"""Turn a full voiceover recording into one clip per scene, with measured word timings.

    python3 voice.py --model ggml-base.en.bin take1.mp3 [take2.mp3 ...] [--use outcomes=2]
    python3 voice.py --model ggml-base.en.bin --only assign assign-take.mp3
    python3 voice.py --lang ja take.mp3

Each take is the whole script read in order, one paragraph per scene (script.json, or script.ja.json). By default every
scene comes from take 1; --use picks another take for a scene (1-based). With --only, the take holds
just that scene's line and only that scene is replaced. Writes public/vo/<scene>.wav,
public/vo/durations.json, and public/vo/cues.json (when each word starts, so on-screen moments land on
the spoken words). Needs whisper-cli (whisper.cpp) and numpy; uses Remotion's bundled ffmpeg.
"""

import argparse
import difflib
import json
import os
import re
import subprocess
import sys
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FFDIR = os.path.join(HERE, "node_modules", "@remotion", "compositor-darwin-arm64")
OUT = os.path.join(HERE, "public", "vo")
SCRIPT = json.load(open(os.path.join(HERE, "script.json")))

# Every clip is levelled to the same speech loudness (takes generated separately can differ),
# then a soft ceiling keeps the loudest peaks below full scale.
TARGET_DB = -18.0
KNEE, CEILING = 0.82, 0.94


def ffmpeg(*args):
    env = {**os.environ, "DYLD_LIBRARY_PATH": FFDIR}
    subprocess.run([os.path.join(FFDIR, "ffmpeg"), "-v", "error", "-y", *args], check=True, env=env)


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))


def script_words(only=None):
    """Every word of the script: (scene id, character index in its line, normalised word)."""
    out = []
    for sc in SCRIPT:
        if only and sc["id"] != only:
            continue
        for m in re.finditer(r"\S+", sc["text"]):
            off = 0
            for part in m.group(0).split("-"):
                if norm(part):
                    out.append((sc["id"], m.start() + off, norm(part)))
                off += len(part) + 1
    return out


def heard_words(whisper_json):
    out = []
    for seg in json.load(open(whisper_json))["transcription"]:
        for part in re.split(r"[\s-]+", seg["text"].strip()):
            if norm(part):
                out.append((norm(part), seg["offsets"]["from"] / 1000, seg["offsets"]["to"] / 1000))
    return out


def word_times(sw, aw):
    """Start and end of each script word in the recording, from a word-level alignment."""
    sm = difflib.SequenceMatcher(None, [w[2] for w in sw], [w[0] for w in aw], autojunk=False)
    t = [None] * len(sw)
    e = [None] * len(sw)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            t[blk.a + k], e[blk.a + k] = aw[blk.b + k][1], aw[blk.b + k][2]
    # Words heard differently ("52" for "fifty-two") share the span of what was heard.
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op in ("replace", "delete") and i2 > i1:
            a = aw[j1][1] if op == "replace" else (e[i1 - 1] if i1 else 0)
            b = aw[j2 - 1][2] if op == "replace" else (t[i2] if i2 < len(sw) and t[i2] is not None else a + 0.3)
            for k in range(i1, i2):
                t[k] = a + (b - a) * (k - i1) / (i2 - i1)
                e[k] = a + (b - a) * (k - i1 + 1) / (i2 - i1)
    matched = sum(b.size for b in sm.get_matching_blocks())
    return t, e, matched / len(sw)


def read_wav(path):
    w = wave.open(path)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x, w.getframerate()


# ---------- Japanese: no speech recogniser, so pauses are matched to the text ----------


def morae(ch):
    """Rough speaking length of one character, in morae."""
    if ch in "、。？！：「」（）・": return 0.0
    if ch in "ゃゅょャュョぁぃぅぇぉァィゥェォ": return 0.4
    if "\u3040" <= ch <= "\u30ff": return 1.0
    if "\u4e00" <= ch <= "\u9fff": return 1.7
    if ch.isdigit(): return 2.0
    return 1.0


def pauses(env, quiet, lo, hi, min_len):
    runs, cur = [], None
    for k in range(int(lo * 100), min(len(env), int(hi * 100))):
        if env[k] <= quiet:
            cur = (cur[0], k) if cur else (k, k)
        elif cur:
            runs.append(cur)
            cur = None
    if cur:
        runs.append(cur)
    return [(a / 100, b / 100) for a, b in runs if (b - a) / 100 >= min_len]


