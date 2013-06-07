var express = require('express'),
    moment = require('moment'),
    params = require('../../myparams.js'),
    models = require('../../models');

app = module.exports = express();

// ADMIN POST action
// update/delete tweet using POST ajax request
app.post('/update', function(req, res) {
	var password = 	req.body.pass;
	var action = 	req.body.action;
	var what = 		req.body.what;
	var id = 		req.body.id;
	console.log("POST ACTION");
	console.log(JSON.stringify(req.body,null,4));
	if(password==params.adminKey && action=='delete') {
		if(what=='tweet')
			models.Tweet.findOne({id_str:id},function(err,t){
				if(t!=null) {
					console.log("Removing tweet: "+t.text);
					t.remove();
				} else {
					console.log("No tweet found");
				}
			});
		if(what=='event')
			models.Event.findOne({_id:id},function(err,t){
				if(t!=null) {
					console.log("Removing event: "+t.nom);
					t.remove();
				} else {
					console.log("No event found");
				}
			});
		res.json({'status':'done'});
	} else {
		res.json({'status':'not admin'});
	}
});
