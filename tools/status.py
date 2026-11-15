#!/usr/bin/env python3
"""Writes status.json: what each board's automation is doing, for the dot on each card.

    python3 tools/status.py           # run by build.py --bump, and daily by .github/workflows/status.yml

For every card in tools/boards.json it reads, from GitHub:
  - the workflows that run on their own (a schedule, or issues/comments), and their schedule
  - the latest run of each and whether it worked
  - the kill switches: automation.json here (master) and in the board's repo
  - when the repo last changed, its version, and who made the recent changes (you, AI, script)

Plain-English wording for each workflow comes from "automation" in boards.json.
Uses GITHUB_TOKEN if set (the daily workflow has one); works without, within GitHub's
60-requests-an-hour limit for anonymous callers. Standard library only.
"""
import datetime, json, os, pathlib, re, sys, urllib.error, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OWNER = "stuartokin"
API = "https://api.github.com"
RAW = "https://raw.githubusercontent.com"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")

# Who made a change. Order matters: the first rule that matches wins.
# "agent": an AI agent that runs on its own. "assistant": Claude, working in a session you started.
AGENT_AUTHORS = {"horizonq-agent", "research-gap-publisher", "research-gap-ui-agent", "claude[bot]"}
AGENT_MESSAGE = re.compile(r"agent-merged|ai-enhanced|ai-maintained|^data revision|^(steward|queue|scout|sourcer|verifier|reviewer|newsroom):"
                           r"|co-authored-by: horizonq-agent", re.I | re.M)
ASSISTANT = re.compile(r"co-authored-by: claude|claude-session:|generated with \[?claude code", re.I)
SCRIPT_AUTHORS = {"data-pack-bot", "app-build", "github-actions[bot]", "github-actions", "dependabot[bot]", "web-flow-bot"}


def get(url, raw=False):
    req = urllib.request.Request(url, headers={"User-Agent": "horizonq-status", "Accept": "application/vnd.github+json"})
    if TOKEN and url.startswith(API):
        req.add_header("Authorization", f"Bearer {TOKEN}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode("utf-8", "replace")
            return body if raw else json.loads(body)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None


def raw_file(repo, path, ref="HEAD"):
    return get(f"{RAW}/{OWNER}/{repo}/{ref}/{path}", raw=True)


def paused_flag(text):
    """True / False from an automation.json, None if there isn't one."""
    if text is None:
        return None
    try:
        return bool(json.loads(text).get("paused", False))
    except (json.JSONDecodeError, AttributeError):
        return None


# ---------- Schedules in plain English ----------
DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]


def expand(field, lo, hi):
    if field == "*":
        return None
    out = []
    for part in field.split(","):
        step = 1
        if "/" in part:
            part, s = part.split("/"); step = int(s)
        if part == "*":
            a, b = lo, hi
        elif "-" in part:
            a, b = map(int, part.split("-"))
        else:
            a = b = int(part)
        out += list(range(a, b + 1, step))
    return out


def and_list(xs):
    xs = list(xs)
    return xs[0] if len(xs) == 1 else ", ".join(xs[:-1]) + " and " + xs[-1]


def month_range(ms):
    if len(ms) > 2 and ms == list(range(ms[0], ms[-1] + 1)):
        return f"from {MONTHS[ms[0]]} to {MONTHS[ms[-1]]}"
    return "in " + and_list(MONTHS[m] for m in ms)


def ordinal(n):
    return f"{n}{'th' if 11 <= n % 100 <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def cron_text(cron):
    try:
        m, h, dom, mon, dow = cron.split()
        t = f"{int(h):02d}:{int(m):02d} UTC"
        days, mons = expand(dom, 1, 31), expand(mon, 1, 12)
        wdays = expand(dow, 0, 6)
        if wdays is not None:
            wdays = sorted({d % 7 for d in wdays})
            s = "every day" if len(wdays) == 7 else "every " + and_list(DAYS[d] for d in wdays)
            if wdays == [1, 2, 3, 4, 5]:
                s = "every weekday"
            return f"{s}{' ' + month_range(mons) if mons else ''} at {t}"
        if days is None:
            return f"every day{' ' + month_range(mons) if mons else ''} at {t}"
        if mons is None:
            return f"on the {and_list(ordinal(d) for d in days)} of every month at {t}"
        return "on " + and_list(f"{d} {MONTHS[mo]}" for mo in mons for d in days) + f" at {t}"
    except (ValueError, IndexError):
        return f"on the schedule “{cron}”"


