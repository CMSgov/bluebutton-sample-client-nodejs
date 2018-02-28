const express = require('express');
const axios = require("axios");
const path = require('path');
const serverAuth = require('./serverAuth.js');

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
    console.log("Access token = " + JSON.stringify(tokenObject.token, null, 2));
    
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
	console.log("Access token = " + JSON.stringify(tokenData, null, 2));
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
    			console.log(result);
    			
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
	storage.removeItemSync('token');
	tokenObject = undefined;
	// render home page
	res.redirect(app.locals.ep.homepage);
});

/**
 * Query the server for user data using the requests url paramater as the endpoint
 */
app.get(app.locals.ep.fetch, hasToken, (req,res) => {
	var url = req.query.url;
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
	    console.log(JSON.stringify(response.data.entry, null, 2));
	    res.render('results', {
	    		token: tokenObject.token,
	    		url: url,
	    		data: response.data.entry
	    });
	  })
	  .catch(error => {
		  render_error(res, 'Cannot Fetch ' + url + '!', error);
	  });
});

// start the application listening
app.listen(appPort, () => console.log('The ' + app.locals.siteName + ' has been successfully started!\nVisit ' + appUri + ' in your favorite browser to try it out...'));
