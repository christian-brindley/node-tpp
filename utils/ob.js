var user = require("./user.js");
var config = require("../conf/config.json");
var https = require("https");
var fs = require('fs');
var log = require("./log.js");

var httpOptions = {
  method: 'POST',
  key: fs.readFileSync(config.transportcert.key),
  cert: fs.readFileSync(config.transportcert.cert),  
};

function getAccountIds(token) {
    return null;
}

getAccountInfo = function(userid) {
    var u = user.get(userid);
    if (u == null) {
        return null;
    }

    var token = u.access_token;

    if (token == null)
    {
        return null;
    }
    
    var accountids = getAccountIds(token);
}

function buildClientCred(asConfig) {
    var cred = { "sub" : config.clientid, "aud" : asConfig.issuer, "exp" : (new Date).getTime() };
    log.debug("Built client cred");
    log.debug(JSON.stringify(cred));
    return cred;
}

getAccountAccess = function(userid,asConfig,rsConfig,res) {
    // First get access token for intent

    log.debug("Registering access intent");
    
    var cred = buildClientCred(asConfig);

    log.debug("Signing client creds at " + config.signingservice);

    var req = https.request(config.signingservice, httpOptions, function(r) {
        log.debug("Reponse: " + r.statusCode);
        r.on('data', function(d) {
            log.debug(d.toString());
            res.writeHead(302, {'Location': '/'});
            res.end();
        });
    });
    req.write(JSON.stringify(cred));
    req.end()

    // Use access token to register intent

    // Build and sign the request object

    // Redirect the user to the authorization server with the request
}

module.exports = {
    getAccountAccess,
    getAccountInfo
};
