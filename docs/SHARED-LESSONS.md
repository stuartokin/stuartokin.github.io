# Shared lessons (all repos)

Lessons that apply beyond one app. Each repo keeps its own `LESSONS` too; add here only what
another repo would benefit from. Newest at the bottom. Say which repo it came from.

1. **GitHub runs scheduled workflows only from `main`,** and may delay or drop runs at the top
   of the hour. Use an off-the-hour minute (e.g. `17 5 * * 1`), and a back-up slot that skips
   itself if the day's run already happened. (ResearchGap)
2. **A run that ends in seconds is not necessarily switched off.** Look at which jobs ran or
   were skipped before concluding anything. (hub, 2026-11-15)
3. **Every automatic workflow starts with the kill-switch job.** `automation.json` in the repo,
   master in stuartokin.github.io. (hub, 2026-11-15)
4. **Anyone can open an issue on a public repo.** A workflow triggered by issues or comments
   that spends API credit or changes the repo must check the sender is the owner.
   (quantum-observatory, 2026-11-15)
5. **Real fingers wobble.** On touch screens a tap that moves 5–10 px can be read as a drag or
   cancel the click. Test taps with a wobble; act on `pointerup` for important buttons. (hub)
6. **Web uploads can't delete files and lose who-wrote-what.** Push from the session instead;
   the commit history then shows Stuart vs Claude vs agents. (hub, 2026-11-15)
7. **Write for the public.** Panels and help text are read by visitors: "Stuart", not "you";
   no employer or job title anywhere. (hub, 2026-11-15)
8. **Phones keep old copies.** Version every release, show the version somewhere visible, and
   put it on asset URLs (or bump the service-worker cache). Ask which version a bug report
   was on. (hub, ApolloMaths, Starlane)