def triggers(text):
    """The automatic triggers in a workflow file: its crons (with any 'safety net' note) and events."""
    on = re.search(r"^on:\s*\n((?:[ \t]+.*\n|\s*\n)*)", text, re.M)
    block = on.group(1) if on else ""
    crons = []
    for line in block.splitlines():
        mm = re.search(r"cron:\s*['\"]([^'\"]+)['\"]\s*(#.*)?", line)
        if mm:
            crons.append((mm.group(1), "safety" in (mm.group(2) or "").lower()))
    events = set(re.findall(r"^  ([a-z_]+):", block, re.M))
    return crons, events


def schedule_text(crons, events):
    parts = []
    main = [c for c, backup in crons if not backup]
    backup = [c for c, b in crons if b]
    for c in main:
        parts.append(cron_text(c))
    s = "; ".join(parts)
    if s:
        s = s[0].upper() + s[1:]
    if backup:
        s += " (with a back-up slot later the same day, in case GitHub drops the first)"
    if events & {"issues", "issue_comment"}:
        s = (s + ". Also runs" if s else "Runs") + " when an issue is opened or commented on"
    return s


# ---------- Runs ----------
def run_outcome(repo, run):
    if run["status"] != "completed":
        return "running"
    if run["conclusion"] in ("failure", "timed_out", "startup_failure"):
        return "failed"
    if run["conclusion"] == "cancelled":
        return "cancelled"
    jobs = (get(f"{API}/repos/{OWNER}/{repo}/actions/runs/{run['id']}/jobs?per_page=50") or {}).get("jobs", [])
    work = [j for j in jobs if j["name"] not in ("switch", "check")]
    if work and all(j["conclusion"] == "skipped" for j in work):
        return "skipped"
    return "worked"


def by_whom(c):
    author = ((c.get("author") or {}).get("login") or c["commit"]["author"]["name"] or "").lower()
    name = (c["commit"]["author"]["name"] or "").lower()
    msg = c["commit"]["message"]
    if author in AGENT_AUTHORS or name in AGENT_AUTHORS or AGENT_MESSAGE.search(msg):
        return "agent"
    if name == "claude" or ASSISTANT.search(msg):
        return "assistant"
    if author in SCRIPT_AUTHORS or name in SCRIPT_AUTHORS or author.endswith("[bot]") or name.endswith("-bot"):
        return "script"
    return "you"


def version_of(repo, branch):
    v = raw_file(repo, "version.json", branch)
    if v:
        try:
            j = json.loads(v)
            if j.get("version"):
                return str(j["version"])
        except json.JSONDecodeError:
            pass
    v = raw_file(repo, "VERSION", branch) or raw_file(repo, "tools/VERSION", branch)
    if v and len(v.strip()) < 40:
        return v.strip()
    pj = raw_file(repo, "package.json", branch)
    if pj:
        try:
            pv = json.loads(pj).get("version")
            if pv and pv not in ("0.0.0", "0.1.0", "1.0.0"):
                return pv
        except json.JSONDecodeError:
            pass
    ch = raw_file(repo, "CHANGELOG.md", branch)
    if ch:
        mm = re.search(r"^##\s*\[?v?(\d+\.\d+(?:\.\d+)?)", ch, re.M)
        if mm:
            return mm.group(1)
    page = raw_file(repo, "index.html", branch) or ""
    mm = re.search(r"APP_VERSION\s*=\s*['\"]([\d.]+)['\"]", page)
    tags = [x["name"] for x in (get(f"{API}/repos/{OWNER}/{repo}/tags?per_page=100") or [])]
    data_revs = sorted(int(x[6:]) for x in tags if re.fullmatch(r"data-r\d+", x))
    rev = f"data revision {data_revs[-1]}" if data_revs else None
    if mm:
        return mm.group(1) + (f" · {rev}" if rev else "")
    if rev:
        return rev
    return None


