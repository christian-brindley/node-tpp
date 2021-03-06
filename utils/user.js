var fs = require('fs');

var log = require("./log.js");
var config = require("../conf/config.json");


function write (users) {
    var prettyUsers = JSON.stringify(users,null,2);
    fs.writeFile(config.userdb, prettyUsers, function (err) {
        if (err) {
            log.debug("Error writing to user db [" + err + "]");
            return false;
       } 
       log.debug("writing to " + config.userdb);
       log.debug(prettyUsers);
    });
}

get = function(userid) {
    var users = require(config.userdb);
    return users[userid];
}

update = function(userid,key,value) {

    var users = require(config.userdb);

    if (users[userid] == null) {
        log.debug("Couldn't find userid [" + userid + "]");
        return false;
    }
    users[userid][key] = value;
    write(users); 
}

add = function(userid,name,password) {
    var users = require(config.userdb);
    var user = {"common_name" : name, "password" : password};
    users[userid] = user;
    write(users);
}

authenticate = function(userid,password) {
    log.debug("Authenticating user [" + userid + "] password [" + password + "]");
    var users = require(config.userdb);
    var success = (users[userid] != null && users[userid].password == password);
    log.debug("Authenticated: " + success);
    return success;
}

module.exports = {
   add,
   update,
   authenticate,
   get
}; 
