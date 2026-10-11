// The film: shots, transitions, subtitles, chapter cards and the two clocks — Earth's and the ship's.

export const DURATION = 122;

// [start, end, world, shot, transition-in]
// transitions: 'black' dip, 'cut', 'white' flash, 'hold' (stay black first)
export const SHOTS = [
  [0, 14, 'dust', 'fall', 'black'],
  [14, 21.5, 'earth', 'dawn', 'black'],
  [21.5, 28, 'earth', 'depart', 'cut'],
  [28, 35.5, 'saturn', 'vista', 'black'],
  [35.5, 41, 'saturn', 'approach', 'cut'],
  [41, 44, 'saturn', 'enter', 'cut'],
  [44, 49, 'miller', 'calm', 'white'],
  [49, 52.5, 'miller', 'reveal', 'cut'],
  [52.5, 60, 'miller', 'rise', 'cut'],
  [60, 63.2, 'dock', 'wide', 'hold'],
  [63.2, 70, 'dock', 'dock', 'cut'],
  [70, 79.5, 'garg', 'reveal', 'black'],
  [79.5, 86, 'garg', 'flyby', 'cut'],
  [86, 94, 'garg', 'dive', 'cut'],
  [94, 102.5, 'tess', 'fall', 'white'],
  [102.5, 110, 'tess', 'drift', 'cut'],
  [110, 122, 'dust', 'stay', 'black'],
];

export const CHAPTERS = [
  { t: 0, num: '01', zh: '尘埃', en: 'THE DUST' },
  { t: 14, num: '02', zh: '启航', en: 'ENDURANCE' },
  { t: 28, num: '03', zh: '虫洞', en: 'THE WORMHOLE' },
  { t: 44, num: '04', zh: '米勒星球', en: 'MILLER' },
  { t: 60, num: '05', zh: '对接', en: 'DOCKING' },
  { t: 70, num: '06', zh: '卡冈图雅', en: 'GARGANTUA' },
  { t: 94, num: '07', zh: '超立方体', en: 'TESSERACT' },
  { t: 110, num: '08', zh: '留下', en: 'STAY' },
];

export const SUBS = [
  [1.8, 5.8, '尘埃落下的方式，并不随机。', 'The dust wasn’t falling at random.'],
  [6.6, 10.6, '它在说话——用引力。', 'It was speaking — in gravity.'],
  [15.2, 19.6, '收成一年比一年少，沙尘一年比一年厚。', 'Each harvest thinner. Each storm darker.'],
  [22.2, 26.6, '于是，我们抬起头。', 'So we looked up.'],
  [29, 33.6, '土星旁边，有人为我们留下了一扇门。', 'Beside Saturn, someone had left us a door.'],
  [36, 40.2, '它不是一个洞，而是一个球。', 'Not a hole — a sphere.'],
  [45.2, 48.8, '米勒星球。这里的一小时，是地球上的七年。', 'Miller’s planet. One hour here is seven years on Earth.'],
  [49.6, 52.2, '那不是山……', 'Those aren’t mountains…'],
  [53, 56.4, '……是浪。', '…they’re waves.'],
  [61.6, 64.8, '永恒号失控了，每分钟二十多转。', 'Endurance is tumbling — over twenty turns a minute.'],
  [65.4, 69.4, '匹配它的转速，然后，靠上去。', 'Match its spin. Then close in.'],
  [72.2, 77.4, '卡冈图雅。一亿个太阳的质量，连光都无法逃离。', 'Gargantua. A hundred million suns. Not even light escapes.'],
  [80.2, 85.2, '在它身边，时间不再是一个常数。', 'Near it, time is no longer a constant.'],
  [86.8, 91.2, '离视界越近，家里的岁月走得越快。', 'The closer we fall, the faster the years pass at home.'],
  [96, 101.2, '留下那扇门的，从来不是“他们”。', 'The ones who left the door were never “them”.'],
  [103, 108.8, '是我们。引力能穿越时间——也许，爱也能。', 'It was us. Gravity crosses time — perhaps love does too.'],
  [111, 114.6, '尘埃再次落下。这一次，只有一个词。', 'The dust falls again. This time, one word.'],
];

