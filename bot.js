const HTTPS = require('https')
const request = require('request')
const fs = require('fs')
const syllable = require('syllable')
const ImageService = require('groupme').ImageService // GroupMe image service wrapper
const Snoowrap = require('snoowrap') // Reddit API wrapper
const pg = require('pg')

// Get GroupMe bot ID
const botID = process.env.BOT_ID

// Get Reddit API config
const r = new Snoowrap({
  userAgent: process.env.USER_AGENT || ' ', // userAgent == null throws an error
  clientId: process.env.CLIENT_ID || null,
  clientSecret: process.env.CLIENT_SECRET || null,
  refreshToken: process.env.REFRESH_TOKEN || null
})

// Array for regular expressions -> responses
function getActionArr () {
  return [
    // fun warriors facts
    {
      regex: /\bwarriors\b/i,
      action: (inputString, nickname) => {
        var botResponse = 'Did you know that the Golden State Warriors hold the record for the best regular season in NBA history? They went 73-9 in the 2015-2016 season!'
        if (nickname) {
          if (request.name !== 'Stephanie Levine') {
            botResponse = 'I bet Stephanie could beat ' + nickname + ' in a fight.'
          } else {
            botResponse = 'I agree.'
          }
        }
        postMessage(botResponse)
      }
    },

    // Did I hear something about the patriarchy?
    {
      regex: /\bpatriarch(s|y|ical)?/i,
      action: (inputString, nickname) => {
        var botResponse = 'Fuck the patriarchy!'
        if (nickname) {
          botResponse = 'Fuck the patriarchy, ' + nickname + '!'
        }
        postMessage(botResponse)
      }
    },

    // find wholesome memes
    {
      regex: /\bmemes?\b/i,
      action: (inputString, nickname) => {
        var botResponse = 'I hope this brightens your day'
        if (nickname) {
          botResponse = 'I hope this brightens your day, ' + nickname
        }
        getMeme('wholesomememes', (imageUrl) => {
          postImageMessage(botResponse, imageUrl)
        })
      }
    },

    // pull xkcd comics
    {
      regex: /\b(xkcd|nerd|geek|dork|computer science)(s|y)?\b/i,
      action: (inputString, nickname) => {
        var botResponse = ''
        if (nickname) {
          botResponse = 'Here you go, ' + nickname
        }
        getXkcd('', xkcd => {
          var randomNum = Math.ceil(Math.random() * xkcd.num)
          getXkcd(randomNum.toString(), xkcd => {
            postImageMessage(botResponse, xkcd.img)
          })
        })
      }
    },

    // Ron Swanson is a pretty cool dude
    {
      regex: /\b(Ron|Swanson)\b/i,
      action: (inputString, nickname) => {
        getRonSwansonQuote(quote => {
          postMessage(quote || 'Sorry, something went wrong retrieving a Ron Swanson quote.')
        })
      }
    },

    // You can call me "Al"
    {
      regex: /\bcall\s*\bme\b\s"(.*)"/i,
      action: (inputString, nickname, userId) => {
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

  // Return a normal 200 status code
  res.writeHead(200)

  if (request.name && request.name === 'Beep Boop') {
    console.log('ignoring message sent by Beep Boop')
  } else {
    // Matching logic
    var matched = false
    getActionArr().forEach(actionResponse => {
      matched = performActionIfAppropriate(request,
        request.text && request.text.match(actionResponse.regex),
        actionResponse.action, request.user_id) || matched
    })

    if (!matched) {
      let haiku = detectHaiku(request.text)
      if (haiku) {
        postMessage('That sounds like it would make a nice haiku:\n\n' + haiku)
      } else {
        console.log("don't care: ", request.text)
      }
    }
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
      'attachments': [{
        'type': 'image',
        'url': imageUrl
      }]
    }
  } else {
    body = {
      'bot_id': botID,
      'text': botResponse
    }
  }

  console.log('sending ' + botResponse + ' to ' + botID)

  // actually post the message
  botReq = HTTPS.request(options, res => {
    if (res.statusCode === 202) {
      // neat
    } else {
      console.log('rejecting bad status code ' + res.statusCode)
    }
  })

  botReq.on('error', err => {
    console.log('error posting message ' + JSON.stringify(err))
  })
  botReq.on('timeout', err => {
    console.log('timeout posting message ' + JSON.stringify(err))
  })
  botReq.end(JSON.stringify(body))
}

// postMessage wrapper that takes care of annoying image-posting details
function postImageMessage (botResponse, imageUrl) {
  if (imageUrl) {
    processImage(imageUrl, (err, processedImageUrl) => {
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

  imageStream.on('close', () => {
    ImageService.post(
      'tmp-image',
      (err, ret) => {
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
  r.getSubreddit(subreddit).getHot({ limit: 20 }).filter(post => {
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
  request(options, (err, res, body) => {
    if (res.statusCode === 200) {
      console.log('retrieved XKCD comic', body.num, body.img)
      var xkcd = {
        num: body.num,
        img: body.img,
        title: body.title,
        alt: body.alt
      }
      callback(xkcd)
    } else if (err) {
      console.log('error retrieveing XKCD comic', url)
      callback()
    }
  })
}

// Get a Ron Swanson quote
function getRonSwansonQuote (callback) {
  var url = 'http://ron-swanson-quotes.herokuapp.com/v2/quotes'
  var options = {
    url: url,
    json: true
  }
  request(options, (err, res, body) => {
    if (res.statusCode === 200) {
      var quote = body[0]
      console.log('retrieved Ron Swanson quote', quote)
      callback(quote)
    } else if (err) {
      console.log('error retrieving Ron Swanson quote', err)
      callback()
    }
  })
}

function detectHaiku (message) {
  if (syllable(message) !== 17) {
    return false
  } else {
    console.log('17-syllable message; checking for haiku')
    message = message.replace(/\r?\n|\r/g, ' ')
    message = message.replace(/\s+/g, ' ')
    let words = message.split(' ')
    let lineNumber = 1
    let syllablesToNextLine = 5
    let haiku = ''
    words.forEach(word => {
      haiku += word
      let wordSyllables = syllable(word)
      syllablesToNextLine -= wordSyllables
      if (syllablesToNextLine < 0) {
        haiku = false
        console.log('no dice on the haiku :(')
      } else if (syllablesToNextLine === 0) {
        lineNumber++
        if (lineNumber === 2) {
          haiku += '\n'
          syllablesToNextLine = 7
        } else if (lineNumber === 3) {
          haiku += '\n'
          syllablesToNextLine = 5
        }
      } else {
        haiku += ' '
      }
    })
    return haiku
  }
}

/**
 * Helper method for detecting bot-response-worthy messages
 */
function performActionIfAppropriate (request, isMatch, action, submitterId) {
  if (isMatch) {
    getNicknameAndFireOffAction(submitterId, action, request.text)
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
  pg.connect(process.env.DATABASE_URL, (err, client, done) => {
    if (err) {
      console.error(err)
    }
    var entryExists = false
    client.query(existenceQuery, (err, result) => {
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
  pg.connect(process.env.DATABASE_URL, (err, client, done) => {
    if (err) {
      console.error(err)
    }
    client.query(updateQuery, (err, result) => {
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
  pg.connect(process.env.DATABASE_URL, (err, client, done) => {
    if (err) {
      console.error(err)
    }
    client.query(insertQuery, (err, result) => {
      done()
      if (err) {
        console.error(err)
      } else {
        console.log('Inserted ' + nickname + ' as a nickname with id ' + userId)
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
  pg.connect(process.env.DATABASE_URL, (err, client, done) => {
    if (err) {
      console.error(err)
    }
    client.query(getQuery, (err, result) => {
      done()
      if (err) {
        console.error(err)
      } else {
        if (result.rows[0]) {
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
