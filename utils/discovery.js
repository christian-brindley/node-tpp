var log = require ("./log.js");

fetchRemoteConfig = function(url) {
    var request = require('sync-request');
    log.debug("Requesting config from " + url);
    var res = request('GET', url);
    var data = res.getBody().toString();
    log.debug(data);
    var json = JSON.parse(data);
    return json;
}

module.exports = {
    fetchRemoteConfig
};
