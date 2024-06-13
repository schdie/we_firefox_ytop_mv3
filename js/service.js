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
