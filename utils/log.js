var config = require("../conf/config.json");

function stageMessage(message) {
    return "**********************************************************************" +
           "\n" +
           "\n" +
           message +
           "\n" +
           "\n" +
           "**********************************************************************";
}

debug = function(message,stage) {
    if (config.debug) {
        if (stage) {
            message = stageMessage(message);
        }
        console.log("-------------------------------------------------------------------");
        console.log(message);
    }
}

module.exports = {
   debug 
};
