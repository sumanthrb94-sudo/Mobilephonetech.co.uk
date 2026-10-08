#!/usr/bin/env bash
# Synthesises the video's sound effects with ffmpeg, so no stock audio is needed.
set -euo pipefail
cd "$(dirname "$0")/assets/sfx"
f() { ffmpeg -loglevel error -y "$@"; }
# Low lab ambience: two detuned hums with a slow swell.
f -f lavfi -i "aevalsrc='0.10*sin(2*PI*55*t)+0.06*sin(2*PI*82.5*t)+0.03*sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*0.25*t))':s=44100:d=12.5" -af "afade=t=in:d=0.8,afade=t=out:st=11.3:d=1.2,lowpass=f=400" bed.wav
# Whoosh: band-passed noise swelling and falling.
f -f lavfi -i "anoisesrc=d=0.6:c=pink:a=0.6" -af "bandpass=f=1200:w=900,afade=t=in:d=0.25,afade=t=out:st=0.3:d=0.3" whoosh.wav
# Scanner sweep: a rising chirp.
f -f lavfi -i "aevalsrc='0.35*sin(2*PI*(400*t+900*t*t))':s=44100:d=0.9" -af "afade=t=in:d=0.05,afade=t=out:st=0.7:d=0.2" scan.wav
# Tick: a short bright click.
f -f lavfi -i "aevalsrc='0.5*sin(2*PI*2200*t)*exp(-60*t)':s=44100:d=0.12" tick.wav
# Blip: a soft UI blip.
f -f lavfi -i "aevalsrc='0.4*sin(2*PI*1320*t)*exp(-25*t)':s=44100:d=0.2" blip.wav
# Charge: rising tone for the battery fill.
f -f lavfi -i "aevalsrc='0.25*sin(2*PI*(300*t+250*t*t))':s=44100:d=1.4" -af "afade=t=in:d=0.1,afade=t=out:st=1.2:d=0.2" charge.wav
# Data wipe: filtered noise with a falling tone.
f -f lavfi -i "anoisesrc=d=1.4:c=white:a=0.25" -f lavfi -i "aevalsrc='0.2*sin(2*PI*(900*t-250*t*t))':s=44100:d=1.4" -filter_complex "[0]highpass=f=2500,volume=0.5[n];[n][1]amix=inputs=2,afade=t=in:d=0.1,afade=t=out:st=1.1:d=0.3" wipe.wav
# Success chime: a major triad, staggered.
f -f lavfi -i "aevalsrc='0.3*sin(2*PI*784*t)*exp(-3*t)+0.25*sin(2*PI*988*max(t-0.08,0))*exp(-3*max(t-0.08,0))*gte(t,0.08)+0.25*sin(2*PI*1175*max(t-0.16,0))*exp(-2.5*max(t-0.16,0))*gte(t,0.16)':s=44100:d=1.6" chime.wav
# Stamp: a low thud for the certified seal.
f -f lavfi -i "aevalsrc='0.9*sin(2*PI*(90*t-30*t*t))*exp(-14*t)':s=44100:d=0.4" stamp.wav
