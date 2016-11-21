var http       = require('http');
var express    = require('express');
var mongodb    = require('mongodb').MongoClient;
var bodyParser = require('body-parser');

var uri = process.env.MONGODB_URI || "mongodb://localhost/SE464";
if(process.env.OPENSHIFT_MONGODB_DB_URL){
	uri = process.env.OPENSHIFT_MONGODB_DB_URL;
}

var app = express();

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3002);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
app.use(bodyParser.json());

mongodb.connect(uri)
	.then(startServer)
	.catch(function(err) {
		console.log(err);
		console.log("Could not start server")
	});

function startServer(db) {
	// list all required files here.
	require('./app/images/images')(app, db);
	require('./app/users/users')(app, db);
	require('./app/ratings/ratings')(app, db);

	if(process.env.OPENSHIFT_NODEJS_IP){
		console.log("Server starting on port " + app.get('port') + app.get('ip'));
		app.listen(app.get('port'), app.get('ip'));		
	}
	else{
		console.log('local testing starting');
		console.log("Server starting on port " + app.get('port'));
		app.listen(app.get('port'));
	}
}