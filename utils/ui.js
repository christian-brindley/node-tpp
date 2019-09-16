var config = require("../conf/config.json");

render = function(res,content) {
    res.writeHead(200, {'content-type': 'text/html'});
    res.end(content);
}

module.exports = {
   render 
};
