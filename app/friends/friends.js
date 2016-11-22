var express   = require('express');
var mongodb   = require('mongodb');
var ObjectID  = mongodb.ObjectID;

const IMAGE_COLLECTION    = 'images';
const FRIEND_COLLECTION   = 'friends';

module.exports = function(app, db) {
	var paramM = require("../shared/params.middleware.js")(app, db);
	var authM  = require("../shared/auth.middleware.js")(app, db);

	function getFriends(req, res) {
		res.setHeader('Access-Control-Allow-Origin','*');

		db.collection(FRIEND_COLLECTION)
			.find({uidOne: req.user})
			.toArray()
			.then(function(friends) {
				res.status(200).json(friends).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to get friend"}).end();
			});
	}

	function postFriend(req, res) {
		var updateOne = {uidOne: new ObjectID(req.params.uid), uidTwo: req.user}
		var updateTwo = {uidOne: req.user, uidTwo: new ObjectID(req.params.uid)}
		var friend = {}

		db.collection(FRIEND_COLLECTION)
			.update(updateOne, updateOne, {upsert: true})
			.then(function() {
				return db.collection(FRIEND_COLLECTION).update(updateTwo, updateTwo, {upsert: true});
			}).then(function(retFriend) {
				res.status(200).json(retFriend).end();
			}).catch(function(err) {
				console.log(err);
				res.status(500).json({error: "Failed to post friend"}).end();
			});
	}

	function deleteFriend(req, res) {
		db.collection(FRIEND_COLLECTION)
			.deleteOne({uidOne: new ObjectID(req.params.uid), uidTwo: req.user})
			.then(function() {
				return db.collection(FRIEND_COLLECTION)
					.deleteOne({uidOne: req.user, uidTwo: new ObjectID(req.params.uid)})
			}).then(function() {
				res.status(200).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to delete friend"}).end();
			});
	}

	app.get('/friends',	authM.validateUser,
						getFriends);

	app.post('/friends/:uid',	authM.validateUser,
								postFriend);
	app.delete('/friends/:uid',	authM.validateUser,
								deleteFriend);
}
