var config = require("../conf/config.json");

debug = function(message) {
    if (config.debug) {
        console.log("-------------------------------------------------------------------");
        console.log(message);
    }
}

module.exports = {
   debug 
};
