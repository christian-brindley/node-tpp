var user = require("./user.js");
var config = require("../conf/config.json");
var fs = require('fs');
var log = require("./log.js");
// var https = require("https");
var https = require('http-debug').https;
https.debug = 1;



var OPERATION_SIGN         = 1;
var OPERATION_TOKEN        = 2;
var OPERATION_ACCESSINTENT = 3;

function getHttpOptions(operation,authorization)
{
    switch (operation) {

        case OPERATION_SIGN:
            httpHeaders = { 
                "Content-Type" : "application/json",
                "issuerId" : config.clientid
            }
            break;

        case OPERATION_TOKEN:
            httpHeaders = { 
                "Content-Type" : "application/x-www-form-urlencoded",
            }
            break;

        case OPERATION_ACCESSINTENT:
            httpHeaders = { 
                "Content-Type" : "application/json",
                "Authorization" : "Bearer " + authorization
            }
            break;

        default:
            httpHeaders = { 
                "Content-Type" : "application/json"
            }

    }

        
    return {
        method: 'POST',
        key: fs.readFileSync(config.transportcert.key),
        cert: fs.readFileSync(config.transportcert.cert),  
        headers: httpHeaders
    };

}


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
    var now = Math.round((new Date).getTime() / 1000);
    var exp = now + 600;
    var cred = { "sub" : config.clientid, "aud" : asConfig.issuer, "exp" : exp };
    log.debug("Built client cred");
    log.debug(JSON.stringify(cred));
    return cred;
}

getAccountAccess = function(userid,asConfig,rsConfig,res,redirectUri) {

    // First get access token for intent

    log.debug("Registering access intent");
    
    var cred = buildClientCred(asConfig);

    log.debug("Signing client creds at " + config.signingservice);

    var req = https.request(config.signingservice, getHttpOptions(OPERATION_SIGN,null), function(r) {
        log.debug("Response: " + r.statusCode);
        r.on('data', function(clientJwt) {
            log.debug(clientJwt.toString());

            getAccountAccessGetAccessToken(clientJwt,userid,asConfig,rsConfig,res,redirectUri);
        });
    });
    req.write(JSON.stringify(cred));
    req.end()

    // Use access token to register intent

    // Build and sign the request object

    // Redirect the user to the authorization server with the request
}

function getAccountAccessGetAccessToken(clientJwt,userid,asConfig,rsConfig,res,redirectUri) {
    log.debug("Requesting access token at " + asConfig.token_endpoint);

    var req = https.request(asConfig.token_endpoint, getHttpOptions(OPERATION_TOKEN,null), function(r) {
        log.debug("Response: " + r.statusCode);
        r.on('data', function(rsp) {
            var jsonResponse = rsp.toString();
            log.debug(jsonResponse);
            var accessToken = JSON.parse(jsonResponse).access_token;
            getAccountAccessCreateAccessIntent(accessToken,userid,asConfig,rsConfig,res,redirectUri);
        });
    });
    req.write("grant_type=client_credentials&scope=accounts&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=" + clientJwt);
    req.end()
}

function getAccountAccessCreateAccessIntent(accessToken,userid,asConfig,rsConfig,res,redirectUri) {
    log.debug("Creating Access Intent");
    var consentEndpoint = rsConfig.Data.AccountAndTransactionAPI[0].Links.CreateAccountAccessConsent;    
    var req = https.request(consentEndpoint, getHttpOptions(OPERATION_ACCESSINTENT,accessToken), function(r) {
        log.debug("Response: " + r.statusCode);
        r.on('data', function(rsp) {
            var jsonResponse = rsp.toString();
            
            log.debug(jsonResponse);
            var intent = JSON.parse(jsonResponse);
            var consentId = intent.Data.ConsentId;
            getAccountAccessAuthorizeIntent(consentId,userid,asConfig,rsConfig,res,redirectUri);
        });
    });
    req.write(accessIntent());
    req.end()

}

function accessIntent() {
    var accessIntent = {
        "Data": {
            "Permissions": [
                "ReadAccountsDetail",
                "ReadBalances",
                "ReadTransactionsDetail"
            ],
            "ExpirationDateTime": "2019-08-01T00:00:00+00:00",
            "TransactionFromDateTime": "2019-04-03T00:00:00+00:00",
            "TransactionToDateTime": "2019-08-01T00:00:00+00:00"
        },
        "Risk": {}
    };

    return JSON.stringify(accessIntent);
}

function requestObject(intentId,asConfig,redirectUri) {
    var now = Math.round((new Date).getTime() / 1000);
    var exp = now + 600;

    var request = {
        "aud": asConfig.issuer,
        "scope": "openid accounts",
        "iss": config.clientid,
        "claims": {
          "id_token": {
            "acr": {
              "value": "urn:openbanking:psd2:ca",
              "essential": true
            },
            "openbanking_intent_id": {
              "value": intentId,
              "essential": true
            }
          }
        },
        "response_type": "code id_token",
        "redirect_uri": redirectUri,
        "state": "10d260bf-a7d9-444a-92d9-7b7a5f088208",
        "exp": exp,
        "nonce": "10d260bf-a7d9-444a-92d9-7b7a5f088208",
        "client_id": config.clientid
    }

    return JSON.stringify(request);
}

function getAccountAccessAuthorizeIntent(consentId,userid,asConfig,rsConfig,res,redirectUri) {

    log.debug("Signing authz request object");

    var req = https.request(config.signingservice, getHttpOptions(OPERATION_SIGN,null), function(r) {
        log.debug("Response: " + r.statusCode);
        r.on('data', function(rsp) {
            var signedRequest = rsp.toString();
            log.debug(signedRequest);

            log.debug("Redirecting the user");
            var location = asConfig.authorization_endpoint + "?" +
                 "client_id=" + config.clientid + "&" + 
                 "response_type=code%20id_token" + "&" + 
                 "redirect_uri=" + redirectUri + "&" +
                 "scope=accounts%20openid" + "&" +
                 "state=10d260bf-a7d9-444a-92d9-7b7a5f088208" + "&" +
                 "nonce=10d260bf-a7d9-444a-92d9-7b7a5f088208" + "&" +
                 "request=" + signedRequest;

            log.debug("--> " + location);

            res.writeHead(302, {"Location": location});            
            res.end();
        });
    });
    req.write(requestObject(consentId,asConfig,redirectUri));

    req.end()

}

module.exports = {
    getAccountAccess,
    getAccountInfo
};
