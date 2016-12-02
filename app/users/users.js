var express   = require('express');
var mongodb   = require('mongodb');
var request   = require('request');
var cors 	  = require('cors');
var config    = require('../shared/config');
var ObjectID  = mongodb.ObjectID;

const USER_COLLECTION = 'users';
const IMAGE_COLLECTION = 'images';
const RATING_COLLECTION = 'ratings';
const FRIEND_COLLECTION = 'friends';

module.exports = function(app, db) {
	var paramM = require("../shared/params.middleware.js")(app, db);
	var authM  = require("../shared/auth.middleware.js")(app, db);

	function getUsers(req, res) {
		db.collection(USER_COLLECTION)
			.find({_id: new ObjectID(req.params.id)})
			.toArray()
			.then(function(users) {
				res.status(200).json(users).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to get user"}).end();
			});
	}

	function postUser(req, res) {
		var user = {}
        console.log("welcome to the POST office");

		res.setHeader('Access-Control-Allow-Origin','*');
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

		user.name        = req.body.name;
		user.email       = req.body.email;
		user.images      = [];

		var url = config.googleUrl + req.body.token;

		request(url, function(error, response, body) {
			var bodyOb = JSON.parse(body);

			if (error || response.statusCode !== 200) {
				console.log("error: " + error);
				console.log("Status code: " + response.statusCode !== 200);
				console.log("Google API call failed");
				res.status(500).json({error: "Google API call failed"}).end();
				return;
			}
			if ((bodyOb.aud !== config.clientId) && (bodyOb.aud !== config.webClientId)) {
				console.log("Unauthorized access, user aud: " + bodyOb.aud);
				res.status(401).json({error: "Unauthorized"}).end();
				return;
			}

			user.googleId = bodyOb.sub;

			db.collection(USER_COLLECTION)
				.updateOne({googleId: user.googleId}, user, {upsert: true})
				.then(function(user) {
					res.status(200).json(user).end();
				}).catch(function(err) {
					console.log(err);
					res.status(500).json({error: "Failed to post user"}).end();
				});
		});
	}

	function updateUser(req, res) {
		var update = {};

		update.name = req.body.name;
		user.email  = req.body.email;

		db.collection(USER_COLLECTION)
			.updateOne({_id: req.user}, {$set: update})
			.then(function(user) {
				res.status(200).json(user).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to update user"}).end();
			});
	}

	function deleteUser(req, res) {
		db.collection(USER_COLLECTION)
			.deleteOne({_id: req.user})
			.then(function() {
				return db.collection(RATING_COLLECTION).deleteMany({uid: req.user});
			})
			.then(function() {
				return db.collection(FRIEND_COLLECTION).deleteMany({$or: [{uidOne: req.user}, {uidTwo: req.user}]});
			})
			.then(function() {
				res.status(200).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to delete user"}).end();
			});
	}

	function getUser(req, res) {
		res.setHeader('Access-Control-Allow-Origin','*');
		
		db.collection(USER_COLLECTION)
			.findOne({_id: new ObjectID(req.params.id)})
			.then(function(user) {
				res.status(200).json(user).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to get user"}).end();
			});
	}

	app.options('/users', cors());
	app.get('/users', getUsers);
	app.post('/users',	paramM.checkBodyParams(['name', 'email', 'token']),
						postUser);
	app.put('/users',	authM.validateUser,
						updateUser);
	app.delete('/users',	authM.validateUser,
							deleteUser);

	app.get('/users/:id', getUser);
}