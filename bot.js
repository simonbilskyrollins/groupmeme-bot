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


// Array for regular expressions -> responses
function getActionArr(){
  return [ 
    //Fun warriors facts
    {
      regex : new RegExp(".*\\bwarriors\\b.*", "i"),
      action : function() {
        botResponse = "Did you know that the Golden State Warriors blew a 3-1 lead in the 2016 NBA Finals?";
        postMessage(botResponse);
      }
    },

    //talk about illnesses
    {
      regex: new RegExp(".*\\bsick\\b.*", "i"),
      action : function() {
        botResponse = "Too bad your immune system isn't as good as Steph's :(";
        postMessage(botResponse);
      }
    },

    //find wholesome memes
    {
      regex : new RegExp(".*\\bmeme\\b.*", "i"),
      action : function() {
        botResponse = "I hope this brightens your day";
        getMeme('wholesomememes', function(imageUrl) {
          if (imageUrl) {
            processImage(imageUrl, function(err, processedImageUrl) {
              if (err) {
                return;
              } else {
                console.log('attaching ' + processedImageUrl);
                postMessage(botResponse, processedImageUrl);
              }
            })
          } else {
            botResponse = "Sorry, something went wrong and I'm fresh out of memes"
            postMessage(botResponse);
          }
        });
      }
    }
  ];
}

// Called when a new message is sent to the group chat
function respond() {
  var request = JSON.parse(this.req.chunks[0])

  var botResponse, imageUrl;

  // Return a normal 200 status code
  this.res.writeHead(200);

  // Matching logic
  var matched = false;
  getActionArr().forEach(function(actionResponse){
    matched = performActionIfAppropriate(request, 
      request.text && request.text.match(actionResponse.regex), 
      actionResponse['action']) || matched;
  });

  //log stuff we ignored
  if (!matched){
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
              return callback(err, null);
            } else {
              return callback(null, ret.url);
            }
          });
  });
}

// Get top link from given subreddit
function getMeme(subreddit, callback) {
  r.getSubreddit(subreddit).getHot({limit: 20}).filter(post => {
    if (post.is_self==false && post.stickied==false && post.likes==null) {
      return post;
  }}).then(post => {
    if (post.length > 0) {
      meme = post[0]
      r.getSubmission(meme.id).upvote();
      console.log("retrieved meme ", meme.url);
      return callback(meme.url);
    } else {
      console.log('ran out of /r/wholesomememes posts');
      return callback();
    }
  });
}

/**
 * Helper method for detecting bot-response-worthy messages
 */
 function performActionIfAppropriate(request, isMatch, action){
  if(isMatch && request.name && request.name !== "Beep Boop"){
    action();
    return true;
  }
  return false;
 }

exports.respond = respond;