#!/bin/zsh
# usage: shot.sh <url> <out.png> <width> <height>
P=$(mktemp -d /tmp/chrome-prof-XXXXXX)
rm -f "$2"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-first-run --user-data-dir="$P" --screenshot="$2" --window-size="$3,$4" --hide-scrollbars --force-device-scale-factor=1 "$1" 2>/dev/null &
PID=$!
i=0
while [ ! -s "$2" ] && [ $i -lt 180 ]; do sleep 0.5; i=$((i+1)); done
sleep 2
kill $PID 2>/dev/null
wait $PID 2>/dev/null
rm -rf "$P"
[ -s "$2" ] && echo "shot ok: $2" || echo "shot FAILED: $2"
