var chai = require('chai');
var expect = chai.expect;
var td = require('testdouble');
var requestHandlers, dataloaders;

describe('dataloader test', function(){

	beforeEach(function(){
		requestHandlers = td.replace('./utils/requestHandlers.js');
		dataloaders = require('./dataloaders.js');
	});

	beforeEach(function(){
		var cacheParams = {
			guideStore: {
				cacheName: 'guideStore',
				timeoutInSeconds: 1,
				maxEntries: 50,
				maxAge: 31536000,
				useAsKey: 'url',
				requestMethod: 'cacheOnly'
			}	
		}

		td.when(requestHandlers.requestFromNetwork('https://validUrl.com'), {ignoreExtraArgs: true}).thenResolve('request from network successful');
		td.when(requestHandlers.requestFromNetwork('https://badUrl.com'), {ignoreExtraArgs: true}).thenReject('request from network failed');
		td.when(requestHandlers.requestFromCache('valid cache', 'valid key'), {ignoreExtraArgs: true}).thenResolve('request from cache successful');
		td.when(requestHandlers.requestFromCache('bad cache'), {ignoreExtraArgs: true}).thenReject(Error('request from cache failed: invalid cacheName'));
		td.when(requestHandlers.requestFromCache('valid cache', 'invalid key'), {ignoreExtraArgs: true}).thenReject(Error('request from cache failed: invalid cacheKey'));
		td.when(requestHandlers.getCacheSettings('valid cache')).thenReturn(cacheParams);
		td.when(requestHandlers.getCacheSettings('bad cache')).thenReturn(null);
		td.when(requestHandlers.setStorageInstances('validRequest')).thenReturn('storageInstances called');
		td.when(requestHandlers.setStorageInstances('validRequest')).thenReturn('storageInstances called');
	});


	afterEach(function(){
	  td.reset();
	});

	describe('setStorageInstances', function(){
		it('should call reqestHandlers.setStorageInstances when called', function(){
			var instance = dataloaders.setStorageInstances('validRequest');
			expect(instance).to.equal('storageInstances called');
		});

	});

	describe('networkOnly request', function(){
		
		it('return correct data when request is properly formatted', function() {
	    return Promise.resolve(dataloaders.networkOnly('https://validUrl.com')).then(function(data){
	    	expect(data).to.equal('request from network successful');
	    });
	  });

	  it('returns error on bad request', function() {
	    return Promise.resolve(dataloaders.networkOnly('https://badUrl.com')).catch(function(error){
	    	expect(error).to.be.an('error');
	    	expect(error.message).to.equal('request from network failed');
	    });
	  });

	});

	describe('cacheOnly request', function(){

		it('returns correct data when request is properly formatted', function() {
	    return Promise.resolve(dataloaders.cacheOnly('valid cache', 'valid key')).then(function(data){
	    	expect(data).to.equal('request from cache successful');
	    });
	  });

	   it('returns an error when a bad cacheName is provided', function() {
	    return Promise.resolve(dataloaders.cacheOnly('bad cache')).catch(function(error){
	    	expect(error.message).to.equal('request from cache failed: invalid cacheName');
	    });
	  });

	  it('returns nothing when an invalid key is provided', function() {
	    return Promise.resolve(dataloaders.cacheOnly('valid cache','invalid key')).catch(function(error){
	    	expect(error).to.be.an('error');
	    	expect(error.message).to.equal('request from cache failed: invalid cacheKey');
	    });
	  });

	});

	describe('networkFirst request', function(){

		it('returns from network when passed a valid url and valid cache data', function() {
	    return Promise.resolve(dataloaders.networkFirst('https://validUrl.com', 'valid cache', 'valid key')).then(function(data){
	    	expect(data).to.equal('request from network successful');
	    });
	  });

	  it('returns from network when passed a valid url and bad cache data', function() {
	    return Promise.resolve(dataloaders.networkFirst('https://validUrl.com', 'bad cache', 'invalid key')).then(function(data){
	    	expect(data).to.equal('request from network successful');
	    });
	  });

	  it('returns from cache when passed a bad url and valid cache data', function() {
	    return Promise.resolve(dataloaders.networkFirst('https://badUrl.com', 'valid cache', 'valid key')).then(function(data){
	    	expect(data).to.equal('request from cache successful');
	    });
	  });

	  it('returns an error when passed a bad url and bad cache data', function() {
	    return Promise.resolve(dataloaders.networkFirst('https://badUrl.com', 'bad cache')).catch(function(error){
	    	expect(error).to.be.an('error');
	    	expect(error.message).to.equal('request from cache failed: invalid cacheName');
	    });
	  });	

	});

	describe('cacheFirst request', function(){

		it('returns from cache when passed a valid url and valid cache data', function() {
	    return Promise.resolve(dataloaders.cacheFirst('https://validUrl.com', 'valid cache', 'valid key')).then(function(data){
	    	expect(data).to.equal('request from cache successful');
	    });
	  });

	  it('returns from network when passed a valid url and bad cache data', function() {
	    return Promise.resolve(dataloaders.cacheFirst('https://validUrl.com', 'bad cache', 'invalid key')).then(function(data){
	    	expect(data).to.equal('request from network successful');
	    });
	  });

	  it('returns from cache when passed a bad url and valid cache data', function() {
	    return Promise.resolve(dataloaders.cacheFirst('https://badUrl.com', 'valid cache', 'valid key')).then(function(data){
	    	expect(data).to.equal('request from cache successful');
	    });
	  });

	  it('returns an error when passed a bad url and bad cache data', function() {
	    return Promise.resolve(dataloaders.cacheFirst('https://badUrl.com', 'bad cache', 'bad key')).catch(function(error){
	    	expect(error).to.be.an('error');
	    	expect(error.message).to.be.oneOf(['request from network failed','request from cache failed: invalid cacheName']);
	    });
	  });	

	});

	describe('fastest request', function(){

		it('returns from a valid response when passed a valid url and valid cache data', function() {
	    return Promise.resolve(dataloaders.fastest('https://validUrl.com', 'valid cache', 'valid key')).then(function(data){
	    	expect(data).to.be.oneOf(['request from network successful','request from cache successful']);
	    });
	  });

		it('returns from a valid response when passed a valid url and bad cache data', function() {
	    return Promise.resolve(dataloaders.fastest('https://validUrl.com', 'bad cache', 'invalid key')).then(function(data){
	    	expect(data).to.equal('request from network successful');
	    });
	  });

	  it('returns from a valid response when passed a bad url and valid cache data', function() {
	    return Promise.resolve(dataloaders.fastest('https://badUrl.com', 'valid cache', 'valid key')).then(function(data){
	    	expect(data).to.equal('request from cache successful');
	    });
	  });

	  it('returns an error when passed a bad url and bad cache data', function() {
	    return Promise.resolve(dataloaders.fastest('https://badUrl.com', 'bad cache')).catch(function(error){
	    	expect(error).to.be.an('error');
	    	expect(error.message).to.equal('both cache and network requests failed');
	    });
	  });

	  it('returns an error when passed a bad url and vaid cache data and invalid cache ID', function() {
	    return Promise.resolve(dataloaders.fastest('https://badUrl.com', 'valid cache', 'invalid key')).catch(function(error){
	    	expect(error).to.be.an('error');
	    	expect(error.message).to.equal('both cache and network requests failed');
	    });
	  });

	});

	describe('cachePage', function(){
		it('should add the page to the pageCache when provided with valid information');

		it('should respond with an error when invalid data is submitted');
	});

});

