#!/usr/bin/env bash
# Turns a screen recording into the three files a card needs:
#   media/<name>.mp4          the demo (1280 wide, H.264, starts playing before it has fully downloaded)
#   media/<name>-preview.mp4  an 8-second silent loop, played when the pointer is over the card
#   media/<name>.jpg          the still shown on the card (1280×720)
#
# Usage:
#   tools/make_media.sh <name> <recording> <keep> <preview-start> <still-at> [--sound]
#
#   <keep>          the parts to keep, as start:end seconds, comma-separated — e.g. "0:4.2,10.5:19.5,23.5:71"
#                   (use "all" to keep everything)
#   <preview-start> where the 8-second hover loop starts, in seconds of the ORIGINAL recording
#   <still-at>      which moment of the ORIGINAL recording becomes the card's still
#   --sound         keep the recording's audio (default: silent, like the other demos)
#
# Example (how energy-resilience was made):
#   tools/make_media.sh energy-resilience ~/Desktop/Energy-Resilience.mp4 \
#       "0:4.2,10.5:19.5,23.5:27.8,34.5:41,50.5:52.7,53.2:71" 59 64
#
# Needs ffmpeg and ffprobe. Find the pauses to cut by scrubbing the recording, or ask Claude to
# measure them (docs/KNOWLEDGE-BASE.md → "Making demo videos").
set -euo pipefail
name=$1; src=$2; keep=$3; pstart=$4; still=$5; sound=${6:-}
out="$(cd "$(dirname "$0")/.." && pwd)/media"
mkdir -p "$out"

if [ "$keep" = "all" ]; then
  vf="scale=1280:-2,fps=30"
  ffmpeg -v error -y -i "$src" -vf "$vf" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p \
    $([ "$sound" = "--sound" ] && echo "-c:a aac -b:a 96k" || echo "-an") -movflags +faststart "$out/$name.mp4"
else
  fc=""; labels=""; n=0
  IFS=',' read -ra parts <<< "$keep"
  for p in "${parts[@]}"; do
    a=${p%%:*}; b=${p##*:}
    fc+="[0:v]trim=$a:$b,setpts=PTS-STARTPTS[v$n];"
    if [ "$sound" = "--sound" ]; then fc+="[0:a]atrim=$a:$b,asetpts=PTS-STARTPTS[a$n];"; labels+="[v$n][a$n]"; else labels+="[v$n]"; fi
    n=$((n+1))
  done
  if [ "$sound" = "--sound" ]; then
    fc+="${labels}concat=n=$n:v=1:a=1[cv][ca];[cv]scale=1280:-2,fps=30[v]"
    ffmpeg -v error -y -i "$src" -filter_complex "$fc" -map "[v]" -map "[ca]" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart "$out/$name.mp4"
  else
    fc+="${labels}concat=n=$n:v=1[cv];[cv]scale=1280:-2,fps=30[v]"
    ffmpeg -v error -y -i "$src" -filter_complex "$fc" -map "[v]" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -an -movflags +faststart "$out/$name.mp4"
  fi
fi

ffmpeg -v error -y -ss "$pstart" -t 8 -i "$src" -vf "scale=640:-2,fps=24" -an -c:v libx264 -preset slow -crf 30 \
  -pix_fmt yuv420p -movflags +faststart "$out/$name-preview.mp4"
# The still is padded (not cropped) to 16:9, so nothing at the edges of the screen is lost.
ffmpeg -v error -y -ss "$still" -i "$src" -frames:v 1 -update 1 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0b0f17" -q:v 4 "$out/$name.jpg"

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/$name.mp4")
ls -lh "$out/$name.mp4" "$out/$name-preview.mp4" "$out/$name.jpg"
echo "Demo is ${dur%.*}s long. GitHub's upload box takes files up to 25 MB."
