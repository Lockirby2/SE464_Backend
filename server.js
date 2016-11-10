var http       = require('http');
var express    = require('express');
var mongodb    = require('mongodb').MongoClient;
var bodyParser = require('body-parser');

const PORT = 8080;

var uri = process.env.MONGODB_URI || "mongodb://localhost/SE464";
var app = express();
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

	console.log("Server starting on port " + PORT);
	app.listen(PORT);
}