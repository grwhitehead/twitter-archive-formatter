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
% node format.js -d PATH_TO_TWITTER_ARCHIVE
```

Format one or more threads
```
% node format.js -d PATH_TO_TWITTER_ARCHIVE ID ...
```

## Requirements

* Node (https://nodejs.org)

On MacOS:
```
% brew install node
% npm install optparse
```

Copyright (c) 2022 Greg Whitehead

MIT License
