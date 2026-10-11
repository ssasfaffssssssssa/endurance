// node tools/snap.js out.jpg "url-path-and-query" [width height wait_ms] [js-to-eval-before-shot]
const { chromium } = require(process.env.HOME + '/Documents/视频素材/ai-history-film/node_modules/playwright-core');
(async () => {
  const [out, q, w = 1280, h = 720, wait = 6000, js] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.error('[console]', m.text()); });
  await p.goto('http://localhost:8090/' + q);
  await p.waitForTimeout(+wait);
  if (js) { await p.evaluate(js); await p.waitForTimeout(800); }
  await p.screenshot({ path: out, type: 'jpeg', quality: 90 });
  await b.close();
})();
