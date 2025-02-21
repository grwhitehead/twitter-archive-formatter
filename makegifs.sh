#!/bin/sh

# make animated gifs for mp4s that were originally animated gifs
#
# node format.js -d ${ARCHIVE_DIR} --animatedgifs > archive.html
# cat archive.html |./makegifs.sh

for F in `perl findgifs.pl`; do
    echo $F
    ffmpeg -sws_flags bicubic -i `dirname $F`/`basename $F .gif` $F
done
