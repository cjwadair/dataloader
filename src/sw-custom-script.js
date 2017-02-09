'use strict';

import * as dataloaders from '../main/sw-dataLoaders';

(function(){

	/* 
		cacheParams is array of objects that holds routing details to tell SW which type of 
		request to trigger when it interceptsa fetch request from the page 
	*/
	var cacheParams = {
		dataStore: {
			// files from the guidefinder.com apu
			url:  [
				/^https?:\/\/(?:www\.)?guidefinder\.herokuapp\.com\/api/
			],
			requestMethod: 'networkFirst',
			cacheName: 'SWdataStore', 
			maxAge: [60],
			maxEntries: 5,
			timeoutInSeconds: 2
		},
		imageStore: {
			// files from the imgix folder with the file extension matching jpg, jpeg, png, gif, tiff, webp, svg
			url: [
				/^(?:https?:\/\/)?(?:.*\.)?(?:pwa-demo-app.imgix.net|localhost:300(?:0|1)\/images|offlinepwa.firebaseapp.com\/images).+(?:\.jpg|\.jpeg|\.png|\.gif|\.tiff|\.webp|\.svg)/
			],
			requestMethod: 'cacheFirst',
			cacheName: 'SWimageStore', 
			maxAge: [60 * 60 * 24 * 365],
			maxEntries: 10,
			timeoutInSeconds: 2
		},
		staticFileStore: {
			// any file from googleapis or gstatic plus offlinepwa or local host files from the scripts, images or styles folders plus the manifest file
			url: [
				/^http(?:s)?:\/\/(?:(.*\.)?googleapis\.com|(.*\.)?gstatic\.com)/,
				/^(?:https?:\/\/)?(?:.*\.)?(?:localhost:300(?:0|1)|offlinepwa\.firebaseapp\.com)(?:\/styles|\/(?!scripts\/dontshow)scripts|\/manifest\.json|\/index\.html)/
			],
			requestMethod: 'cacheFirst',
			cacheName: 'SWstaticStore', 
			maxAge: [60 * 60 * 24 * 365],
			maxEntries: 10,
			timeoutInSeconds: 2
		}
	};

	self.addEventListener('install', function(event) {
		dataloaders.setStorageInstances(cacheParams);
		console.log('service worker install event taking place', event, dataloaders);
	});

	self.addEventListener('fetch', function(event){
		console.debug('fetch event captured by Service Worker', event.request.url);
		dataloaders.handleFetchEvent(event);
	});

})();

