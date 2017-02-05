var HTTPS = require('https')
var request = require('request')
var fs = require('fs')
var ImageService = require('groupme').ImageService // GroupMe image service wrapper
var Snoowrap = require('snoowrap')  // Reddit API wrapper
var pg = require('pg')

// Get GroupMe bot ID
var botID = process.env.BOT_ID

// Get Reddit API config
var r = new Snoowrap({
  userAgent: process.env.USER_AGENT || null,
  clientId: process.env.CLIENT_ID || null,
  clientSecret: process.env.CLIENT_SECRET || null,
  refreshToken: process.env.REFRESH_TOKEN || null
})

// Array for regular expressions -> responses
function getActionArr () {
  return [
    // fun warriors facts
    {
      regex: new RegExp('.*\\bwarriors\\b.*', 'i'),
      action: function (inputString, nickname, userId) {
        var botResponse = 'Did you know that the Golden State Warriors blew a 3-1 lead in the 2016 NBA Finals?'
        if (nickname) {
          botResponse = 'Hey ' + nickname + ', did you know that the Golden State Warriors blew a 3-1 lead in the 2016 NBA Finals?'
        }
        postMessage(botResponse)
      }
    },

    // Did I hear something about the patriarchy?
    {
      regex: new RegExp('.*\\bpatriarch.*', 'i'),
      action: function (inputString, nickname, userId) {
        var botResponse = 'Fuck the patriarchy!'
        if (nickname) {
          botResponse = 'Fuck the patriarchy, ' + nickname + '!'
        }
        postMessage(botResponse)
      }
    },

    // find wholesome memes
    {
      regex: new RegExp('.*\\bmeme\\b.*', 'i'),
      action: function (inputString, nickname, userId) {
        var botResponse = 'I hope this brightens your day'
        if (nickname) {
          botResponse = 'I hope this brightens your day, ' + nickname
        }
        getMeme('wholesomememes', function (imageUrl) {
          postImageMessage(botResponse, imageUrl)
        })
      }
    },

    // pull xkcd comics
    {
      regex: new RegExp('.*\\b(xkcd|nerd|geek|dork|computer science).*', 'i'),
      action: function (inputString, nickname, userId) {
        var botResponse = ''
        if (nickname) {
          botResponse = 'Here you go, ' + nickname
        }
        getXkcd('', function (imageUrl, latestNum) {
          var randomNum = Math.ceil(Math.random() * latestNum)
          getXkcd(randomNum.toString(), function (imageUrl, num) {
            postImageMessage(botResponse, imageUrl)
          })
        })
      }
    },

    // You can call me "Al"
    {
      regex: new RegExp('.*\\bcall\\s*\\bme\\b\\s"(.*)".*', 'i'),
      action: function (inputString, nickname, userId) {
        // fix this (there should be a way to get "this.regex"):
        var hackyRegex = new RegExp('.*\\bcall\\s*\\bme\\b\\s"(.*)".*', 'i')
        var newNickname = inputString.match(hackyRegex)[1]
        var botResponse = 'Sure thing, ' + newNickname
        addIdNicknameRowToDatabase(userId, newNickname)
        postMessage(botResponse)
      }
    }
  ]
}

// Called when a new message is sent to the group chat
function respond (req, res) {
  var request = req.body
  console.log(request)
  // Return a normal 200 status code
  res.writeHead(200)

  // Matching logic
  var matched = false
  getActionArr().forEach(function (actionResponse) {
    matched = performActionIfAppropriate(request,
      request.text && request.text.match(actionResponse.regex),
      actionResponse.action, request.userId) || matched
  })

  // log stuff we ignored
  if (!matched) {
    console.log("don't care: ", request.text)
  }

  res.end()
}

function postMessage (botResponse, imageUrl) {
  var options, body, botReq

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  }

  // Slightly different structure if we want to send an image
  if (imageUrl) {
    body = {
      'bot_id': botID,
      'text': botResponse,
      'attachments': [
        {
          'type': 'image',
          'url': imageUrl
        }
      ]
    }
  } else {
    body = {
      'bot_id': botID,
      'text': botResponse
    }
  }

  console.log('sending ' + botResponse + ' to ' + botID)

  // actually post the message
  botReq = HTTPS.request(options, function (res) {
    if (res.statusCode === 202) {
        // neat
    } else {
      console.log('rejecting bad status code ' + res.statusCode)
    }
  })

  botReq.on('error', function (err) {
    console.log('error posting message ' + JSON.stringify(err))
  })
  botReq.on('timeout', function (err) {
    console.log('timeout posting message ' + JSON.stringify(err))
  })
  botReq.end(JSON.stringify(body))
}

// postMessage wrapper that takes care of annoying image-posting details
function postImageMessage (botResponse, imageUrl) {
  if (imageUrl) {
    processImage(imageUrl, function (err, processedImageUrl) {
      if (err) {
        return
      } else {
        console.log('attaching ' + processedImageUrl)
        postMessage(botResponse, processedImageUrl)
      }
    })
  } else {
    botResponse = "Sorry, something went wrong and I'm fresh out of memes"
    postMessage(botResponse)
  }
}

