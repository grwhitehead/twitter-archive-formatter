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
    ['-l', '--link', 'link to original tweet']
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

var args = parser.parse(process.argv);

var ids = args.slice(2);


if (verbose) console.log("loading data from "+dir);
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

function formatTweet(t) {
    var text = t.tweet.full_text;
    var links = [];
    var selfqts = [];
    if (t.tweet.entities != undefined && t.tweet.entities.urls != undefined) {
        for (var i = 0; i < t.tweet.entities.urls.length; i++) {
            var selfqt = tweets_byid[t.tweet.entities.urls[i].expanded_url.substr(SELF_STATUS_URL_PREFIX.length)];
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
    var imgs = [];
    if (t.tweet.extended_entities != undefined && t.tweet.extended_entities.media != undefined) {
        for (var i = 0; i < t.tweet.extended_entities.media.length; i++) {
            imgs.push(dir+"/data/tweets_media/"+t.tweet.id_str+"-"+t.tweet.extended_entities.media[i].media_url.substr(MEDIA_URL_PREFIX.length));
            text = text.replace(t.tweet.extended_entities.media[i].url, '');
        }
    }
    var str = "<div class='tweet'>\n"+
        "<div class='tweet_avatar'><img src='"+avatar+"'></div>\n"+
        "<div class='tweet_header'>\n"+
        " <span class='tweet_displayname'>"+account.accountDisplayName+"</span> <span class='tweet_username'>@"+account.username+"</span> • <span class='tweet_timestamp'>"+t.date.toDateString()+"</span> <span class='tweet_id'>"+t.tweet.id_str+"</span>\n"+
        "</div>\n";
    if (t.tweet.in_reply_to_status_id_str != undefined && tweets_byid[t.tweet.in_reply_to_status_id_str] == undefined) {
        var reply_to_url = "https://twitter.com/"+t.tweet.in_reply_to_screen_name+"/status/"+t.tweet.in_reply_to_status_id_str;
        str += "<div class='tweet_reply'>\n"+
            "↩️ <span class='tweet_replyid'><a href='"+reply_to_url+"'>"+reply_to_url+"</a></span>\n"+
            "</div>";
    }
    str += "<div class='tweet_body'>\n"+
        "<p>"+text+"</p>\n"+
        "</div>\n";
    if (imgs.length > 0) {
        str += "<div class='tweet_imgs'>\n";
        for (var i = 0; i < imgs.length; i++) {
            str += "<img class='tweet_img' src=\""+imgs[i]+"\">\n";
        }
        str += "</div>\n";
    }
    if (selfqts.length > 0) {
        str += "<div class='tweet_links'>\n";
        for (var i = 0; i < selfqts.length; i++) {
            str += formatTweet(selfqts[i]);
        }
        str += "</div>\n";
    }
    if (link) {
        var orig_url = SELF_STATUS_URL_PREFIX+t.tweet.id_str;
        str += "<div class='tweet_original'>\n"+
            "• <a href='"+orig_url+"'>"+orig_url+"</a> •\n"+
            "</div>\n";
    }
    str += "</div>\n";
    return str;
}

function formatThread(t) {
    var str = "<div class='thread'>\n";
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
            ".thread { width: 600px }"+
            ".tweet { margin: 1%; border: solid 1px; width: 94%; padding: 2%; font-family: sans-serif; font-size: small }\n"+
            ".tweet_avatar { display: inline-block; position: relative; width: 48px; height: 48px; overflow: hidden; border-radius: 50%; float: left; margin-right: 10px; margin-bottom: 10px }\n"+
            ".tweet_avatar img { width: 100%; height: 100% }\n"+
            ".tweet_header { margin-left: 60px }\n"+
            ".tweet_displayname { font-weight: bold }\n"+
            ".tweet_username { color: gray }\n"+
            ".tweet_timestamp { color: gray }\n"+
            ".tweet_id { float: right; display: none }\n"+
            ".tweet_body { margin-top: 2%; margin-left: 60px }\n"+
            ".tweet_imgs { margin-top: 2% }\n"+
            //".tweet_imgs { margin-top: 2%; margin-left: 60px }\n"+
            ".tweet_img { width: 100% }\n"+
            ".tweet_qts { margin-top: 2% }\n"+
            //".tweet_qts { margin-top: 2%; margin-left: 60px }\n"+
            ".tweet_original { margin-top: 2%; text-align: center; font-size: x-small }\n"+
            "  </style>\n"+
            " </head>\n"+
            " <body>\n"+
            "  <ul>");
for (var i = 0; i < threads.length; i++) {
    t = threads[i];
    if (ids.length == 0 || ids.indexOf(t.tweet.id_str) >= 0) {
        console.log("<li> THREAD "+t.tweet.id_str);
        console.log(formatThread(t));
    }
}
console.log("  </ul>\n"+
            " </body>\n"+
            "</html>")
