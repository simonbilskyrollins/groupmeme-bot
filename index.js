var http, director, cool, bot, router, server, port;

http        = require('http');
director    = require('director');
fs          = require('fs');
bot         = require('./bot.js');

router = new director.http.Router({
  '/' : {
    post: bot.respond,
    get: ping
  }
});

server = http.createServer(function (req, res) {
  req.chunks = [];
  req.on('data', function (chunk) {
    req.chunks.push(chunk.toString());
  });

  router.dispatch(req, res, function(err) {
    res.writeHead(err.status, {"Content-Type": "text/plain"});
    res.end(err.message);
  });
});

port = Number(process.env.PORT || 5000);
server.listen(port);

function ping() {
  var res = this.res;
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
}