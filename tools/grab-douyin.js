// Open a Douyin video page in a fresh headless Chrome profile and capture the media URLs it requests.
const { chromium } = require(process.env.HOME + '/Documents/视频素材/ai-history-film/node_modules/playwright-core');
const fs = require('fs');
const [url, outDir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
  const p = await ctx.newPage();
  const media = new Set(); let detail = null;
  p.on('response', async r => {
    const u = r.url();
    if (/aweme\/v1\/web\/aweme\/detail/.test(u)) { try { detail = await r.json(); } catch (e) {} }
    const ct = r.headers()['content-type'] || '';
    if (ct.startsWith('video/') || /douyinvod|\/video\/tos\/|v\d+-web\.douyinvod|mime_type=video/.test(u)) media.add(u);
  });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(9000);
  const vids = await p.evaluate(() => [...document.querySelectorAll('video')].map(v => [v.currentSrc, ...[...v.querySelectorAll('source')].map(s => s.src)]).flat().filter(Boolean));
  vids.forEach(v => media.add(v));
  let play = [];
  if (detail && detail.aweme_detail) {
    const v = detail.aweme_detail.video;
    (v.bit_rate || []).forEach(br => (br.play_addr?.url_list || []).forEach(u => play.push({ q: br.gear_name, w: br.play_addr.width, h: br.play_addr.height, u })));
    (v.play_addr?.url_list || []).forEach(u => play.push({ q: 'play_addr', u }));
    fs.writeFileSync(outDir + '/detail.json', JSON.stringify({ desc: detail.aweme_detail.desc, duration: v.duration, w: v.width, h: v.height, music: detail.aweme_detail.music?.title }, null, 1));
  }
  console.log(JSON.stringify({ media: [...media].slice(0, 8), play: play.slice(0, 6), title: await p.title() }, null, 1));
  const cands = [...play.map(x => x.u), ...media].filter(u => u.startsWith('http'));
  for (const u of cands) {
    try {
      const res = await ctx.request.get(u, { headers: { Referer: 'https://www.douyin.com/' }, timeout: 120000 });
      const body = await res.body();
      console.log('try', res.status(), body.length, u.slice(0, 90));
      if (res.ok() && body.length > 200000) { fs.writeFileSync(outDir + '/ref.mp4', body); console.log('saved', body.length); break; }
    } catch (e) { console.log('fail', e.message.slice(0, 80)); }
  }
  await b.close();
})();
