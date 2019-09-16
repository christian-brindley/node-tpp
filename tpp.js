const express = require('express');

var session = require('express-session');
var bodyParser = require('body-parser');

// Funcs

require ("./utils/discovery.js");
var user = require ("./utils/user.js");
var log = require ("./utils/log.js");
var ui = require("./utils/ui.js");

var authCheck = function(req, res, next) {
    if (req.session && req.session.loggedin) {
        return next();
    }
    else {
      res.writeHead(302, {'Location': '/login'});
      res.end();
    }
};

// Load config

var config = require("./conf/config.json",);

// Fetch AS/RS info

var asConfig = fetchRemoteConfig(config.discovery.as,config.debug);

log.debug("AS details");
var asDetails = "" +
    "Authorise endpoint   " + asConfig.authorization_endpoint + "\n" +
    "Token endpoint       " + asConfig.token_endpoint + "\n" +
    "";

log.debug(asDetails);

// Constants

// App
const app = express();

app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    saveUninitialized: true
}));

// parse application/json
app.use(bodyParser.json());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', authCheck, function (req, res) {
    res.send("Welcome");
});

app.get('/login', function (req, res) {
    render(res,
	'Please log in<br/><br/>' +
	'<form action="/loginhandler" method="post">'+
	'<table>' +
	'<tr><td>Userid</td><td><input type="text" name="userid"></td></tr>'+
	'<tr><td>Password</td><td><input type="password" name="password"></td></tr>'+
	'<tr><td colspan="2" align="right"><input type="submit" value="Login"></td></tr>'+
	'</table>' +
	'</form>'
    );
});

app.post('/loginhandler', function (req, res) {
  if (!user.authenticate(req.body.userid,req.body.password)) {
	res.writeHead(302, {'Location': '/'});
	res.end();
  }
  else {
          req.session.loggedin = true;
	  req.session.userid = req.body.userid;
          res.writeHead(302, {'Location': '/'});
          res.end();
  }
});

app.get('/update', (req, res) => {
  res.send('Updating\n');
  user.update("jane.doe","access_token","lasdjfjkljsadfk");
});

app.get('/add', (req, res) => {
    user.add("john.doe","John Doe","Passw0rd");
    res.send('Adding\n');
});

app.listen(config.listen.port, config.listen.addr);
console.log(`Running on http://${config.listen.addr}:${config.listen.port}`);
