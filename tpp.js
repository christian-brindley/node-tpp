/***************************************************************************/
/*                                                                         */
/* Mock TPP service                                                        */
/*                                                                         */
/***************************************************************************/

const express = require('express');

var session = require('express-session');
var bodyParser = require('body-parser');

/***************************************************************************/
/*                                                                         */
/* Dependencies                                                            */
/*                                                                         */
/***************************************************************************/

var discovery = require ("./utils/discovery.js");
var user = require ("./utils/user.js");
var log = require ("./utils/log.js");
var ui = require("./utils/ui.js");
var ob = require("./utils/ob.js");

/***************************************************************************/
/*                                                                         */
/* Funcs                                                                   */
/*                                                                         */
/***************************************************************************/

// Build redirect URI relative to current request

function getRedirectUri(req)
{
    return req.protocol + "://" + req.get('Host') +  "/oauthreturn";

}

// Check whether authenticated

var authCheck = function(req, res, next) {
    if (req.session && req.session.loggedin) {
        return next();
    }
    else {
      res.writeHead(302, {'Location': '/login'});
      res.end();
    }
};

/***************************************************************************/
/*                                                                         */
/* Initialise                                                              */
/*                                                                         */
/***************************************************************************/

// Load config

var config = require("./conf/config.json",);

// Fetch AS/RS info

log.debug("Loading AS configuration from AM",true);
var asConfig = discovery.fetchRemoteConfig(config.discovery.as,config.debug);


log.debug("AS details");
var asDetails = "" +
    "Issuer               " + asConfig.issuer + "\n" +
    "Authorise endpoint   " + asConfig.authorization_endpoint + "\n" +
    "Token endpoint       " + asConfig.token_endpoint + "\n" +
    "";

log.debug(asDetails);

log.debug("Loading OB endpoint configuration from bank API",true);
var rsConfig = discovery.fetchRemoteConfig(config.discovery.rs,config.debug);
var rsAccountEndpoints = rsConfig.Data.AccountAndTransactionAPI[0].Links;


log.debug("RS details");
var rsDetails = "" +
    "Consents endpoint   " + rsAccountEndpoints.CreateAccountAccessConsent + "\n" + 
    "Accounts endpoint   " + rsAccountEndpoints.GetAccounts + "\n" +
    "";

log.debug(rsDetails);

// Main express handler

const app = express();

// Session handlera

app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    saveUninitialized: true
}));

// parse application/json

app.use(bodyParser.json());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

/***************************************************************************/
/*                                                                         */
/* / - Show balance summary  (or throw back to login)                      */
/*                                                                         */
/***************************************************************************/

app.get('/', authCheck, function (req, res) {

    var content = '' +
        '<form action="/accountmanager" method="post">'+
        '<table>' +
        '<tr><td>No banks currently linked.</td></tr>' +
        '<tr><td align="right"><input type="submit" value="Add"></td></tr>'+
        '</table>' +
        '</form>'

    ui.render(req,res,content);
});

app.get('/balances', function (req, res) {

    var accountSummary = "";
    var accounts = req.session.accountInfo;

    for (i = 0; accounts != null && i < accounts.length; i++) {
        accountSummary += "<tr><td class='balances'>Acme Bank</td><td class='balances'>" + accounts[i].accountid + "</td><td class='balances'>" + accounts[i].currency + "</td><td class='balances'>" + accounts[i].balance + "</td></tr>";
    }

    var content = 'Your account balances are as follows <br/><br/>' +
        '<table>' +
        '<tr><th class="balances">Bank</th><th class="balances">Account</th><th class="balances">Currency</th><th class="balances">Amount</th>' +
        accountSummary +
        '</table>';

    ui.render(req,res,content);
});

app.get('/refreshbalances', function (req, res) {
    ob.getAccountInfo("/balances",req.session.userid,rsConfig,req,res);
});


/***************************************************************************/
/*                                                                         */
/* /login - Authenticate to TPP                                            */
/*                                                                         */
/***************************************************************************/

app.get('/login', function (req, res) {
    render(req,res,
	'<form action="/loginhandler" method="post">'+
	'<table>' +
	'<tr><td>Userid</td><td><input type="text" name="userid"></td></tr>'+
	'<tr><td>Password</td><td><input type="password" name="password"></td></tr>'+
	'<tr><td colspan="2" align="right"><input type="submit" value="Login"></td></tr>'+
	'</table>' +
	'</form>',
        "userid"
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

/***************************************************************************/
/*                                                                         */
/* /accountmanager - add a bank to dashboard                               */
/*                                                                         */
/***************************************************************************/

app.post('/accountmanager', (req, res) => {
    var content = '' +
	'<form action="/accounthandler" method="post">'+
	'<table>' +
	'<tr><td>Choose a provider</td><td><select name="provider" onChange="this.form.provider.disabled = true; this.form.submit()"><option>Select...</option><option>Acme Bank</select></td></tr>'+
	'</table>' +
	'</form>';
    ui.render(req,res,content);
});

app.post('/accounthandler', (req, res) => {
    ob.getAccountAccess(session.userid, asConfig, rsConfig, res, getRedirectUri(req));
});

/***************************************************************************/
/*                                                                         */
/* /logout - end user session                                              */
/*                                                                         */
/***************************************************************************/

app.get('/logout', function (req, res) {
	req.session.destroy();
	res.writeHead(302, {'Location': '/'});
	res.end();
});

/***************************************************************************/
/*                                                                         */
/* /oauthreturn - callback to OAuth2 redirect uri with auth code           */
/*                uses js to pass back fragment as url variables to        */
/*                /oauthresult                                             */
/*                                                                         */
/***************************************************************************/

app.get('/oauthreturn', function (req, res) {
    var content = "<script>window.location.replace('/oauthresult?' + window.location.hash.substring(1));</script>";
    ui.render(req,res,content);            
});

/***************************************************************************/
/*                                                                         */
/* /oauthresult - send auth code to AM to get access token                 */
/*                                                                         */
/***************************************************************************/

app.get('/oauthresult', function (req, res) {
    ob.exchangeToken(req.session.userid,req.query.code, asConfig, res, getRedirectUri(req),"/refreshbalances");
});

/***************************************************************************/
/*                                                                         */
/* Kick off express                                                        */
/*                                                                         */
/***************************************************************************/
app.listen(config.listen.port, config.listen.addr);
console.log(`Running on http://${config.listen.addr}:${config.listen.port}`);
