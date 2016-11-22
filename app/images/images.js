var express   = require('express');
var mongodb   = require('mongodb');
var path  = require('path');
var fs = require('fs');
var ObjectID  = mongodb.ObjectID;

const IMAGE_COLLECTION   = 'images';
const RATING_COLLECTION  = 'ratings';
const USER_COLLECTION    = 'users';
const SEARCH_RADIUS      = 500;

module.exports = function(app, db) {
	var paramM = require("../shared/params.middleware.js")(app, db);
	var authM  = require("../shared/auth.middleware.js")(app, db);

	function getImagesInRange(req, res) {
		db.collection(IMAGE_COLLECTION)
			.find({
		        location:
		        	{ $near :
		            	{
			            	$geometry: { type: "Point",  coordinates: [ parseFloat(req.query.longitude), parseFloat(req.query.latitude) ] },
			            	$maxDistance: SEARCH_RADIUS
		            	}
		        	}
		    })
			.toArray()
			.then(function(images) {
				console.log(images);
				res.status(200).json(images).end();
			}).catch(function(err) {
				res.status(500).json(err).end();
			});
	}

	function getAllImages(req, res) {
		res.setHeader('Access-Control-Allow-Origin','*');

		db.collection(IMAGE_COLLECTION)
			.find({})
			.toArray()
			.then(function(images) {
				res.status(200).json(images).end();
			}).catch(function(err) {
				res.status(500).json(err).end();
			});
	}


	function rawBody(req, res, next) {
	    var chunks = [];

	    req.on('data', function(chunk) {
	        chunks.push(chunk);
	    });

	    req.on('end', function() {
	        var buffer = Buffer.concat(chunks);

	        req.bodyLength = buffer.length;
	        req.rawBody = buffer;
	        next();
	    });

	    req.on('error', function (err) {
	        console.log(err);
	        res.status(500);
	    });
	}

	function postImage(req, res) {
		var image = {};
		image.name        = req.body.name        || 'Untitled';
		image.description = req.body.description || 'No Description :)';
		image.rating      = 5;
		image.user        = req.user;
		image.filePath    = '../../images/dummy';
		image.location    = {
    		type: "Point",
    		coordinates: [ req.body.latitude, req.body.longitude ]
    	};
    	image.timestamp   = new Date();

		db.collection(IMAGE_COLLECTION)
			.insertOne(image)
			.then(function(retImage) {
				var action = {$push: {images: retImage.insertedId}}
				return db.collection(USER_COLLECTION).updateOne({_id: req.user}, action);
			}).then(function() {
				res.status(200).json(image).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to post image"}).end();
			});
	}
	
	function uploadImage(req, res) {
		resp = {};
		resp.lit = "fam";
		console.log("image getting writ fam");	
		fs.writeFile('../data/' + req.params.id + '.png', req.rawBody, 'base64', function(err) {});

		update = {};
		update.filePath =  '../data/' + req.params.id + '.png';

		db.collection(IMAGE_COLLECTION)
			.updateOne({_id: new ObjectID(req.params.id), user: req.user}, {$set: update})
			.then(function(image) {
				if (image.result.n === 0) {
					res.status(401).json({error: "Unauthorized"}).end();
				} else {
					res.status(200).json(image).end();
				}
			}).catch(function(err) {
				res.status(500).json({error: "Failed to update image"}).end();
			});
	}

	function getImage(req, res) {
	    var options = {
         	root: '../data/',
         	dotfiles: 'allow', // allow dot in file name
   		};
   		var filename = '../data/' + req.params.id + '.png';
   		
		res.setHeader('Access-Control-Allow-Origin','*');
   		res.sendFile(path.resolve(filename), function(err){       
   			if (err) {
              console.log(err);
              res.status(err.status).end();
         }else {
             console.log('Sent:', filename);
        }});
	}

	function updateImage(req, res) {
		var update = {};

		update.name        = req.body.name;
		update.description = req.body.description;

		db.collection(IMAGE_COLLECTION)
			.updateOne({_id: new ObjectID(req.params.id), user: req.user}, {$set: update})
			.then(function(image) {
				if (image.result.n === 0) {
					res.status(401).json({error: "Unauthorized"}).end();
				} else {
					res.status(200).json(image).end();
				}
			}).catch(function(err) {
				res.status(500).json({error: "Failed to update image"}).end();
			});
	}

	function deleteImage(req, res) {
		db.collection(IMAGE_COLLECTION)
			.deleteOne({_id: new ObjectID(req.params.id), user: req.user})
			.then(function(image) {
				if (image.result.n === 0) {
					return Promise.reject("Unauthorized");
				} else {
					var action = {$pull: {images: new ObjectID(req.params.id)}}
					return db.collection(USER_COLLECTION).updateOne({_id: req.user}, action);
				}
			}).then(function() {
				console.log("Deleting rating");
				return db.collection(RATING_COLLECTION).deleteMany({iid: new ObjectID(req.params.id)});
			}).then(function() {
				res.status(200).end();
			}).catch(function(err) {
				res.status(500).json({error: err || "Failed to delete image"}).end();
			});
	}

	function getImagesByUser(req, res) {
		db.collection(IMAGE_COLLECTION)
			.find({user: req.user})
			.toArray()
			.then(function(images) {
				res.status(200).json(images).end();
			}).catch(function(err) {
				res.status(500).json({error: "Failed to get image"}).end();
			});
	}

	app.get('/images',	paramM.checkBodyParams(['longitude', 'latitude']),
						getImagesInRange);

	app.get('/images/all', getAllImages);
	
	app.post('/images', authM.validateUser,
						paramM.checkBodyParams(['longitude', 'latitude']),
						postImage);

	app.post('/images/:id', rawBody,
							uploadImage);

	app.get('/images/:id', getImage);

	app.put('/images/:id',	authM.validateUser,
							updateImage);
	app.delete('/images/:id',	authM.validateUser,
								deleteImage);

	app.get('/images/user',	authM.validateUser,
							getImagesByUser);
}