var express = require('express');

module.exports = (function(app, db) {
	var paramM = {}

	paramM.checkBodyParams = function(paramList) {
		return function(req, res, next) {
			for (var i = 0; i < paramList.length; i += 1) {
				param = paramList[i];
				if (!req.body[param]) {
					res.status(400).json({error: "Need parameters: " + paramList}).end();
					return;
				}
			};
			next();
		}
	}

	return paramM;
});