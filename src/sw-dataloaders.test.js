var chai = require('chai');
var expect = chai.expect;
var td = require('testdouble');
var requestHandlers, dataloaders;

describe('dataloader test', function(){

	beforeEach(function(){
		?requestHandlers = td.replace('./utils/requestHandlers.js');
		dataloaders = require('./sw-dataloaders.js');
	});

	beforeEach(function(){
	});


	afterEach(function(){
	  td.reset();
	});

	// describe('setStorageInstances', function(){
	// 	it('should call reqestHandlers.setStorageInstances when called', function(){
	// 		var instance = dataloaders.setStorageInstances('validRequest');
	// 		expect(instance).to.equal('storageInstances called');
	// 	});

	// });