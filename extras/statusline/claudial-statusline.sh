#!/usr/bin/env bash
# claudial statusline for Claude Code — live World Cup 2026 scores in the status bar.
# Source: ESPN's public soccer scoreboard (league fifa.world). Keyless, facts only.
# Serves a cached line instantly; refreshes at most once per TTL.

input=$(cat)

CACHE=/tmp/claudial-statusline
LOCK="$CACHE.lock"
STATE="$CACHE.state"
TTL=10
GOAL_WINDOW=15

SB="https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"

refresh() {
  exec 9>"$LOCK"
  flock -n 9 || exit 0

  today=$(date -u +%Y%m%d)
  json=$(curl -sf -m 3 -H "Accept: application/json" "$SB?dates=$today" 2>/dev/null) || json=""

  line=""
  if [ -n "$json" ]; then
    line=$(jq -r '
      [ .events[]
        | select(.status.type.state == "in")
        | .competitions[0].competitors as $c
        | ($c[] | select(.homeAway == "home")) as $h
        | ($c[] | select(.homeAway == "away")) as $a
        | "⚽ " + $h.team.abbreviation + " " + ($h.score|tostring) + "—" + ($a.score|tostring) + " " + $a.team.abbreviation
          + (if .status.type.name == "STATUS_HALFTIME" then " HT"
             elif (.status.displayClock // "") != "" then " " + .status.displayClock
             else "" end)
      ] | join("  ")' <<<"$json" 2>/dev/null)
  fi

  if [ -z "$line" ]; then
    # no live match → next kickoff from a 10-day window
    end=$(date -u -d '+10 days' +%Y%m%d 2>/dev/null || date -u -v+10d +%Y%m%d)
    nxt=$(curl -sf -m 3 -H "Accept: application/json" "$SB?dates=$today-$end" 2>/dev/null)
    line=$(jq -r '
      [ .events[] | select(.status.type.state == "pre") ] | sort_by(.date) | .[0]
      | select(. != null)
      | .competitions[0].competitors as $c
      | ($c[] | select(.homeAway == "home")) as $h
      | ($c[] | select(.homeAway == "away")) as $a
      | "○ " + $h.team.abbreviation + "—" + $a.team.abbreviation + " "
        + ((.date | strptime("%Y-%m-%dT%H:%MZ") | mktime) | strflocaltime("%a %H:%M"))' <<<"$nxt" 2>/dev/null)
  fi

  # goal detection: compare each live match's goal total with the previous poll;
  # on increase, arm a celebration line that output serves for GOAL_WINDOW secs
  if [ -n "$json" ]; then
    new_state=$(jq -c '[ .events[]
      | select(.status.type.state == "in" or .status.type.state == "post")
      | .competitions[0].competitors as $c
      | { key: (.id|tostring),
          value: (([$c[].score | tonumber? // 0]) | add) }
      ] | from_entries' <<<"$json" 2>/dev/null)
    if [ -n "$new_state" ] && [ -f "$STATE" ]; then
      goal=$(jq -r --slurpfile prev "$STATE" '
        [ .events[]
          | select(.status.type.state == "in")
          | .competitions[0].competitors as $c
          | (([$c[].score | tonumber? // 0]) | add) as $tot
          | ($prev[0][(.id|tostring)] // $tot) as $was
          | select($tot > $was)
          | ($c[] | select(.homeAway == "home")) as $h
          | ($c[] | select(.homeAway == "away")) as $a
          | $h.team.abbreviation + " " + ($h.score|tostring) + "—" + ($a.score|tostring) + " " + $a.team.abbreviation
        ] | first // empty' <<<"$json" 2>/dev/null)
      if [ -n "$goal" ]; then
        printf '\033[1;38;2;217;119;87m⚽ G O O O L  ·  %s\033[0m' "$goal" > "$CACHE.goal"
        date +%s > "$CACHE.goalts"
      fi
    fi
    [ -n "$new_state" ] && printf '%s' "$new_state" > "$STATE"
  fi

  [ -n "$line" ] && printf '%s' "$line" > "$CACHE"
}

age=9999
[ -f "$CACHE" ] && age=$(( $(date +%s) - $(stat -c %Y "$CACHE") ))
# synchronous refresh (curl capped at 3s) so every repaint shows current truth;
# flock -n means concurrent repaints skip the refresh and serve cache
[ "$age" -gt "$TTL" ] && refresh >/dev/null 2>&1

# a fresh goal owns the bar for GOAL_WINDOW seconds, then back to the score
if [ -f "$CACHE.goalts" ] && [ $(( $(date +%s) - $(cat "$CACHE.goalts") )) -le "$GOAL_WINDOW" ]; then
  score=$(cat "$CACHE.goal" 2>/dev/null)
else
  score=$(cat "$CACHE" 2>/dev/null)
fi

cwd=$(jq -r '.workspace.current_dir // .cwd // empty' <<<"$input" 2>/dev/null)
branch=""
[ -n "$cwd" ] && branch=$(git -C "$cwd" branch --show-current 2>/dev/null)

out="${score:-⚽ claudial · warming up}"
[ -n "$branch" ] && out="$out · $branch"
printf '%s' "$out"
