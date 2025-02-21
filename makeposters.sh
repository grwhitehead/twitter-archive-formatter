#!/bin/sh

# make video posters for mp4s used in video tags
#
# node format.js -d ${ARCHIVE_DIR} --videoposters > archive.html
# cat archive.html |./makeposters.sh

for F in `perl findposters.pl`; do
    echo $F
    ffmpeg -ss 00:00:00 -i `dirname $F`/`basename $F -poster.jpg` -frames:v 1 -q:v 2 $F
done
