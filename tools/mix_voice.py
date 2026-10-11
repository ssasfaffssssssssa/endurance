#!/usr/bin/env python3
"""Mix a narration track over the film score.

    python3 tools/mix_voice.py <plan.json> <clips_dir> <out.wav> [score.wav]

plan.json: [{"i": 0, "t0": 1.8, "dur": 2.4, ...}, ...]  (clip file = <clips_dir>/<i:02d>.mp3)
Pass 1 measures how far each line sits above the (side-chain ducked) score;
pass 2 adds a smooth extra dip under any line that is less than 10.5 dB clear,
pads to the full film, fades the tail and normalises to -14 LUFS.
"""
import json, os, subprocess, sys, tempfile
import numpy as np

FILM = 122.0

def graph(plan, clips, expr):
    inputs, parts = ['-i', SCORE], []
    for k, p in enumerate(plan):
        inputs += ['-i', os.path.join(clips, f"{p['i']:02d}.mp3")]
        ms = int((p['t0'] + .15) * 1000)
        parts.append(f"[{k+1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={ms}|{ms},volume=1.6[v{k}]")
    vox = ''.join(f'[v{k}]' for k in range(len(plan)))
    fc = ';'.join(parts) + (
        f";{vox}amix=inputs={len(plan)}:normalize=0,apad=whole_dur={FILM + .5}[vox];[vox]asplit=3[vx1][vx2][vx3]"
        f";[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume='{expr}':eval=frame[mus]"
        f";[mus][vx1]sidechaincompress=threshold=0.02:ratio=6:attack=25:release=450:makeup=1,asplit[duck][duck2]"
        f";[duck][vx2]amix=inputs=2:normalize=0:duration=longest,atrim=0:{FILM},afade=t=out:st={FILM - 1.4}:d=1.4,loudnorm=I=-14:TP=-1.2:LRA=14[out]")
    return inputs, fc

def clarity(plan, clips, expr, out):
    inputs, fc = graph(plan, clips, expr)
    tmp = tempfile.mkdtemp()
    dm, dv = os.path.join(tmp, 'm.f32'), os.path.join(tmp, 'v.f32')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc,
                    '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', out,
                    '-map', '[duck2]', '-ac', '1', '-ar', '16000', '-f', 'f32le', dm,
                    '-map', '[vx3]', '-ac', '1', '-ar', '16000', '-f', 'f32le', dv], check=True)
    m, v = np.fromfile(dm, dtype=np.float32), np.fromfile(dv, dtype=np.float32)
    rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x * x)) + 1e-9)
    res = {}
    for p in plan:
        a, b = int((p['t0'] + .2) * 16000), int((p['t0'] + .15 + p['dur']) * 16000)
        res[p['i']] = rms(v[a:b]) - rms(m[a:b])
    return res

def dips(plan, snr):
    terms = []
    for p in plan:
        need = 10.5 - snr[p['i']]
        if need <= 0: continue
        g = 10 ** (-need / 20)
        a, b = p['t0'] + .05, p['t0'] + .15 + p['dur'] + .15
        terms.append(f"(1-{1 - g:.3f}*clip((t-{a:.2f})/0.35,0,1)*clip(({b:.2f}-t)/0.5,0,1))")
    return '*'.join(terms) or '1'

if __name__ == '__main__':
    plan_f, clips, out = sys.argv[1:4]
    SCORE = sys.argv[4] if len(sys.argv) > 4 else os.path.join(os.path.dirname(__file__), '..', 'out', 'film_score.wav')
    plan = json.load(open(plan_f))
    first = clarity(plan, clips, '1', out)
    final = clarity(plan, clips, dips(plan, first), out)
    print('clarity dB:', ' '.join(f"{i:02d}:{s:.1f}" for i, s in final.items()), '| min', f"{min(final.values()):.1f}")
