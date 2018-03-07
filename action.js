'use strict'; // required for the class syntax used below to work

const traverse = require('traverse');
const sprintf = require('sprintf-js').sprintf;
const logger = require('./log.js');

/**
 * Action Class
 * 
 * Contains several methods that perform 'Action' on JSON objects like retrieving a record from JSON and formatting it into HTML that can be displayed in a browser
 */
class Action {
	/**
	 * Constructor
	 */
	constructor() {
		this.name = 'Action';
	}

	/**
	 * Find the named nodes in the specified json and return a list of found items
	 * 
	 * @param json the JSON object to parse
	 * @param name the name we are looking for
	 * @returns a list of found items, empty list if none found
	 */
	_findNodes(json, name) {
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
	 * @param json the json to parse into html
	 * @returns benefit balance record in html format
	 */
	createBenefitBalanceRecord(json) {
		var headers = {system : 'System', code : 'Code', allowed : 'Allowed', currency : 'Currency'};
		var data = [];
	
		var nodes;
		// A benefitBalance record is a bit complicated so find the financial node first
		if((nodes = this._findNodes(json, 'financial'))) {
			// now you will have a list of financial objects...
			nodes.forEach((nodelist) => {
				var count = 0;
				// walk each financial object...
				nodelist.forEach((element) => {
					var entry = {system:'undefined',code:'undefined',allowed:'undefined',currency:'undefined'};
					// lookup the coding object for each financial object...
					var coding = this._findNodes(element, 'coding');
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
					var allowedMoney = this._findNodes(element, 'allowedMoney');
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
		logger.debug(html);
		return html;
	}

	/**
	 * Create HTML Value Coding Record from raw JSON data
	 * 
	 * @param json the json to parse into html
	 * @returns value coding record in html format
	 */
	createValueCodingRecord(json) {
		var headers = {system : 'System', code : 'Code', display : 'Display'};
		var data = [];
	
		var nodes;
		if((nodes = this._findNodes(json, 'valueCoding'))) {
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
		logger.debug(html);
		return html;
	}
	
	/**
	 * Create HTML Patient Record from raw JSON data
	 * 
	 * @param json the json to parse into html
	 * @returns patient record in html format
	 */
	createPatientRecord(json) {
		var headers = {key : 'Key', value : 'Value'};
		var data = [];
		var nodes;
		
		// fetch the nodes we are interested in displaying
		if((nodes = this._findNodes(json, 'id'))) {
			data.push({ key:'Patient ID', value: nodes.join() });
		}
		if((nodes = this._findNodes(json, 'given'))) {
			data.push({ key:'First Name', value: nodes.join(" ") });
		}
		if((nodes = this._findNodes(json, 'family'))) {
			data.push({ key:'Last Name', value: nodes.join() });
		}
		if((nodes = this._findNodes(json, 'birthDate'))) {
			data.push({ key:'Birth Date', value: nodes.join() });
		}
		if((nodes = this._findNodes(json, 'gender'))) {
			data.push({ key:'Gender', value: nodes.join() });
		}
		if((nodes = this._findNodes(json, 'district'))) {
			data.push({ key:'District', value: nodes.join() });
		}
		if((nodes = this._findNodes(json, 'state'))) {
			data.push({ key:'State', value: nodes.join() });
		}
		if((nodes = this._findNodes(json, 'postalCode'))) {
			data.push({ key:'Postal Code', value: nodes.join() });
		}
	
		logger.debug(data);
		 
		var TableBuilder = require('table-builder');
		var html = (new TableBuilder({class: 'table table-hover'}))
			.setHeaders(headers)
			.setData(data)
			.render();
	
		// uncomment to set table style class type for stylesheet
		html = html.replace(/class="/g, 'class="info ');
		
		logger.debug(html);
		return html;
	}
}

// export an Action instance
module.exports = new Action();
