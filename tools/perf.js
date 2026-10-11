// Frame-rate audit: every explore scene + the intro, at a given viewport, with adaptive quality on.
const { chromium } = require(process.env.HOME + '/Documents/视频素材/ai-history-film/node_modules/playwright-core');
(async () => {
  const [w = 1920, h = 1080, dpr = 1] = process.argv.slice(2).map(Number);
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await p.goto('http://localhost:8090/?explore=garg');
  await p.waitForFunction(() => window.__app && document.body.className.includes('state-explore'), null, { timeout: 90000 });
  for (const id of ['garg', 'saturn', 'miller', 'dock', 'tess', 'earth', 'dust']) {
    await p.evaluate(id => document.querySelector(`.rl[data-id=${id}]`).click(), id);
    await p.waitForTimeout(9000);   // let adaptive resolution settle
    const r = await p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res({ fps: n / ((performance.now() - t0) / 1000), pr: __app.pr, q: __app.quality }); }; requestAnimationFrame(f); }));
    console.log(id.padEnd(7), `${r.fps.toFixed(1)} fps`, `pr ${r.pr.toFixed(2)}`, `quality ${r.q.toFixed(2)}`);
  }
  await b.close();
})();
