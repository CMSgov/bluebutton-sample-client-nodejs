// import modules
const Action = require('./action.js'), action = new Action();
const axios = require("axios");
const express = require('express'), app = express();
const logger = require('./log.js');
const path = require('path');
const serverAuth = require('./serverAuth.js');
const Token = require('./token.js'), token = new Token();

// init the express application
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.set("includes", __dirname);

/**
 * app.locals are variables that are shared between javascript and pug resources
 */

// site name
app.locals.siteName = "Blue Button OAuth Node.js Sample Client Application";

// remote urls
app.locals.rurl = {
	'eob' : serverAuth.credentials.auth.tokenHost + '/v1/fhir/ExplanationOfBenefit',
	'patient' : serverAuth.credentials.auth.tokenHost + '/v1/fhir/Patient',
	'coverage' : serverAuth.credentials.auth.tokenHost + '/v1/fhir/Coverage',
	'register' : serverAuth.credentials.auth.tokenHost + '/v1/o/applications/register/',
	'sandbox' : serverAuth.credentials.auth.tokenHost,
	'tokens' : serverAuth.credentials.auth.tokenHost + '/v1/o/authorized_tokens/'
};

// configure application server endpoints
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

// Initialize the OAuth2 Library
const oauth2 = require('simple-oauth2').create(serverAuth.credentials);

// Authorization oauth2 URI
const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: appRedirectUri,
    state: '<state>'
});

/**
 * Renders an error page with the specified text and information
 *
 * @param res the response object to render to
 * @param title the title text of the error to display
 * @param error the details of the error to display
 */
function render_error(res, title, error) {
	logger.error(title, error);
	
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
	if(token.object === undefined) {
		render_error(res, 'Session Error: a valid token has not been loaded!', 
			'This can happen if the application server is stopped and restarted and a URL other than the home page is visited.  ' +
			'Click Done below to clear this error and acquire a valid token for this session.');
	}
	else {
		next();
	}
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
    			token.object = oauth2.accessToken.create(result);
    			
    			// persist token
    			token.store();
    	
    			// render the authpass page
    	        res.render('authpass', {
    	    			token: token.json
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
	var tokenData = token.load();
	if (tokenData !== undefined) {
		token.object = oauth2.accessToken.create(tokenData);
		
		if (token.object.expired()) {
			// render the expired page
			res.render('expired', {
				token: token.json
			});
			return;
		}
		else {
			// render default home page
			res.render('index', {
				moreinfo: 'I found an OAuth token in local storage!',
				token: token.json
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
	logger.info("Access token = " + JSON.stringify(token.json, null, 2));
	
	// render action page
	res.render('action', {
		token: token.json
	});
});

/**
 * Refreshes an expired OAuth token
 */
app.get(app.locals.ep.refresh, hasToken, (req, res) => {
	// attempt to refresh the token
	token.object.refresh()
	  .then(result => {
		  token.object = result;

		  // persist token
		  token.store();
		  
		  // render the action page
		  res.render('action', {
			  moreinfo: 'The token has been refreshed!',
			  token: token.json
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
	// remove the token
	token.remove();
	// render home page
	res.redirect(app.locals.ep.homepage);
});

/**
 * Query the server for user data using the requests url parameter as the endpoint
 */
app.get(app.locals.ep.fetch, hasToken, (req,res) => {
	var url = req.query.url;
	var command = req.query.action;
	logger.debug('Command = ' + command);
	
	// make sure the url exists
	if (url === undefined) {	
		render_error(res, 'Fetch Error:', 'URL was not specified');
		return;
	}

	logger.debug("Access token = " + JSON.stringify(token.json, null, 2));
	
	// setup authorization header to use OAuth token
	axios.defaults.headers.common.authorization = `Bearer ` + token.accessToken;
	
	// use axios to retrieve the specified URL
	axios
	  .get(url)
	  .then(response => {
		var data = response.data;
		var links = data.link;
		var entry = data.entry[0];
		var resource = entry.resource;
	    var results, html, table;
	    
	    logger.debug(JSON.stringify(entry, null, 2));
	    
	    switch(command) {
	    case 'listEobs':
	    		var eobs;
	    		if(links !== undefined) {
	    			logger.debug(JSON.stringify(links, null, 2));
	    			eobs = action.createEobDict(links);
	    		}
	    		// render results
			res.render('eoblist', {
				eobs: eobs
			});
	    		break;
	    	
	    case 'benefitBalance':
	    		if(resource !== undefined) {
		    		html = '<h2>Here is your Benefit Balance Information</h2>';
		    		table = action.createBenefitBalanceRecord(resource);
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
		    		table = action.createPatientRecord(resource);
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
		    		table = action.createValueCodingRecord(resource);
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
    				token: token.json,
    				url: url,
    				json: entry
    			});
    			break;
	    }
	  })
	  .catch(error => {
		  render_error(res, 'Cannot Fetch ' + url + '!', error);
	  });
});

// start the application listening
app.listen(appPort, () => logger.info('The ' + app.locals.siteName + ' has been successfully started!\nVisit ' + appUri + ' in your favorite browser to try it out...'));
