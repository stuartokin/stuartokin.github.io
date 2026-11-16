#!/usr/bin/env python3
"""Seal the hidden cards (\"hidden\": true in tools/boards.json) so only someone with the key can see them.

The page never contains a hidden card. Instead this writes sealed.json: the card's HTML, encrypted with
AES-256-GCM under a key derived from HUB_UNLOCK_KEY (PBKDF2-SHA256, 600,000 rounds, random salt).
js/unlock.js asks for the key (ⓘ panel, or a link ending #key=…), decrypts it in the browser and puts
the card back in its place before the rest of the page starts.

    HUB_UNLOCK_KEY=… python3 tools/seal.py            (what the seal workflow runs; the key is a GitHub secret)
    python3 tools/seal.py --key=test --out=tests/out/sealed-test.json   (the test rig, with a made-up key)

With no key, sealed.json says nothing is sealed and hidden cards simply stay hidden.
The file is only rewritten when its contents would change, so the workflow doesn't commit every run.
Needs: pip install cryptography
"""
import base64, json, os, sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))
import build  # noqa: E402  (card() renders exactly what the page would)

ITER = 600_000
arg = lambda k, d=None: next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith(f"--{k}=")), d)


def payload(data):
    """The hidden cards' HTML, each with where it goes: its section, and the visible card it follows."""
    boards, base = data["boards"], data.get("base", "https://horizonqltd.com/")
    out = []
    for i, b in enumerate(boards):
        if not b.get("hidden"):
            continue
        before = [x for x in boards[:i] if x["sec"] == b["sec"] and not x.get("hidden")]
        out.append({"repo": b["repo"], "sec": b["sec"], "after": before[-1]["repo"] if before else None,
                    "agents": b["sec"] == "live" and not b.get("tag"),
                    "html": build.card(b, boards, base)})  # no live status: keeps the sealed file stable day to day
    return {"cards": out}


def derive(key, salt):
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(key.encode("utf-8"))


def opened(path, key):
    """What an existing sealed file holds, if this key opens it (so an unchanged card isn't re-sealed)."""
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    try:
        s = json.loads(path.read_text(encoding="utf-8"))
        if not s.get("sealed"):
            return None
        b = lambda k: base64.b64decode(s[k])
        return json.loads(AESGCM(derive(key, b("salt"))).decrypt(b("iv"), b("data"), None))
    except Exception:
        return None


def main():
    data = json.loads((TOOLS / "boards.json").read_text(encoding="utf-8"))
    key = (arg("key") or os.environ.get("HUB_UNLOCK_KEY") or "").strip()
    out = Path(arg("out", str(ROOT / "sealed.json")))
    p = payload(data)
    if not p["cards"] or not key:
        doc = {"v": 1, "sealed": False}
        why = "no hidden cards" if not p["cards"] else "no key set (add the HUB_UNLOCK_KEY secret)"
        if not out.exists() or json.loads(out.read_text(encoding="utf-8")) != doc:
            out.write_text(json.dumps(doc) + "\n", encoding="utf-8")
        print(f"{out.name}: nothing sealed — {why}")
        return
    prev = opened(out, key) if out.exists() else None
    if prev == p:
        print(f"{out.name}: unchanged ({len(p['cards'])} hidden card(s))")
        return
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    # Same key as before: keep the salt, so devices already unlocked stay unlocked after a card edit.
    # A new key gets a new salt, and every device has to enter the new key.
    salt = base64.b64decode(json.loads(out.read_text(encoding="utf-8"))["salt"]) if prev is not None else os.urandom(16)
    iv = os.urandom(12)
    data_ct = AESGCM(derive(key, salt)).encrypt(iv, json.dumps(p, ensure_ascii=False).encode("utf-8"), None)
    e = lambda x: base64.b64encode(x).decode()
    out.write_text(json.dumps({"v": 1, "sealed": True, "kdf": "PBKDF2-SHA256", "iter": ITER,
                               "salt": e(salt), "iv": e(iv), "data": e(data_ct)}) + "\n", encoding="utf-8")
    print(f"{out.name}: sealed {len(p['cards'])} hidden card(s)")


if __name__ == "__main__":
    main()
