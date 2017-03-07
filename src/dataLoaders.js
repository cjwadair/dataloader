/* eslint-disable */
'use strict';

var dataHandlers = require('./utils/requestHandlers.js');

module.exports = {
	setStorageInstances: dataHandlers.setStorageInstances,
	cacheFirst: cacheFirst,
	networkFirst: networkFirst,
	cacheOnly: cacheOnly,
	networkOnly: networkOnly,
	fastest: fastest,
	cachePage: cachePage
};

var requestHandlers = {
	"networkFirst": networkFirst,
  "cacheFirst": cacheFirst,
  "fastest": fastest,
  "networkOnly": networkOnly,
  "cacheOnly": cacheOnly
};

function cacheFirst(url, cacheName, cacheKey) {
	return new Promise(function(resolve, reject){
		return dataHandlers.requestFromCache(cacheName, cacheKey).then(function(response){
			if(response) {
				return resolve(response);
			} 
			return reject(new Error('error returning from the cache'));
		}).catch(function(error){
			var dataFromNetwork = dataHandlers.requestFromNetwork(url, cacheName)
				.then(function(response){
					if(response) {
						return resolve(response); 
					}
				})
				.catch(function(error){
					return reject(new Error(error));
				});
		});	
	});
}

function networkFirst(url, cacheName, cacheKey) {
	let timeoutId;
	let cacheInstance = dataHandlers.getCacheSettings(cacheName);
	let timeoutLength = (cacheInstance && cacheInstance.timeoutInSeconds) ? cacheInstance.timeoutInSeconds * 1000 : 1500;

	var backupFromCache = 
	new Promise(function(resolve, reject){
		timeoutId = setTimeout(function(){
			cacheOnly(cacheName, cacheKey).then(function(result){
				return resolve(result);
			}).catch(function(error){
				return reject(error);
			});
		}, timeoutLength); 	
	});

	var networkRequest = 
	new Promise(function(resolve, reject){
		dataHandlers.requestFromNetwork(url, cacheName)
		.then(function(result){
			if(timeoutId) { clearTimeout(timeoutId); }
			return resolve(result);
		})
		.catch(function(error){
			return error;
		});
	});

	return Promise.race([backupFromCache, networkRequest]);
}

function fastest(url, cacheName, cacheKey) {
	return new Promise(function(resolve, reject) {
		let rejected = false;
		
		var handleRejection = function(err) {
			if (rejected){
				return reject(Error('both cache and network requests failed'), err);
			} else {
				rejected = true;
			}
		};

		var handleData = function(data) {
			if(data) { 
				return resolve(data); 
			} else {
				handleRejection();
			}
		};
		
		dataHandlers.requestFromCache(cacheName, cacheKey).then(handleData, handleRejection);
		dataHandlers.requestFromNetwork(url, cacheName).then(handleData, handleRejection);
	});
}

/* 
	NOTE: THERE IS AN ISSUE HERE WITH THE ORDRING OF CACHENAME AND CACHEKEY THAT MAY NEED TO BE WORKED OUT...
*/
function cacheOnly(cacheName, cacheKey) {
	return new Promise(function(resolve, reject) {
		return dataHandlers.requestFromCache(cacheName, cacheKey)
			.then(function(response){
				if(response) { 
					return resolve(response); 
				}
				return reject('cacheOnly request: Error: the response from cacheOnly request came back blank');
			})
			.catch(function(error){
				return reject(error);
			});	
	});
}

function networkOnly(url) {
	return new Promise(function(resolve, reject) {
		// NUll AS SECOND PARAM BECAUSE THERE IS NO CACHING HAPPENING. 
		// FALSE AS THIRD PARAM INDICATES THAT DATA SHOULDS NOT BE CACHED
		// ******* CONVER TO USING DECONSTRUCTED PARAMS TO AVOID THIS... *******
		return dataHandlers.requestFromNetwork(url, null, false)
			.then(function(response){
				if(response) {
					return resolve(response);
				}
			}).catch(function(error){
				return reject(new Error(error));
			});
	}); 
}

function cachePage(urlPath, pageContent) {
	return new Promise(function(resolve, reject) {
		
		// THE PARAMETERS HERE SHOULD BE DECONSTRUCTED FOR EASIER USE
		dataHandlers.cacheItem(pageContent, 'pageStore', urlPath).then(function(data){
			resolve(data);
		}).catch(function(error){
			reject(new Error(error));
		});
		
	});
}
/* eslint-disable */