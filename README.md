# Twitter archive formatter

Node JS command line tool to format a twitter archive into a single html file
* sorts by date
* expands shortened links
* assembles threads
* embeds self-quotetweets

DISCLAIMER: This was a quick hack to meet a specific need, pulling together threads. I probably won't put much more time into it.

## Running

(see requirements below)

Format entire archive
```
% node format.js -d PATH_TO_TWITTER_ARCHIVE > archive.html
```

Format one or more threads
```
% node format.js -d PATH_TO_TWITTER_ARCHIVE ID ... > archive.html
```

Make video posters for mp4s
```
% node format.js -d PATH_TO_TWITTER_ARCHVIE --videoposters > archive.html
% cat archive.html |./makeposters.sh
```

Make animated gifs for mp4s that were originally animated gifs
```
% node format.js -d PATH_TO_TWITTER_ARCHIVE --animatedgifs > archive.html
% cat archive.html |./makegifs.sh
```

Generate output suitable for merging with microblogging content from other sources
```
% node format.js --timestampids --styleprefix SOME_PREFIX -d PATH_TO_MASTODON_ARCHIVE
```

## Requirements

* Node (https://nodejs.org)

On MacOS:
```
% brew install node
% npm install optparse
```

Copyright (c) 2022-2025 Greg Whitehead

MIT License