// If we want to send an image, we first have to upload it to GroupMe's image
// processing service
function processImage (imageUrl, callback) {
  var imageStream = fs.createWriteStream('tmp-image')
  request(imageUrl).pipe(imageStream)

  imageStream.on('close', function () {
    ImageService.post(
      'tmp-image',
          function (err, ret) {
            if (err) {
              console.log('error posting image ', imageUrl, 'to GroupMe')
              callback(err, null)
            } else {
              callback(null, ret.url)
            }
          })
  })
}

// Get top link from given subreddit
function getMeme (subreddit, callback) {
  r.getSubreddit(subreddit).getHot({limit: 20}).filter(post => {
    if (post.is_self === false && post.stickied === false && post.likes == null) {
      return post
    }
  }).then(post => {
    if (post.length > 0) {
      var meme = post[0]
      r.getSubmission(meme.id).upvote()
      console.log('retrieved meme ', meme.url)
      callback(meme.url)
    } else {
      console.log('ran out of /r/wholesomememes posts')
      callback()
    }
  })
}

// Get an xkcd comic
function getXkcd (number, callback) {
  var BASE_URL = 'https://xkcd.com/'
  var url
  if (number) {
    url = BASE_URL + number + '/info.0.json'
  } else {
    url = BASE_URL + 'info.0.json'
  }
  var options = {
    url: url,
    json: true
  }
  request(options, function (err, res, body) {
    if (res.statusCode === 200) {
      console.log('retrieved XKCD comic', body.num, body.img)
      var xkcd = {
        num: body.num,
        img: body.img,
        title: body.title,
        alt: body.alt
      }
      callback(xkcd)
    } else {
      console.log('error retrieveing XKCD comic:', err)
    }
  })
}

/**
 * Helper method for detecting bot-response-worthy messages
 */
function performActionIfAppropriate (request, isMatch, action, submitterId) {
  if (isMatch && request.name && request.name !== 'Beep Boop') {
    getNicknameAndFireOffAction(submitterId, action, request.text)
    // action(request.text, submitterId);
    return true
  }
  return false
}

/**
 * Helper methods for interacting with nickname database
 */
function addIdNicknameRowToDatabase (userId, nickname) {
  console.log('Building query')
  var existenceQuery = {
    text: 'SELECT * FROM nicknames WHERE id=$1;',
    values: [userId]
  }
  pg.connect(process.env.DATABASE_URL, function (err, client, done) {
    if (err) {
      console.error(err)
    }
    var entryExists = false
    client.query(existenceQuery, function (err, result) {
      done()
      if (err) {
        console.error(err)
      } else {
        entryExists = result.rowCount > 0
        console.log('rowCount: ' + result.rowCount)
        console.log('entryExists: ' + entryExists)
        if (entryExists) {
          console.log('update')
          updateNickname(userId, nickname)
        } else {
          console.log('insert')
          insertNickname(userId, nickname)
        }
      }
    })
  })
}

function updateNickname (userId, nickname) {
  var updateQuery = {
    text: 'UPDATE nicknames SET nickname = $1 WHERE id = $2;',
    values: [nickname, userId]
  }
  pg.connect(process.env.DATABASE_URL, function (err, client, done) {
    if (err) {
      console.error(err)
    }
    client.query(updateQuery, function (err, result) {
      done()
      if (err) {
        console.error(err)
      } else {
        console.log('Updated nickname to ' + nickname)
      }
    })
  })
}

function insertNickname (userId, nickname) {
  var insertQuery = {
    text: 'INSERT INTO nicknames (id, nickname) VALUES ($1, $2)',
    values: [userId, nickname]
  }
  pg.connect(process.env.DATABASE_URL, function (err, client, done) {
    if (err) {
      console.error(err)
    }
    client.query(insertQuery, function (err, result) {
      done()
      if (err) {
        console.error(err)
      } else {
        console.log('Inserted ' + nickname + ' as a nickname')
      }
    })
  })
}

 /**
  * Given a userId, returns either "" or the user's nickname.
  */
function getNicknameAndFireOffAction (userId, action, text) {
  var getQuery = {
    text: 'SELECT nickname FROM nicknames WHERE id=$1;',
    values: [userId]
  }
  pg.connect(process.env.DATABASE_URL, function (err, client, done) {
    if (err) {
      console.error(err)
    }
    client.query(getQuery, function (err, result) {
      done()
      if (err) {
        console.error(err)
      } else {
        if (result.rows[0]){
          action(text, result.rows[0].nickname, userId)
        } else {
          action(text, null, userId)
        }
      }
    })
  })
}

exports.respond = respond
exports.postMessage = postMessage
exports.postImageMessage = postImageMessage
