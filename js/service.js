'use strict';

const targetTabId = new Set();
//var enable;

// on installation the audio only option is set to false
async function setDefaultValues() {
	const {audioonly} = await browser.storage.local.get('audioonly');
	
	if (!audioonly) {
		await browser.storage.local.set({audioonly: 0});
	}
}

// fires when first installed but also on browser update or extension update
browser.runtime.onInstalled.addListener(() => {
	setDefaultValues();
});

var stoppls = 0;
var currentURL;
var oldURL;

// Get the current url
browser.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		currentURL = request.currloc;
		//console.log("currentURL: " + request.currloc);
	}
);

// always listening for urls, the content script decides whenever should play audio only or not
checkAudioUrls();

/*
function checkAudioUrls() {
	chrome.webRequest.onBeforeRequest.addListener(
		processRequest,
		{ urls: ["<all_urls>"],
		  types: ["xmlhttprequest"]
		}
	);
}
*/

function checkAudioUrls() {
	chrome.webRequest.onBeforeRequest.addListener(
		processRequest,
		{
			urls: ["<all_urls>"],
			types: ["xmlhttprequest"]
	});
}
/*
function checkAudioUrls() {
	chrome.webRequest.onBeforeRequest.addListener(
		processRequest,
		{
			urls: ["<all_urls>"],
			types: ["xmlhttprequest"]
	},
	['requestBody']
	);
}
*/

// original code from https://github.com/craftwar/youtube-audio
function processRequest(details) {
	//console.log("processRequest requested");
	// youtube.com/embed/ is usally for ads, you don't want to even hear the ad right?
	if (details.originUrl.includes("https://www.youtube.com/embed/") || details.originUrl.includes(" https://accounts.youtube.com/RotateCookiesPage")) {
		console.log("bailing! details.originUrl.includes: " + details.originUrl);
		return;
	}
	
	if (currentURL) {
		if (currentURL.includes("accounts.youtube.com/RotateCookiesPage")) {
		console.log("bailing! currentURL: " + currentURL);
		return;
		}
	}
	// here we are forcing itag 251, with a little more code we could choose from 139/140/141/171/172/249/250/251/256/258
	// 251 is probably the safest bet and has the best quality
	if (details.url.includes('mime=audio') && details.url.includes('itag=251') && !details.url.includes('live=1') && (currentURL) && (currentURL !== oldURL)) {
		// reverse parameter order (same as url parameter traversal order)
		const parametersToBeRemoved = ['ump', 'rbuf=', 'rn=', 'range='];		
		const audioURL = removeURLParameters(details.url, parametersToBeRemoved);
		
		// check if the url has &redirect_counter and remove everything after
		//const newString = audioURL.split('&redirect_counter')[0];
		//console.log("ogString: " + audioURL);
		//console.log("newString: " + newString);
		
		// fetch the url and check for a pre tag
		
		chrome.tabs.sendMessage(details.tabId, {url: audioURL, curl: currentURL});
		//console.log("audio URL ORIGIN: " + details.originUrl);
		//console.log("audio URL: " + audioURL);
		stoppls = stoppls + 1;
		console.log("stoppls counter: " + stoppls);
		console.log("currentURL: " + currentURL);
		console.log("currentURL audio only url: " + audioURL);
		console.log("-------------------------");
		//console.log("currentURL: " + currentURL);
		oldURL = currentURL;
	}
}

function removeURLParameters(url, parametersToBeRemoved) {
	console.log("removeURLParameters executed: " + url);
	const urlparts = url.split('?');
	if (urlparts.length >= 2) {
		let pars = urlparts[1].split('&');

		// assume each parameter exists once only
		for (const parameter of parametersToBeRemoved) {
			for (var i = pars.length - 1; ~i; --i) {
				if (pars[i].startsWith(parameter)) {
					pars.splice(i, 1);
					break;
				}
			}
		}
		url = `${urlparts[0]}?${pars.join('&')}`;
	}
	return url;
}

/*
function disableExtension() {
	chrome.webRequest.onBeforeRequest.removeListener(processRequest);
}
*/
