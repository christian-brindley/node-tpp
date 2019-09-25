/***************************************************************************/
/*                                                                         */
/* Open Banking calls                                                      */
/*                                                                         */
/***************************************************************************/

var user = require("./user.js");
var config = require("../conf/config.json");
var fs = require('fs');
var log = require("./log.js");
var https;
if (config.debug) {
    https = require('http-debug').https;
    https.debug = 1;
}
else {
    https = require("https");
}

// Constants

var OPERATION_SIGN         = 1;
var OPERATION_TOKEN        = 2;
var OPERATION_ACCESSINTENT = 3;
var OPERATION_GETACCOUNTS  = 4;

/***************************************************************************/
/*                                                                         */
/* Utility funcs                                                           */
/*                                                                         */
/***************************************************************************/

// Set up HTTP options for each type of call 

function getHttpOptions(operation,authorization)
{
    var method = 'POST';

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

        case OPERATION_GETACCOUNTS:
            method = 'GET';
            httpHeaders = { 
                "Content-Type" : "application/json",
                "Authorization" : "Bearer " + authorization,
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
        method: method,
        key: fs.readFileSync(config.transportcert.key),
        cert: fs.readFileSync(config.transportcert.cert),  
        headers: httpHeaders
    };

}

// Build unsigned client credential 

function buildClientCred(asConfig) {
    var now = Math.round((new Date).getTime() / 1000);
    var exp = now + 600;
    var cred = { "sub" : config.clientid, "aud" : asConfig.issuer, "exp" : exp };
    log.debug("Built client cred");
    log.debug(JSON.stringify(cred));
    return cred;
}

/***************************************************************************/
/*                                                                         */
/* Load account balances from accounts endpoint                            */
/*                                                                         */
/***************************************************************************/

// Main entry point

getAccountInfo = function(landingPage,userid,rsConfig,userReq,res) {
    var u = user.get(userid);
    var token = u.access_token;

    if (token == null)
    {
        // Terminate
        res.writeHead(302, {"Location": landingPage});            
        return;
    }
    
    getAccountInfoGetAccountIds(landingPage,userid,rsConfig,userReq,res,token);
}

// Fetch a list of account IDs consented to 

function getAccountInfoGetAccountIds(landingPage,userid,rsConfig,userReq,res,token) {
         
    log.debug("Fetching account IDs");
    var accountsEndpoint = rsConfig.Data.AccountAndTransactionAPI[0].Links.GetAccounts;    
    var req = https.request(accountsEndpoint, getHttpOptions(OPERATION_GETACCOUNTS,token), function(r) {
        log.debug("Response: " + r.statusCode);
        r.on('data', function(rsp) {
            var jsonResponse = rsp.toString();
            
            log.debug(jsonResponse);
            var accountData = JSON.parse(jsonResponse);
            var accounts = accountData.Data.Account;
            getAccountInfoLoadIntoSession(landingPage,userid,rsConfig,userReq,res,token,accounts);
            
        });
    });
    req.end()
}

// For each account ID, load the balance into the user session

function getAccountInfoLoadIntoSession(landingPage,userid,rsConfig,userReq,res,token,accounts,index) {
    if (index == null) {
        index = 0;
        userReq.session.accountInfo = new Array();
    }
    else if (index == accounts.length) {
        // Wrap up
        res.writeHead(302, {"Location": landingPage});            
        res.end();
        return;
    }

    var accountId = accounts[index].AccountId; 
   

    log.debug("Fetching info for account ID [" + accountId + "]");
    var balancesEndpoint = rsConfig.Data.AccountAndTransactionAPI[0].Links.GetAccountBalances;    
    var uri = balancesEndpoint.replace("{AccountId}",accountId);
    var req = https.request(uri, getHttpOptions(OPERATION_GETACCOUNTS,token), function(r) {
        log.debug("Response: " + r.statusCode);
        r.on('data', function(rsp) {
            var jsonResponse = rsp.toString();
            
            log.debug(jsonResponse);
            var accountData = JSON.parse(jsonResponse);
            var amount = accountData.Data.Balance[0].Amount;
            userReq.session.accountInfo.push( { "accountid": accountId, "balance" : amount.Amount, "currency": amount.Currency });
            getAccountInfoLoadIntoSession(landingPage,userid,rsConfig,userReq,res,token,accounts,index + 1);
            
        });
    });
    req.end()


}

/***************************************************************************/
/*                                                                         */
/* Set up hybrid flow for obtaining token for accounts endpoint            */
/*                                                                         */
/* 1. Get an access token to register intent                               */
/* 2. Register intent with access token                                    */
/* 3. Build signed request object with intent id                           */
/* 4. Redirect user to authorization endpoint with request object          */
/*                                                                         */
/***************************************************************************/

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

/***************************************************************************/
/*                                                                         */
/* Complete hybrid flow for account access token - exchange auth code for  */
/* access token                                                            */
/*                                                                         */
/***************************************************************************/

exchangeToken = function(userid,code,asConfig,res,redirectUri,landingPage) {

    log.debug("Exchange auth code for token");
    
    var cred = buildClientCred(asConfig);

    log.debug("Signing client creds at " + config.signingservice);

    var req = https.request(config.signingservice, getHttpOptions(OPERATION_SIGN,null), function(r) {
        log.debug("Response: " + r.statusCode);
        r.on('data', function(clientJwt) {
            log.debug(clientJwt.toString());

            exchangeTokenGetAccessToken(userid,clientJwt,code,asConfig,res,redirectUri,landingPage);
        });
    });
    req.write(JSON.stringify(cred));
    req.end()
}

function exchangeTokenGetAccessToken(userid,clientJwt,code,asConfig,res,redirectUri,landingPage) {
    log.debug("Requesting access token at " + asConfig.token_endpoint);

    var req = https.request(asConfig.token_endpoint, getHttpOptions(OPERATION_TOKEN,null), function(r) {
        log.debug("Response: " + r.statusCode);
        r.on('data', function(rsp) {
            var jsonResponse = rsp.toString();
            log.debug(jsonResponse);
            var accessToken = JSON.parse(jsonResponse).access_token;
            user.update(userid,"access_token",accessToken);            
            res.writeHead(302, {"Location": landingPage});            
            res.end();
        });
    });
    req.write("redirect_uri=" + redirectUri + "&grant_type=authorization_code&code=" + code + "&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=" + clientJwt);
    req.end()
}

module.exports = {
    getAccountAccess,
    getAccountInfo,
    exchangeToken
};
