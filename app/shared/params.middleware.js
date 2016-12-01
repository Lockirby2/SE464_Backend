var express = require('express');

module.exports = (function(app, db) {
	var paramM = {}

	paramM.checkBodyParams = function(paramList) {
		return function(req, res, next) {
				console.log(req.body);
			for (var i = 0; i < paramList.length; i += 1) {
				param = paramList[i];
				console.log("checking " + param);
				if (!req.body[param]) {
					console.log("bad parameters, missing : " + param);
					res.status(400).json({error: "Need parameters: " + paramList}).end();
					return;
				}
			};
			next();
		}
	}

	return paramM;
});