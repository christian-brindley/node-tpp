var stylesheet = "" +
    "<style>" +
    "* {font-family: arial; font-size: 10pt;}" +
    "</style>";

var header = "" +
    "<html>" + 
    "<head>" +
    stylesheet +
    "</head>" +
    "<body>";
    
var footer = "" +
    "</body>" + 
    "</html>";
 
render = function(res,content) {
    res.writeHead(200, {'content-type': 'text/html'});
    res.end(header + content + footer);
}

module.exports = {
   render 
};
