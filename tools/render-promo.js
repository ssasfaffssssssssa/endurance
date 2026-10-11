// Frame-exact renderer for the Douyin promo (and audio offline-render).
//   node tools/render-promo.js stills out/stills 1 5 12 ...
//   node tools/render-promo.js video out/promo_silent.mp4 [fps=60] [workers=3] [t0] [t1]
//   node tools/render-promo.js audio out/promo.wav
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require(process.env.HOME + '/Documents/视频素材/ai-history-film/node_modules/playwright-core');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }); s.listen(0, () => r(s)); }); }
async function page(browser, port) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  await p.goto(`http://localhost:${port}/index.html?promo`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  return p;
}
const ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'];
(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const srv = await serve(); const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ARGS });
  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true }); const p = await page(browser, port);
    for (const ts of rest) { const t = parseFloat(ts); await p.evaluate(t => render(t), t); await p.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 90 }); console.log('still', t); }
  } else if (mode === 'cover') {
    for (const [k, w, h] of [['169', 1920, 1080], ['34', 1080, 1440]]) {
      const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      p.on('pageerror', e => console.error('[pageerror]', e.message));
      await p.goto(`http://localhost:${port}/index.html?cover=${k}`);
      await p.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(out, `cover_${k}.jpg`), type: 'jpeg', quality: 94 });
      console.log('cover', k); await p.close();
    }
  } else if (mode === 'audio') {
    const p = await page(browser, port);
    const b64 = await p.evaluate(async () => {
      const { Score, buildTrailer } = await import('/js/audio.js');
      const SR = 48000, dur = window.PROMO_END + .5;
      const off = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
      const sc = new Score(buildTrailer()); sc.init(off);
      for (const e of sc.events) sc.fire(e, e.t);
      const buf = await off.startRendering();
      const L = buf.getChannelData(0), Rr = buf.getChannelData(1), n = L.length;
      const pcm = new Int16Array(n * 2);
      for (let i = 0; i < n; i++) { pcm[i * 2] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[i * 2 + 1] = Math.max(-1, Math.min(1, Rr[i])) * 32767; }
      const u8 = new Uint8Array(pcm.buffer); let s = ''; const CH = 0x8000;
      for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
      return btoa(s);
    });
    const data = Buffer.from(b64, 'base64'), SR = 48000;
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
    h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.concat([h, data])); console.log('audio', out, data.length);
  } else if (mode === 'video') {
    const fps = +(rest[0] || 60), workers = +(rest[1] || 3);
    const p0 = await page(browser, port); const END = await p0.evaluate(() => window.PROMO_END); await p0.close();
    const t0 = +(rest[2] || 0), t1 = +(rest[3] || END);
    const F0 = Math.round(t0 * fps), F1 = Math.round(t1 * fps), total = F1 - F0, per = Math.ceil(total / workers);
    const tmp = path.join(ROOT, 'out', 'parts'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    let done = 0; const st = Date.now();
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const a = F0 + w * per, b = Math.min(F1, a + per); if (a >= b) return;
      const p = await page(browser, port);
      // warm-up: render the first frame twice so shaders/fonts are settled
      await p.evaluate(t => render(t), a / fps);
      const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(fps), path.join(tmp, `p${String(w).padStart(2, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        await p.evaluate(t => render(t), f / fps);
        const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        done++; if (done % 120 === 0) { const el = (Date.now() - st) / 1000; console.log(`${done}/${total}  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el)).toFixed(0)}s`); }
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r)); await p.close();
    }));
    const list = fs.readdirSync(tmp).filter(f => f.endsWith('.mp4')).sort().map(f => `file '${path.join(tmp, f)}'`).join('\n');
    fs.writeFileSync(path.join(tmp, 'list.txt'), list);
    await new Promise(r => spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('video done', out, ((Date.now() - st) / 1000).toFixed(0) + 's');
  }
  await browser.close(); srv.close();
})();
