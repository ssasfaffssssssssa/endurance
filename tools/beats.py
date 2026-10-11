#!/usr/bin/env python3
"""Find the accents in a music file and snap the promo's cut points onto them.

    python3 tools/beats.py music.m4a [--offset 0] [--write]

Prints onset times with strengths, the estimated tempo, and a proposed cut list
(each default segment boundary moved to the strongest nearby accent).
--write saves js/promo-cuts.json, which js/promo.js picks up on the next render.
"""
import json, subprocess, sys, os
import numpy as np

SR = 22050

def load(path, offset=0.0):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(offset), '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32)

def onsets(x):
    n, hop = 2048, 512
    win = np.hanning(n).astype(np.float32)
    frames = 1 + (len(x) - n) // hop
    S = np.abs(np.fft.rfft(np.stack([x[i * hop:i * hop + n] * win for i in range(frames)]), axis=1))
    S = np.log1p(100 * S)
    flux = np.maximum(0, np.diff(S, axis=0)).sum(axis=1)
    low = np.maximum(0, np.diff(S[:, :40], axis=0)).sum(axis=1)          # < ~430 Hz: drums, organ pedal
    env = flux / (flux.max() + 1e-9) + .8 * low / (low.max() + 1e-9)
    t = (np.arange(len(env)) + 1) * hop / SR
    # adaptive threshold + peak picking
    k = 16
    med = np.array([np.median(env[max(0, i - k):i + k]) for i in range(len(env))])
    peaks = [i for i in range(1, len(env) - 1) if env[i] > env[i - 1] and env[i] >= env[i + 1] and env[i] > med[i] + .12]
    rms = np.array([np.sqrt(np.mean(x[i * hop:i * hop + n] ** 2)) for i in range(frames)])
    return t, env, peaks, rms

def tempo(env, hop_t):
    e = env - env.mean()
    ac = np.correlate(e, e, 'full')[len(e) - 1:]
    lo, hi = int(60 / 180 / hop_t), int(60 / 60 / hop_t)
    lag = lo + int(np.argmax(ac[lo:hi]))
    return 60 / (lag * hop_t)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    off = float(sys.argv[sys.argv.index('--offset') + 1]) if '--offset' in sys.argv else 0.0
    x = load(args[0], off)
    t, env, peaks, rms = onsets(x)
    bpm = tempo(env, t[1] - t[0])
    strong = sorted(peaks, key=lambda i: -env[i])
    print(f'duration {len(x) / SR:.2f}s  tempo ≈ {bpm:.1f} BPM')
    print('strongest accents:', ', '.join(f'{t[i]:.2f}' for i in sorted(strong[:40])))
    # loudness curve, 1 s buckets
    hop_t = t[1] - t[0]
    per = int(1 / hop_t)
    curve = [20 * np.log10(rms[i:i + per].mean() + 1e-6) for i in range(0, len(rms), per)]
    print('loudness dB/s:', ' '.join(f'{c:.0f}' for c in curve))
    # default boundaries from promo.js durations
    src = open(os.path.join(os.path.dirname(__file__), '..', 'js', 'promo.js')).read()
    import re
    ds = [float(m) for m in re.findall(r"\bd: ([\d.]+)", src.split('const SEGMENTS')[1].split('];')[0])]
    bounds = np.cumsum(ds)[:-1]
    cand = [(t[i], env[i]) for i in peaks]
    cuts, used = [], set()
    for b in bounds:
        near = [(abs(ct - b), -e, ct) for ct, e in cand if abs(ct - b) < .7 and ct not in used and (not cuts or ct > cuts[-1] + .25)]
        best = min(near, key=lambda z: z[0] * 1.2 + z[1] * .9)[2] if near else b
        used.add(best); cuts.append(round(float(best), 3))
    end = round(float(min(len(x) / SR, sum(ds) + 2)), 3)
    cuts.append(end)
    print('proposed cuts:', cuts)
    if '--write' in sys.argv:
        out = os.path.join(os.path.dirname(__file__), '..', 'js', 'promo-cuts.json')
        json.dump({'source': os.path.basename(args[0]), 'offset': off, 'cuts': cuts}, open(out, 'w'), indent=1)
        print('wrote', out)

if __name__ == '__main__':
    main()
