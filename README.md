<div align="center">

# ⚽ claudial

### Live football in your terminal — goal and red-card takeovers included

One command. Your leagues and your teams, live in your terminal and right inside
Claude Code, while you work.

```
npm install -g claudial && claudial setup
```

<br/>

[![npm version](https://img.shields.io/npm/v/claudial?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/claudial)
[![npm downloads](https://img.shields.io/npm/dm/claudial?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/claudial)
[![node](https://img.shields.io/node/v/claudial?style=flat-square&color=339933&logo=node.js&logoColor=white)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/claudial?style=flat-square&color=blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![GitHub stars](https://img.shields.io/github/stars/lefProg/claudial?style=flat-square&color=f5c518&logo=github)](https://github.com/lefProg/claudial/stargazers)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/lefProg/claudial/issues)

</div>

---

Live scores right inside Claude Code's status bar — under the input box, always
visible while you work, lighting up the moment anyone scores:

<div align="center">

![claudial — live football scores in Claude Code's status bar](demo.gif)

</div>

## Your matches, in Claude Code

The whole point: your Claude Code, score-aware. One command and the live score
sits right in Claude Code's status bar — under the input box, always visible
while Claude works, with nothing to wire up by hand.

```bash
npm install -g claudial
claudial setup
```

The wizard drops a live-score statusline into your Claude Code settings:

```
⚽ PAO 1—0 OLY 67' · main                   ← during a match
⚽ QAT 🇶🇦 0—1 🇨🇭 SUI 67' · main          ← national teams get their flags
○ QAT 🇶🇦 — 🇨🇭 SUI 10:00 PM · main        ← between matches (next kickoff, or last result)
⚽ G O O O L  ·  ARG 🇦🇷 1—0 🇲🇽 MEX        ← for 15s whenever anyone scores
🟥 R E D  ·  OTAMENDI  ·  ARG 🇦🇷 — 🇲🇽 MEX  ← for 15s on a red card
```

It refreshes every few seconds and is pure Node, so it runs on macOS and
Windows too, in any shell. Restart Claude Code after setup to see it.
Scriptable, no prompts: `claudial setup --statusline --global --yes`.

**Already run a custom status line?** `claudial setup` keeps it — it wraps your
existing one and appends the score, so nothing you had is lost.

## Pick your teams from a list

`claudial setup` ends by asking what you follow. Type a team's name, tick it with
space, press esc to save:

```
 claudial · what do you follow?

 search › pana▏

   ○ Panama  PAN · FIFA World Cup
 › ◉ Panathinaikos  PAO · Super League Greece

 Following Panathinaikos
 ↑↓ move · space follow · type to search · esc clear search · ctrl+c cancel
```

With the search empty you see the ten leagues: space follows a whole league, enter
browses its teams. Change your mind any time with `claudial follow`, or press `f` in
the dashboard. `claudial forget` deletes this device from the server.

For scripts there are plain commands too: `claudial leagues`, `claudial teams <league> [search]`,
`claudial follow <league or team id>...`, `claudial unfollow ...`, `claudial following`.

## The full dashboard

Prefer the full board beside Claude? `claudial` opens a live dashboard — every
match you follow with scores, minutes and scorers, the next ten days of fixtures
in your local time, all auto-refreshing while you work. And when a goal goes in,
the whole screen takes over:

```


      █▀▀█  █▀▀█  █▀▀█  █
      █ ▄▄  █  █  █▀▀█  █
      ▀▀▀▀  ▀▀▀▀  ▀  ▀  ▀▀▀▀

         LIONEL MESSI · 23'

      ARG 🇦🇷  2 — 1  🇲🇽 MEX


```

Four seconds of glory, then back to the board. It costs nothing to glance at,
and celebrates louder than a push notification — without you ever opening a
browser tab.

## Usage

```
npx claudial            # the dashboard
npx claudial --ticker   # 4-line strip for slim split panes
npx claudial | cat      # non-interactive snapshot (pipes, scripts, CI)
```

Or install it for good:

```
npm install -g claudial
claudial
```

Requires Node ≥ 18. No account, no API key.

| Key | Action      |
|-----|-------------|
| `r` | refresh now |
| `f` | pick what you follow |
| `q` | quit        |

Beyond goals, every live match carries its incident feed (goals, yellow and red
cards), and red cards get the full-screen treatment, same as goals. Goals and
cards are pushed from the server the moment it sees them.

## Status

The World Cup is over; claudial now follows ten leagues through its own server,
[claudial-backend](https://github.com/lefProg/claudial-backend).

## Notes

- Seeing letter codes instead of country flags (`🇦🇷` showing as `AR`)? Your
  terminal isn't rendering flag emoji. Install [Konsole](https://konsole.kde.org/)
  — it shows them out of the box. (macOS terminals already do; Windows
  Terminal does not.)
- claudial talks only to the claudial server, which gets match facts (scores,
  scorers, cards; no logos or branding) from ESPN's public site API. See
  [DATA.md](DATA.md). Not affiliated with or endorsed by ESPN, FIFA or any league.
- The server stores a random device id and what you follow, nothing else; its
  [privacy page](https://github.com/lefProg/claudial-backend/blob/main/PRIVACY.md)
  has the details.
- Betting predictions are off unless you set `CLAUDIAL_PREDICTIONS_URL`. They show
  stakes and odds: for adults only, where betting is legal. Please bet responsibly.
- Not affiliated with Anthropic. The aesthetic is a love letter to
  [Claude Code](https://claude.com/claude-code), whose terminal UI this
  proudly imitates.
- The client polls its own server gently (15 s, plus pushed events), and the
  server makes one set of ESPN calls for everybody. Please keep it that way.

```js
// Canada — Bosnia & Herzegovina, 12 June 2026, was on while this was built.
// Jovo Lukić's 21' goal was the first one this codebase ever saw — it showed
// up in a smoke test before any UI existed to celebrate it. Legendary.
```

## Contributing

Issues and PRs welcome — bug reports, new incident types, terminal quirks,
all of it. Keep the polling gentle and the spirit playful.

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

**If this made a goal feel a little louder, drop a ⭐ — it helps others find it.**

[Report a bug](https://github.com/lefProg/claudial/issues) ·
[Request a feature](https://github.com/lefProg/claudial/issues) ·
[npm](https://www.npmjs.com/package/claudial)

</div>
