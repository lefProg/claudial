<div align="center">

# ⚽ claudial

### Live World Cup 2026 in your terminal — goal, red-card and VAR takeovers included

One line. Zero install. Every score, while you work.

```
npx claudial
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

Live matches with scores, minutes and scorers on top. Upcoming fixtures in
your local time below. Auto-refreshing while you work.

```
 ▐▛███▜▌   WORLD CUP 2026 · LIVE
 ▝▜█████▛▘  ───────────────────────

 ⏺ LIVE 67'
   Argentina  2 — 1  Mexico
   ⚽ 23' Messi · 51' Álvarez | 44' Lozano

 ⏺ LIVE 12'
   France  0 — 0  Senegal

 ○ UPCOMING
   18:00  Brazil — Croatia
   21:00  Spain — Morocco

 r refresh · q quit
```

And when a goal goes in — anywhere in the tournament — the whole screen
takes over:

```


      █▀▀█  █▀▀█  █▀▀█  █
      █ ▄▄  █  █  █▀▀█  █
      ▀▀▀▀  ▀▀▀▀  ▀  ▀  ▀▀▀▀

         LIONEL MESSI · 23'

      ARGENTINA  2 — 1  MEXICO


```

Four seconds of glory, then back to the board.

## Claude Code, World Cup edition

The whole point. Two commands and your Claude Code becomes a World Cup
workstation — Claude working on top, every live score ticking in a strip
below, forever.

Needs [tmux](https://github.com/tmux/tmux) (`sudo pacman -S tmux` /
`sudo apt install tmux` / `brew install tmux`), then:

```bash
npm install -g claudial
cat >> ~/.zshrc <<'EOF'
alias claude-mundial="tmux new-session 'claude' \; split-window -v -l 5 'claudial --ticker' \; select-pane -U"
EOF
```

Open a new shell, type `claude-mundial`, and:

```
┌──────────────────────────────────────┐
│ > implement the parser               │
│                                      │
│ ⏺ Working…                           │
│                                      │
├──────────────────────────────────────┤
│ ⏺ 67' QAT 0—1 SUI                    │
│ ○ BRA—MOR Sun 01:00                  │
└──────────────────────────────────────┘
```

When a goal goes in, the strip lights up while Claude keeps working.
(`bash` users: append to `~/.bashrc` instead. Prefer the full board beside
Claude rather than a strip below? Use
`split-window -h -l 44 'claudial'` in the alias.)

Don't want to hand-edit your shell config? `claudial setup --tmux` appends the
right alias for you — zsh, bash or fish — idempotently.

Want the score *inside* Claude Code itself — in its status bar, no tmux at
all? Install everything in one step:

```bash
npm install -g claudial
claudial setup
```

The wizard adds a live-score statusline (`⚽ QAT 0—1 SUI 67' · main`, refreshed
every few seconds) to your Claude Code settings, and can also wire up the tmux
ticker alias below. It works on zsh, bash and fish, and the statusline itself
is pure Node — no `jq`/`flock`/`curl`, so it runs on macOS and Windows too.
Non-interactive: `claudial setup --statusline --global --tmux --shell zsh --yes`.

## Why a TUI

The World Cup happens during work hours somewhere. This sits in a terminal
split, costs nothing to glance at, and celebrates louder than a push
notification — without you ever opening a browser tab.

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

Requires Node ≥ 18. No account, no API key, no config.

| Key | Action      |
|-----|-------------|
| `r` | refresh now |
| `q` | quit        |

Beyond goals, every live match carries its incident feed: yellow cards,
substitutions, injury time — and a `⚖ VAR` badge the moment a review starts.
Red cards and VAR decisions get the full-screen treatment, same as goals.

## Status

v1 is being built live during the group stage. Follow the commits.

## Notes

- Match data comes from [ESPN's public soccer scoreboard](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard)
  — facts only (scores, scorers, cards), no logos or branding. See
  [DATA.md](DATA.md) for why this source. Not affiliated with or endorsed by
  ESPN or FIFA.
- Not affiliated with Anthropic. The aesthetic is a love letter to
  [Claude Code](https://claude.com/claude-code), whose terminal UI this
  proudly imitates.
- Polling is deliberately gentle (15 s live, 5 min fixtures), and a single
  scoreboard call serves all live matches at once. Please keep it that way.

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
