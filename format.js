/*
 * MIT License
 *
 * Copyright (c) 2022 Greg Whitehead
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const optparse = require('optparse');

var switches = [
    ['-v', '--verbose', 'verbose output'],
    ['-d', '--dir PATH', 'twitter archive directory'],
    ['-l', '--link', 'link to original tweet'],
    ['--timestampids', 'use timestamp ids'],
    ['--videoposters', 'use video posters (see makevideoposters.sh)'],
    ['--animatedgifs', 'use animated gifs (see makegif.sh)'],
    ['--styleprefix PREFIX', 'style name prefix (defaults to twitter)'],
    ['--startedbyaccount', 'only format threads started by this account'],
    ['--startedwithmedia', 'only format threads started with media']
];

var parser = new optparse.OptionParser(switches);

parser.banner = 'Usage: node format.js [options]';

var verbose = false;
parser.on('verbose', function(opt) {
    verbose = true;
});

var dir = ".";
parser.on('dir', function(opt, value) {
    dir = value;
});

var link = false;
parser.on('link', function(opt) {
    link = true;
});

var timestampids = false;
parser.on('timestampids', function(opt) {
    timestampids = true;
});

var videoposters = false;
parser.on('videoposters', function(opt) {
    videoposters = true;
});

var animatedgifs = false;
parser.on('animatedgifs', function(opt) {
    animatedgifs = true;
});

var styleprefix = "twitter";
parser.on('styleprefix', function(opt, value) {
    styleprefix = value;
});

var startedbyaccount = false;
parser.on('startedbyaccount', function(opt) {
    startedbyaccount = true;
});

var startedwithmedia = false;
parser.on('startedwithmedia', function(opt) {
    startedwithmedia = true;
});

var args = parser.parse(process.argv);

var ids = args.slice(2);


if (verbose) {
    console.log("loading data from "+dir);
    console.log("using style prefix "+styleprefix);
}

window = {};
window.YTD = {};

// account
window.YTD.account = {};
require(dir+"/data/account.js");
var account = window.YTD.account.part0[0].account;
if (verbose) console.log(account);

// profile
window.YTD.profile = {};
require(dir+"/data/profile.js");
var profile = window.YTD.profile.part0[0].profile;
if (verbose) console.log(profile);

var avatar = dir+"/data/profile_media/"+account.accountId+"-"+profile.avatarMediaUrl.split("/").slice(-1);

// tweets
window.YTD.tweets = {};
require(dir+"/data/tweets.js");
var tweets = window.YTD.tweets.part0;
if (verbose) console.log("loaded "+tweets.length+" tweets");

// parse dates, build tweets_byid lookup table
var tweets_byid = {}
for (var i = 0; i < tweets.length; i++) {
    var t = tweets[i];
    if (verbose) console.log(t);
    t.date = new Date(t.tweet.created_at);
    tweets_byid[t.tweet.id_str] = t;
}

// sort tweets by date
tweets.sort(function(a, b) { return a.date - b.date });

// build threads (chains of self-replies)
var threads = [];
for (var i = 0; i < tweets.length; i++) {
    var t = tweets[i];
    if (t.tweet.in_reply_to_status_id_str == undefined || t.tweet.in_reply_to_user_id_str != account.accountId) {
        if (verbose) console.log(t.tweet.id_str);
        threads.push(t);
    } else if (tweets_byid[tweets[i].tweet.in_reply_to_status_id_str] != undefined) {
        if (verbose) console.log(t.tweet.id_str+" -> "+t.tweet.in_reply_to_status_id_str);
        tweets_byid[t.tweet.in_reply_to_status_id_str].thread = t;
    }
}
if (verbose) console.log("found "+threads.length+" threads")

var MEDIA_URL_PREFIX = "http://pbs.twimg.com/media/";
var SELF_STATUS_URL_PREFIX = "https://twitter.com/"+account.accountId+"/status/";

function mediaFile(m) {
    if (m.type == "photo") {
        var re = /([^\/]+\.(jpg|jpeg|png))/;
        return m.media_url.match(re)[0];
    } else if (m.type == "video" || m.type == "animated_gif") {
        // twitter exports the highest bitrate variant
        var br = -1;
        var mf = null;
        for (var i = 0; i < m.video_info.variants.length; i++) {
            if (m.video_info.variants[i].content_type == "video/mp4") {
                var br_i = parseInt(m.video_info.variants[i].bitrate);
                if (br_i > br) {
                    br = br_i;
                    var re = /([^\/]+\.(mp4))/;
                    mf = m.video_info.variants[i].url.match(re)[0];
                }
            }
        }
        if (animatedgifs && m.type == "animated_gif") {
            return mf+".gif";
        }
        return mf;
    }
}

function formatTweet(t) {
    var t_id = timestampids?t.date.toISOString().replace(/[a-zA-Z\-\:\.]+/g, ""):t.tweet.id_str;
    var text = t.tweet.full_text;
    var links = [];
    var selfqts = [];
    if (t.tweet.entities != undefined && t.tweet.entities.urls != undefined) {
        for (var i = 0; i < t.tweet.entities.urls.length; i++) {
            var selfqt = tweets_byid[t.tweet.entities.urls[i].expanded_url.split("?",1)[0].substr(SELF_STATUS_URL_PREFIX.length)];
            if (selfqt) {
                selfqts.push(selfqt);
                text = text.replace(t.tweet.entities.urls[i].url, '');
            } else {
                links.push(t.tweet.entities.urls[i].expanded_url);
                text = text.replace(t.tweet.entities.urls[i].url,
                                    "<a href='"+t.tweet.entities.urls[i].expanded_url+"'>"+t.tweet.entities.urls[i].expanded_url+"</a>");
            }
        }
    }
    var media = [];
    if (t.tweet.extended_entities != undefined && t.tweet.extended_entities.media != undefined) {
        for (var i = 0; i < t.tweet.extended_entities.media.length; i++) {
            var mf = mediaFile(t.tweet.extended_entities.media[i]);
            media.push(dir+"/data/tweets_media/"+t.tweet.id_str+"-"+mf);
            text = text.replace(t.tweet.extended_entities.media[i].url, '');
        }
    }
    var str = "<div class='"+styleprefix+"_post'>\n"+
        "<div class='"+styleprefix+"_post_avatar'><img src='"+avatar+"'></div>\n"+
        "<div class='"+styleprefix+"_post_header'>\n"+
        " <span class='"+styleprefix+"_post_displayname'>"+account.accountDisplayName+"</span> <span class='"+styleprefix+"_post_username'>@"+account.username+"</span> • <span class='"+styleprefix+"_post_timestamp'>"+t.date.toDateString()+"</span> <span class='"+styleprefix+"_post_id'>"+t_id+"</span>\n"+
        "</div>\n";
    if (link && t.tweet.in_reply_to_status_id_str != undefined && tweets_byid[t.tweet.in_reply_to_status_id_str] == undefined) {
        var reply_to_url = "https://twitter.com/"+t.tweet.in_reply_to_screen_name+"/status/"+t.tweet.in_reply_to_status_id_str;
        str += "<div class='"+styleprefix+"_post_reply'>\n"+
            "↩️ <span class='"+styleprefix+"_post_replyid'><a href='"+reply_to_url+"'>"+reply_to_url+"</a></span>\n"+
            "</div>";
    }
    str += "<div class='"+styleprefix+"_post_body'>\n"+
        "<p>"+text+"</p>\n"+
        "</div>\n";
    if (media.length > 0) {
        str += "<div class='"+styleprefix+"_post_media'>\n";
        for (var i = 0; i < media.length; i++) {
            if (media[i].endsWith("mp4")) {
                if (videoposters) {
                    str += "<video class='"+styleprefix+"_post_video' poster='"+media[i]+"-poster.jpg' preload='none' controls><source src='"+media[i]+"' type='video/mp4'>Your browser does not support the video tag.</video>\n";
                } else {
                    str += "<video class='"+styleprefix+"_post_video' controls><source src='"+media[i]+"' type='video/mp4'>Your browser does not support the video tag.</video>\n";
                }
            } else {
                str += "<img class='"+styleprefix+"_post_img' src='"+media[i]+"'>\n";
            }
        }
        str += "</div>\n";
    }
    if (selfqts.length > 0) {
        str += "<div class='"+styleprefix+"_post_links'>\n";
        for (var i = 0; i < selfqts.length; i++) {
            str += formatTweet(selfqts[i]);
        }
        str += "</div>\n";
    }
    if (link) {
        var orig_url = SELF_STATUS_URL_PREFIX+t.tweet.id_str;
        str += "<div class='"+styleprefix+"_post_original'>\n"+
            "• <a href='"+orig_url+"'>"+orig_url+"</a> •\n"+
            "</div>\n";
    }
    str += "</div>\n";
    return str;
}

function formatThread(t) {
    var str = "<div class='"+styleprefix+"_thread'>\n";
    str += formatTweet(t);
    while (t.thread) {
        t = t.thread;
        str += formatTweet(t);
    }
    str += "</div>";
    return str;
}

console.log("<!doctype html>\n"+
            "<html>\n"+
            " <head>\n"+
            "  <meta charset='utf-8'>\n"+
            "  <style>\n"+
            "."+styleprefix+"_thread { width: 600px }\n"+
            "."+styleprefix+"_post { margin: 1%; border: solid 1px; width: 94%; padding: 2%; font-family: sans-serif; font-size: small }\n"+
            "."+styleprefix+"_post_avatar { display: inline-block; position: relative; width: 48px; height: 48px; overflow: hidden; border-radius: 50%; float: left; margin-right: 10px; margin-bottom: 10px }\n"+
            "."+styleprefix+"_post_avatar img { width: 100%; height: 100% }\n"+
            "."+styleprefix+"_post_header { margin-left: 60px }\n"+
            "."+styleprefix+"_post_displayname { font-weight: bold }\n"+
            "."+styleprefix+"_post_username { color: gray }\n"+
            "."+styleprefix+"_post_timestamp { color: gray }\n"+
            "."+styleprefix+"_post_id { float: right; display: none }\n"+
            "."+styleprefix+"_post_reply { margin-top: 2% }\n"+
            "."+styleprefix+"_post_replyid { }\n"+
            "."+styleprefix+"_post_body { margin-top: 2%; margin-left: 60px }\n"+
            "."+styleprefix+"_post_media { margin-top: 2% }\n"+
            "."+styleprefix+"_post_img { width: 100% }\n"+
            "."+styleprefix+"_post_video { width: 100% }\n"+
            "."+styleprefix+"_post_qts { margin-top: 2% }\n"+
            "."+styleprefix+"_post_original { margin-top: 2%; text-align: center; font-size: x-small }\n"+
            "  </style>\n"+
            " </head>\n"+
            " <body>\n"+
            "  <ul>");
for (var i = 0; i < threads.length; i++) {
    var t = threads[i];
    var t_id = timestampids?t.date.toISOString().replace(/[a-zA-Z\-\:\.]+/g, ""):t.tweet.id_str;
    if (ids.length > 0 && ids.indexOf(t_id) < 0) continue;
    if (startedbyaccount && t.tweet.in_reply_to_status_id_str) continue;
    if (startedwithmedia && !(t.tweet.extended_entities && t.tweet.extended_entities.media && t.tweet.extended_entities.media.length > 0)) continue;
    console.log("<li> THREAD "+t_id);
    console.log(formatThread(t));
}
console.log("  </ul>\n"+
            " </body>\n"+
            "</html>")
