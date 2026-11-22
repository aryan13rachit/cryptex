// Cryptex: the web app (assets/web) running inside a native Flutter shell.
//
// The app serves the web files from its asset bundle on http://localhost (a secure context, so
// camera, microphone and Web Crypto work) and shows them in a full-screen WebView.
//
// The web code was written for Capacitor and calls window.Capacitor.Plugins.* for native
// features. A stand-in for that object is added to the page as it is served, and each call is
// routed to Flutter over a JavaScript channel: haptics, the camera torch, save/share files,
// status-bar colour and the Android back button.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:mime/mime.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import 'package:torch_light/torch_light.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

const _root = 'assets/web';
late final int _port;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  _port = await _serve();
  runApp(const CryptexApp());
}

/// Serves the bundled web app on 127.0.0.1 (fixed port so localStorage persists between launches).
Future<int> _serve() async {
  HttpServer server;
  try {
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 8742);
  } on SocketException {
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
  }
  server.listen((req) async {
    var path = Uri.decodeFull(req.uri.path);
    if (path == '/' || path.isEmpty) path = '/index.html';
    final res = req.response;
    try {
      var bytes = (await rootBundle.load('$_root$path')).buffer.asUint8List();
      final type = lookupMimeType(path) ?? 'application/octet-stream';
      if (path == '/index.html') {
        bytes = utf8.encode(utf8.decode(bytes).replaceFirst('<head>', '<head>\n<script>$_bridge</script>'));
      }
      res.headers.contentType = ContentType.parse(type.startsWith('text/') || type.contains('javascript') || type.contains('json') ? '$type; charset=utf-8' : type);
      res.headers.set('Cache-Control', 'no-cache');
      res.add(bytes);
    } catch (_) {
      res.statusCode = HttpStatus.notFound;
    }
    await res.close();
  });
  return server.port;
}

/// What the web app expects from Capacitor, backed by Flutter. Runs before any page script.
const _bridge = r'''
(() => {
  let seq = 0; const waiting = new Map();
  window.__cxReply = (id, ok, value) => { const p = waiting.get(id); if (!p) return; waiting.delete(id); ok ? p.res(value) : p.rej(new Error(String(value))); };
  const call = (name, ...args) => new Promise((res, rej) => {
    const id = ++seq; waiting.set(id, { res, rej });
    const send = () => window.CxNative.postMessage(JSON.stringify({ id, name, args }));
    if (window.CxNative) send(); else setTimeout(() => window.CxNative ? send() : rej(new Error('native bridge unavailable')), 300);
  });
  let back = null;
  window.__cxBack = () => { if (back) { back(); return 'handled'; } return 'none'; };
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    Plugins: {
      Haptics: { impact: ({ style } = {}) => call('haptic', style || 'LIGHT') },
      Torch: {
        isAvailable: () => call('torchAvailable').then(a => ({ available: !!a })),
        enable: () => call('torch', true),
        disable: () => call('torch', false),
      },
      Filesystem: { writeFile: ({ path, data }) => call('writeFile', path, data).then(uri => ({ uri })) },
      Share: { share: ({ title, files }) => call('share', title || '', files || []) },
      StatusBar: {
        setBackgroundColor: ({ color }) => call('statusBar', color),
        setStyle: () => Promise.resolve(),
      },
      Tts: {
        speak: ({ text, rate = 0.45, pitch = 1 } = {}) => call('speak', text || '', rate, pitch),
        stop: () => call('ttsStop'),
      },
      App: {
        addListener: (event, cb) => { if (event === 'backButton') back = cb; return Promise.resolve({ remove() { back = null; } }); },
        exitApp: () => call('exit'),
      },
    },
  };
  // The Android WebView has no vibration API; route it to native haptics.
  navigator.vibrate = ms => { call('haptic', (Array.isArray(ms) ? ms[0] : ms) >= 25 ? 'HEAVY' : 'LIGHT').catch(() => {}); return true; };
})();
''';

class CryptexApp extends StatelessWidget {
  const CryptexApp({super.key});
  @override
  Widget build(BuildContext context) => const MaterialApp(debugShowCheckedModeBanner: false, title: 'Cryptex', home: WebShell());
}

