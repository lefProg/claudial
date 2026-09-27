<div align="center">

# ⚽ claudial

### Live football inside Claude Code

Your teams' scores sit under your prompt while you code.
When one of them scores, your terminal celebrates.

```
npm install -g claudial && claudial setup
```

<br/>

[![npm version](https://img.shields.io/npm/v/claudial?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/claudial)
[![npm downloads](https://img.shields.io/npm/dm/claudial?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/claudial)
[![node](https://img.shields.io/node/v/claudial?style=flat-square&color=339933&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![backend](https://img.shields.io/badge/backend-Rust-DEA584?style=flat-square&logo=rust&logoColor=white)](https://github.com/lefProg/claudial-backend)
[![license](https://img.shields.io/npm/l/claudial?style=flat-square&color=blue)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/lefProg/claudial?style=flat-square&color=f5c518&logo=github)](https://github.com/lefProg/claudial/stargazers)

<br/>

![claudial: a live football board in the terminal, taken over by a full-screen GOAL](dashboard.gif)

**Premier League · La Liga · Serie A · Bundesliga · Ligue 1 · Champions League ·
Europa League · Conference League · Super League Greece · World Cup**

</div>

---

## The score, right under your prompt

One command puts a live score line into Claude Code's status bar. It stays out
of the way while Claude works, and lights up the moment anyone scores:

<div align="center">

![claudial: live scores in Claude Code's status bar, flashing GOOOL on a goal](demo.gif)

</div>

```
⚽ ARS 1—1 LIV 77'  ⚽ PAO 1—0 OLY 67'  ⚽ RMA 2—2 BAR HT · main   ← every match you follow
⚽ G O O O L  ·  ARS 2—1 LIV · main                              ← for 15 s after a goal
🟥 R E D  ·  VAN DIJK  ·  ARS — LIV · main                        ← for 15 s after a red card
○ FCB — PSG Sun 07:00 PM · main                                  ← between matches: next kickoff
```

Your git branch stays at the end. **Already run a custom status line?** Setup
keeps it and appends the score, so nothing you had is lost. Pure Node, so it
works on macOS, Linux and Windows. Restart Claude Code after setup to see it.

## Pick your teams in five seconds

Setup ends by asking what you follow. Type a name, tick it with space, press
esc to save:

```
 claudial · what do you follow?

 search › pana▏

 › ◉ Panathinaikos  PAO · Super League Greece

 Following Panathinaikos · Arsenal
 ↑↓ move · space follow · type to search · esc clear search · ctrl+c cancel
```

Follow a whole league or just your club. Change your mind any time: press `f`
in the dashboard, or run `claudial follow`.

## A goal takes over the whole screen

Want the full board beside Claude? `claudial` opens a live dashboard: every
match you follow with scores, minutes, scorers and cards, plus the next ten
days of fixtures in your local time.

When a goal goes in, the server pushes it within a second, and the whole
screen becomes the goal: the scorer, the minute, the new score. Four seconds
of glory, then back to the board. Red cards get the same treatment.

## Usage

```
claudial              # the live dashboard
claudial --ticker     # a 4-line strip for slim split panes
claudial | cat        # plain snapshot for pipes and scripts
claudial follow       # pick leagues and teams
```

| Key | Action |
|-----|--------|
| `f` | pick what you follow |
| `r` | refresh now |
| `q` | quit |

Requires Node ≥ 18. No account, no sign-up, no API key.

Scripting it? `claudial setup --statusline --yes` installs without
prompts, and `claudial leagues`, `claudial teams <league>`,
`claudial follow <id>...`, `claudial unfollow <id>...` and `claudial following`
work without the UI. `claudial forget` deletes your device from the server.

## Status

claudial started as a World Cup 2026 side project. It now follows ten leagues
through its own server, [claudial-backend](https://github.com/lefProg/claudial-backend),
written in Rust: one set of polls for everyone, goals pushed to every terminal
over server-sent events.

## Notes

- The server stores a random device id and what you follow, nothing else. See
  its [privacy page](https://github.com/lefProg/claudial-backend/blob/main/PRIVACY.md).
- Match facts (scores, scorers, cards) come from ESPN's public site API, through
  the claudial server. No logos or branding. Not affiliated with or endorsed by
  ESPN, FIFA, UEFA or any league.
- Seeing `AR` instead of `🇦🇷` for national teams? Your terminal doesn't render
  flag emoji. macOS terminals and [Konsole](https://konsole.kde.org/) do;
  Windows Terminal doesn't.
- Not affiliated with Anthropic. The look is a love letter to
  [Claude Code](https://claude.com/claude-code).

```js
// Canada — Bosnia & Herzegovina, 12 June 2026, was on while this was built.
// Jovo Lukić's 21' goal was the first one this codebase ever saw — it showed
// up in a smoke test before any UI existed to celebrate it. Legendary.
```

## Contributing

Issues and PRs welcome: bug reports, new incident types, terminal quirks, all
of it. Keep the spirit playful.

```bash
git clone https://github.com/lefProg/claudial.git
cd claudial
npm install
npm run dev     # live TUI from source
npm test        # vitest
```

## License

[MIT](LICENSE) © lefProg

<div align="center">

<br/>

**If this made a goal feel a little louder, drop a ⭐. It helps others find it.**

[Report a bug](https://github.com/lefProg/claudial/issues) ·
[Request a feature](https://github.com/lefProg/claudial/issues) ·
[npm](https://www.npmjs.com/package/claudial) ·
[Backend](https://github.com/lefProg/claudial-backend)

</div>
