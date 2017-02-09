
/* 
	WORKS INSIDE SERVICE WORKER 
*/

var idbManager = require('../src/utils/dataloader-cache-expiration');

var storageInstances = {};

export function setStorageInstances(params){
	storageInstances = params;
	console.log('storageInstances are: ', storageInstances);
}

export function handleFetchEvent(event){
	
	// FIND THE MATCHING cacheParam based on the matching by URL
	// let params = swCheckCacheParams(event.request.url, storageInstances);	
	let params = swCheckCacheParams(event.request.url);		
	
	// ONLY TRIGGER RESPOND WITH EVENT IF THERE IS A MATCH
	// OTHERWISE, ALLOW THE REQUESTING METHOD TO FETCH THE DATA DIRECTLY
	if(params){
		console.info('handleFetchRequest starting for: ', event.request.url);
		event.respondWith(
			swProcessRequest(event, params)
				.then(function(response){
					console.log('handleFetchEvent successfully resolved', event.request.url);
					return response;
				})
				.catch(function(error){
					console.log('handleFetchEvent failed to resolve successfully', error, event.request.url);
					throw error;
				})
		);
	} else {
		console.debug(`no cache matches found for ${event.request.url}. Proceeding with regular fetch.`);
	}
}

/*
	Selects the appropriate routingParams to use by matching to the url regex.
*/
function swCheckCacheParams(url) {
	for (let key in storageInstances) {
		let instance = storageInstances[key];
		let matchingStorageInstance = false;
		instance.url.filter(function(expression){
			if(url.match(expression)){
				// console.debug('regex match FOUND', url, instance.cacheName);
				matchingStorageInstance = true;
				return;
			}
		});

		if(matchingStorageInstance) {
			// return the instance if a regex match is found
			return instance;
		}
	}
	// IF MATCH FAILS RETURN NOTHING SO THAT REGULAR FETCH REQUEST CAN PROCEED
	return;
}

var requestHandler = {
  "networkFirst": swNetworkFirst,
  "cacheFirst": swCacheFirst,
  "fastest": swFastest,
  "networkOnly": swNetworkOnly,
  "cacheOnly": swCacheOnly
};

function swProcessRequest(event, params) {
	return new Promise(function(resolve, reject) {
		let requestType = requestHandler[params.requestMethod];
		requestType(event, params)
			.then(function(response){
					if(typeof response != 'object'){
						console.info('swProcessRequest is returning a: ', typeof response, event.request.url);
					}
					
					if(response) {
						console.info('swProcessRequest resolving: ', response);
						return resolve(formatResponse(requestType, response));
					}
					console.warn('swProcessRequest did not resolve. throwing error now', event.request.url);
					// return resolve();
					throw Error;
					// throw Error;
			}).catch(function(error){
				console.info('swProcessRequest rejecting', event.request.url);
				// Error('error in swProcessRequest: ', error, event.request.url);
				// throw error;
				return reject(error);
			});
	});
}

/* 
	Checks if response type is a Response Object or not and 
	converts it to a response object if it isn't
*/
function formatResponse(requestType, response) {
	let init = {
		status: 200,
		statusText: "OK",
		headers: {'Content-Type': 'text/plain'}
	};

	if (response.constructor == Response ) {
		console.debug('formatResponse: object is response object', response);
		return response;
	}

	console.debug(response.text, typeof response, response);
	return response.text().then(function(body){
		let newResponse = new Response(body, init);
		return newResponse;
	});
}

caches.keys().then(function(cacheKeys){
		console.log('current caches are: ', cacheKeys);
});

/*
	cacheName is a name string not an object as in other methods
	may not to namespace this into a sub module so that use calls something
	like dataloaders.serviceWorker.cacheFirst instead of swCacheFirst
*/
function swCacheFirst(event, cacheParams){
	return new Promise(function(resolve, reject) {

		caches.match(event.request.url).then(function(resp) {
			if(resp){
				console.info(`${event.request.url} returning from the cache`, resp);
				return resolve(resp);
			} else {
				console.info('swCacheFirst starting network request', event.request.url);
				
				var networkTimeout = new Promise(function(reject){
					let timeoutLength = cacheParams.maxAge * 1000 || 2000;
					setTimeout(reject, timeoutLength, 'network request failed to respond');
				});

				var networkRequest = new Promise(function(resolve, reject){
					return swRequestFromNetwork(event, cacheParams)
						.then(function(response){
							console.info(`${event.request.url} returning from the network directly from swRequestFromNetwork`);
							return resolve(response);
						}).catch(function(error){
							console.info('swCacheFirst: network request error being caught', event.request.url);
							return reject(error);
						});
				});

				Promise.race([networkTimeout, networkRequest])
					.then(function(response){
						console.info(`swCacheFirst: ${event.request.url} returning from the network via Promise.race`);
						return resolve(response);
					})
					.catch(function(reason){
						console.info('swCacheFirst request rejected because timeout triggered', reason, event.request.url);
						return reject(reason);
					});
			}
		}).catch(function(error){
			console.error("error in swCacheFirst request", error, event.request.url);
			reject(error);
		});
	});
}

function swCacheOnly(event, cacheParams){//eslint-disable-line
	return new Promise(function(resolve, reject) {
		caches.match(event.request)
			.then(function(resp) {
				if(resp){
					return resolve(resp);
				} else {
					return reject();
				}
			});
	});
}