def repo_status(board, master_paused):
    repo = board["repo"]
    info = get(f"{API}/repos/{OWNER}/{repo}")
    if not info:
        return None
    branch = info.get("default_branch", "main")
    out = {"repo": repo, "url": info.get("html_url")}

    commits = get(f"{API}/repos/{OWNER}/{repo}/commits?sha={branch}&per_page=30") or []
    if commits:
        last = commits[0]
        out["updated"] = last["commit"]["committer"]["date"]
        out["lastBy"] = by_whom(last)
        out["lastMessage"] = last["commit"]["message"].splitlines()[0][:120]
        counts = {"you": 0, "assistant": 0, "agent": 0, "script": 0}
        for c in commits:
            counts[by_whom(c)] += 1
        out["recent"] = dict(counts, of=len(commits))
    out["version"] = version_of(repo, branch)

    local = paused_flag(raw_file(repo, "automation.json", branch))
    out["switch"] = {"local": local, "master": master_paused}

    described = {a["workflow"]: a for a in board.get("automation", [])}
    files = get(f"{API}/repos/{OWNER}/{repo}/contents/.github/workflows?ref={branch}") or []
    runs = (get(f"{API}/repos/{OWNER}/{repo}/actions/runs?per_page=60") or {}).get("workflow_runs", [])
    jobs = []
    for f in files if isinstance(files, list) else []:
        if not f["name"].endswith((".yml", ".yaml")):
            continue
        text = raw_file(repo, f".github/workflows/{f['name']}", branch) or ""
        crons, events = triggers(text)
        if not crons and not (events & {"issues", "issue_comment"}):
            continue   # only runs when you push or press the button: not automation
        d = described.get(f["name"], {})
        name = re.search(r"^name:\s*(.+)$", text, re.M)
        job = {"file": f["name"], "name": (name.group(1).strip().strip("'\"") if name else f["name"]),
               "what": d.get("what"), "ai": bool(d.get("ai", re.search(r"anthropic|claude", text, re.I))),
               "when": schedule_text(crons, events)}
        mine = [r for r in runs if r.get("path", "").endswith(f["name"])]
        if not mine:
            wid = f["name"]
            mine = (get(f"{API}/repos/{OWNER}/{repo}/actions/workflows/{wid}/runs?per_page=5") or {}).get("workflow_runs", [])
        if mine:
            r = mine[0]
            job["lastRun"] = {"date": r["run_started_at"] or r["created_at"], "outcome": run_outcome(repo, r),
                              "event": r["event"], "url": r["html_url"]}
            worked = next((x for x in mine[:6] if x["status"] == "completed" and x["conclusion"] == "success"
                           and run_outcome(repo, x) == "worked"), None) if job["lastRun"]["outcome"] != "worked" else r
            if worked:
                job["lastWorked"] = worked["run_started_at"] or worked["created_at"]
        jobs.append(job)
    out["jobs"] = jobs

    if not jobs:
        out["state"] = "none"
    elif master_paused or local:
        out["state"] = "paused"
    elif any(j.get("lastRun", {}).get("outcome") == "failed" for j in jobs):
        out["state"] = "failed"
    else:
        out["state"] = "on"
    return out


def main():
    data = json.loads((ROOT / "tools" / "boards.json").read_text(encoding="utf-8"))
    master_file = ROOT / "automation.json"
    master = paused_flag(master_file.read_text(encoding="utf-8")) if master_file.exists() else None
    status = {"generated": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat(),
              "master": {"paused": bool(master)}, "boards": {}}
    failed = []
    for b in data["boards"]:
        s = repo_status(b, bool(master))
        if s is None:
            failed.append(b["repo"]); continue
        status["boards"][b["repo"]] = s
    if failed and len(failed) == len(data["boards"]):
        print("status.json not written: could not reach GitHub.")
        sys.exit(1)
    out = ROOT / "status.json"
    old = out.read_text(encoding="utf-8") if out.exists() else ""
    if old and failed:   # keep the last known state for any board GitHub didn't answer for
        prev = json.loads(old).get("boards", {})
        for r in failed:
            if r in prev:
                status["boards"][r] = prev[r]
    out.write_text(json.dumps(status, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = ", ".join(f"{r}: {s['state']}" for r, s in status["boards"].items())
    print(f"status.json written — {summary}" + (f" (no answer for {', '.join(failed)})" if failed else ""))


if __name__ == "__main__":
    main()
