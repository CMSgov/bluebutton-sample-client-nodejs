/* global it, describe */

const chai = require('chai'), assert = chai.assert;
const Token = require('../token.js');

describe('Token Class Tests', function(){
	describe('constructor', function(){
		it('should have a default name', function(){
			const token = require('../token.js');
			assert.isString(token.name);
			assert.equal(token.name, 'Token');
		});
	});
	
	describe('#getters_setters_persist', function(){
		it('getter, setter and persist methods should function as expected', function(){
			const expected = {
					'token': {
						'access_token' : 'access token data'
					}
				};
			
			var token = new Token();
			
			// verify default state is undefined
			assert.equal(token.object, undefined);
			assert.equal(token.accessToken, undefined);
			assert.equal(token.json, undefined);
			
			// set object and test getters and setters
			token.object = expected;
			assert.equal(token.object, expected);
			assert.equal(token.accessToken, expected.token.access_token);
			assert.deepEqual(token.json, expected.token);
			
			// test store and load
			token.store();
			var actual = token.load();
			assert.deepEqual(token.json, actual);
			
			// test removal
			token.remove();
			actual = token.load();
			assert.deepEqual(undefined, actual);
			
			// test store and load of undefined
			token.store();
			actual = token.load();
			assert.deepEqual(token.json, actual);
		});
	});
});