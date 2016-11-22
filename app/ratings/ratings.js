var express   = require('express');
var mongodb   = require('mongodb');
var ObjectID  = mongodb.ObjectID;

const IMAGE_COLLECTION    = 'images';
const RATING_COLLECTION   = 'ratings';

module.exports = function(app, db) {
	var paramM = require("../shared/params.middleware.js")(app, db);
	var authM  = require("../shared/auth.middleware.js")(app, db);

	function getRating(req, res) {
		db.collection(RATING_COLLECTION)
			.findOne({iid: new ObjectID(req.params.id), uid: req.user})
			.then(function(rating) {
				res.status(200).json(rating).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to get rating"}).end();
			});
	}

	function postRating(req, res) {
		var query = {iid: new ObjectID(req.params.iid), uid: req.user}
		var update = {iid: new ObjectID(req.params.iid), uid: req.user, rating: req.body.rating}
		var rating = {}

		db.collection(RATING_COLLECTION)
			.update(query, update, {upsert: true})
			.then(function(retRating) {
				rating = retRating;
				return updateImages(db, new ObjectID(req.params.iid));
			}).then(function() {
				res.status(200).json(rating).end();
			}).catch(function(err) {
				console.log(err);
				res.status(500).json({error: "Failed to post rating"}).end();
			});
	}

	function deleteRating(req, res) {
		db.collection(RATING_COLLECTION)
			.deleteOne({iid: new ObjectID(req.params.iid), uid: req.user})
			.then(function() {
				return updateImages(db, new ObjectID(req.params.iid));
			}).then(function() {
				res.status(200).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to delete rating"}).end();
			});
	}

	app.get('/ratings/:iid',	authM.validateUser,
								getRating);
	app.post('/ratings/:iid',	authM.validateUser,
								paramM.checkBodyParams(['rating']),
								postRating);
	app.delete('/ratings/:iid',	authM.validateUser,
								deleteRating);
}

// private method
function updateImages(db, iid) {
	return new Promise(function(resolve, reject) {
		db.collection(RATING_COLLECTION).aggregate(
			[
				{
					$match:
						{
							iid: iid
						}
				},
		    	{
		    		$group:
		        		{
		        			_id: "$iid",
		        			avgRating: { $avg: "$rating" }
		        		}
		    	}
			]
		).toArray()
		.then(function(result) {
			var update = {rating: result[0].avgRating}
			return db.collection(IMAGE_COLLECTION).updateOne({_id: iid}, {$set: update});
		}).then(function() {
			resolve();
		}).catch(function(err) {
			reject("ERROR: could not update image's rating");
		});
	});
}