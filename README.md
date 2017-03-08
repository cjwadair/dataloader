# Offline-dataloader

#### NOTE: THIS LIBRARY IS IN ACTIVE DEVELOPMENT AND BREAKING CHANGES ARE POSSIBLE AT ANY TIME. ITS ALSO POSSIBLE THAT THE README CONTENT BELOW IS NOT 100% ACCURATE

Offline-dataloader is a Javascript library that wraps the [localforage](https://github.com/localForage/localForage) library in a series of simple helpers that dramatically simplify the process of setting up and managing offline data storage for your website or web application. 

Key features of the libary include: 

* Works with [localforage](https://github.com/localForage/localForage), so it supports offline storage cross-browser using IndexDb, webSQL, and localStorage thorugh a simple localStorage-like API.
* Supports all modern browsers from ie8 and up and mobile browsers from Safari 3.1 and Android 2.1 (complete list to follow...)
* Provides simple helpers for implementing cache management strategies that cover most use cases. See Jake Archibald's excellent article, [The Offline Cookbook](https://jakearchibald.com/2014/offline-cookbook/) for more information on the various strategies available.
* Provides configuration options that simplify cache management and cache expiration tasks


Offline-dataloader is similar in its features to Google's [sw-toolbox](https://github.com/GoogleChrome/sw-toolbox) library with the exception that offline-dataloader does not require (or support) Service Workers. As such it could be used as a stand-alone alternative to sw-toolbox or paired with it for a best of both worlds solution that leverages the advantages of a service worker when available but still supports offline storage where they are not (an example of this is in the works...). 


#Installation

[download from github](https://github.com/cjwadair/offline-dataloader) or install using npm:

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

Offline-dataloader supports the 5 caching strategies outlined in Jake Archibald's excellent [Offline Cookbook](https://jakearchibald.com/2014/offline-cookbook/):

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
