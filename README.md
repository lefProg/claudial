# claudial

Live World Cup 2026 fixtures in your terminal. One line, zero install:

```
npx claudial
```

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

Want the score *inside* Claude Code itself — in its status bar, no tmux at
all? There's a [statusline integration](extras/statusline/) for that:
`⚽ QAT 0—1 SUI 67' · main`, refreshed every 15 s.

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

| Key | Action  |
|-----|---------|
| `r` | refresh now |
| `q` | quit    |

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

## License

MIT