function swNetworkFirst(event, cacheParams) {
	let timeoutId;

	var backupFromCache = new Promise(function(resolve, reject){
		timeoutId = setTimeout(function(){
			caches.match(event.request).then(function(response){
				
				if (response) {
					console.log('returning swNetworkFirst request from the Cache', typeof response, response);
					// ONLY RESOLVES IF THE CACHE CONTAINS DATA
					// SO NETWORK RESPONSE DOESN'T TIMEOUT UNLESS THERE IS A BACKUP 
					return resolve(response);
				} else {
					console.warn('no response to resolve to in swNetworkFirst');
					return reject();
				}
			});
		// }, cacheParams.timeoutInSeconds * 1000); 	
		}, 1500);
	});

	var networkRequest = new Promise(function(resolve, reject){

		return swRequestFromNetwork(event, cacheParams)
			.then(function(response){
				if(timeoutId) { clearTimeout(timeoutId); }
				console.log('returning swNetworkFirst request from the Network', event.request, event.request.url);
				caches.match(event.request).then(function(response){
					console.log('matching cache is:', response);
				});
				if(response) {
					return resolve(response);
				}
				console.warn('swNetworkFirst: Bad Response From networkRequest');
				return reject();
			})
			.catch(function(error){
				console.log('swNetworkFirst: error returned from requestFromNetwork', error, event.request.url);
				if(timeoutId) { clearTimeout(timeoutId); }
				return caches.match(event.request)
					.then(function(response){
						if (response) {
							console.log('returning swNetworkFirst request from the Cache', typeof response, response);
							// ONLY RESOLVES IF THE CACHE CONTAINS DATA
							// SO NETWORK RESPONSE DOESN'T TIMEOUT UNLESS THERE IS A BACKUP 
							return resolve(response);
						} else {
							console.warn('no response to resolve to in swNetworkFirst');
							return reject();
						}
					});
			});
	});

	return Promise.race([backupFromCache, networkRequest])
		.then(function(response){
			return response;
		});
		// .catch(function(error){
		// 	return reject(error);
		// });
}

function swNetworkOnly(event, cacheParams){
	return new Promise(function(resolve, reject){
		// last parameter set to false indicates that the network only requests should not cache
		//  the data they get back
		swRequestFromNetwork(event, cacheParams, false).then(function(response){
			if(response){
				return resolve(response);
			}
			console.log('swNetworkOnly Request did not succeed. The response was: ' + response);
			return resolve;
		}).catch(function(error){
			console.debug('swNetworkOnly request failed');
			reject(Error(error));
		});
	});
}

function swFastest(event, cacheParams) {
	return new Promise(function(resolve, reject) {
		let rejected = false;
		
		var handleRejection = function(err) {
			if (rejected){
				reject(Error('both cache and network requests failed'), err);
			} else {
				console.log('rejected request');
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
		
		swCacheOnly(event, cacheParams).then(handleData, handleRejection);
		swRequestFromNetwork(event, cacheParams).then(handleData, handleRejection);
	});
}

function swRequestFromNetwork(event, cacheParams, shouldCacheData=true) {
	return new Promise(function(resolve, reject){

		// let myHeaders = new Headers();
		// myHeaders.append("Cache-Control", "max-age=31536000");

		// let myInit = { method: 'GET',
  //              headers: myHeaders,
  //              mode: 'cors',
  //              cache: 'default' };

		fetch(event.request)
		.then(function(response){
			console.debug('swRequestFromNetwork: network request responded with: ', event.request.url, response.headers, response.headers.get("Content-Type"));
			caches.open(cacheParams.cacheName)
				.then(function(cache) {				
				// caches.open(event.request.url).then(function(cache) {				
					if(shouldCacheData && event.request.method === 'GET'){				
						cache.add(event.request.url).then(function(){
							console.debug('swRequestFromNetwork: network item added to cache', event.request.url);
							cleanUpCache(cacheParams, cache, event.request.url);
						}).catch(function(error){
							console.error('swRequestFromNetwork: error when adding item to the cache', event.request.url, error);
						});	
					}
					return resolve(response);  
				});	
				}).catch(function(error){
					console.error('error in swRequestFromNetwork: ', error, event.request.url);
					return reject(error);
				});
	});
}

/*
	called from network request. triggers the cache cleanup process to 
	remove expired entries, manage cache size, etc.
*/
function cleanUpCache(cacheParams, cache, url){

	console.log('offline status', navigator.offline);

	let now = Date.now();
	idbManager.openDb(cacheParams.cacheName).then(function(db) {
    return idbManager.setTimestampForUrl(db, url, now);
  }).then(function(db) {
    return idbManager.expireEntries(db, cacheParams.maxEntries, cacheParams.maxAge, now);
  }).then(function(urlsToDelete) {
    var deletionPromises = urlsToDelete.map(function(urlToDelete) {
			console.log('deleting cache: ', urlToDelete, cacheParams.maxAge);
      return cache.delete(urlToDelete);
    });
    return Promise.all(deletionPromises).then(function() {
      console.log('Done with cache cleanup.');
    });
  }).catch(function(error) {
    console.log('error in cache clean up: ', error);
  });
}

