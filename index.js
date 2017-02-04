var express, bodyParser, bot, app, port

express = require('express')
bodyParser = require('body-parser')
bot = require('./bot.js')

// New express web app with a root dir, template engine, and a request parser
app = express()
app.use(express.static(__dirname))
app.set('view engine', 'pug')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

// Run server on port specified in .env or default to port 5000
port = Number(process.env.PORT || 5000)

// Display index.html for GET requests sent to /
app.get('/', function (req, res) {
  res.render('index', {})
})

// Pass message data POSTed to / to respond() in bot.js
app.post('/', function (req, res) {
  bot.respond(req, res)
})

// Handle form data POSTed to /send
app.post('/send', function (req, res) {
  var message = req.body.message
  var imageUrl = req.body.imageUrl
  console.log('received form input:', message, imageUrl)
  if (imageUrl) {
    bot.postImageMessage(message, imageUrl)
  } else {
    bot.postMessage(message)
  }
  res.render('send', { message: message, imageUrl: imageUrl })
})

app.listen(port, function () {
  console.log('Listening on port', port)
})
