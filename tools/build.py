#!/usr/bin/env python3
"""Builds index.html for HorizonQ Observatories.

    python3 tools/build.py            # uses the version in tools/VERSION
    python3 tools/build.py --bump     # moves the version on one step first (…-13g → …-13h, or today + 'a')

Inputs   tools/page.html   the page around the cards (header, toolbar, carousel, footer, player)
         tools/boards.json the cards themselves (one entry per board) and the section headings
         tools/VERSION     the version stamp shown in the ⓘ panel and used to bust browser caches
Output   index.html        at the repo root — the file GitHub Pages serves

css/ and js/ are not generated: edit them directly.
Standard library only, so it runs anywhere Python 3.8+ does.
"""
import datetime, html, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"

TAG = {"live": '<span class="tag--live">Live</span>',
       "studies": '<span class="tag">Study</span>',
       "fun": '<span class="tag--fun">For fun</span>'}
SEC_SHORT = {"live": "Live", "studies": "Study", "fun": "For fun"}
LI_ICON = ('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.6 14H.9V5.3h2.7V14ZM2.2 4.1a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Z'
           'M15 14h-2.7V9.8c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V14H6.6V5.3h2.6v1.2h.03c.36-.68 1.24-1.4 2.56-1.4 2.74 0 3.24 1.8 3.24 4.15V14Z"/></svg>')
INFO = ('<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/>'
        '<circle cx="8" cy="4.6" r="1" fill="currentColor"/><path d="M8 7v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>')
PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>'


def bump(v):
    today = datetime.date.today().isoformat()
    if v.startswith(today) and len(v) == len(today) + 1 and v[-1].isalpha() and v[-1] != "z":
        return v[:-1] + chr(ord(v[-1]) + 1)
    return today + "a"


def card(b, boards, base):
    e = html.escape
    vids = json.dumps([[v["label"], f"media/{v['media']}.mp4"] for v in b["videos"]])
    alone = sum(1 for x in boards if x["sec"] == b["sec"]) == 1
    cls = "card" + (" card--lead" if b.get("lead") else "") + (" card--wide" if alone else "")
    about = f' data-about="{e(b["about"])}"' if b.get("about") else ""
    note = f'\n            <span class="note">{e(b["note"])}</span>' if b.get("note") else ""
    agents = " data-agents" if b["sec"] == "live" and not b.get("tag") else ""
    art = ""
    if b.get("article"):
        t, u = b["article"]["title"], b["article"]["url"]
        art = (f'          <a class="article" href="{e(u)}" target="_blank" rel="noopener" '
               f'title="Read my LinkedIn article: {e(t)}" aria-label="Read the LinkedIn article: {e(t)}">{LI_ICON}<span>Article</span></a>\n')
    tag = TAG[b["sec"]].replace(">Live<", ">" + b["tag"] + "<") if b.get("tag") else TAG[b["sec"]]
    href = b.get("url") or f"{base}{b['repo']}/"
    return f'''        <article class="{cls}" data-repo="{b['repo']}" data-section="{SEC_SHORT[b['sec']]}"{agents}>
          <button class="media" type="button" data-title="{e(b['title'])}" data-videos='{e(vids)}'{about} aria-label="Watch the {e(b['title'])} demo">
            <img src="media/{b['media']}.jpg" alt="" loading="lazy" width="1280" height="720" />
            <video muted loop playsinline preload="none" data-src="media/{b['media']}-preview.mp4"></video>
            <span class="watch">{PLAY}<span class="wl">Watch demo</span></span>
          </button>
{art}          <a class="body" href="{e(href)}">
            <span class="meta">{tag} <span>{e(b['topic'])}</span></span>
            <span class="upd" data-fallback="{b['fallback']}"></span>
            <h3>{e(b['title'])}</h3>
            <span class="desc">{e(b['desc'])}</span>{note}
            <span class="go">{b.get('go', 'Open')} ↗</span>
          </a>
        </article>'''


def check(data):
    """Catch the mistakes that are easy to make by hand, before they reach the live site."""
    problems = []
    keys = {s["key"] for s in data["sections"]}
    for b in data["boards"]:
        name = b.get("title", b.get("repo", "?"))
        for f in ("sec", "repo", "title", "media", "topic", "fallback", "videos", "desc"):
            if f not in b:
                problems.append(f"{name}: missing '{f}'")
        if b.get("sec") not in keys:
            problems.append(f"{name}: section '{b.get('sec')}' is not one of {sorted(keys)}")
        media = ROOT / "media"
        if media.exists():
            for need in [f"{b.get('media')}.jpg", f"{b.get('media')}-preview.mp4"] + [f"{v['media']}.mp4" for v in b.get("videos", [])]:
                if not (media / need).exists():
                    problems.append(f"{name}: media/{need} not found")
        try:
            datetime.date.fromisoformat(b.get("fallback", ""))
        except ValueError:
            problems.append(f"{name}: fallback must be a date like 2026-11-13")
    return problems


def main():
    data = json.loads((TOOLS / "boards.json").read_text(encoding="utf-8"))
    vfile = TOOLS / "VERSION"
    ver = vfile.read_text().strip()
    if "--bump" in sys.argv:
        ver = bump(ver)
        vfile.write_text(ver + "\n")
    problems = check(data)
    if problems:
        print("Not built — fix these first:\n  " + "\n  ".join(problems))
        sys.exit(1)
    boards, base = data["boards"], data.get("base", "https://stuartokin.github.io/")
    sections = []
    for s in data["sections"]:
        cards = "\n".join(card(b, boards, base) for b in boards if b["sec"] == s["key"])
        if not cards:
            continue
        sections.append(f'''      <section class="group" data-group="{s['key']}">
        <h2>{s['label']}<button type="button" class="infobtn infobtn--sec" aria-expanded="false" aria-controls="note-{s['key']}" title="About this section" aria-label="About {s['label']}">{INFO}</button></h2>
        <p class="section-note" id="note-{s['key']}">{s['note']}</p>
        <div class="grid">
{cards}
        </div>
      </section>''')
    tpl = (TOOLS / "page.html").read_text(encoding="utf-8")
    out = (tpl.replace("<!--SECTIONS-->", "\n\n".join(sections))
              .replace("<!--COUNT-->", str(len(boards)))
              .replace("__VER__", ver))
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html written — {len(boards)} boards, version {ver}")


if __name__ == "__main__":
    main()
