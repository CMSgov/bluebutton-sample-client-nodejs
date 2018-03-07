/* global it, describe */

const chai = require('chai'), assert = chai.assert;
const action = require('../action.js');

describe('Action Class Tests', function(){
	describe('constructor', function(){
		it('should have a default name', function(){
			assert.typeOf(action.name, 'string');
			assert.equal(action.name, 'Action');
		});
	});
	
	describe('#_findNodes', function(){
		it('should find nodes by name', function(){
			// create some test data
			const json = {
				a : [1,2,3],
				b : { c: [4,5,6] },
				d : { c: [7,8,9] },
				e : 'a string'
			};
			
			// test various searches
			var actual;
			actual = action._findNodes(json, 'a');
			assert.typeOf(actual, 'array');
			assert.lengthOf(actual, 1);
			assert.typeOf(actual[0],'array');
			assert.lengthOf(actual[0],3);
			assert.deepEqual(actual[0],[1,2,3]);
			
			actual = action._findNodes(json, 'b');
			assert.typeOf(actual, 'array');
			assert.lengthOf(actual, 1);
			assert.typeOf(actual[0],'object');
			assert.deepEqual(actual[0],{c:[4,5,6]});
			
			actual = action._findNodes(json, 'c');
			assert.typeOf(actual, 'array');
			assert.lengthOf(actual, 2);
			assert.typeOf(actual[0],'array');
			assert.deepEqual(actual[0],[4,5,6]);
			assert.typeOf(actual[1],'array');
			assert.deepEqual(actual[1],[7,8,9]);
			
			actual = action._findNodes(json, 'd');
			assert.typeOf(actual, 'array');
			assert.lengthOf(actual, 1);
			assert.typeOf(actual[0],'object');
			assert.deepEqual(actual[0],{c:[7,8,9]});
			
			actual = action._findNodes(json, 'e');
			assert.typeOf(actual, 'array');
			assert.lengthOf(actual, 1);
			assert.typeOf(actual[0],'string');
			assert.deepEqual(actual[0],'a string');
			
			actual = action._findNodes(json, 'not found');
			assert.typeOf(actual, 'array');
			assert.lengthOf(actual, 0);
		});
	});
	
	describe('#createBenefitBalanceRecord', function(){
		it('should create properly formatted html record', function(){
			
			// create some test data
			const json = { 
				"some parent" : [{
					"financial": [ {
		              "type": {
		                "coding": [
		                  {
		                    "system": "http://url1",
		                    "code": "code1"
		                  }
		                ]
		              },
		              "allowedMoney": {
		                "value": 0,
		                "system": "USD"
		              }
		            },
		            {
		              "type": {
		                "coding": [
		                  {
		                    "system": "http://url2",
		                    "code": "code2"
		                  }
		                ]
		              },
		              "allowedMoney": {
		                "value": 42,
		                "system": "EUR"
		              }
		            }
		          ]
				}]
			};
			
			var expected;
			expected = '<table class="warning table table-hover"><thead><tr><th class="warning system-th">System</th><th class="warning code-th">Code</th><th class="warning allowed-th">Allowed</th><th class="warning currency-th">Currency</th></tr></thead><tbody >';
			expected += '<tr ><td class="warning system-td td_text"><a href="http://url1">http://url1</a></td><td class="warning code-td td_text">code1</td><td class="warning allowed-td td_num">0.00</td><td class="warning currency-td td_text">USD</td></tr>\n';
			expected += '<tr ><td class="warning system-td td_text"><a href="http://url2">http://url2</a></td><td class="warning code-td td_text">code2</td><td class="warning allowed-td td_num">42.00</td><td class="warning currency-td td_text">EUR</td></tr></tbody></table>';
			
			var actual = action.createBenefitBalanceRecord(json);
			assert.typeOf(actual, 'string');
			assert.equal(actual, expected);
		});
	});
	
	describe('#createValueCodingRecord', function(){
		it('should create properly formatted html record', function(){
			// create some test data
			const json = {
				"extension": [
				      {
				        "valueIdentifier": {
				          "system": "http://url1",
				          "value": "1"
				        }
				      },
				      {
				        "valueCoding": {
				          "system": "http://url2",
				          "code": "2",
				          "display": "value2"
				        }
				      },
				      {
				        "valueCoding": {
				          "system": "http://url3",
				          "code": "ABC",
				          "display": "value3"
				        }
				      }
				 ]
			};
			
			var expected;
			expected = '<table class="table table-hover"><thead><tr><th class="system-th">System</th><th class="code-th">Code</th><th class="display-th">Display</th></tr></thead><tbody ><tr ><td class="system-td td_text"><a href="http://url2">http://url2</a></td><td class="code-td td_num">2</td><td class="display-td td_text">value2</td></tr>\n';
			expected += '<tr ><td class="system-td td_text"><a href="http://url3">http://url3</a></td><td class="code-td td_text">ABC</td><td class="display-td td_text">value3</td></tr></tbody></table>';
			
			var actual = action.createValueCodingRecord(json);
			assert.typeOf(actual, 'string');
			assert.equal(actual, expected);
		});
	});
	
	describe('#createPatientRecord', function(){
		it('should create properly formatted html record', function(){
			// create some test data
			const json = {
			  "resource": {
			    "resourceType": "Patient",
			    "id": "1234567890",
			    "name": [
			      {
			        "family": "Doe",
			        "given": [
			          "John",
			          "C"
			        ]
			      }
			    ],
			    "gender": "male",
			    "birthDate": "01-01-2018",
			    "address": [
			      {
			        "district": "9",
			        "state": "99",
			        "postalCode": "99999"
			      }
			    ]
			  }
			};
			
			var expected;
			expected = '<table class="info table table-hover"><thead><tr><th class="info key-th">Key</th><th class="info value-th">Value</th></tr></thead><tbody ><tr ><td class="info key-td td_text">Patient ID</td><td class="info value-td td_num">1234567890</td></tr>\n';
			expected += '<tr ><td class="info key-td td_text">First Name</td><td class="info value-td td_text">John,C</td></tr>\n';
			expected += '<tr ><td class="info key-td td_text">Last Name</td><td class="info value-td td_text">Doe</td></tr>\n';
			expected += '<tr ><td class="info key-td td_text">Birth Date</td><td class="info value-td td_text">01-01-2018</td></tr>\n';
			expected += '<tr ><td class="info key-td td_text">Gender</td><td class="info value-td td_text">male</td></tr>\n';
			expected += '<tr ><td class="info key-td td_text">District</td><td class="info value-td td_num">9</td></tr>\n';
			expected += '<tr ><td class="info key-td td_text">State</td><td class="info value-td td_num">99</td></tr>\n';
			expected += '<tr ><td class="info key-td td_text">Postal Code</td><td class="info value-td td_num">99999</td></tr></tbody></table>';
			
			var actual = action.createPatientRecord(json);
			assert.typeOf(actual, 'string');
			assert.equal(actual, expected);
		});
	});
	
	
});