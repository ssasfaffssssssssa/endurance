// Mission-control HUD for explore mode: vessel, mission, relativity (with live charts), observer, 3D markers.
import * as THREE from 'three';
import { RS } from './worlds/gargantua.js';

const $ = id => document.getElementById(id);
const R = (k, v, cls = '') => `<div class="tr ${cls}"><span>${k}</span><b>${v}</b></div>`;
const BAR = (k, pct, val, col) => `<div class="bar"><span>${k}</span><s><i style="width:${Math.max(0, Math.min(100, pct))}%;${col ? 'background:' + col : ''}"></i></s><b>${val}</b></div>`;

// per-world mission context
const CTX = {
  dust: { dest: '地球 · 美国中西部', earth: 2067.71, met: 0, fuel: 100, o2: 100, sig: '—', focus: '引力异常', planets: [0, 0, 0], ship: 'ON GROUND' },
  earth: { dest: '土星 · 虫洞', earth: 2067.74, met: 0.002, fuel: 98, o2: 99, sig: '0.03 s', focus: '永恒号', planets: [0, 0, 0], ship: 'NOMINAL' },
  saturn: { dest: '虫洞 → 卡冈图雅星系', earth: 2069.82, met: 2.04, fuel: 71, o2: 88, sig: '79 min', focus: '虫洞', planets: [0, 0, 0], ship: 'NOMINAL' },
  miller: { dest: '米勒星球 · 海洋', earth: 2093.17, met: 2.06, fuel: 54, o2: 81, sig: '经虫洞 · 单向', focus: '潮汐巨浪', planets: [1, 0, 0], ship: 'RANGER DOWN' },
  garg: { dest: '卡冈图雅 · 弹弓变轨', earth: 2144.3, met: 2.4, fuel: 23, o2: 64, sig: '无法建立', focus: '卡冈图雅', planets: [2, 2, 1], ship: 'SLINGSHOT' },
  dock: { dest: '永恒号 · 紧急对接', earth: 2093.4, met: 2.3, fuel: 31, o2: 58, sig: '近距离 · 实时', focus: '对接口', planets: [2, 1, 0], ship: 'TUMBLING' },
  tess: { dest: '超立方体 · 视界之内', earth: NaN, met: NaN, fuel: 0, o2: 12, sig: '引力 · 跨越时间', focus: '时间之线', planets: [2, 2, 1], ship: 'TARS LINKED' },
};
const CREW = ['COOPER', 'BRAND', 'ROMILLY', 'DOYLE', 'TARS', 'CASE'];
const PLANETS = [['MILLER', '米勒'], ['MANN', '曼恩'], ['EDMUNDS', '埃德蒙兹']];
const fmtDate = y => { if (!isFinite(y)) return '∞'; const yr = Math.floor(y); const doy = Math.floor((y - yr) * 365); const md = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; let m = 0, d = doy; while (m < 11 && d >= md[m]) { d -= md[m]; m++; } return `${yr}.${String(m + 1).padStart(2, '0')}.${String(d + 1).padStart(2, '0')}`; };

