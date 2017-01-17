var HTTPS = require('https');
var cool = require('cool-ascii-faces');

var botID = process.env.BOT_ID;

function respond() {
  var request = JSON.parse(this.req.chunks[0]),
      warriorsRegex = new RegExp(".*\\bwarriors\\b.*", "i"),
      wholesomeMemeRegex = new RegExp(".*\\bmeme\\b.*", "i");

  var botResponse, messageType, imageUrl;

  if (request.text && warriorsRegex.test(request.text)) {
    botResponse = "Did you know that the Golden State Warriors blew a 3-1 lead in the 2016 NBA Finals?";
    this.res.writeHead(200);
    postMessage(botResponse);
  } else if (request.text && wholesomeMemeRegex.test(request.text)) {
    botResponse = "I hope this meme brightens your day";
    messageType = "image";
    imageUrl = "";
    this.res.writeHead(200);
    //postMessage(botResponse, messageType, imageUrl);
  } else {
    console.log("don't care: ", request.text);
    this.res.writeHead(200);
  }
  this.res.end();
}

function postMessage(botResponse, messageType, imageUrl) {
  var options, body, botReq;

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  switch (messageType) {
    case "image":
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
    default:
      body = {
        "bot_id" : botID,
        "text" : botResponse
      };
  }

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


exports.respond = respond;