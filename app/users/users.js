var express   = require('express');
var mongodb   = require('mongodb');
var request   = require('request');
var config    = require('../shared/config');
var ObjectID  = mongodb.ObjectID;

const USER_COLLECTION = 'users';

module.exports = function(app, db) {
	var paramM = require("../shared/params.middleware.js")(app, db);
	var authM  = require("../shared/auth.middleware.js")(app, db);

	function postUser(req, res) {
		var user = {}

		user.name        = req.body.name;
		user.images      = [];

		var url = config.googleUrl + req.body.token;

		request(url, function(error, response, body) {
			var bodyOb = JSON.parse(body);

			if (error || response.statusCode !== 200) {
				res.status(500).json({error: "Google API call failed"}).end();
				return;
			}
			if (bodyOb.aud !== config.clientId) {
				res.status(401).json({error: "Unauthorized"}).end();
				return;
			}

			user.googleId = bodyOb.sub;

			db.collection(USER_COLLECTION)
				.insert(user)
				.then(function(user) {
					res.status(200).json(user).end();
				}).catch(function(err) {
					res.status(500).json({error: "Failed to post user"}).end();
				});
		});
	}

	function updateUser(req, res) {
		var update = {};

		update.name = req.body.name;

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
			.then(function(user) {
				res.status(200).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to delete user"}).end();
			});
	}

	function getUser(req, res) {
		db.collection(USER_COLLECTION)
			.findOne({_id: new ObjectID(req.params.id)})
			.then(function(user) {
				res.status(200).json(user).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to get user"}).end();
			});
	}

	app.post('/users',	paramM.checkBodyParams(['name', 'token']),
						postUser);
	app.put('/users',	authM.validateUser,
						updateUser);
	app.delete('/users',	authM.validateUser,
							deleteUser);
	app.get('/users/:id', getUser);
}