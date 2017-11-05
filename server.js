var express = require('express');
var rewrite = require('express-urlrewrite');
var https = require('https');
var fs = require('fs');
var path = require('path');

var privateKey  = fs.readFileSync(__dirname + '/cert/key.pfx', 'ascii');
var certificate = fs.readFileSync(__dirname +'/cert/cert.pem', 'ascii');
var credentials = {key: privateKey, cert: certificate};

var app = express();

/*
fs.readdirSync(__dirname).forEach(function (file) {
  if (fs.statSync(path.join(__dirname, file)).isDirectory()) {
    app.use(rewrite('/' + file + '/*', '/' + file + '/index.html'));
  }
});*/

app.use('/', express.static(__dirname));
app.use(rewrite('index.html'));
app.use('/scritps', express.static(__dirname + '/scripts'));
app.use('/resources', express.static(__dirname + '/resources'));

var httpsServer = https.createServer(credentials, app);

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

app.listen(port);
httpsServer.listen(4443);
console.log("Express server listening on port " + port );