export function createHUD() {
  const markersEl = $('markers');
  const pool = [];
  const mk = i => {
    if (!pool[i]) { const d = document.createElement('div'); d.className = 'mk'; d.innerHTML = '<i class="pt"></i><i class="ld"></i><div class="tx"></div>'; markersEl.appendChild(d); pool[i] = d; }
    return pool[i];
  };
  const v3 = new THREE.Vector3();
  let id = 'garg', world = null, last = 0, t0 = 0;
  const crew = $('v-crew');
  crew.innerHTML = CREW.map(c => `<span class="${c === 'TARS' || c === 'CASE' ? 'ai' : ''}">${c}</span>`).join('');
  const meter = $('v-meter'); meter.innerHTML = '<i></i>'.repeat(32);

  function select(newId, w) {
    id = newId; world = w; t0 = 0;
    const c = CTX[id];
    $('m-planets').innerHTML = PLANETS.map(([en, zh], i) => `<div class="pl ${c.planets[i] === 1 ? 'on' : ''} ${c.planets[i] === 2 ? 'x' : ''}"><b>${en}</b>${zh} · ${c.planets[i] === 2 ? '不宜居' : c.planets[i] === 1 ? '在此' : '待勘探'}</div>`).join('');
    pool.forEach(p => p.style.display = 'none');
  }

  // ——— charts ———
  const chart = $('r-chart');
  function svgPath(pts) { return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(''); }
  const axis = `<line x1="0" y1="100" x2="280" y2="100" stroke="rgba(236,231,222,.25)"/><line x1="0" y1="0" x2="0" y2="100" stroke="rgba(236,231,222,.12)"/>`;
  function drawChart(t, extra) {
    let h = axis;
    if (id === 'garg') {
      const X = r => Math.log(r) / Math.log(40) * 280, Y = g => 100 - Math.min(1, (g - 1) / 3) * 92;
      const pts = []; for (let r = 1.02; r <= 40; r *= 1.04) pts.push([X(r), Y(1 / Math.sqrt(1 - 1 / r))]);
      h += `<path d="${svgPath(pts)}" fill="none" stroke="#e8b46a" stroke-width="1.2"/>`;
      for (const [r, l] of [[1.5, '光子球'], [3, 'ISCO']]) h += `<line x1="${X(r)}" y1="6" x2="${X(r)}" y2="100" stroke="rgba(236,231,222,.25)" stroke-dasharray="2 3"/><text x="${X(r) + 3}" y="14">${l}</text>`;
      const r = extra.r, x = X(Math.min(40, r)), y = Y(1 / Math.sqrt(Math.max(1e-6, 1 - 1 / r)));
      h += `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff"/><circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#e8b46a" opacity=".6"/>`;
      h += `<text x="4" y="96">γ(r) = 1/√(1−rₛ/r)</text><text x="230" y="96">r / rₛ →</text>`;
    } else if (id === 'saturn') {
      const pts = []; for (let x = 1; x <= 4; x += .05) pts.push([(x - 1) / 3 * 280, 100 - .42 / (x * x) / .42 * 90]);
      h += `<path d="${svgPath(pts)}" fill="none" stroke="#e8b46a" stroke-width="1.2"/>`;
      h += `<text x="4" y="12">偏折角 α ∝ 1/b²</text><text x="210" y="96">b / R_throat →</text>`;
      // light rays bending round the sphere
      for (let k = 0; k < 5; k++) { const yy = 30 + k * 12; h += `<path d="M150 ${yy} Q 215 ${yy + (k - 2) * -6} 280 ${yy + (k - 2) * -14}" fill="none" stroke="rgba(159,180,201,.45)"/>`; }
      h += `<circle cx="150" cy="54" r="9" fill="none" stroke="#fff" opacity=".8"/>`;
    } else if (id === 'miller') {
      const H = extra.H, front = extra.front;
      const X = d => d / 10000 * 280, Y = y => 100 - y / 420 * 90;
      const pts = []; for (let d = 0; d <= 10000; d += 60) { const s = d - front; const w = s < 0 ? H * .55 : H * 2.4; pts.push([X(d), Y(H * Math.exp(-s * s / (w * w)))]); }
      h += `<path d="${svgPath(pts)} L280 100 L0 100Z" fill="rgba(159,180,201,.12)" stroke="#9fb4c9" stroke-width="1.2"/>`;
      h += `<circle cx="2" cy="99" r="3" fill="#e8b46a"/><text x="8" y="94">RANGER</text><text x="200" y="12">剖面 · 0–10 km</text>`;
      if (front < 10000) h += `<text x="${Math.min(240, X(front) + 6)}" y="${Y(H) + 10}">${Math.round(H)} m</text>`;
    } else if (id === 'earth') {
      const pts = []; for (let i = 0; i <= 27; i++) { const v = .12 + .8 * Math.pow(i / 27, 1.8) + .05 * Math.sin(i * 1.9); pts.push([i / 27 * 280, 100 - v * 90]); }
      h += `<path d="${svgPath(pts)}" fill="none" stroke="#e8b46a" stroke-width="1.2"/><circle cx="280" cy="${pts[27][1]}" r="3.5" fill="#fff"/>`;
      h += `<text x="4" y="12">大气沙尘指数</text><text x="4" y="96">2040</text><text x="250" y="96">2067</text>`;
    } else if (id === 'tess') {
      for (let k = 0; k < 6; k++) {
        const pts = []; for (let x = 0; x <= 280; x += 6) pts.push([x, 50 + Math.sin(x * .03 + t * (1 + k * .3) + k) * (8 + k * 5)]);
        h += `<path d="${svgPath(pts)}" fill="none" stroke="${k % 2 ? '#9fb4c9' : '#e8b46a'}" stroke-width=".9" opacity="${.35 + k * .1}"/>`;
      }
      h += `<text x="4" y="12">时间维度 · 可见的过去</text>`;
    } else if (id === 'dust') {
      const pat = extra.pattern || [];
      const xs = pat.map(p => p[0]); const mn = Math.min(...xs) - .1, mx = Math.max(...xs) + .1;
      pat.forEach(p => { const x = (p[0] - mn) / (mx - mn) * 280, w = Math.max(2, p[1] * 2 / (mx - mn) * 280); h += `<rect x="${x - w / 2}" y="22" width="${w}" height="66" fill="#e8b46a" opacity=".85"/>`; });
      h += `<text x="4" y="12">${extra.morse ? '摩尔斯 · S T A Y' : '二进制 · 1011 0010 1110'}</text>`;
    }
    chart.innerHTML = h;
  }

  function update(dt, secs, camera, stats, force) {
    if (!world) return;
    t0 += dt; last += dt;
    if (force) { t0 = secs; last = 1; }
    // markers every frame
    const ms = world.markers ? world.markers(camera) : [];
    const w = innerWidth, hgt = innerHeight;
    ms.forEach((m, i) => {
      const el = mk(i);
      v3.copy(m.p).project(camera);
      const vis = v3.z < 1 && Math.abs(v3.x) < .96 && Math.abs(v3.y) < .92;
      el.style.display = vis ? 'block' : 'none';
      if (!vis) return;
      const x = (v3.x * .5 + .5) * w, y = (-v3.y * .5 + .5) * hgt;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.classList.toggle('left', x > w * .62);
      const html = `${m.t}<small>${m.s || ''}</small>`;
      if (el._h !== html) { el.children[2].innerHTML = html; el._h = html; }
    });
    for (let i = ms.length; i < pool.length; i++) pool[i].style.display = 'none';
    if (last < .1) return; last = 0;
    const c = CTX[id];
    // brand clocks
    const metY = c.met + secs / 3.15e7;
    const met = isFinite(metY) ? metY * 365.25 * 24 * 3600 + secs : NaN;
    const hh = Math.floor(met / 3600), mm = Math.floor(met / 60) % 60, ss = Math.floor(met) % 60;
    $('h-met').textContent = isFinite(met) ? `T+${String(hh).padStart(3, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : 'T+ — — —';
    let earth = c.earth;
    if (id === 'miller') earth += secs / 1.25 / 365.25;               // a day per tick
    if (id === 'garg') earth += secs * (stats.f - 1) / 3.15e7 * 3600;  // exaggerated, live
    $('h-earth').textContent = id === 'tess' ? (Math.random() > .5 ? '∞' : fmtDate(2019 + Math.random() * 130)) : fmtDate(earth);
    // vessel
    const g = 1 + Math.sin(t0 * .7) * .004;
    $('v-g').textContent = g.toFixed(2);
    const on = Math.round(24 + 4 * Math.sin(t0 * .9));
    [...meter.children].forEach((e, i) => e.classList.toggle('on', i < on));
    const jit = (a, b) => (a + Math.sin(t0 * b) * .3).toFixed(1);
    $('v-rows').innerHTML =
      R('环转速 RING', '5.30 rpm') +
      R('船体 HULL', jit(id === 'garg' ? 91.4 : 98.6, 1.3) + ' %') +
      BAR('氧气 O₂', c.o2, c.o2 + '%') +
      BAR('燃料 FUEL', c.fuel, c.fuel + '%', c.fuel < 30 ? '#f08a6a' : '') +
      BAR('动力 POWER', 86 + Math.sin(t0) * 3, (86 + Math.sin(t0) * 3).toFixed(0) + '%');
    // mission
    $('m-rows').innerHTML =
      R('目的地', c.dest) +
      R('飞船时间', isFinite(c.met) ? `+${c.met.toFixed(2)} 年` : '— —') +
      R('地球时间', isFinite(earth) ? `+${(earth - 2067.71).toFixed(2)} 年` : '<span class="warn">∞</span>') +
      R('通讯延迟', c.sig);
    // relativity
    let rel = '', head = 'RELATIVITY · 相对论', extra = {};
    if (id === 'garg') {
      const { r, f } = stats;
      const pretty = f < 48 ? f.toFixed(3) + ' 小时' : (f / 24).toFixed(1) + ' 天';
      rel = R('距奇点 r', r.toFixed(2) + ' rₛ') + R('时间膨胀 γ', f.toFixed(4) + '×', 'big') + R('你的 1 小时 =', '地球 ' + pretty) +
        R('自旋 a/M', world.spin.toFixed(2)) + R('最内稳定轨道', (world.uniforms.uRin.value).toFixed(2) + ' rₛ') + R('质量', '1.0 × 10⁸ M☉');
      extra = { r };
    } else if (id === 'saturn') {
      head = 'GRAVITATIONAL LENS · 引力透镜';
      const d = stats.wh;
      rel = R('距虫洞', d.toFixed(1) + ' R') + R('目的地距离', '≈ 10 亿光年', 'big') + R('喉部直径', '≈ 2 km') + R('外观', '球体 · 三维透镜');
    } else if (id === 'miller') {
      head = 'TIME DILATION · 时间膨胀';
      const days = Math.floor(secs / 1.25);
      rel = R('时间膨胀', '61,320×', 'big') + R('你在此停留', secs.toFixed(1) + ' s') + R('地球已过去', days + ' 天') + R('巨浪距离', Math.max(0, stats.front / 1000).toFixed(2) + ' km');
      extra = { H: 380, front: stats.front };
    } else if (id === 'earth') {
      head = 'ATMOSPHERE · 大气';
      rel = R('高度', Math.round(stats.alt).toLocaleString() + ' km') + R('沙尘指数', '87 %', 'big') + R('作物', '仅剩玉米') + R('枯萎病', '扩散中');
    } else if (id === 'tess') {
      head = 'FIVE DIMENSIONS · 五维';
      rel = R('维度', '3 + 时间', 'big') + R('时间方向', '可见 · 可触') + R('信号媒介', '引力') + R('目标', '1 个房间 · 无数时刻');
    } else if (id === 'dust') {
      head = 'ANOMALY · 引力异常';
      rel = R('信号', '尘埃落线', 'big') + R('二进制', '1011 0010 1110') + R('摩尔斯', '··· — ·— —·——') + R('解码', 'S T A Y');
      extra = { pattern: stats.pattern, morse: stats.morse };
    }
    $('r-head').textContent = head;
    $('tl-rows').innerHTML = rel;
    drawChart(t0, extra);
    // observer
    $('o-rows').innerHTML = R('焦点', c.focus) + R('视距', stats.range) + R('视场', camera.fov.toFixed(1) + '°') + R('渲染', `${stats.fps.toFixed(0)} fps · ${Math.round(stats.pr * 100)}%`);
  }
  return { select, update };
}

export { CTX };
