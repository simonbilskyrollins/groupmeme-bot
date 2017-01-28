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
      wholesomeMemeRegExp = new RegExp(".*\\bmeme.*", "i"),
      xkcdRegExp = new RegExp(".*\\b(xkcd|nerd|geek|dork|computer science).*", "i");

  var botResponse, imageUrl;

  // Return a normal 200 status code
  this.res.writeHead(200);

  // Matching logic
  if (request.text && warriorsRegExp.test(request.text) && request.name && request.name !== "Beep Boop") {
    botResponse = "Did you know that the Golden State Warriors blew a 3-1 lead in the 2016 NBA Finals?";
    postMessage(botResponse);
  } else if (request.text && sickRegExp.test(request.text) && request.name && request.name !== "Beep Boop") {
    botResponse = "Too bad your immune system isn't as good as Steph's :(";
    postMessage(botResponse);
  } else if (request.text && xkcdRegExp.test(request.text) && request.name && request.name !== "Beep Boop") {
    botResponse = "";
    getXkcd('', function(imageUrl, latestNum) {
      var randomNum = Math.ceil(Math.random() * latestNum);
      getXkcd(randomNum.toString(), function(imageUrl, num) {
        postImageMessage(botResponse, imageUrl);
      });
    });
  } else if (request.text && wholesomeMemeRegExp.test(request.text) && request.name && request.name !== "Beep Boop") {
    botResponse = "I hope this brightens your day";
    getMeme('wholesomememes', function(imageUrl) {
      postImageMessage(botResponse, imageUrl);
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

// postMessage wrapper that takes care of annoying image-posting details
function postImageMessage(botResponse, imageUrl) {
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
              callback(err, null);
            } else {
              callback(null, ret.url);
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
      console.log('retrieved meme ', meme.url);
      callback(meme.url);
    } else {
      console.log('ran out of /r/wholesomememes posts');
      callback();
    }
  });
}

// Get an xkcd comic
function getXkcd(number, callback) {
  var BASE_URL = 'https://xkcd.com/';
  if (number) {
    url = BASE_URL + number + '/info.0.json';
  } else {
    url = BASE_URL + 'info.0.json';
  }
  var options = {
    url: url,
    json: true
  };
  request(options, function(err, res, body) {
    if (res.statusCode == 200) {
      console.log('retrieved XKCD comic', body.num, body.img);
      callback(body.img, body.num);
    } else {
      console.log('error retrieveing XKCD comic');
    }
  });
}


exports.respond = respond;