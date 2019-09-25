var log = require ("./log.js");

fetchRemoteConfig = function(url) {
    var request = require('sync-request');
    log.debug("Requesting config from " + url);
    var res = request('GET', url);
    var data = res.getBody().toString();
    var json = JSON.parse(data);
    log.debug(JSON.stringify(json,null,2));
    return json;
}

module.exports = {
    fetchRemoteConfig
};