class WebShell extends StatefulWidget {
  const WebShell({super.key});
  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> {
  late final WebViewController _web;
  final _tts = FlutterTts();
  bool _ttsReady = false;
  Color _bar = const Color(0xFF1A110B);
  bool _ready = false;   // the page has painted; until then the launch screen stays up

  @override
  void initState() {
    super.initState();
    _web = WebViewController(onPermissionRequest: _permission)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(_bar)
      ..enableZoom(false)
      ..addJavaScriptChannel('CxNative', onMessageReceived: (m) => _onCall(m.message))
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) => Future.delayed(const Duration(milliseconds: 120), () { if (mounted) setState(() => _ready = true); }),
        // everything lives on the in-app server; never wander off to other sites
        onNavigationRequest: (r) {
          final u = Uri.tryParse(r.url);
          final local = u != null && (u.host == 'localhost' || u.host == '127.0.0.1' || u.scheme == 'blob' || u.scheme == 'data' || u.scheme == 'about');
          return local ? NavigationDecision.navigate : NavigationDecision.prevent;
        },
      ))
      ..loadRequest(Uri.parse('http://localhost:$_port/index.html'));
    final p = _web.platform;
    if (p is AndroidWebViewController) {
      p.setMediaPlaybackRequiresUserGesture(false);
      p.setTextZoom(100);
      p.setOnShowFileSelector(_pickFiles);
      // on-device profiling build: flutter build apk --dart-define=CX_DEBUG=true
      AndroidWebViewController.enableDebugging(const bool.fromEnvironment('CX_DEBUG'));
    }
  }

  // ---- calls from the page -------------------------------------------------------------
  Future<void> _onCall(String raw) async {
    final m = jsonDecode(raw) as Map<String, dynamic>;
    final id = m['id'], args = (m['args'] as List?) ?? const [];
    try {
      final v = await _handle('${m['name']}', args);
      await _web.runJavaScript('window.__cxReply($id, true, ${jsonEncode(v)})');
    } catch (e) {
      await _web.runJavaScript('window.__cxReply($id, false, ${jsonEncode('$e')})');
    }
  }

  Future<Object?> _handle(String name, List args) async {
    switch (name) {
      case 'haptic':
        switch ('${args.isEmpty ? 'LIGHT' : args.first}'.toUpperCase()) {
          case 'HEAVY': await HapticFeedback.heavyImpact();
          case 'MEDIUM': await HapticFeedback.mediumImpact();
          default: await HapticFeedback.lightImpact();
        }
        return null;
      case 'torchAvailable':
        try { return await TorchLight.isTorchAvailable(); } catch (_) { return false; }
      case 'torch':
        try { args.isNotEmpty && args.first == true ? await TorchLight.enableTorch() : await TorchLight.disableTorch(); } catch (_) {}
        return null;
      case 'writeFile':
        final fname = '${args[0]}'.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
        final f = File('${(await getTemporaryDirectory()).path}/$fname');
        await f.writeAsBytes(base64Decode('${args[1]}'));
        return f.path;
      case 'share':
        final files = [for (final p in (args.length > 1 ? args[1] as List : const [])) XFile('$p')];
        if (files.isNotEmpty) await SharePlus.instance.share(ShareParams(files: files, title: '${args[0]}'));
        return null;
      case 'statusBar':
        final c = _parse(args.isEmpty ? null : args.first);
        if (c != null) _setBar(c);
        return null;
      case 'speak':
        // the Numbers Station voice: Android's text-to-speech, resolving when the phrase is finished
        if (!_ttsReady) { await _tts.awaitSpeakCompletion(true); await _tts.setLanguage('en-GB').catchError((_) => _tts.setLanguage('en-US')); _ttsReady = true; }
        await _tts.setSpeechRate(((args.length > 1 ? args[1] : 0.45) as num).toDouble().clamp(0.1, 1.0));
        await _tts.setPitch(((args.length > 2 ? args[2] : 1) as num).toDouble().clamp(0.5, 2.0));
        await _tts.speak('${args.isEmpty ? '' : args.first}');
        return null;
      case 'ttsStop':
        await _tts.stop();
        return null;
      case 'exit':
        await SystemNavigator.pop();
        return null;
    }
    throw UnsupportedError(name);
  }

  void _setBar(Color c) {
    setState(() => _bar = c);
    _web.setBackgroundColor(c);
    final light = c.computeLuminance() > .5;
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
      statusBarColor: c, systemNavigationBarColor: c,
      statusBarIconBrightness: light ? Brightness.dark : Brightness.light,
      systemNavigationBarIconBrightness: light ? Brightness.dark : Brightness.light,
    ));
  }

  static Color? _parse(Object? css) {
    var h = '$css'.trim().replaceFirst('#', '');
    if (h.length == 3) h = h.split('').map((c) => '$c$c').join();
    final v = h.length == 6 ? int.tryParse(h, radix: 16) : null;
    return v == null ? null : Color(0xFF000000 | v);
  }

  // ---- camera / microphone -------------------------------------------------------------
  Future<void> _permission(WebViewPermissionRequest r) async {
    final want = <Permission>[
      if (r.types.contains(WebViewPermissionResourceType.camera)) Permission.camera,
      if (r.types.contains(WebViewPermissionResourceType.microphone)) Permission.microphone,
    ];
    final got = want.isEmpty ? <Permission, PermissionStatus>{} : await want.request();
    if (got.values.every((s) => s.isGranted)) {
      await r.grant();
    } else {
      await r.deny();
    }
  }

  // ---- <input type=file> -----------------------------------------------------------------
  Future<List<String>> _pickFiles(FileSelectorParams p) async {
    final types = p.acceptTypes.join(',');
    final type = types.contains('image') && !types.contains('audio')
        ? FileType.image
        : types.contains('audio') && !types.contains('image')
            ? FileType.audio
            : FileType.any;
    try {
      final files = p.mode == FileSelectorMode.openMultiple
          ? await FilePicker.pickFiles(type: type)
          : [?await FilePicker.pickFile(type: type)];
      return [for (final f in files) if (f.path != null) Uri.file(f.path!).toString()];
    } catch (_) {
      return const [];
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        Object? r;
        try { r = await _web.runJavaScriptReturningResult('window.__cxBack ? window.__cxBack() : "none"'); } catch (_) {}
        if (!'$r'.contains('handled')) await SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: _bar,
        body: Stack(children: [
          SafeArea(child: _web.platform is AndroidWebViewController
              // hybrid composition: Android draws the WebView itself, so scrolling runs at native speed
              ? WebViewWidget.fromPlatformCreationParams(params: AndroidWebViewWidgetCreationParams(controller: _web.platform, displayWithHybridComposition: true))
              : WebViewWidget(controller: _web)),
          // the launch screen (same colour and icon as the Android splash) until the page has painted
          IgnorePointer(
            ignoring: _ready,
            child: AnimatedOpacity(
              opacity: _ready ? 0 : 1,
              duration: const Duration(milliseconds: 260),
              child: Container(
                color: const Color(0xFF1A110B),
                alignment: Alignment.center,
                child: ClipRRect(borderRadius: BorderRadius.circular(28), child: Image.asset('assets/web/assets/icon-192.png', width: 120, height: 120)),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}
