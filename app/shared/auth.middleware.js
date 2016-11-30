var express   = require('express');
var config    = require('../shared/config');
var request   = require('request');

const USER_COLLECTION = 'users';

module.exports = (function(app, db) {
	var authM = {}

	authM.validateUser = function(req, res, next) {
		var credentials = [];
		if (!req.headers.authorization) {
			console.log("No header");
			return res.status(401).json({ message : "User must be authenticated for this action." });
		}

		credentials = req.headers.authorization.split(' ');

		if (credentials[0] != 'Bearer:') {
			console.log("Bearer wrong");
			return res.status(401).json({ message : "'Bearer:' must be first field in authorization header." });
		}

		var url = config.googleUrl + credentials[1];

		console.log(url);
		console.log(credentials);
		console.log(req.headers.authorization);

		request(url, function(error, response, body) {
			var bodyOb = JSON.parse(body);

			if (error || response.statusCode !== 200) {
				console.log("Google API call fail");
				res.status(500).json({error: "Google API call failed"}).end();
				return;
			} if (bodyOb.aud !== config.clientId) {
				console.log(bodyOb.aud);
				res.status(401).json({error: "Unauthorized"}).end();
				return;
			}

			db.collection(USER_COLLECTION)
				.findOne({googleId: bodyOb.sub})
				.then(function(user) {
					if (!user) {
						console.log(bodyOb.sub);
						res.status(401).json({error: "Unauthorized"}).end();
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