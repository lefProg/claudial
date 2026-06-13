# claudial × Claude Code statusline

> **Note:** This bash script is the original statusline and is kept for
> reference. The supported install is now `claudial setup`, which uses the
> built-in, dependency-free `claudial --statusline` command (no curl/jq/flock,
> works on macOS and Windows too). See the [main README](../../README.md).

Live World Cup scores rendered inside Claude Code's status bar — under the
input box, always visible while Claude works.

```
⚽ QAT 0—1 SUI 67' · main        ← during a match
○ BRA—MOR Sun 01:00 · main       ← between matches
```

It serves a cached line in ~10 ms and refreshes every 10 s, so your UI never
waits on the network. Shows every live World Cup match, the next kickoff
otherwise, and your current git branch. Data is ESPN's public scoreboard
(see [../../DATA.md](../../DATA.md)).

## Install

Requires `curl`, `jq`, `flock` (preinstalled on most Linux distros; macOS:
`brew install jq flock`).

```bash
curl -fsSL https://raw.githubusercontent.com/lefProg/claudial/main/extras/statusline/claudial-statusline.sh \
  -o ~/.claude/claudial-statusline.sh && chmod +x ~/.claude/claudial-statusline.sh
```

Then add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/claudial-statusline.sh",
    "refreshInterval": 3
  }
}
```

`refreshInterval` keeps the bar ticking every 3 s even while the session is
idle. When a goal goes in, the bar takes over for 15 seconds:

```
⚽ G O O O L  ·  ARG 1—0 MEX        ← bold, terracotta, impossible to miss
```

then settles back to the live score. Restart Claude Code after editing
settings. Goal in the 67th minute? You'll know before your build finishes.
