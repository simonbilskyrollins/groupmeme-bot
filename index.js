var http, express, bodyParser, fs, bot, app, port;

http        = require('http');
express     = require('express');
bodyParser  = require('body-parser');
fs          = require('fs');
bot         = require('./bot.js');

app = express();
app.use(bodyParser.urlencoded({extended: false}));

// router = new director.http.Router({
//   '/' : {
//     post: bot.respond,
//     get: ping
//   },
//   '/send' : {
//     post: postUserMessage,
//     get: ping
//   }
// });

// server = http.createServer(function (req, res) {
//   req.chunks = [];
//   req.on('data', function (chunk) {
//     req.chunks.push(chunk.toString());
//   });

//   router.dispatch(req, res, function(err) {
//     res.writeHead(err.status, {"Content-Type": "text/plain"});
//     res.end(err.message);
//   });
// });

port = Number(process.env.PORT || 5000);
//server.listen(port);

app.get('/', function (req, res) {
  //var res = this.res;
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

app.post('/', function (req, res) {
  req.chunks = [];
  req.on('data', function (chunk) {
    req.chunks.push(chunk.toString());
  });
  bot.respond(req, res);
});

app.post('/send', function (req, res) {
  console.log(req.body.message);
  res.send('Yay');
  // form.parse(req, function(err, fields) {
  //   console.log('parse');
  //   if (err) {
  //     console.log(err);
  //     res.writeHead(500, {"Content-Type": "text/html"});
  //     res.end();
  //   } else {
  //     console.log('sent');
  //     res.writeHead(200, {"Content-Type": "text/plain"});
  //     res.write('sent message:\n\n');
  //     //res.end(util.inspect({fields: fields}));
  //     res.end();
  //   }
  // });
});

app.listen(port, function () {
  console.log('Listening on port', port);
});
