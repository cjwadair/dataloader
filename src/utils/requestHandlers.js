// import localforage from 'localforage';
var localforage = require('localforage');

module.exports = {
	requestFromNetwork: requestFromNetwork,
	requestFromCache: requestFromCache,
	setStorageInstances: setStorageInstances,
	getCacheSettings: getCacheSettings,
	cacheItem: cacheItem
};

var storageInstances = {};

var cacheParams = {
	staticFileStore: {
		cacheName: 'staticFileStore',
		timeoutInSeconds: 2,
		maxEntries: 50,
		maxAge: 31536000,
		useAsKey: 'url',
		requestMethod: 'cacheFirst'
	}, 
	pageStore: {
		cacheName: 'pageStore',
		timeoutInSeconds: 3,
		maxEntries: 15,
		maxAge: 12000,
		useAsKey: 'url',
		requestMethod: 'cacheOnly'		
	}
}

setStorageInstances(cacheParams);

/* 
	CREATES A LOCAL STORAGE INSTANCE AND BUILDS OUT THE
	STORGE INSTANCES OBJECT THAT WILL BE USED TO SET VALUES
	WITHIN THE DATALOADERS MODULE....
 */
function setStorageInstances(params){
	for (var item in params) {
		let cache = params[item];
		if(!storageInstances[cache.cacheName]){
			setStorageInstance(cache);
		}
	}
	return storageInstances;
}

function setStorageInstance(cache) {
	let instance = localforage.createInstance({
		name: cache.cacheName || 'dataloadersStore', 
		maxEntries: cache.maxEntries || null, 
		maxAge: cache.maxAge || null,
		timeoutInSeconds: cache.timeoutInSeconds || null,
		useAsKey: cache.useAsKey || null,
		requestMethod: cache.requestMethod || null
	});
	storageInstances[cache.cacheName] = instance;
}

function getCacheSettings(cacheName) {
	let instance = storageInstances[cacheName] || null;
	if (instance) {
		return instance._config;
	} else {
		return null;
	}
}

/*
	THIS IS SOMEWHAT SIMILAR TO THE GETCACHESETTINGS METHOD. SHOULD CHOOSE 1 ONLY AND USE THAT
	LIKELY THE GETCACHE SETTINGS METHOD BECUASE IT GETS THE CONFIG ELEMENT NOT THE WHOLE INSTANCE
*/
function getCacheInstance(cacheName){
	let instance = storageInstances[cacheName];
	if (instance) {
		return instance;
	} else {
		return new Error('the requested cache instance does not exist');
	}
}

function cacheItem(item, cacheName, cacheKey){
	return new Promise(function(resolve, reject){
		let instance = getCacheInstance(cacheName);
		if (instance) {
			return resolve(instance.setItem(cacheKey, item));
		} else {
			return reject(new Error(`dataloaders: error attempting to cache item: could not find a cache with the requested name ${cacheName}`));
		}
		
	});
}

