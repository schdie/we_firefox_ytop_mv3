'use strict';

// listen on install only
browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  //if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      {
				// onboarding page
        const url = browser.runtime.getURL("onboarding/installed.html");
        await browser.tabs.create({ url });
        // set defaults in storage
        setDefaultValues();
      }
      break;
    // see below
  }
});

// listen for permissions changes
browser.permissions.onRemoved.addListener(reqPerm);
browser.permissions.onAdded.addListener(reqPerm);

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
	
	console.log("allperms: " + allperms);
	console.log("originsperms: " + originsperms);
	console.log("basicperms: " + basicperms);
	
	// we only bother the user once
	
}

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
	
	if (!currentURL !== oldURL) {
		console.log("currentURL = oldURL");
	}
	// here we are forcing itag 251, with a little more code we could choose from 139/140/141/171/172/249/250/251/256/258
	// 251 is probably the safest bet and has the best quality
	if (details.url.includes('mime=audio') && details.url.includes('itag=251') && !details.url.includes('live=1') && (currentURL) && (currentURL !== oldURL)) {
		// reverse parameter order (same as url parameter traversal order)
		const parametersToBeRemoved = ['ump', 'rbuf=', 'rn=', 'range='];		
		const audioURL = removeURLParameters(details.url, parametersToBeRemoved);
		
		// we only care about videos
		if (!currentURL.includes('.youtube.com/watch?')) {
			console.log("bailing! currentURL: " + currentURL);
			return;
		}
		
		console.log("-------------------------");
		console.log("currentURL: " + currentURL);
		console.log("currentURL audio only url: " + audioURL);
		console.log("-------------------------");	
		
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
