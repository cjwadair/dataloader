# Dataloader

### NOTE: THIS LIBRARY IS IN ACTIVE DEVELOPMENT AND BREAKING CHANGES ARE POSSIBLE AT ANY TIME. ITS ALSO POSSIBLE THAT THE README CONTENT BELOW IS NOT 100% ACCURATE

Offline-dataloader is a tool for managing cached data in your web apps. Using [localforage](https://github.com/localForage/localForage) as a backend it simplifies the task of implementing caching strategies for API calls, 3rd Party resources and infrequently changing local resources that you want to cache. 

The goal of the project is to provide a similar functionality to the [sw-toolbox](https://github.com/GoogleChrome/sw-toolbox) library for browsers that do not support service workers or in cases where implmenting a service worker might not make sense. 


* Works with IndexDb, webSQL, and localstorage
* Supports all modern browsers from ie8 and up (and possibly beyond but that hasn't been fully tested).
* Provides a simple but powerful API for implementing offline support and caching strategies

Offline-dataloader does not support service workers (intentionally), but it does pair nicely with the google sw-toolbox library or it can be used with the sw-dataloaders library for implementations that use service workers when available but still work on browsers that do not. 

#Installation

`npm install offline-dataloader --save`

then in your index.js file: 

`var dataloader = require('offline-dataloader');`

or using es6 modules:

`import * as dataloaders from 'offline-dataloader';`

#How to Use

#### Configuring storage instances

By default, offline dataloader stores all data in the 'dlDataStore' cache. Caching parameters for this store can be set and additional custom data stores can be created using the setStoreageInstances() method which takes an object literal as its only parameter:

```
var cacheParams = {
	dlDataStore: {
		cacheName: 'dlDataStore',
		timeoutInSeconds: 2,
		maxEntries: 6,
		maxAge: 31536000,
		useAsKey: 'id',
		requestMethod: 'networkFirst'
	},
	imageStore: {
		cacheName: 'imageStore',
		timeoutInSeconds: 3,
		maxEntries: 15,
		maxAge: 31536000,
		useAsKey: 'url',
		requestMethod: 'cacheFirst',
		responseType: 'blob'
	}
};

dataloaders.setStorageInstances(cacheParams);
``` 

###Making data requests

Offline-dataloader supports the 5 caching strategies outlined in Jake Archibald's excellent Offline Cookbook (make this a link...):

* Cache First - tries the cache first and fallsback to a network request if that fails
* Network First - tries a network request first and falls back to the cache if that fails
* Fastest - tries both a cache request and a network request at the same time, returning whichever one comes back first. 
* Cache Only - tries the cache only, returning an error if the data is not found there
* Network Only - tries the network only, effectively the same as a straight network request.

When data is requested using the NetworkFirst and Fastest methods, the cache is automatically updated with the fresh data that is returned by the request. CacheOnly and CacheFirst do not trigger any network requests and do not update the cached information in any way. When using networkOnly does not cache the data either. Use networkFirst instead if caching is required. 


#### Network First

`dataloaders.networkFirst(url, cacheName [, cacheKey]);`

#### Cache First

`dataloaders.cacheFirst(url, cacheName [, cacheKey]);`

#### Fastest

`dataloaders.fastest(url, cacheName [, cacheKey]);`

#### Cache Only

`dataloaders.cacheOnly(url, cacheName [, cacheKey]);`

#### Network Only

`dataloaders.networkOnly(url);`
