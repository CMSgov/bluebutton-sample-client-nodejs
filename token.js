'use strict';

const Log = require('log'), logger = new Log('debug');

/**
 * Token Class
 * 
 * Contains several methods that manages an oauth token
 */

/**
 * Helpers Constructor
 */
class Token {
	constructor() {
	  this.name = 'Token';
	  this._tokenObject = undefined;
	  
	  // init persistence storage
	  this.storage = require('node-persist');
	  this.storage.initSync({
			stringify: JSON.stringify,
		    parse: JSON.parse,
		    encoding: 'utf8'});
	}

	// getters and setters
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
	    logger.debug("Store Access token = " + JSON.stringify(this._tokenObject.token, null, 2));
	    
	    // persist token
	    this.storage.setItemSync('token', this._tokenObject.token);
	}
	
	/**
	 * Loads an OAuth token from local storage
	 *
	 * @returns token data as a string
	 */
	load()
	{
		var tokenData = this.storage.getItemSync('token');
		logger.debug("Load Access token = " + JSON.stringify(tokenData, null, 2));
		return tokenData;
	}
	
	/**
	 * Removes an OAuth token from local storage
	 */
	remove()
	{
		logger.debug('Remove Access Token');
		this.storage.removeItemSync('token');
		this._tokenObject = undefined;
	}
}
//export the class
module.exports = Token;