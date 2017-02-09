(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.setStorageInstances = setStorageInstances;
exports.handleFetchEvent = handleFetchEvent;

/* 
	WORKS INSIDE SERVICE WORKER 
*/

var idbManager = require('./utils/dataloader-cache-expiration');

var storageInstances = {};

function setStorageInstances(params) {
	storageInstances = params;
	console.log('storageInstances are: ', storageInstances);
}

function handleFetchEvent(event) {

	// FIND THE MATCHING cacheParam based on the matching by URL
	// let params = swCheckCacheParams(event.request.url, storageInstances);	
	var params = swCheckCacheParams(event.request.url);

	// ONLY TRIGGER RESPOND WITH EVENT IF THERE IS A MATCH
	// OTHERWISE, ALLOW THE REQUESTING METHOD TO FETCH THE DATA DIRECTLY
	if (params) {
		console.info('handleFetchRequest starting for: ', event.request.url);
		event.respondWith(swProcessRequest(event, params).then(function (response) {
			console.log('handleFetchEvent successfully resolved', event.request.url);
			return response;
		}).catch(function (error) {
			console.log('handleFetchEvent failed to resolve successfully', error, event.request.url);
			throw error;
		}));
	} else {
		console.debug('no cache matches found for ' + event.request.url + '. Proceeding with regular fetch.');
	}
}

/*
	Selects the appropriate routingParams to use by matching to the url regex.
*/
function swCheckCacheParams(url) {
	for (var key in storageInstances) {
		var instance = storageInstances[key];
		var matchingStorageInstance = false;
		instance.url.filter(function (expression) {
			if (url.match(expression)) {
				// console.debug('regex match FOUND', url, instance.cacheName);
				matchingStorageInstance = true;
				return;
			}
		});

		if (matchingStorageInstance) {
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
	return new Promise(function (resolve, reject) {
		var requestType = requestHandler[params.requestMethod];
		requestType(event, params).then(function (response) {
			if ((typeof response === 'undefined' ? 'undefined' : _typeof(response)) != 'object') {
				console.info('swProcessRequest is returning a: ', typeof response === 'undefined' ? 'undefined' : _typeof(response), event.request.url);
			}

			if (response) {
				console.info('swProcessRequest resolving: ', response);
				return resolve(formatResponse(requestType, response));
			}
			console.warn('swProcessRequest did not resolve. throwing error now', event.request.url);
			// return resolve();
			throw Error;
			// throw Error;
		}).catch(function (error) {
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
	var init = {
		status: 200,
		statusText: "OK",
		headers: { 'Content-Type': 'text/plain' }
	};

	if (response.constructor == Response) {
		console.debug('formatResponse: object is response object', response);
		return response;
	}

	console.debug(response.text, typeof response === 'undefined' ? 'undefined' : _typeof(response), response);
	return response.text().then(function (body) {
		var newResponse = new Response(body, init);
		return newResponse;
	});
}

caches.keys().then(function (cacheKeys) {
	console.log('current caches are: ', cacheKeys);
});

/*
	cacheName is a name string not an object as in other methods
	may not to namespace this into a sub module so that use calls something
	like dataloaders.serviceWorker.cacheFirst instead of swCacheFirst
*/
function swCacheFirst(event, cacheParams) {
	return new Promise(function (resolve, reject) {

		caches.match(event.request.url).then(function (resp) {
			if (resp) {
				console.info(event.request.url + ' returning from the cache', resp);
				return resolve(resp);
			} else {
				console.info('swCacheFirst starting network request', event.request.url);

				var networkTimeout = new Promise(function (reject) {
					var timeoutLength = cacheParams.maxAge * 1000 || 2000;
					setTimeout(reject, timeoutLength, 'network request failed to respond');
				});

				var networkRequest = new Promise(function (resolve, reject) {
					return swRequestFromNetwork(event, cacheParams).then(function (response) {
						console.info(event.request.url + ' returning from the network directly from swRequestFromNetwork');
						return resolve(response);
					}).catch(function (error) {
						console.info('swCacheFirst: network request error being caught', event.request.url);
						return reject(error);
					});
				});

				Promise.race([networkTimeout, networkRequest]).then(function (response) {
					console.info('swCacheFirst: ' + event.request.url + ' returning from the network via Promise.race');
					return resolve(response);
				}).catch(function (reason) {
					console.info('swCacheFirst request rejected because timeout triggered', reason, event.request.url);
					return reject(reason);
				});
			}
		}).catch(function (error) {
			console.error("error in swCacheFirst request", error, event.request.url);
			reject(error);
		});
	});
}

function swCacheOnly(event, cacheParams) {
	//eslint-disable-line
	return new Promise(function (resolve, reject) {
		caches.match(event.request).then(function (resp) {
			if (resp) {
				return resolve(resp);
			} else {
				return reject();
			}
		});
	});
}

function swNetworkFirst(event, cacheParams) {
	var timeoutId = void 0;

	var backupFromCache = new Promise(function (resolve, reject) {
		timeoutId = setTimeout(function () {
			caches.match(event.request).then(function (response) {

				if (response) {
					console.log('returning swNetworkFirst request from the Cache', typeof response === 'undefined' ? 'undefined' : _typeof(response), response);
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

	var networkRequest = new Promise(function (resolve, reject) {

		return swRequestFromNetwork(event, cacheParams).then(function (response) {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			console.log('returning swNetworkFirst request from the Network', event.request, event.request.url);
			caches.match(event.request).then(function (response) {
				console.log('matching cache is:', response);
			});
			if (response) {
				return resolve(response);
			}
			console.warn('swNetworkFirst: Bad Response From networkRequest');
			return reject();
		}).catch(function (error) {
			console.log('swNetworkFirst: error returned from requestFromNetwork', error, event.request.url);
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			return caches.match(event.request).then(function (response) {
				if (response) {
					console.log('returning swNetworkFirst request from the Cache', typeof response === 'undefined' ? 'undefined' : _typeof(response), response);
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

	return Promise.race([backupFromCache, networkRequest]).then(function (response) {
		return response;
	});
	// .catch(function(error){
	// 	return reject(error);
	// });
}

function swNetworkOnly(event, cacheParams) {
	return new Promise(function (resolve, reject) {
		// last parameter set to false indicates that the network only requests should not cache
		//  the data they get back
		swRequestFromNetwork(event, cacheParams, false).then(function (response) {
			if (response) {
				return resolve(response);
			}
			console.log('swNetworkOnly Request did not succeed. The response was: ' + response);
			return resolve;
		}).catch(function (error) {
			console.debug('swNetworkOnly request failed');
			reject(Error(error));
		});
	});
}

function swFastest(event, cacheParams) {
	return new Promise(function (resolve, reject) {
		var rejected = false;

		var handleRejection = function handleRejection(err) {
			if (rejected) {
				reject(Error('both cache and network requests failed'), err);
			} else {
				console.log('rejected request');
				rejected = true;
			}
		};

		var handleData = function handleData(data) {
			if (data) {
				return resolve(data);
			} else {
				handleRejection();
			}
		};

		swCacheOnly(event, cacheParams).then(handleData, handleRejection);
		swRequestFromNetwork(event, cacheParams).then(handleData, handleRejection);
	});
}

function swRequestFromNetwork(event, cacheParams) {
	var shouldCacheData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

	return new Promise(function (resolve, reject) {

		// let myHeaders = new Headers();
		// myHeaders.append("Cache-Control", "max-age=31536000");

		// let myInit = { method: 'GET',
		//              headers: myHeaders,
		//              mode: 'cors',
		//              cache: 'default' };

		fetch(event.request).then(function (response) {
			console.debug('swRequestFromNetwork: network request responded with: ', event.request.url, response.headers, response.headers.get("Content-Type"));
			caches.open(cacheParams.cacheName).then(function (cache) {
				// caches.open(event.request.url).then(function(cache) {				
				if (shouldCacheData && event.request.method === 'GET') {
					cache.add(event.request.url).then(function () {
						console.debug('swRequestFromNetwork: network item added to cache', event.request.url);
						cleanUpCache(cacheParams, cache, event.request.url);
					}).catch(function (error) {
						console.error('swRequestFromNetwork: error when adding item to the cache', event.request.url, error);
					});
				}
				return resolve(response);
			});
		}).catch(function (error) {
			console.error('error in swRequestFromNetwork: ', error, event.request.url);
			return reject(error);
		});
	});
}

/*
	called from network request. triggers the cache cleanup process to 
	remove expired entries, manage cache size, etc.
*/
function cleanUpCache(cacheParams, cache, url) {

	console.log('offline status', navigator.offline);

	var now = Date.now();
	idbManager.openDb(cacheParams.cacheName).then(function (db) {
		return idbManager.setTimestampForUrl(db, url, now);
	}).then(function (db) {
		return idbManager.expireEntries(db, cacheParams.maxEntries, cacheParams.maxAge, now);
	}).then(function (urlsToDelete) {
		var deletionPromises = urlsToDelete.map(function (urlToDelete) {
			console.log('deleting cache: ', urlToDelete, cacheParams.maxAge);
			return cache.delete(urlToDelete);
		});
		return Promise.all(deletionPromises).then(function () {
			console.log('Done with cache cleanup.');
		});
	}).catch(function (error) {
		console.log('error in cache clean up: ', error);
	});
}

},{"./utils/dataloader-cache-expiration":2}],2:[function(require,module,exports){
/*
  THIS IS FROM THE DATALOADER_CACHE_EXPIRATION FILE
 Copyright 2015 Google Inc. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
'use strict';

// var DB_PREFIX = 'dl-';

var DB_PREFIX = '';
var DB_VERSION = 1;
var STORE_NAME = 'dataStore';
var URL_PROPERTY = 'url';
var TIMESTAMP_PROPERTY = 'timestamp';
// var cacheNameToDbPromise = {};

function openDb(cacheName) {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_PREFIX + cacheName, DB_VERSION);

    request.onupgradeneeded = function () {
      console.log('onupgradeneeded called');
      var objectStore = request.result.createObjectStore(STORE_NAME, { keyPath: URL_PROPERTY });
      objectStore.createIndex(TIMESTAMP_PROPERTY, TIMESTAMP_PROPERTY, { unique: false });
    };

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

function setTimestampForUrl(db, url, now) {
  return new Promise(function (resolve, reject) {
    var transaction = db.transaction(STORE_NAME, 'readwrite');
    var objectStore = transaction.objectStore(STORE_NAME);
    objectStore.put({ url: url, timestamp: now });

    transaction.oncomplete = function () {
      resolve(db);
    };

    transaction.onabort = function () {
      reject(transaction.error);
    };
  });
}

function expireOldEntries(db, maxAgeSeconds, now) {
  // Bail out early by resolving with an empty array if we're not using
  // maxAgeSeconds.
  if (!maxAgeSeconds) {
    return Promise.resolve([]);
  }

  return new Promise(function (resolve, reject) {
    var maxAgeMillis = maxAgeSeconds * 1000;
    var urls = [];

    var transaction = db.transaction(STORE_NAME, 'readwrite');
    var objectStore = transaction.objectStore(STORE_NAME);
    var index = objectStore.index(TIMESTAMP_PROPERTY);

    index.openCursor().onsuccess = function (cursorEvent) {
      var cursor = cursorEvent.target.result;
      var itemAge = now - cursor.value[TIMESTAMP_PROPERTY];
      if (cursor) {
        if (itemAge > maxAgeMillis) {
          var url = cursor.value[URL_PROPERTY];
          urls.push(url);
          objectStore.delete(url);
          cursor.continue();
        }
      }
    };

    transaction.oncomplete = function () {
      resolve(urls);
    };

    transaction.onabort = reject;
  });
}

function expireExtraEntries(db, maxEntries) {
  // Bail out early by resolving with an empty array if we're not using
  // maxEntries.
  if (!maxEntries) {
    return Promise.resolve([]);
  }

  return new Promise(function (resolve, reject) {
    var urls = [];

    var transaction = db.transaction(STORE_NAME, 'readwrite');
    var objectStore = transaction.objectStore(STORE_NAME);
    var index = objectStore.index(TIMESTAMP_PROPERTY);

    var countRequest = index.count();
    index.count().onsuccess = function () {
      var initialCount = countRequest.result;

      if (initialCount > maxEntries) {
        index.openCursor().onsuccess = function (cursorEvent) {
          var cursor = cursorEvent.target.result;
          if (cursor) {
            var url = cursor.value[URL_PROPERTY];
            urls.push(url);
            objectStore.delete(url);
            if (initialCount - urls.length > maxEntries) {
              cursor.continue();
            }
          }
        };
      }
    };

    transaction.oncomplete = function () {
      resolve(urls);
    };

    transaction.onabort = reject;
  });
}

function expireEntries(db, maxEntries, maxAgeSeconds, now) {
  return expireOldEntries(db, maxAgeSeconds, now).then(function (oldUrls) {
    return expireExtraEntries(db, maxEntries).then(function (extraUrls) {
      return oldUrls.concat(extraUrls);
    });
  });
}

module.exports = {
  openDb: openDb,
  setTimestampForUrl: setTimestampForUrl,
  expireEntries: expireEntries
};

},{}]},{},[1]);
