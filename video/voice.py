"""Turn a full voiceover recording into one clip per scene, with measured word timings.

    python3 voice.py --model ggml-base.en.bin take1.mp3 [take2.mp3 ...] [--use outcomes=2]

Each take is the whole script read in order, one paragraph per scene (script.json). By default every
scene comes from take 1; --use picks another take for a scene (1-based). Writes public/vo/<scene>.wav,
public/vo/durations.json, and public/vo/cues.json (when each word starts, so on-screen moments land on
the spoken words). Needs whisper-cli (whisper.cpp) and numpy; uses Remotion's bundled ffmpeg.
"""

import argparse
import difflib
import json
import os
import re
import subprocess
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "public", "vo")
FFDIR = os.path.join(HERE, "node_modules", "@remotion", "compositor-darwin-arm64")
SCRIPT = json.load(open(os.path.join(HERE, "script.json")))

# Even gain for every clip, then a soft ceiling so the loudest peaks stay below full scale.
GAIN = 1.26
KNEE, CEILING = 0.82, 0.94


def ffmpeg(*args):
    env = {**os.environ, "DYLD_LIBRARY_PATH": FFDIR}
    subprocess.run([os.path.join(FFDIR, "ffmpeg"), "-v", "error", "-y", *args], check=True, env=env)


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))


def script_words():
    """Every word of the script: (scene id, character index in its line, normalised word)."""
    out = []
    for sc in SCRIPT:
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("takes", nargs="+")
    ap.add_argument("--model", required=True, help="whisper.cpp model, e.g. ggml-base.en.bin")
    ap.add_argument("--use", action="append", default=[], help="scene=take, e.g. outcomes=2")
    a = ap.parse_args()
    choice = {sc["id"]: 0 for sc in SCRIPT}
    for u in a.use:
        sid, n = u.split("=")
        choice[sid] = int(n) - 1

    sw = script_words()
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
    for sc in SCRIPT:
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

        clip = x[int(start * sr) : int(end * sr)].copy() * GAIN
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
        print(f"{sc['id']:9s} take {choice[sc['id']] + 1}  {durs[sc['id']]:5.2f}s")
    json.dump(durs, open(os.path.join(OUT, "durations.json"), "w"), indent=1)
    json.dump(cues, open(os.path.join(OUT, "cues.json"), "w"))
    print(f"voice total {sum(durs.values()):.1f}s")


if __name__ == "__main__":
    main()
