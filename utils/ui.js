    
 
render = function(req,res,content,focus) {

    var stylesheet = "" +
        "<style>" +
        "body { margin: 0; background-color: #badff3 }" +
        "* {font-family: arial; font-size: 10pt }" +
        "div.title { background-color: #51A0D5; height: 20px; width: 100%; vertical-align: center; padding: 10px; color: white }" +
        "div.content { padding: 10px; margin: 0 auto }" +
        "a:link, a:visited, a:active { font-weight: normal; text-decoration: none; color: white }" +
        "a:hover { font-weight: normal; text-decoration: underline; color: white }" +
        "th.balances {text-align: left; font-weight: bold; color: white; background-color: #51A0D5; padding: 5px}" +
        "td.balances {text-align: left;  color: black; background-color: white; padding: 5px}" +
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
