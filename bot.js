var HTTPS = require('https'),
    request = require('request'),
    fs = require('fs'),
    ImageService = require('groupme').ImageService, // GroupMe image service wrapper
    snoowrap = require('snoowrap');  // Reddit API wrapper

// Get GroupMe bot ID
var botID = process.env.BOT_ID;

// Get Reddit API config
const r = new snoowrap({
  userAgent: process.env.USER_AGENT,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN
});

// Called when a new message is sent to the group chat
function respond() {
  var request = JSON.parse(this.req.chunks[0]),
      // RegExp definitions
      warriorsRegExp = new RegExp(".*\\bwarriors\\b.*", "i"),
      sickRegExp = new RegExp(".*\\bsick\\b.*", "i"),
      wholesomeMemeRegExp = new RegExp(".*\\bmeme\\b.*", "i");

  var botResponse, imageUrl;

  // Return a normal 200 status code
  this.res.writeHead(200);

  // Matching logic
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
    // Message doesn't match any of the patterns we're interested in
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

  // Slightly different structure if we want to send an image
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

  console.log('sending ' + botResponse + ' to ' + botID);

  // actually post the message
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

// If we want to send an image, we first have to upload it to GroupMe's image
// processing service
function processImage(imageUrl, callback) {
  var imageStream = fs.createWriteStream('tmp-image');
  request(imageUrl).pipe(imageStream);

  imageStream.on('close', function() {
    ImageService.post(
      'tmp-image',
          function(err,ret) {
            if (err) {
              console.log('error posting image ', imageUrl, 'to GroupMe');
              //console.log(err);
              return callback(err, null);
            } else {
              return callback(null, ret.url);
            }
          });
  });
}

// Get top link from given subreddit
function getMeme(subreddit, callback) {
  r.getSubreddit(subreddit).getHot({limit: 20}).filter(post => post.is_self==false && post.stickied==false && post.likes==false).map(function(post) {
    console.log(post);
    return post;
  }).then(memes => {
    for (i = 0; i < memes.length; i++) {
      memes[i].upvote();
      return callback(memes[i].url);
    }
  });
}

getMeme('wholesomememes');

exports.respond = respond;