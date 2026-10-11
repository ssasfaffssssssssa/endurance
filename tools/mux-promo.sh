#!/bin/zsh
# Mux the silent promo with its score, loudness-normalised for Douyin (-14 LUFS, -1 dBTP).
cd "$(dirname "$0")/.."
ffmpeg -y -v error -i out/promo_silent.mp4 -i out/promo.wav \
  -filter_complex "[1:a]atrim=0:49,afade=t=out:st=48.2:d=0.8,loudnorm=I=-14:TP=-1.2:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -t 49 -movflags +faststart "out/ENDURANCE_抖音版.mp4"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact "out/ENDURANCE_抖音版.mp4"
