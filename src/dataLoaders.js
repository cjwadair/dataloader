/* eslint-disable */
'use strict';

 // if ('serviceWorker' in navigator && (window.location.protocol === 'https:') && window.location.port != '3000') { 
 // 	console.debug('service worker!');
 // } else {
 // 	console.debug('NO service worker');
 // }


// HAD TO CONVERT FROM USING IMPORT ON NODE MODULES TO 
// USING REQUIRE BECAUSE OF ERROR IN THE DIST FOLDER
// NEED TO FIGURE OUT WHY AND FIX AT SOME POINT
var localforage = require('localforage');

var storageInstances = {};

var requestHandlers = {
  "networkFirst": networkFirst,
  "cacheFirst": cacheFirst,
  "fastest": fastest,
  "networkOnly": networkOnly,
  "cacheOnly": cacheOnly
};

var cacheParams = {
	staticFileStore: {
		cacheName: 'staticFileStore',
		timeoutInSeconds: 2,
		maxEntries: 50,
		maxAge: 31536000,
		useAsKey: 'url',
		requestMethod: 'cacheOnly'
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
export function setStorageInstances(cacheParams){
	for (let key in cacheParams) {
		setStorageInstance(cacheParams[key]);
	}
	console.log(storageInstances);
}

function setStorageInstance(data) {
	let cache = data;
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


export function cacheFirst(url, cacheName, cacheKey) {
	return requestFromCache(cacheName, cacheKey).then(function(response){
		if(response) {
			console.log('cacheFirst: returning from cache: ', response, window.location.pathname);
			return response;
		}
		return requestFromNetwork(url, cacheName, cacheKey).then(function(response){
			if(response) {
				console.log('cacheFirst: returning from network: ', response);
				return response; 
			}
		}, function(err){
			console.log('error getting data from both the cache and the network', err);
			return;
		});	
	}, function(err){
		console.log('error returned form requestFromCache', err);
		return requestFromNetwork(url, cacheName, cacheKey).then(function(response){
			if(response) {
				return response; 
			}
		}, function(err){
			console.log('error getting data from both the cache and the network', err);
			return;
		});	
	});	
}

export function networkFirst(url, cacheName, cacheKey) {
		let timeoutId;
		let cacheInstance = storageInstances[cacheName];

		var backupFromCache = new Promise(function(resolve){
			timeoutId = setTimeout(function(){
				requestFromCache(cacheName, cacheKey).then(function(response){
					if (response) { 
						console.log('networkFirst request: returning from Cache: ', response);
						return resolve(response);
					}
				});
			}, cacheInstance._config.timeoutInSeconds * 1000); 	
		});

		var networkRequest = requestFromNetwork(url, cacheName, cacheKey).then(function(response){
			if(timeoutId) { clearTimeout(timeoutId); }
			if(response) {
				// console.log('networkFirst request: returning from Network: ', response);
				return response;
			}
		}, function(err){
			console.log('error returned from requestFromNetwork', err);
		});

		return Promise.race([backupFromCache, networkRequest]);
}

export function fastest(url, cacheName, cacheKey) {
	return new Promise(function(resolve, reject) {
		let rejected = false;
		
		var handleRejection = function(err) {
			if (rejected){
				return reject(Error('both cache and network requests failed'), err);
			} else {
				console.log('rejected request', err);
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
		
		requestFromCache(cacheName, cacheKey).then(handleData, handleRejection);
		requestFromNetwork(url, cacheName, cacheKey).then(handleData, handleRejection);
	});
}

/* 
	NOTE: THERE IS AN ISSUE HERE WITH THE ORDRING OF CACHEKEY AND CACHEKEY THAT MAY NEED TO BE WORKED OUT...
*/
export function cacheOnly(cacheName, cacheKey) {
	return new Promise(function(resolve, reject) {
		return requestFromCache(cacheName, cacheKey).then(function(response){
			if(response) { 
				return resolve(response); 
			}
			console.log('response from cache request was blank');
			return reject('error: the response from cacheOnly request came back blank');
		}).catch(function(error){
			console.error('Cache Only Error: ', error);
			return reject(error);
		});	
	});
}

export function networkOnly(url) {
	return new Promise(function(resolve) {
	
	// NUll AS SECOND PARAM BECAUSE THERE IS NO CACHING HAPPENING. 
	// FALSE AS THIRD PARAM INDICATES THAT DATA SHOULDS NOT BE CACHED
	// ******* CONVER TO USING DECONSTRUCTED PARAMS TO AVOID THIS... *******
		requestFromNetwork(url, null, false).then(function(response){
			if(response) {
				return resolve(response);
			}
		}, function(err){
			console.log('networkOnly request: error returned from requestFromNetwork', err);
		});

	}); 
}

/* 
	All SW requests processed initially as fetch request so that SW can intercept and
	handle them using logic set up inside the SW...
	As thei is simply a wrapper for a fetch request, the fetch request could also be made
	directly from the app.js code
*/
export function loadViaServiceWorker(url) {
	return new Promise(function(resolve) {
		fetch(url).then(function(response) {			
			
			// If the response is a Response Object, convert it to JSON
			if(response.constructor == Response){
				response = response.json();
			}
			return response;
		}).then(function(response){
			
			// if response is not an array, wrap it inside an array so that user always receives back an array of objects
			if (response.constructor !== Array ) {
				response = [response];
			}
			console.log('returning from requestViaServiceWorker', response);
			return resolve(response);
		}).catch(function(error){
			console.log('error in requestViaServiceWorker', error);
		});
	});
}

export function loadImage(element, cacheName, loadAsBgImg=false) {
	let source = storageInstances[cacheName];
	let requestHandler = requestHandlers[source._config.requestMethod];
	let requestKey = element.getAttribute('dataloader-src');

	if(requestKey) {
		requestHandler(requestKey, cacheName, requestKey).then(function(response){
			let url = window.URL.createObjectURL(response[0]);
			if (loadAsBgImg) {
				element.style.background=`url(${url}) center / cover`;
			} else {
				element.setAttribute('src', url);
			}	
		}).catch(function(err){
			console.log('dataloaders: error processing images in loadImages', err);
		});
	} else {
		console.log(['dataloader error: loadImage funtion failed: dataloader-src attribute not found on the target element']);
	}
}

/* 
	Cache src content for css and js files so taht they can be loaded from the cache when the
	network is offline
*/
export function cacheFile(url) {
		requestFromNetwork(url, 'staticFileStore').then(function(){
			// console.log(`${url} has been added to the staticFileCache`);
		})
}

/* 
	Load stored CSS file content from the cache when the user is offline.
	Used on the fallback page
*/
export function loadCssFile(url, cacheName='staticFileStore') {

	console.log('load css target is: ', url);

	let source = storageInstances['staticFileStore'];
	let requestHandler = requestHandlers[source._config.requestMethod];
	let requestKey = url;
	
	let el = document.createElement('link');
	el.type = 'text/css';
	el.rel = 'stylesheet';

	if (requestKey && source) {
		console.log(`loading css file from ${cacheName}: ${url}`);
		requestHandler(cacheName, requestKey).then(function(response){
			let fileBlob = window.URL.createObjectURL(response[0]);
			el.href = fileBlob;
			console.log('this is the link tag element to be added', el);
			document.head[0].insertBefore(el, document.head.firstChild);
		}).catch(function(error){
			el.href = url;
			console.log (`error retrieving ${url} from cache. `, error);
			document.head[0].insertBefore(el, document.head.firstChild);
		})
	} else {
		console.log(['dataloader error: loadCssFile function failed: href attribute not found on the target element or the storageCache requested does not exist']);
	}
}

/* 
	Load stored JS file content from the cache when the user is offline.
	Used on the fallback page
*/
export function loadScript(url, cacheName='StaticFileStore') {
	
	let source = storageInstances['staticFileStore'];
	let requestHandler = requestHandlers[source._config.requestMethod];
	let requestKey = url;

	if(requestKey) {
		let newElement = document.createElement('script');
    newElement.type = 'text/javascript';
		requestHandler(requestKey, cacheName, requestKey).then(function(response){
			let fileBlob = window.URL.createObjectURL(response[0]);
			console.log('returning the script from the cache', url);
			newElement.src = fileBlob;
			document.body.appendChild(newElement);
		}).catch(function(err){
			console.log('dataloaders: error processing script in loadScript', err);
		});
	} else {
		console.log(['dataloader error: loadScript function failed: dataloader-src attribute not found on the target element']);
	}
}

export function cachePage(urlPath, pageContent) {
	return new Promise(function(resolve) {
		let pageStoreParams = {
			cacheName: 'pageStore',
			timeoutInSeconds: 2,
			maxEntries: 50,
			maxAge: 3600000000,
			useAsKey: 'url',
			requestMethod: 'cacheOnly'
		};

		if(!storageInstances['pageStore']) {
			setStorageInstance(pageStoreParams);
		}
		
		let data = storageInstances['pageStore'].setItem(urlPath, pageContent);
		resolve(data);
	});
}

export function requestFromNetwork(url, cacheName, shouldCache=true) {
  return new Promise(function(resolve, reject) {

    var request = new XMLHttpRequest();
    let responseType = 'text';

    // Change this to look up the storageInstance and look for an instance property that is set 
    // to image or something like that if the item should be treated as an image...
    if (cacheName == 'imageStore' || cacheName == 'staticFileStore') {
			responseType = 'blob';  	
    }
    
    request.onreadystatechange = function() {

      if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
        if (request.status === 200) {
					let response;
					
					if (request.response instanceof Blob) {
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
						// console.log('triggering data caching', url);
						updateCache(cacheName, response, url);
					}

					resolve(response);
          
        }
      }
    };

    request.onerror = function() {
      reject(Error('There was a network error.'));
    };

    request.open('GET', url, true);
    // request.setRequestHeader('Cache-Control', 'max-age:31536000 no-cache');
    request.responseType = responseType; 
    request.send();
  });
}

function requestFromCache(cacheName, cacheKey) {
	let cacheInstance = storageInstances[cacheName];
	return new Promise(function(resolve, reject) {
		
		let resultSet = [];

		if (typeof cacheName === undefined) {
			reject(Error(`${cacheName} is not a valid localforage store`));
		}
		
		if (cacheKey) {
			getItem(cacheInstance, cacheKey);
		} else {
			getAllItems(cacheInstance);
		}
		
		function getItem(cacheInstance, cacheKey) {
			return cacheInstance.getItem(cacheKey).then(function(response) {
				if(response && response != null) {
					resultSet.push(response);
				}
				if(resultSet.length > 0) {
					return resolve(resultSet);
				} 

				// Return empty resolve when no results found so promise is finished and 
				// requesting method can handle next steps.
				return resolve();

			}).catch(function(err) {
				return reject(Error(`getItem errored out: ${err}`));
			});
		}

		function getAllItems(cacheInstance) {
			return cacheInstance.length(function(err, numberOfKeys){
				if (numberOfKeys > 0) {
					cacheInstance.iterate(function(value, key, iterationNumber) { // eslint-disable-line no-unused-vars
						resultSet.push(value);
					}).then(function() {
						if (resultSet.length != -1) {
							return resolve(resultSet);
						}
						return resolve();
					}).catch(function(err) {
						return reject(Error(`requestFromCache: getAllItems errored out: ${err}`));
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

// may need to restructure to make sure these operations occur
// in the right sequence every time....
function updateCache(cacheName, data, keyFieldValue) {//eslint-disable-line
	
	new Promise(function(resolve){
			let cacheInstance = storageInstances[cacheName];

			expireOldItems(cacheName);

			for(let x=0; x < data.length; x++ ) {
				let item = data[x];

				// SET AN EXPIRY TIME ON THE ITEM
				setItemExpiry(cacheInstance._config.maxAge, item);

				let keyToUse = {};

				// check if useAsKey field for the instance is a field in the data item
				if(item[cacheInstance._config.useAsKey]) {
					// if yes, use that field as the key
					keyToUse = item[cacheInstance._config.useAsKey];
					keyToUse = keyToUse.toString();
				} else {
					// if not use the keyFIeldValue provided in the call updateCache
					keyToUse = keyFieldValue;
				}

				cacheInstance.setItem(keyToUse, item);
			}

			manageCacheSize(cacheName);
			resolve();
	});
}

/* 
	SETS THE EXPIRY TIME ON EVERY ITEM ADDED TO A CACHE IN MILLISECONDS
	NEED TO FIND OUT IF THIS IS EFFICIENT WHEN DONE VIA A LOOP OR NOT
*/
function setItemExpiry(maxAge, item){
	item.dataloaderExpiryTime = Date.now() + maxAge;
}

/* 
	expires items from the cache if the items dataloaderExpiryTime has passed
*/
function expireOldItems(cacheName) {
	let cacheInstance = storageInstances[cacheName];
	cacheInstance.iterate(function(value, key){
		let val = value;
		// console.log('value', val);
		// if(key == 1) {
		// 	val.dataloaderExpiryTime = 10000;
		// }
		if(val.dataloaderExpiryTime < Date.now()) {
			console.log(`removing expired item ${key} from ${cacheName}`);
			// NOT SUR3E THE THEN FUNCTION IS NEEDED HERE ....
			cacheInstance.removeItem(key).catch(function(err){
				console.log('could not remove item from cache: ', err);
			});
		}
	});
}

function manageCacheSize(cacheName) {
	let cacheInstance = storageInstances[cacheName];
	if(cacheInstance._config.maxEntries !== null) {
		cacheInstance.length().then(function(numberOfEntries){
			let entriesOverLimit = numberOfEntries - cacheInstance._config.maxEntries;
			let itemArray = [];
			if (entriesOverLimit > 0){
				cacheInstance.iterate(function(value) {
					// if (key == 4 || key == 7) {
					// 	value.dataloaderExpiryTime = value.dataloaderExpiryTime - 1000;
					// }
					
					itemArray.push(value);	
				}).then(function() {
					// sorts the items into ascending order by expiry data (closest expiry first)
					itemArray.sort(function (a, b) {
					if (a.dataloaderExpiryTime > b.dataloaderExpiryTime) {
					// if (a.id > b.id) {
						return 1;
					}
					if (a.dataloaderExpiryTime < b.dataloaderExpiryTime) {
					// if (a.id < b.id) {
						return -1;
					}
					// a must be equal to b
					return 0;
				});
				// slices entries from the start of the array
				itemArray = itemArray.slice(0, entriesOverLimit);

				// NEED TO LOOP THROUGH AND REMOVE ITEMS LEFT IN THE ITEMS ARRAY FROM THE CACHE...

				console.log(`removing ${itemArray.length} items from the cache: `, itemArray);
				});
			} else {
				console.log('entries are less than maxEntries', numberOfEntries, cacheInstance._config.maxEntries);
			} 
		});
	} else {
			console.log('no maxEntries set on this cache', cacheInstance);
			return;
		}
}

/* 
	THIS IS OBSERVER FOR ANY ELEMENT ADDED EVENTS THE USER WANTS TO INTERCEPT. 
	IT SHOULD BE CHANGED TO:
		1. MOVE THE SUPPORTING METHODS INTO A SUBMODULE FOR CODE ORGANIZATION
		2. SET UP A DEFAULT OR BACKUP FOR USE WHEN MUTUATIONOBSERVER IS NOT AVAILABLE IN THE BROWSWER....
*/
var listeners = [], 
doc = window.document, 
MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
observer;

export function detectElementAdded(selector, fn) {//eslint-disable-line
    // Store the selector and callback to be monitored
    listeners.push({
        selector: selector,
        fn: fn
    });
    if (!observer) {
        // Watch for changes in the document
        observer = new MutationObserver(check);
        observer.observe(doc.documentElement, {
            childList: true,
            subtree: true
        });
    }
    // Check if the element is currently in the DOM
    check();
}
    
function check() {//eslint-disable-line
    // Check the DOM for elements matching a stored selector
    for (var i = 0, len = listeners.length, listener, elements; i < len; i++) {
        listener = listeners[i];
        // Query for elements matching the specified selector
        elements = doc.querySelectorAll(listener.selector);
        for (var j = 0, jLen = elements.length, element; j < jLen; j++) {
            element = elements[j];
            // Make sure the callback isn't invoked with the 
            // same element more than once
            if (!element.ready) {
                element.ready = true;
                // Invoke the callback with the element
                listener.fn.call(element, element);
            }
        }
    }
}
/* eslint-disable */