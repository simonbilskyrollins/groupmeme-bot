var HTTPS = require('https'),
    request = require('request'),
    fs = require('fs'),
    ImageService = require('groupme').ImageService,
    snoowrap = require('snoowrap');

var botID = process.env.BOT_ID;

const r = new snoowrap({
  userAgent: process.env.USER_AGENT,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN
});

function respond() {
  var request = JSON.parse(this.req.chunks[0]),
      warriorsRegExp = new RegExp(".*\\bwarriors\\b.*", "i"),
      sickRegExp = new RegExp(".*\\bsick\\b.*", "i"),
      wholesomeMemeRegExp = new RegExp(".*\\bmeme\\b.*", "i");

  var botResponse, messageType, imageUrl;

  this.res.writeHead(200);

  if (request.text && warriorsRegExp.test(request.text)) {
    botResponse = "Did you know that the Golden State Warriors blew a 3-1 lead in the 2016 NBA Finals?";
    postMessage(botResponse);
  } else if (request.text && sickRegExp.test(request.text)) {
    botResponse = "Too bad your immune system isn't as good as Steph's :("
    postMessage(botResponse);
  } else if (request.text && wholesomeMemeRegExp.test(request.text)) {
    botResponse = "I hope this brightens your day";
    getMeme('wholesomememes', function(imageUrl) {
      processImage(imageUrl, function(err, processedImageUrl) {
        if (err) {
          return;
        } else {
          console.log('attaching ' + processedImageUrl);
          postMessage(botResponse, processedImageUrl);
        }
      })
    });
  } else {
    console.log("don't care: ", request.text);
  }
  this.res.end();
}

function postMessage(botResponse, imageUrl) {
  var options, body, botReq;

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  if (imageUrl) {
    body = {
      "bot_id" : botID,
      "text" : botResponse,
      "attachments" : [
        {
          "type"  : "image",
          "url"   : imageUrl
        }
      ]
    };
  } else {
    body = {
      "bot_id" : botID,
      "text" : botResponse
    };
  }
  console.log(body);

  console.log('sending ' + botResponse + ' to ' + botID);

  botReq = HTTPS.request(options, function(res) {
      if(res.statusCode == 202) {
        //neat
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}

function processImage(imageUrl, callback) {
  var imageStream = fs.createWriteStream('tmp-image');
  request(imageUrl).pipe(imageStream);

  imageStream.on('close', function() {
    ImageService.post(
      'tmp-image',
          function(err,ret) {
            if (err) {
              console.log('error posting image to GroupMe')
              return callback(err, null);
            } else {
              return callback(null, ret.url);
            }
          });
  });
}

function getMeme(subreddit, callback) {
  r.getSubreddit(subreddit).getHot().map(post => post.url).then(memes => {
    var selfPostRegExp = new RegExp(".*www.reddit.com/r/.*");
    for (i = 0; i < memes.length; i++) {
      if (selfPostRegExp.test(memes[i])) {
        continue;
      } else {
        return callback(memes[i]);
      }
    }
  });
}


exports.respond = respond;