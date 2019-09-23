    
 
render = function(req,res,content,focus) {

    var stylesheet = "" +
        "<style>" +
        "body { margin: 0; background-color: #badff3 }" +
        "* {font-family: arial; font-size: 10pt }" +
        "div.title { background-color: #1E90FF; height: 20px; width: 100%; vertical-align: center; padding: 10px; color: white }" +
        "div.content { padding: 10px; margin: auto; }" +
        "a:link, a:visited, a:active { font-weight: normal; text-decoration: none; color: white }" +
        "a:hover { font-weight: normal; text-decoration: underline; color: white }" +
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
