'use strict'; // required for the class syntax used below to work

const logger = require('./log.js');

/**
 * Token Class
 * 
 * Contains several methods that manage an OAuth token object
 */
class Token {
	/**
	 * Constructor
	 */
	constructor() {
	  this.name = 'Token';
	  this._tokenObject = undefined;
	  
	  // init persistence storage
	  this.storage = require('store');
	}

	/**
	 * getters and setters
	 */
	get object() { return this._tokenObject; }
	set object(tobj) { this._tokenObject = tobj; }
	get accessToken() { 
		if(this._tokenObject !== undefined && this._tokenObject.token !== undefined) {
			return this._tokenObject.token.access_token;
		}
	}
	get json() {
		if(this._tokenObject !== undefined) {
			return this._tokenObject.token;
		}
	}
	
	/**
	 * Stores a token to local storage
	 */
	store()
	{
		if(this._tokenObject !== undefined && this._tokenObject.token !== undefined) {
		    logger.info("Store Access token = " + JSON.stringify(this._tokenObject.token, null, 2));
		    
		    // persist token
		    this.storage.set('token', this._tokenObject.token);
		}
		else {
			logger.warn("Store Access token failed: this._tokenObject.token undefined!");
		}
	}
	
	/**
	 * Loads an OAuth token from local storage
	 *
	 * @returns token data as a string
	 */
	load()
	{
		var tokenData = this.storage.get('token');
		logger.info("Load Access token = " + JSON.stringify(tokenData, null, 2));
		return tokenData;
	}
	
	/**
	 * Removes an OAuth token from local storage
	 */
	remove()
	{
		logger.info('Removed Access Token');
		this.storage.remove('token');
		this._tokenObject = undefined;
	}
}

// export a Token instance
module.exports = Token;