def japanese(take):
    tmp = tempfile.mkdtemp()
    hi = os.path.join(tmp, "take.wav")
    ffmpeg("-i", take, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", hi)
    x, sr = read_wav(hi)
    hop = sr // 100
    env = np.sqrt(np.convolve(x**2, np.ones(hop) / hop, mode="same"))[::hop]
    quiet = env.max() * 0.025
    total = len(x) / sr
    start = 0.0
    while env[int(start * 100)] <= quiet:
        start += 0.01
    end = total - 0.01
    while env[int(end * 100)] <= quiet:
        end -= 0.01
    weights = [sum(morae(c) for c in sc["text"]) for sc in SCRIPT]
    cands = pauses(env, quiet, start, end, 0.2)
    n = len(SCRIPT)
    # Pick n-1 pauses so every paragraph runs at about the same pace.
    pts = [start] + [(a + b) / 2 for a, b in cands] + [end]
    lens = [0] + [b - a for a, b in cands] + [0]
    rate = (end - start) / sum(weights)
    INF = 1e18
    best = [[INF] * len(pts) for _ in range(n + 1)]
    back = [[-1] * len(pts) for _ in range(n + 1)]
    best[0][0] = 0
    for k in range(1, n + 1):
        for j in range(1, len(pts)):
            if k == n and j != len(pts) - 1:
                continue
            for i in range(j):
                if best[k - 1][i] == INF:
                    continue
                d = pts[j] - pts[i]
                cost = best[k - 1][i] + (np.log(d / (rate * weights[k - 1]))) ** 2 * 10 - lens[j] * 2
                if cost < best[k][j]:
                    best[k][j] = cost
                    back[k][j] = i
    if best[n][len(pts) - 1] == INF:
        sys.exit(f"Found only {len(cands)} pauses for {n} paragraphs: is this the whole script in one take?")
    cuts, j = [], len(pts) - 1
    for k in range(n, 0, -1):
        cuts.append(j)
        j = back[k][j]
    cuts = [0] + cuts[::-1]

    durs, cues = {}, {}
    for k, sc in enumerate(SCRIPT):
        a_idx, b_idx = cuts[k], cuts[k + 1]
        seg0 = start if a_idx == 0 else cands[a_idx - 1][1]
        seg1 = end if b_idx == len(pts) - 1 else cands[b_idx - 1][0]
        clip_start, clip_end = max(0.0, seg0 - 0.1), seg1 + 0.22
        clip = x[int(clip_start * sr) : int(clip_end * sr)].copy()
        speech = clip[np.abs(clip) > 0.01]
        clip *= 10 ** ((TARGET_DB - 20 * np.log10(np.sqrt(np.mean(speech**2)))) / 20)
        over = np.abs(clip) > KNEE
        clip[over] = np.sign(clip[over]) * (KNEE + (CEILING - KNEE) * np.tanh((np.abs(clip[over]) - KNEE) / (CEILING - KNEE)))
        fd = int(0.012 * sr)
        clip[:fd] *= np.linspace(0, 1, fd)
        clip[-fd:] *= np.linspace(1, 0, fd)
        with wave.open(os.path.join(OUT, f"{sc['id']}.wav"), "w") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes((clip * 32767).astype(np.int16).tobytes())
        durs[sc["id"]] = round(len(clip) / sr, 3)
        # Anchor each sentence and comma to the pause nearest where the text says it should be.
        text = sc["text"]
        cum = np.cumsum([0] + [morae(c) for c in text])
        inner = pauses(env, quiet, seg0, seg1, 0.12)
        anchors = [(0, seg0)]
        for i, c in enumerate(text):
            if c in "、。？" and i + 1 < len(text):
                est = seg0 + (seg1 - seg0) * cum[i + 1] / cum[-1]
                near = [p for p in inner if abs((p[0] + p[1]) / 2 - est) < 0.7 and p[1] > anchors[-1][1]]
                if near:
                    p = min(near, key=lambda p: abs((p[0] + p[1]) / 2 - est))
                    anchors.append((i + 1, p[1]))
        anchors.append((len(text), seg1))
        out = []
        for i in range(len(text)):
            for (ci, ti), (cj, tj) in zip(anchors, anchors[1:]):
                if ci <= i <= cj:
                    span = cum[cj] - cum[ci]
                    t = ti + (tj - ti) * ((cum[i] - cum[ci]) / span if span else 0)
                    out.append([i, round(t - clip_start, 3)])
                    break
        cues[sc["id"]] = out
        print(f"{sc['id']:9s} {seg0:6.2f}-{seg1:6.2f}  {durs[sc['id']]:5.2f}s  pace {(seg1 - seg0) / (rate * weights[k]):.2f}  anchors {len(anchors) - 2}")
    json.dump(durs, open(os.path.join(OUT, "durations.json"), "w"), indent=1)
    json.dump(cues, open(os.path.join(OUT, "cues.json"), "w"))
    print(f"voice total {sum(durs.values()):.1f}s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("takes", nargs="+")
    ap.add_argument("--model", help="whisper.cpp model, e.g. ggml-base.en.bin (English only)")
    ap.add_argument("--use", action="append", default=[], help="scene=take, e.g. outcomes=2")
    ap.add_argument("--only", help="the takes hold just this scene's line; replace only that scene")
    ap.add_argument("--lang", default="en")
    a = ap.parse_args()
    if a.lang == "ja":
        global OUT, SCRIPT
        OUT = os.path.join(HERE, "public", "vo-ja")
        SCRIPT = json.load(open(os.path.join(HERE, "script.ja.json")))
        os.makedirs(OUT, exist_ok=True)
        return japanese(a.takes[0])
    if a.only and a.only not in {sc["id"] for sc in SCRIPT}:
        ap.error(f"no scene called {a.only}")
    choice = {sc["id"]: 0 for sc in SCRIPT}
    for u in a.use:
        sid, n = u.split("=")
        choice[sid] = int(n) - 1

    sw = script_words(a.only)
    tmp = tempfile.mkdtemp()
    takes = []
    for i, path in enumerate(a.takes):
        low = os.path.join(tmp, f"t{i}-16k.wav")
        hi = os.path.join(tmp, f"t{i}-44k.wav")
        ffmpeg("-i", path, "-ar", "16000", "-ac", "1", low)
        ffmpeg("-i", path, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", hi)
        subprocess.run(["whisper-cli", "-m", a.model, "-f", low, "-ml", "1", "-sow", "-oj", "-of", os.path.join(tmp, f"t{i}"), "-np"], check=True, capture_output=True)
        t, e, acc = word_times(sw, heard_words(os.path.join(tmp, f"t{i}.json")))
        x, sr = read_wav(hi)
        print(f"take {i + 1}: {len(x) / sr:.1f}s, {acc:.1%} of script words heard as written")
        takes.append((t, e, x, sr))

    durs, cues = {}, {}
    if a.only:
        durs = json.load(open(os.path.join(OUT, "durations.json")))
        cues = json.load(open(os.path.join(OUT, "cues.json")))
    for sc in SCRIPT:
        if a.only and sc["id"] != a.only:
            continue
        t, e, x, sr = takes[choice[sc["id"]]]
        idx = [i for i, w in enumerate(sw) if w[0] == sc["id"]]
        first, last = idx[0], idx[-1]
        # 10 ms loudness; the break between paragraphs is the longest quiet run near each boundary.
        hop = sr // 100
        env = np.sqrt(np.convolve(x**2, np.ones(hop) / hop, mode="same"))[::hop]
        quiet = env.max() * 0.025

        def pause(center, span=0.9):
            lo, hi = int(max(0, center - span) * 100), int(min(len(env) - 1, (center + span) * 100))
            runs, cur = [], None
            for k in range(lo, hi):
                if env[k] <= quiet:
                    cur = (cur[0], k) if cur else (k, k)
                elif cur:
                    runs.append(cur)
                    cur = None
            if cur:
                runs.append(cur)
            if not runs:
                return center, center
            r = max(runs, key=lambda r: r[1] - r[0])
            return r[0] / 100, r[1] / 100

        if first:
            speech0 = pause((e[first - 1] + t[first]) / 2)[1]
        else:
            speech0 = 0.0
            while env[int(speech0 * 100)] <= quiet:
                speech0 += 0.01
        if last + 1 < len(sw):
            speech1 = pause((e[last] + t[last + 1]) / 2)[0]
        else:
            speech1 = len(env) / 100 - 0.01
            while env[int(speech1 * 100)] <= quiet:
                speech1 -= 0.01
        start = max(0.0, speech0 - 0.1)
        end = speech1 + 0.22

        clip = x[int(start * sr) : int(end * sr)].copy()
        speech = clip[np.abs(clip) > 0.01]
        clip *= 10 ** ((TARGET_DB - 20 * np.log10(np.sqrt(np.mean(speech**2)))) / 20)
        over = np.abs(clip) > KNEE
        clip[over] = np.sign(clip[over]) * (KNEE + (CEILING - KNEE) * np.tanh((np.abs(clip[over]) - KNEE) / (CEILING - KNEE)))
        f = int(0.012 * sr)
        clip[:f] *= np.linspace(0, 1, f)
        clip[-f:] *= np.linspace(1, 0, f)
        with wave.open(os.path.join(OUT, f"{sc['id']}.wav"), "w") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes((clip * 32767).astype(np.int16).tobytes())
        durs[sc["id"]] = round(len(clip) / sr, 3)
        cues[sc["id"]] = [[sw[i][1], round(t[i] - start, 3)] for i in idx]
        print(f"{sc['id']:9s} take {choice[sc['id']] + 1}  {durs[sc['id']]:5.2f}s  speech {speech0:.2f}-{speech1:.2f} of {len(x) / sr:.2f}s")
    json.dump(durs, open(os.path.join(OUT, "durations.json"), "w"), indent=1)
    json.dump(cues, open(os.path.join(OUT, "cues.json"), "w"))
    print(f"voice total {sum(durs.values()):.1f}s")


if __name__ == "__main__":
    main()
