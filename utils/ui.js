    
 
render = function(req,res,content,focus) {

    var stylesheet = "" +
        "<style>" +
        "body { margin: 0 }" +
        "* {font-family: arial; font-size: 10pt }" +
        "div.title { background-color: #f0f0f0; height: 25px; width: 100%; vertical-align: center; padding: 10px }" +
        "div.content { padding: 10px; margin: auto }" +
        "a:link, a:visited, a:active { font-weight: normal; text-decoration: none; color: black }" +
        "a:hover { font-weight: normal; text-decoration: underline; color: black }" +
        "</style>";

    var bodytag = focus ? "<body onload=\"document.all['" + focus + "'].focus()\">" : "<body>";

    var header = "" +
        "<html>" + 
        "<head>" +
        stylesheet +
        "</head>" +
        bodytag + 
        "";

    var footer = "" +
        "</body>" + 
        "</html>";

    var usertext = req.session.loggedin ? ("<b>" + req.session.userid + "</b> | <a href='/logout'>logout</a> ") : "";

    var title = "<div class='title'><b>Findemo Dashboard</b><div style='float: right; padding-right: 20px'>" + usertext + "</div></div>";
    res.writeHead(200, {'content-type': 'text/html'});
    res.end(header + title + "<div class='content'>" + content + "</div>" + footer);
}

module.exports = {
   render 
};
