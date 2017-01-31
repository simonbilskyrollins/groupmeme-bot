var http, express, bodyParser, fs, bot, app, port;

http        = require('http');
express     = require('express');
bodyParser  = require('body-parser');
fs          = require('fs');
bot         = require('./bot.js');

app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Run server on port specified in .env or default to port 5000
port = Number(process.env.PORT || 5000);

// Display index.html for GET requests sent to /
app.get('/', function (req, res) {
  fs.readFile('index.html', function(err, data) {
    if (err) {
      console.log(err);
      res.writeHead(404, {"Content-Type": "text/html"});
    }
    else {
      res.writeHead(200, {"Content-Type": "text/html"});
      res.write(data);
    }
    res.end();
  });
});

// Pass message data POSTed to / to respond() in bot.js
app.post('/', function (req, res) {
  bot.respond(req, res);
});

// Handle form data POSTed to /send
app.post('/send', function (req, res) {
  var message = req.body.message;
  console.log('received form input', message);
  bot.postMessage(message);
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.write('sent message:\n\n');
  res.write(message);
  res.end();
});

app.listen(port, function () {
  console.log('Listening on port', port);
});
