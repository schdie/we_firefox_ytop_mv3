// on the first installation the options are set to false
async function setDefaultValues() {
	
	const {audioonly} = await browser.storage.local.get('audioonly');
	const {commentsout} = await browser.storage.local.get('commentsout');
	
	if (!audioonly) {
		await browser.storage.local.set({audioonly: 0});
	}
	
	if (!audioonly) {
		await browser.storage.local.set({commentsout: 0});
	}
}

// fires when first installed but also on browser update or extension update
browser.runtime.onInstalled.addListener(() => {
	setDefaultValues();
});

// id to identify the rule, must be > 1
const adblockRuleID = 2;

// block the video streams
function blockvideostream() {
	browser.declarativeNetRequest.updateDynamicRules(
		{
			addRules: [
				{
					action: {
						type: "block",
					},
					condition: {
						resourceTypes: ["xmlhttprequest"],
						urlFilter: "googlevideo.com/*mime=video*",
						initiatorDomains: ["youtube.com"],
					},
					id: adblockRuleID,
					priority: 1,
				},
			],
			removeRuleIds: [adblockRuleID],
		},
		() => {
			console.log("block rule added");
		}
	);
}

// unblock the video streams
function unblockvidestream() {
	browser.declarativeNetRequest.updateDynamicRules(
		{
			removeRuleIds: [adblockRuleID], // this removes old rule if any
		},
		() => {
			console.log("block rule removed");
		}
	);
}

// handling received requests by yt.js
function handleMessage(request, sender) {
  console.log(`A content script sent a message: ${request.greeting}`);
  if (request.greeting == "removeblock") {
		console.log("block removed");
		unblockvidestream();
	} else if (request.greeting == "addblock") {
		console.log("block added");
		blockvideostream();
	}
}

browser.runtime.onMessage.addListener(handleMessage);