// Earth calendar (decimal years) — keyframes [filmTime, year]
export const EARTH_CLOCK = [
  [0, 2067.71], [28, 2067.74], [43.6, 2069.82],
  [44.6, 2069.82], [59.8, 2093.17],          // +23 years 4 months 8 days
  [60, 2093.17], [70, 2093.4], [86, 2093.43], [93.6, 2144.5], // the slingshot: +51 years
];
export const SHIP_CLOCK = [[0, 0], [28, 0], [43.6, 2.04], [60, 2.0404], [70, 2.3], [94, 2.31]];
export const JUMPS = [
  { t: 53.5, zh: '地球时间 +23 年 4 个月 8 天', en: 'EARTH TIME +23 YEARS 4 MONTHS 8 DAYS' },
  { t: 89.5, zh: '地球时间 +51 年', en: 'EARTH TIME +51 YEARS' },
];

export const WORLD_INFO = {
  dust: {
    num: '01', zh: '尘埃', en: 'THE DUST', kicker: 'EARTH · 2067',
    text: '一间书房，一扇窗，一束光。尘埃在地板上落成粗细不同的线条——那是用引力写下的二进制坐标，也是一个摩尔斯电码单词。',
    textEn: 'A study, a window, a shaft of light. Dust settles into lines on the floor — binary coordinates written in gravity, and one word in Morse.',
  },
  earth: {
    num: '02', zh: '启航', en: 'ENDURANCE', kicker: 'LOW EARTH ORBIT',
    text: '沙尘暴笼罩下的地球。永恒号由十二个舱段组成环形，自转产生人造重力，载着最后的希望出发。',
    textEn: 'A planet veiled in dust. Endurance — twelve modules in a spinning ring for artificial gravity — leaves with the last hope.',
  },
  saturn: {
    num: '03', zh: '虫洞', en: 'THE WORMHOLE', kicker: 'SATURN ORBIT',
    text: '虫洞在三维空间里看起来是一个球体：它像透镜一样折射周围的星空，球面里映出的，是另一个星系的天空。',
    textEn: 'In three dimensions a wormhole appears as a sphere — a lens bending the stars around it, showing the sky of another galaxy inside.',
  },
  miller: {
    num: '04', zh: '米勒星球', en: 'MILLER', kicker: 'GARGANTUA SYSTEM · PLANET 1',
    text: '贴近卡冈图雅运行的水世界，引力潮汐掀起千米巨浪。1 小时 = 地球 7 年——每一声“滴答”，地球上就过去一天。',
    textEn: 'An ocean world skimming Gargantua; tidal forces raise kilometre-high waves. One hour = seven Earth years — every tick is a day at home.',
  },
  dock: {
    num: '05', zh: '对接', en: 'DOCKING', kicker: 'ENDURANCE · CRITICAL',
    text: '永恒号失控高速旋转，两个舱段被炸飞。驾驶徘徊者号匹配它的转速、对准对接口、慢慢靠近——转速、对准、速度三项全部达标才能对上。',
    textEn: 'Endurance tumbles out of control. Fly the Ranger, match its spin, line up with the port and close in — all three must be right.',
  },
  garg: {
    num: '06', zh: '卡冈图雅', en: 'GARGANTUA', kicker: 'SUPERMASSIVE BLACK HOLE',
    text: '实时求解旋转黑洞（克尔时空）里的光线路径：吸积盘背面的光被弯到黑洞上下方，形成标志性的光环。切换“物理”可看到多普勒集束与引力红移；调高自旋，阴影会被拖得不对称。',
    textEn: 'Light is traced live through spinning (Kerr) spacetime: the far side of the disk bends above and below the shadow. Physical mode adds Doppler beaming and redshift; raise the spin and the shadow turns lopsided.',
  },
  tess: {
    num: '07', zh: '超立方体', en: 'TESSERACT', kicker: 'INSIDE THE EVENT HORIZON',
    text: '五维存在为我们搭建的三维空间：同一间书房的背面，沿着时间无限重复。发光的丝线是时间本身——在这里，可以触碰过去。',
    textEn: 'A three-dimensional space built inside five: the back of one bookshelf repeated endlessly along time. The glowing threads are time itself.',
  },
};
