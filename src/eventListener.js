/* eslint-disable */
'use strict';

/* 
	THIS IS OBSERVER FOR ANY ELEMENT ADDED EVENTS THE USER WANTS TO INTERCEPT. 
	IT SHOULD BE CHANGED TO:
		1. MOVE INTO ITS OWN NPM PACKAGE EVENTUALLY
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