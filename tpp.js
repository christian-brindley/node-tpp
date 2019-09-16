const express = require('express');

// Funcs

require ("./utils/discovery.js");
var user = require ("./utils/user.js");
var log = require ("./utils/log.js");


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

app.get('/', (req, res) => {
  res.send('Hello world\n');
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
