var express   = require('express');
var config    = require('../shared/config');
var request   = require('request');

const USER_COLLECTION = 'users';

module.exports = (function(app, db) {
	var authM = {}

	authM.validateUser = function(req, res, next) {
		var credentials = [];

		console.log("authenticating user with header: " + req.headers.authorization);

		if (!req.headers.authorization) {
			console.log("No auth Headers found in request");
			return res.status(401).json({ message : "User must be authenticated for this action." });
		}

		credentials = req.headers.authorization.split(' ');

		if (credentials[0] != 'Bearer:') {
			console.log("no bearer found in request");
			return res.status(401).json({ message : "'Bearer:' must be first field in authorization header." });
		}

		var url = config.googleUrl + credentials[1];

		request(url, function(error, response, body) {
			var bodyOb = JSON.parse(body);

			if (error || response.statusCode !== 200) {
				console.log("Google Api call failed");
				res.status(500).json({error: "Google API call failed"}).end();
				return;
			} if (bodyOb.aud !== config.clientId && bodyOb.aud !== config.webClientId) {
				console.log("Unauthorized domain");
				res.status(401).json({error: "Unauthorized domain"}).end();
				return;
			}

			db.collection(USER_COLLECTION)
				.findOne({googleId: bodyOb.sub})
				.then(function(user) {
					if (!user) {
						console.log("User does not exist");
						res.status(401).json({error: "User does not exist"}).end();
						return;
					}
					req.user = user._id;
					next();
				}).catch(function(err) {
					res.status(500).json({error: "Failed to post user"}).end();
				});
		});
	}

	return authM;
});