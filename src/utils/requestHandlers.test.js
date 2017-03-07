var chai = require('chai');
var expect = chai.expect;
var td = require('testdouble');
var request, dataloaders, localforage, testParams;

beforeEach(function(){
		request = require('./requestHandlers.js');

		var cacheParams = {
			guideStore: {
				cacheName: 'guideStore',
				timeoutInSeconds: 2,
				maxEntries: 50,
				maxAge: 31536000,
				useAsKey: 'id',
				requestMethod: 'cacheFirst'
			}
		};

		request.setStorageInstances(cacheParams);

	});

	afterEach(function(){
		td.reset();
	});

describe('setStorageInstances', function(){

	beforeEach(function(){
		testParams = {
			testStore: {
				cacheName: 'testStore',
				timeoutInSeconds: 2,
				maxEntries: 50,
				maxAge: 31536000,
				useAsKey: 'url',
				requestMethod: 'cacheFirst'
			}
		};

	});

	it('should respond with a localforage instance when called', function(){
		var cacheInstances = request.setStorageInstances(testParams);
		expect(cacheInstances['testStore']).to.be.an('object');
		expect(cacheInstances['testStore']).to.have.deep.property('_config.requestMethod', testParams['testStore'].requestMethod);		
	});

});

describe('getCacheSettings', function(){
	it('should return a valid response when called with proper data', function(){
		expect(request.getCacheSettings('guideStore')).to.be.an('object');
	});
});


describe('request From the Network', function(){

  it("should return an array when provided a valid url", function () {
      return request.requestFromNetwork('http://localhost:5001/users', null, null).then(function(data){
				expect(data).to.be.an('array');
				expect(data).length.to.be.at.least(1);
			}); 	
  });

  it('should return an blob object when a valid image url is passed in');

  it("should return an error when provided an invalid url", function () {
      return request.requestFromNetwork('http://localhost:5001/notaresource', null, null).catch(function(data){
				expect(data).to.be.an('error');
				expect(data.message).to.contain('requestFromNetwork error: ');
			}); 	
  });

  it('should return a valid response when requesting an image object', function(){
  	return request.requestFromNetwork('https://pwa-demo-app.imgix.net/graffitti_rain.jpg', 'guideStore').then(function(data){
  		expect(data).to.be.an('array');
  	})
  });

});

describe('requestFromCache', function(){
	it('should respond with data when data exists in the cache');

	it('should respond with the correct cache when a valid cache is called');

	it('should respond with an error when an invalid cache is called');

	it('should respond with an error when cache does not contain the data that is being requested');
});