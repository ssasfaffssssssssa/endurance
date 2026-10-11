// README screenshots: explore HUD for each world + a few film frames.
const { chromium } = require(process.env.HOME + '/Documents/视频素材/ai-history-film/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const only = process.argv[2]; let list = [['1_gargantua', 'explore=garg'], ['2_wormhole', 'explore=saturn'], ['3_miller', 'explore=miller'], ['4_tesseract', 'explore=tess'], ['5_earth', 'explore=earth'], ['9_docking', 'explore=dock'], ['6_dust', 'explore=dust'], ['7_film_flyby', 'film=82.5'], ['8_film_wave', 'film=56']];
  if (only) list = list.filter(l => l[0].startsWith(only));
  for (const [name, q] of list) {
    await p.goto('http://localhost:8090/?dev&' + q);
    await p.waitForTimeout(q.startsWith('film') ? 9000 : 11000);
    if (q === 'explore=dock') { await p.evaluate(() => __app.W.dock.setAuto(true)); await p.waitForTimeout(12000); }
    if (q === 'explore=garg') { await p.evaluate(() => { document.querySelectorAll('#tl-ctrl .tg')[1].click(); }); await p.waitForTimeout(1500); }
    if (q.startsWith('film')) { const t = +q.split('=')[1]; await p.evaluate(t => { __app.togglePlay(); __app.seek(t); }, t); await p.waitForTimeout(1500); }
    await p.waitForTimeout(400);
    await p.screenshot({ path: `screenshot/${name}.jpg`, type: 'jpeg', quality: 90 });
    console.log(name);
  }
  await b.close();
})();
