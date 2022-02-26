# Offline-dataloader

Helper methods for using offline data loading using [localforage](https://github.com/localForage/localForage)

* Supports offline storage cross-browser using IndexDb, webSQL, and localStorage thorugh a simple localStorage-like API.
* Supports all modern browsers from ie8 and up and mobile browsers from Safari 3.1 and Android 2.1 (complete list to follow...)
* See [The Offline Cookbook](https://jakearchibald.com/2014/offline-cookbook/) for more information on the storage strategies supported.

# Installation

[download from github](https://github.com/cjwadair/offline-dataloader) or install using npm:

`npm install offline-dataloader --save`

then in your index.js file: 

`var dataloader = require('offline-dataloader');`

or using es6 modules:

`import * as dataloaders from 'offline-dataloader';`

# How to Use

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

### Making data requests

Offline-dataloader supports the 5 caching strategies outlined in Jake Archibald's excellent [Offline Cookbook](https://jakearchibald.com/2014/offline-cookbook/):


#### Network First

* Network First - tries a network request first and falls back to the cache if that fails

`dataloaders.networkFirst(url, cacheName [, cacheKey]);`

#### Cache First

* Cache First - tries the cache first and fallsback to a network request if that fails

`dataloaders.cacheFirst(url, cacheName [, cacheKey]);`

#### Fastest

* Fastest - tries both a cache request and a network request at the same time, returning whichever one comes back first. 

`dataloaders.fastest(url, cacheName [, cacheKey]);`

#### Cache Only

* Cache Only - tries the cache only, returning an error if the data is not found there

`dataloaders.cacheOnly(url, cacheName [, cacheKey]);`

#### Network Only

* Network Only - tries the network only, effectively the same as a straight network request.

`dataloaders.networkOnly(url);`
