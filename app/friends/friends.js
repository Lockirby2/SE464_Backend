var express   = require('express');
var mongodb   = require('mongodb');
var cors 	  = require('cors');
var ObjectID  = mongodb.ObjectID;

const IMAGE_COLLECTION    = 'images';
const FRIEND_COLLECTION   = 'friends';
const USER_COLLECTION   = 'users';

module.exports = function(app, db) {
	var paramM = require("../shared/params.middleware.js")(app, db);
	var authM  = require("../shared/auth.middleware.js")(app, db);

	function getFriends(req, res) {
		res.setHeader('Access-Control-Allow-Origin','*');
		console.log("getting friends");
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
		var newFriendId = "";
		console.log(req.params.uid);
		db.collection(USER_COLLECTION)
			.findOne({email: req.params.uid})
			.then(function(user) {
			 	newFriendId = user._id;
			 	console.log("found user :" + user.name)
			 	console.log(user);
			}).then(function(){

				var updateOne = {uidOne: new ObjectID(newFriendId), uidTwo: req.user}
				var updateTwo = {uidOne: req.user, uidTwo: new ObjectID(newFriendId)}

				// var updateOne = {uidOne: newFriendId, uidTwo: req.user}
				// var updateTwo = {uidOne: req.user, uidTwo: newFriendId}
				var friend = {}
				db.collection(FRIEND_COLLECTION)
					.update(updateOne, updateOne, {upsert: true})
					.then(function() {
						return db.collection(FRIEND_COLLECTION).update(updateTwo, updateTwo, {upsert: true});
					}).then(function(retFriend) {
						res.status(200).json(retFriend).end();
					});

			}).catch(function(err) {
				console.log("that user doesn't exist");
				res.status(500).json({error: "That user doesn't exist"}).end();
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

	app.options('/friends', cors());

	app.get('/friends',	cors(),
						authM.validateUser,
						getFriends);

	app.options('/friends/:uid', cors());
	app.post('/friends/:uid',	cors(),
								authM.validateUser,
								postFriend);
	app.delete('/friends/:uid',	authM.validateUser,
								deleteFriend);
}
