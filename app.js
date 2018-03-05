const express = require('express');
const axios = require("axios");
const path = require('path');
const traverse = require('traverse');
const util = require('util');
const serverAuth = require('./serverAuth.js');
const sprintf = require('sprintf-js').sprintf;
//const sprintf = sprintfjs.sprintf;

// init the express application
const app = express();
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.set("includes", __dirname);

// Variables shared between javascript and pug resources

// site name
app.locals.siteName = "BlueButton OAuth Node.js Sample Client Application";

// remote urls
app.locals.rurl = {
	'eob' : serverAuth.credentials.auth.tokenHost + '/v1/fhir/ExplanationOfBenefit',
	'patient' : serverAuth.credentials.auth.tokenHost + '/v1/fhir/Patient',
	'coverage' : serverAuth.credentials.auth.tokenHost + '/v1/fhir/Coverage',
	'register' : serverAuth.credentials.auth.tokenHost + '/v1/o/applications/register/',
	'sandbox' : serverAuth.credentials.auth.tokenHost,
	'tokens' : serverAuth.credentials.auth.tokenHost + '/v1/o/authorized_tokens/'
};

//configure application endpoints
app.locals.ep = {
	'action' : '/action',
	'authapp' : '/authapp',
	'fetch' : '/fetch',
	'help' : '/help',
	'homepage' : '/',
	'redirect' : '/redirect',
	'refresh' : '/refresh',
	'reset' : '/reset'
};

// application variables
const appUrl = 'http://localhost';
const appPort = '8001';
const appUri = appUrl + ':' + appPort;
const appRedirectUri = appUri + '/redirect';

// init persistence storage
var storage = require('node-persist');

storage.initSync({
	stringify: JSON.stringify,
    parse: JSON.parse,
    encoding: 'utf8'});

// Initialize the OAuth2 Library
const oauth2 = require('simple-oauth2').create(serverAuth.credentials);

// Authorization oauth2 URI
const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: appRedirectUri,
    state: '<state>'
});

var tokenObject;

/**
 * Stores a token to local storage
 *
 * @param tokenObject the token object to store
 */
function store_token(tokenObject)
{
    console.log("Store Access token = " + JSON.stringify(tokenObject.token, null, 2));
    
    // persist token
    storage.setItemSync('token', tokenObject.token);
}

/**
 * Loads an OAuth token from local storage
 *
 * @returns token data as a string
 */
function load_token()
{
	var tokenData = storage.getItemSync('token');
	console.log("Load Access token = " + JSON.stringify(tokenData, null, 2));
	return tokenData;
}

/**
 * Renders an error page with the specified text and information
 *
 * @param res the response object to render to
 * @param title the title text of the error to display
 * @param error the details of the error to display
 */
function render_error(res, title, error) {
	console.log(title, error);
	
	res.render('error', {
		title: title,
		error: error
	});
}

/**
 * Tests if a token is currently loaded.  This is mostly used when the user tries to reach a page before loading a token
 *
 * @param req the request object containing url parameters
 * @param res the response object to render to
 * @param next the next to use
 */
function hasToken(req, res, next) {
	if(tokenObject === undefined) {
		render_error(res, 'Session Error: a valid token has not been loaded!', 
			'This can happen if the application server is stopped and restarted and a URL other than the home page is visited.  ' +
			'Click Done below to clear this error and acquire a valid token for this session.');
	}
	else {
		next();
	}
}

/**
 * Find the named nodes in the specified json and return a list of found items
 * 
 * @param json the JSON object to parse
 * @param name the name we are looking for
 * @returns a list of found items, empty list if none found
 */
function findNodes(json, name) {
	var results = traverse(json).reduce(function (acc, x) {
	    if (this.key === name) {
	    		acc.push(x);
	    }
	    return acc;
	}, []);
	return results;
}

/**
 * Create HTML Benefit Balance Record from raw JSON data
 * 
 * @param json
 * @returns
 */
