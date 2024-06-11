'use strict';

// listen on install only
browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  //if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      {
				// onboarding page
        const url = browser.runtime.getURL("onboarding/installed.html");
        await browser.tabs.create({ url, active: true });
        // set defaults in storage
        setDefaultValues();
      }
      break;
    // see below
  }
});

// listen for removal of permissions
browser.permissions.onRemoved.addListener(reqPerm);

var reqPermWait = 0;

// decide what to do when permissions change
async function reqPerm() {
	let challengeAllPerms = {
		origins: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"],
		permissions: ["storage", "webRequest"],
	};
	
	let challengeOriginsPerms = {
		origins: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"],
	};
	
	let challengeBasicPerms = {
		permissions: ["storage", "webRequest"],
	};
	
	const allperms = await browser.permissions.contains(challengeAllPerms);
	const originsperms = await browser.permissions.contains(challengeOriginsPerms);
	const basicperms = await browser.permissions.contains(challengeBasicPerms);
	
	//console.log("All permssions: " + allperms);
	//console.log("Origins permssions: " + originsperms);
	//console.log("Basic permssions: " + basicperms);
	
	// if we don't have all the permissions needed
	if (!allperms) {
		// and didn't request them in the last ~5 seconds
		if (reqPermWait === 0) {
			// alert the content script to let the user know we need the permissions to work properly
			//console.log("Sending message to content script: we need permissions.");
			
			const tabs = await chrome.tabs.query({});

			for (const tab of tabs) {
				if (!tab.id) return;
				//console.log("tab.id: " + tab.id);
				browser.tabs.sendMessage(tab.id, {weneedpermissions: "we really need them"});
			}

			// we wait a little in case the user changes more than one permission in close sucession
			reqPermWait = 1;
			await new Promise(r => setTimeout(r, 5000));
			reqPermWait = 0;
		}
	}
}

// check for permissions on load
reqPerm();

// on installation the audio only option is set to false
async function setDefaultValues() {
	const {audioonly} = await browser.storage.local.get('audioonly');
	
	if (!audioonly) {
		await browser.storage.local.set({audioonly: 0});
	}
}

var currentURL;
var oldURL;

// Get the current url
browser.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		// in case the user reloads the page
		if (currentURL == request.currloc) {
			oldURL = "";
		}
		currentURL = request.currloc;
		console.log("requested currentURL: " + request.currloc);
	}
);

// always listening for urls, content script decides what to play
function checkAudioUrls() {
	browser.webRequest.onBeforeRequest.addListener(
		processRequest,
		{
			urls: ["<all_urls>"],
			types: ["xmlhttprequest"]
	});
}

checkAudioUrls();

// original code from https://github.com/craftwar/youtube-audio
function processRequest(details) {
	// youtube.com/embed/ is usally for ads, you don't want to even hear the ad right?
	if (details.originUrl.includes("https://www.youtube.com/embed/") || details.originUrl.includes(" https://accounts.youtube.com/RotateCookiesPage")) {
		console.log("bailing! details.originUrl.includes: " + details.originUrl);
		return;
	}
	
	// reviewing code I found this so funny I'm leaving it here (:
	//if (!currentURL !== oldURL) {
		//console.log("currentURL = oldURL");
	//}
	// we are forcing itag 251, with a little more code we could choose from 139/140/141/171/172/249/250/251/256/258
	// 251 is probably the safest bet and has the best quality
	//if (details.url.includes('mime=audio') && details.url.includes('itag=251') && !details.url.includes('live=1') && (currentURL) && (currentURL !== oldURL)) {
	if (details.url.includes('base.js') && (currentURL) && (!details.url.includes('/api/stats/'))) {
		// reverse parameter order (same as url parameter traversal order)
		const parametersToBeRemoved = ['ump', 'rbuf=', 'rn=', 'range='];		
		const audioURL = removeURLParameters(details.url, parametersToBeRemoved);
		
		console.log("-------------------------");
		console.log("currentURL: " + currentURL);
		console.log("currentURL audio only url: " + audioURL);
		console.log("-------------------------");	
		
		// we only care about videos
		//if (!currentURL.includes('.youtube.com/watch?')) {
		if (currentURL.includes('.youtube.com/watch?')) {
			console.log("bailing! currentURL: " + currentURL);
			return;
		}
		

		
		browser.tabs.sendMessage(details.tabId, {url: audioURL, curl: currentURL});

		oldURL = currentURL;
	}
}

// used to remove parameters from the audio only url
function removeURLParameters(url, parametersToBeRemoved) {
	console.log("removeURLParameters executed, original url: " + url);
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
	console.log("removeURLParameters executed, new url: " + url);
	return url;
}
