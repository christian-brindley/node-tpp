const express = require('express');

var session = require('express-session');
var bodyParser = require('body-parser');

// Funcs

var discovery = require ("./utils/discovery.js");
var user = require ("./utils/user.js");
var log = require ("./utils/log.js");
var ui = require("./utils/ui.js");
var ob = require("./utils/ob.js");


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

var asConfig = discovery.fetchRemoteConfig(config.discovery.as,config.debug);

log.debug("AS details");
var asDetails = "" +
    "Issuer               " + asConfig.issuer + "\n" +
    "Authorise endpoint   " + asConfig.authorization_endpoint + "\n" +
    "Token endpoint       " + asConfig.token_endpoint + "\n" +
    "";

log.debug(asDetails);

var rsConfig = discovery.fetchRemoteConfig(config.discovery.rs,config.debug);
var rsAccountEndpoints = rsConfig.Data.AccountAndTransactionAPI[0].Links;

log.debug("RS details");
var rsDetails = "" +
    "Consents endpoint   " + rsAccountEndpoints.CreateAccountAccessConsent + "\n" + 
    "Accounts endpoint   " + rsAccountEndpoints.GetAccounts + "\n" +
    "";

log.debug(rsDetails);

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
    var accounts = ob.getAccountInfo(req.session.userid);
    var accountSummary = "";
    for (i = 0; accounts != null && i < accounts.size; i++) {
        accountSummary += "<tr><td>" + accounts[i].id + "</td><td>" + accounts[i].balance + "</td></tr>";
    }
    var content = 'Your account balances as follows' +
	'<form action="/accountmanager" method="post">'+
	'<table>' +
        accountSummary + 
	'<tr><td colspan="2" align="right"><input type="submit" value="Add"></td></tr>'+
	'</table>' +
	'</form>'
        
    ui.render(res,content);
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

app.post('/accountmanager', (req, res) => {
    var content = 'Select a financial services provider' +
	'<form action="/accounthandler" method="post">'+
	'<table>' +
	'<tr><td>Provider</td><td><select name="provider" onChange="this.form.submit()"><option>Select...</option><option>Acme Bank</select></td></tr>'+
	'</table>' +
	'</form>';
    ui.render(res,content);
});

app.post('/accounthandler', (req, res) => {
    ob.getAccountAccess(session.userid, asConfig, rsConfig, res);
});

app.listen(config.listen.port, config.listen.addr);
console.log(`Running on http://${config.listen.addr}:${config.listen.port}`);