function createBenefitBalanceRecord(json) {
	var headers = {system : 'System', code : 'Code', allowed : 'Allowed', currency : 'Currency'};
	var data = [];

	var nodes;
	// A benefitBalance record is a bit complicated so find the financial node first
	if((nodes = findNodes(json, 'financial'))) {
		// now you will have a list of financial objects...
		nodes.forEach((nodelist) => {
			var count = 0;
			// walk each financial object...
			nodelist.forEach((element) => {
				var entry = {system:'undefined',code:'undefined',allowed:'undefined',currency:'undefined'};
				// lookup the coding object for each financial object...
				var coding = findNodes(element, 'coding');
				if(coding !== undefined) {
					// the coding object is a list of objects...
					coding.forEach((codelist) => {
						// finally retrieve the system and code information from the code listing and place in our entry dictionary
						codelist.forEach((item) => {
							if(item.system !== undefined) {
								entry.system = item.system;
							}
							if(item.code !== undefined) {
								entry.code = item.code;
							}
						});
					});
				}
				var allowedMoney = findNodes(element, 'allowedMoney');
				// lookup the allowedMoney for each financial object...
				if(allowedMoney !== undefined) {
					allowedMoney.forEach((item) => {
						// finally retrieve the value and system allowedMoney information from the item and place in out entry dictionary
						if(item.value !== undefined) {
							entry.allowed = sprintf('%1.2f', parseFloat(item.value));
						}
						if(item.system !== undefined) {
							entry.currency = item.system;
						}
					});
				}
				// push the formulated entry into the data list
				data.push(entry);
			});
		});
	}
	
	var TableBuilder = require('table-builder');
	var html = (new TableBuilder({class: 'table table-hover'}))
		// convert urls to hrefs in table
		.setPrism('system', function (cellData) {
			return cellData && '<a href="'+cellData+'">'+cellData+'</a>' || 'undefined';
		})
		.setHeaders(headers)
		.setData(data)
		.render();
	
	// uncomment to set table style class type for stylesheet
	html = html.replace(/class="/g, 'class="warning ');
	console.log(html);
	return html;
}

/**
 * Create HTML Value Coding Record from raw JSON data
 * 
 * @param json the json to parse into html
 * @returns value coding record in html format
 */
function createValueCodingRecord(json) {
	var headers = {system : 'System', code : 'Code', display : 'Display'};
	var data = [];

	var nodes;
	if((nodes = findNodes(json, 'valueCoding'))) {
		nodes.forEach((element) => {
			data.push(element);
		});
	}
	
	var TableBuilder = require('table-builder');
	var html = (new TableBuilder({class: 'table table-hover'}))
		// convert urls to hrefs in table
		.setPrism('system', function (cellData) {
			return cellData && '<a href="'+cellData+'">'+cellData+'</a>' || 'undefined';
		})
		.setHeaders(headers)
		.setData(data)
		.render();
	
	// uncomment to set table style class type for stylesheet
	// html = html.replace(/class="/g, 'class="info ');
	console.log(html);
	return html;
}

/**
 * Create HTML Patient Record from raw JSON data
 * 
 * @param json the json to parse into html
 * @returns patient record in html format
 */
function createPatientRecord(json) {
	var headers = {key : 'Key', value : 'Value'};
	var data = [];
	var nodes;
	
	// fetch the nodes we are interested in displaying
	if((nodes = findNodes(json, 'id'))) {
		data.push({ key:'Patient ID', value: nodes.join() });
	}
	if((nodes = findNodes(json, 'given'))) {
		data.push({ key:'First Name', value: nodes.join(" ") });
	}
	if((nodes = findNodes(json, 'family'))) {
		data.push({ key:'Last Name', value: nodes.join() });
	}
	if((nodes = findNodes(json, 'gender'))) {
		data.push({ key:'Gender', value: nodes.join() });
	}
	if((nodes = findNodes(json, 'district'))) {
		data.push({ key:'District', value: nodes.join() });
	}
	if((nodes = findNodes(json, 'state'))) {
		data.push({ key:'State', value: nodes.join() });
	}
	if((nodes = findNodes(json, 'postalCode'))) {
		data.push({ key:'Postal Code', value: nodes.join() });
	}

	console.log(data);
	 
	var TableBuilder = require('table-builder');
	var html = (new TableBuilder({class: 'table table-hover'}))
		.setHeaders(headers)
		.setData(data)
		.render();

	// uncomment to set table style class type for stylesheet
	html = html.replace(/class="/g, 'class="info ');
	
	console.log(html);
	return html;
}

/**
 * Redirects to the remote server's URI to get permission for this application to access user information
 */
app.get(app.locals.ep.authapp, (req, res) => res.redirect(authorizationUri));

/**
 * Called by the authorization server with an authorization code in the request that we can process into an OAuth token
 */
app.get(app.locals.ep.redirect, (req,res) => {
    const code = req.query.code;
    const tokenConfig = {
            code: code,
            redirect_uri: appRedirectUri
        };

    // Save the access token
    oauth2.authorizationCode.getToken(tokenConfig)
    		.then(result => {
    			tokenObject = oauth2.accessToken.create(result);
    			
    			// persist token
    			store_token(tokenObject);
    	
    			// render the authpass page
    	        res.render('authpass', {
    	    			token: tokenObject.token
    	        });
    		})
    		.catch(error => {
    			render_error(res, 'Token Authorization Failed!', error.message);
    		});
});

/**
 * Renders help information to the clients browser
 */
app.get(app.locals.ep.help, (req, res) => res.render('help'));

/**
 * Home page for application
 */
app.get(app.locals.ep.homepage, (req, res) => {
	// create access token object from persist data
	var tokenData = load_token();
	if (tokenData !== undefined) {
		tokenObject = oauth2.accessToken.create(tokenData);
		
		if (tokenObject.expired()) {
			// render the expired page
			res.render('expired', {
				token: tokenObject.token
			});
			return;
		}
		else {
			// render default home page
			res.render('index', {
				moreinfo: 'I found an OAuth token in local storage!',
				token: tokenObject.token
			});
			return;
		}
	}
	
	// otherwise, always render index page with no token specified
	res.render('index' , {
		moreinfo: 'A client token must be authorized by ' + serverAuth.credentials.auth.tokenHost + ' before proceeding.'
	});	
});

/**
 * Render an action page that uses the token in various ways
 */
app.get(app.locals.ep.action, hasToken, (req, res) => {	
	console.log("Access token = " + JSON.stringify(tokenObject.token, null, 2));
	
	// render action page
	res.render('action', {
		token: tokenObject.token
	});
});

/**
 * Refreshes an expired OAuth token
 */
app.get(app.locals.ep.refresh, hasToken, (req, res) => {
	// attempt to refresh the token
	tokenObject.refresh()
	  .then(result => {
		  tokenObject = result;

		  // persist token
		  store_token(tokenObject);
		  
		  // render the action page
		  res.render('action', {
			  moreinfo: 'The token has been refreshed!',
			  token: tokenObject.token
		  });
	  })
	  .catch(error => {
		  render_error(res, 'Token Refresh Failed!', error.message);
	  });
});

/**
 * Resets the application state by deleting the stored token
 */
app.get(app.locals.ep.reset, (req,res) => {
	console.log('Remove Access Token');
	storage.removeItemSync('token');
	tokenObject = undefined;
	// render home page
	res.redirect(app.locals.ep.homepage);
});

/**
 * Query the server for user data using the requests url parameter as the endpoint
 */
app.get(app.locals.ep.fetch, hasToken, (req,res) => {
	var url = req.query.url;
	var action = req.query.action;
	console.log('Action = ' + action);
	// make sure url exists
	if (url === undefined) {	
		render_error(res, 'Fetch Error:', 'URL was not specified');
		return;
	}

	console.log("Access token = " + JSON.stringify(tokenObject.token, null, 2));
	// setup authorization header to use OAuth token
	axios.defaults.headers.common.authorization = `Bearer ` + tokenObject.token.access_token;
	
	// use axios to retrieve the specified URL
	axios
	  .get(url)
	  .then(response => {
		console.log(JSON.stringify(response.data.entry[0], null, 2));
		var json = response.data.entry[0];
		var resource = json.resource;
	    var results, html, table;
	    
	    switch(action) {
	    case 'benefitBalance':
    		if(resource !== undefined) {
	    		html = '<h2>Here is your Benefit Balance Information</h2>';
	    		table = createBenefitBalanceRecord(resource);
    		}
    		else {
    			html = '<h2>No benefit balance records found!</h2>';
    		}
    		// render results
		res.render('results', {
			customHtml: html + table
		});
    		break;
    		
	    case 'patientRecord':
	    		if(resource !== undefined) {
		    		html = '<h2>Here is your Patient Record</h2>';
		    		table = createPatientRecord(resource);
	    		}
	    		else {
	    			html = '<h2>No patient record found!</h2>';
	    		}
	    		// render results
			res.render('results', {
				customHtml: html + table
			});
	    		break;
	    		
	    case 'valueCodings':
	    		if(resource !== undefined) {
		    		html = '<h2>Here are your value codings</h2>';
		    		table = createValueCodingRecord(resource);
	    		}
	    		else {
	    			html = '<h2>No value codings found!</h2>';
	    		}
	    		// render results
	    		res.render('results', {
	    			customHtml: html + table
	    		});
	    		break;
	    		
    		default:
    			res.render('results', {
    				token: tokenObject.token,
    				url: url,
    				json: json
    			});
    			break;
	    }


	  })
	  .catch(error => {
		  render_error(res, 'Cannot Fetch ' + url + '!', error);
	  });
});

// start the application listening
app.listen(appPort, () => console.log('The ' + app.locals.siteName + ' has been successfully started!\nVisit ' + appUri + ' in your favorite browser to try it out...'));