function requestFromNetwork(url, cacheName=null, shouldCache=true) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    let responseType = 'text';
    // Change this to look up the storageInstance and look for an instance property that is set 
    // to image or something like that if the item should be treated as an image...
    if (cacheName == 'imageStore' | cacheName == 'staticFileStore') {
			responseType = 'blob';  	
    }
    request.onreadystatechange = function() {
    	let regexPattern = /^[4,5][0-9][0-9]$/.test(request.status);
    	if(regexPattern) {
    		return reject(new Error(`requestFromNetwork error: ${request.status} ${request.statusText} returned from ${url}`));
    	}
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
					let response;
					let isImage = /^image\/*/.test(request.getResponseHeader('content-type'));
					if (isImage) {
							response = request.response;
					} else {	
						response = JSON.parse(request.response);
					}
					if (response.constructor !== Array) {
						response = [response];
					}
					// shouldCache provides option to avoid storing data from network requests when required
					// used by networkOnly requests to avoid unnecessary storage of items
					if(shouldCache) {
						updateCache(cacheName, response, url);
					}
					return resolve(response);
        }
      }
    };
    request.onerror = function(error) {
    	console.log('returning error from requestFromNetwork');
      return reject(error);
    };
    request.open('GET', url, true);
    request.responseType = responseType; 
    request.send();
  });
}

function requestFromCache(cacheName, cacheKey) {
	let cacheInstance = getCacheInstance(cacheName);
	return new Promise(function(resolve, reject) {
		let resultSet = [];
		if (typeof cacheName === undefined) {
			return reject(new Error(`${cacheName} is not a valid localforage store`));
		}
		if (cacheKey) {
			getItem(cacheInstance, cacheKey);
		} else {
			getAllItems(cacheInstance);
		}
		function getItem(cacheInstance, cacheKey) {
			return cacheInstance.getItem(cacheKey).then(function(response) {
				if(response && response != null) {
					resultSet.push(response.value);
				}
				if(resultSet.length > 0) {
					return resolve(resultSet);
				} 
				// Return empty resolve when no results found so promise is finished and 
				// requesting method can handle next steps.
				return reject(new Error('no response returned from get Item call'));
				// return resolve();

			}).catch(function(err) {
				return reject(new Error(`getItem errored out: ${err}`));
			});
		}
		function getAllItems(cacheInstance) {
			return cacheInstance.length(function(err, numberOfKeys){
				if (numberOfKeys > 0) {
					cacheInstance.iterate(function(item, key, iterationNumber) { // eslint-disable-line no-unused-vars
						resultSet.push(item.value);
					}).then(function() {
						if (resultSet.length != -1) {
							return resolve(resultSet);
						}
						return reject();
					}).catch(function(err) {
						return reject(new Error(`requestFromCache: getAllItems errored out: ${err}`));
					});
				} else {
					// Resolve to nothing so that cache requests can handle responses without a result correctly
					return resolve();
				}
			});	
		}

	});
}

/* 
	ADDS AN OBJECT TO STORAGEINSTANCES VARIABLE
	FOR EACH LOCALFORAGE INSTANCE CREATED. THESE OPTIONS ARE USED TO SET USER
	CONTROLLED PARAMS FOR DATA REQUESTS (timeooutInSecond, maxEntries, etc)
*/
function updateCache(cacheName, data, keyFieldValue) {//eslint-disable-line
	new Promise(function(resolve){
			let cacheInstance = getCacheInstance(cacheName);
			expireOldItems(cacheInstance);
			for(let x=0; x < data.length; x++ ) {
				
				// SET AN EXPIRY TIME ON THE ITEM
				let expiry = setItemExpiry(cacheInstance._config.maxAge, data[x]);
				let item = {value: data[x], dataloaderExpiryTime: expiry};
				let keyToUse = {};
				// check if useAsKey field for the instance is a field in the data item
				if(item.value[cacheInstance._config.useAsKey]) {
					// if yes, use that field as the key
					keyToUse = item.value[cacheInstance._config.useAsKey];
					keyToUse = keyToUse.toString();
				} else {
					// if not use the keyFIeldValue provided in the call to updateCache
					keyToUse = keyFieldValue;
				}
				cacheInstance.setItem(keyToUse, item);
			}
			
			manageCacheSize(cacheInstance);
			resolve();
	});
}

/* 
	Calculates the expiry time for cached items when provided with a maxAge value
*/
function setItemExpiry(maxAge){
	return Date.now() + maxAge;
}

/* 
	expires items from the cache if the items dataloaderExpiryTime has passed
*/
function expireOldItems(instance) {	
	instance.iterate(function(value, key){
		if(value.dataloaderExpiryTime < Date.now()) {
			instance.removeItem(key)
				.then(function(){
					console.log(`removed expired item ${key} from ${instance._config.name}`);
				})
				.catch(function(err){
					console.warn('could not remove item from cache: ', err);
				});
		}
	});
}

function manageCacheSize(instance) {
	if(instance._config.maxEntries !== null) {
		instance.length().then(function(numberOfEntries){
			let entriesOverLimit = numberOfEntries - instance._config.maxEntries;
			let itemArray = [];
			if (entriesOverLimit > 0){
				instance.iterate(function(value) {					
					itemArray.push(value);	
				}).then(function() {
					// sorts the items into ascending order by expiry data (closest expiry first)
					itemArray.sort(function (a, b) {
					if (a.dataloaderExpiryTime > b.dataloaderExpiryTime) {
						return 1;
					}
					if (a.dataloaderExpiryTime < b.dataloaderExpiryTime) {
						return -1;
					}
					// a must be equal to b
					return 0;
				});
				// slices entries from the start of the array
				itemArray = itemArray.slice(0, entriesOverLimit);
				});
			} else {
				return;
			} 
		});
	} else {
			return;
		}
}
