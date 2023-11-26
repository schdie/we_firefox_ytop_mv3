'use strict';

/*
I tried several approaches and I feel this is the best option when using the website.
It is not the cleanest but requires the least amount of code.
We don't have to deal with ciphers and it's probably the most resistant to YT changes.
*/

// original logic code from https://github.com/craftwar/youtube-audio
browser.runtime.onMessage.addListener(
	(request, sender, sendResponse) => {
		console.log("main function, document.location.href : " + document.location.href);
		const url = request.url;
		console.log("main function, url: " + url);
		const curl = request.curl;
		console.log("main function, curl: " + curl);
		// save the audio only source in case of a switch
		recoveredAudioSource = url;
		
		// check the url for special cases
		redirectCases(url);
		
		const videoElement = document.getElementsByTagName('video')[0];
				
		// save the video+audio source in case of a switch
		if (videoElement.src.indexOf("blob:") >= 0) {
			originalVideoSource = videoElement.src;
		}

		// time to try to play the new source
		if (videoElement.src != url && isAudioEnabledfromStorage === 1) {
			// https://developer.chrome.com/blog/play-request-was-interrupted/
			var playPromise = videoElement.play();

			if (playPromise !== undefined) {
					playPromise.then(function() {
						videoElement.src = url;
						setCurrentTime();
						videoElement.play();
						console.log("Play promise succeed!");
					}).catch(function(error) {
						console.log("Play promise failed: " + error);
						// we are just going to brute force or way because youtube doesn't play nice sometimes
						videoElement.src = url;
						setCurrentTime();
						videoElement.play();
					});
			}
		}
	}
);

browser.runtime.sendMessage('1');

// global scope, used to check if audioonly is enabled or not "currently"
var isAudioEnabledfromStorage;

// global scope, used to store original audio+video source
var originalVideoSource;

// global scope, used to store the recovered audio source
var recoveredAudioSource;

// sending the current url to the service worker
function urlChanged(e) {
  const sending = browser.runtime.sendMessage({
    currloc: document.location.href,
  });
}

urlChanged();

// get the stored value of audioonly and set the isAudioEnabledfromStorage var
async function getStoredValues() {
	const {audioonly} = await browser.storage.local.get('audioonly');

  if (audioonly === 1) {
		console.log("startup: audioonly is enabled.");
		isAudioEnabledfromStorage = 1;
	} else {
		isAudioEnabledfromStorage = 0;
		console.log("startup: audioonly is disabled.");
	}
}

// this should be one of the first things to execute
getStoredValues();

// enables audio only in storage
async function storEnableAudioOnly() {
	const {audioonly} = await browser.storage.local.get('audioonly');
	await browser.storage.local.set({audioonly: 1});
}

// disables audio only in storage
async function storDisableAudioOnly() {
	const {audioonly} = await browser.storage.local.get('audioonly');
	await browser.storage.local.set({audioonly: 0});
}

// function to play only audio
function playAudioOnly() {
	console.log("playAudioOnly called: " + recoveredAudioSource);
	const videoElement = document.getElementsByTagName('video')[0];
	videoElement.src = recoveredAudioSource;
	setCurrentTime();
	videoElement.play();
}

// function to play the original stream with video+audio
function playVideoWithAudio() {
	console.log("playVideoWithAudio called: " + originalVideoSource);
	const videoElement = document.getElementsByTagName('video')[0];
	videoElement.src = originalVideoSource;
	setCurrentTime();
	videoElement.play();
}

// get the current time of the player to allow for a seamless switch
function setCurrentTime() {
	// desktop
	if (!document.location.href.includes('m.youtube.com/watch?')) {
		// find the video element
		const videoElement = document.getElementsByTagName('video')[0];
		// save the current player time
		var currentTime = document.getElementsByClassName("ytp-time-current")[0];
		// convert the time into seconds
		var currentTimeSeconds = +(currentTime.innerText.split(':').reduce((acc,time) => (60 * acc) + +time));
		// set the current time for the video element
		videoElement.currentTime = currentTimeSeconds;
	} else {
	// mobile
	// find the video element
		const videoElement = document.getElementsByTagName('video')[0];
		console.log("mobile videoElement: " + videoElement);
		// save the current player time
		//var currentTime = document.getElementsByClassName("ytm-time-display")[0];
		//console.log("mobile time: " + currentTime.outerHTML);
		// convert the time into seconds
		//var currentTimeSeconds = +(currentTime.innerText.split(':').reduce((acc,time) => (60 * acc) + +time));
		
		// use the href &t=xxxxxs
		// set the current time for the video element
		//videoElement.currentTime = currentTimeSeconds;
	}
}

// function to create our audioonly div
async function createAudioDiv() {
	// ytp-right-controls needs to be loaded before we can attach our div to it 
	// there's more than one ytp-right-controls, once 'movie_player' has loaded we can get the first one safely
	while(!document.getElementById('movie_player')) {
		await new Promise(r => requestAnimationFrame(r));
	}
	
	// if we already exist there's no need for more of us
	if (document.getElementById('audioonly')) {
		// but before we leave we check if audioonly is enabled and request the audio playback
		//if (document.getElementById('audioonly').getAttribute("aria-pressed") == "true") {
			// request playback to audio only
			//playAudioOnly();
		//}
		console.log("audioonly div already exists, bailing.");
		return;
	}
	
	if (document.getElementsByClassName('ytp-right-controls')[0]) {
		console.log("Desktop button.");
		// once ytp-right-controls can be safely found
		let ytpRightControlsElement = document.getElementsByClassName('ytp-right-controls')[0];
		
		// we create the new div to append right before ytp-right-controls
		let audiotdiv = document.createElement("div");
		
		// sometimes there's a race condition at startup, this fixes that
		while(isAudioEnabledfromStorage == null) {
			await new Promise(r => requestAnimationFrame(r));
		}

		// check the initial state our div should have
		if (isAudioEnabledfromStorage === 1) {
			audiotdiv.innerHTML = '<button id="audioonly" class="ytp-audioonly-button ytp-button" data-priority="3" data-title-no-tooltip="Audio-only Toggle" aria-pressed="true" aria-label="Audio-only Toggle" title="Audio-only Toggle"><svg class="ytp-subtitles-button-icon" height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><use class="ytp-svg-shadow" xlink:href="#ytp-id-ao17"></use><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg></button>';
		} else {
			audiotdiv.innerHTML = '<button id="audioonly" class="ytp-audioonly-button ytp-button" data-priority="3" data-title-no-tooltip="Audio-only Toggle" aria-pressed="false" aria-label="Audio-only Toggle" title="Audio-only Toggle"><svg class="ytp-subtitles-button-icon" height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><use class="ytp-svg-shadow" xlink:href="#ytp-id-ao17"></use><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg></button>';
		}

		// get the parent node
		let parentDiv = ytpRightControlsElement.parentNode;

		// insert the new elements to the left of the ytp-right-controls div
		parentDiv.insertBefore(audiotdiv, ytpRightControlsElement);
	} else {
		console.log("mobile div!");
		
		// mobile
		while(!document.getElementsByClassName('icon-share_arrow')[0]) {
			await new Promise(r => requestAnimationFrame(r));
		}
	
		let ytpRightControlsElementMobile = document.getElementsByClassName('icon-share_arrow')[0];
		//ytpRightControlsElementMobile.remove();
		//document.getElementsByClassName('player-controls-top').innerHTML += '<button id="audioonly" aria-label="Autoplay is off" aria-pressed="false" class="ytm-autonav-toggle-button-container"><c3-icon class="spanner-icon-off"><svg width="36" height="14" viewBox="0 0 36 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" width="34" height="14" rx="7" fill="white" fill-opacity="0.5"></rect></svg></c3-icon><c3-icon class="pause-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" rx="10" fill="#717171"></rect><rect x="6" y="5.33" width="2.67" height="9.33" fill="white"></rect><rect x="11.33" y="5.33" width="2.67" height="9.33" fill="white"></rect></svg></c3-icon></button>';
		console.log("ytpRightControlsElementMobile: " + ytpRightControlsElementMobile);
		
		let audiotdivMobile = document.createElement("div");
		//audiotdivMobile.innerHTML = '<ytm-button-renderer id="audioonly" class="slim_video_action_bar_renderer_button icon-share_arrow"><button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading" style="" aria-label="" title=""><div class="yt-spec-button-shape-next__icon" aria-hidden="true"><c3-icon><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z"></path></svg></c3-icon></div><div class="yt-spec-button-shape-next__button-text-content"><span class="yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap" role="text">Share</span></div><yt-touch-feedback-shape style="border-radius: inherit;"><div class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response" aria-hidden="true"><div class="yt-spec-touch-feedback-shape__stroke" style=""></div><div class="yt-spec-touch-feedback-shape__fill" style=""></div></div></yt-touch-feedback-shape></button></ytm-button-renderer>';
		audiotdivMobile.innerHTML = '<ytm-button-renderer id="audioonly" class="slim_video_action_bar_renderer_button icon-share_arrow"><button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading" style="" aria-label="Pls Respond" title=""><div class="yt-spec-button-shape-next__icon" aria-hidden="true"><c3-icon><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M15,5.63L20.66,12L15,18.37V15v-1h-1c-3.96,0-7.14,1-9.75,3.09c1.84-4.07,5.11-6.4,9.89-7.1L15,9.86V9V5.63 M14,3v6 C6.22,10.13,3.11,15.33,2,21c2.78-3.97,6.44-6,12-6v6l8-9L14,3L14,3z"></path></svg></c3-icon></div><div class="yt-spec-button-shape-next__button-text-content"><span class="yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap" role="text">Share</span></div><yt-touch-feedback-shape style="border-radius: inherit;"><div class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response" aria-hidden="true"><div class="yt-spec-touch-feedback-shape__stroke" style=""></div><div class="yt-spec-touch-feedback-shape__fill" style=""></div></div></yt-touch-feedback-shape></button></ytm-button-renderer>';
		//<ytm-button-renderer class="slim_video_action_bar_renderer_button icon-share_arrow"><button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading" style="" aria-label="" title=""><div class="yt-spec-button-shape-next__icon" aria-hidden="true"><c3-icon><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z"></path></svg></c3-icon></div><div class="yt-spec-button-shape-next__button-text-content"><span class="yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap" role="text">Share</span></div><yt-touch-feedback-shape style="border-radius: inherit;"><div class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response" aria-hidden="true"><div class="yt-spec-touch-feedback-shape__stroke" style=""></div><div class="yt-spec-touch-feedback-shape__fill" style=""></div></div></yt-touch-feedback-shape></button></ytm-button-renderer>
		//ytpRightControlsElementMobile.appendChild(audiotdivMobile);
		//<button id="audioonly" class="yt-spec-button-shape-next yt-spec-button-shape-next--text yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-l yt-spec-button-shape-next--icon-button" style="" aria-label="false" title="Audio-only Toggle"><c3-icon><svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z"></path></svg></c3-icon></div><yt-touch-feedback-shape style="border-radius: inherit;"><div class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--overlay-touch-response" aria-hidden="true"><div class="yt-spec-touch-feedback-shape__stroke" style=""></div><div class="yt-spec-touch-feedback-shape__fill" style=""></div></div></yt-touch-feedback-shape></button>
		//audiotdivMobile.innerHTML = '<button id="audioonly" class="ytp-audioonly-button ytm-button" data-priority="3" data-title-no-tooltip="Audio-only Toggle" aria-pressed="true" aria-label="Audio-only Toggle" title="Audio-only Toggle"><svg class="ytp-subtitles-button-icon" height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><use class="ytp-svg-shadow" xlink:href="#ytp-id-ao17"></use><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg><div class="ytp-unmute-box"></button>';
		//console.log("audiotdivMobile: " + audiotdivMobile);
		
		let parentDivMobile = ytpRightControlsElementMobile.parentNode;
		//console.log("parentDivMobile: " + parentDivMobile);
		 
		// insert the new elements to the left of the player-controls-top div
		parentDivMobile.insert(audiotdivMobile, ytpRightControlsElementMobile);
		//document.getElementsByClassName('player-controls-top').innerHTML += '<button aria-label="Autoplay is off" aria-pressed="false" class="ytm-autonav-toggle-button-container"><c3-icon class="spanner-icon-off"><svg width="36" height="14" viewBox="0 0 36 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" width="34" height="14" rx="7" fill="white" fill-opacity="0.5"></rect></svg></c3-icon><c3-icon class="pause-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" rx="10" fill="#717171"></rect><rect x="6" y="5.33" width="2.67" height="9.33" fill="white"></rect><rect x="11.33" y="5.33" width="2.67" height="9.33" fill="white"></rect></svg></c3-icon></button>';	
		
	}
  
  // add an event listener for clicks on the created div and the quality menu of yt
	monitorForClicks();
}

// monitoring for clicks on our div and the video quality menu of YT
async function monitorForClicks() {
	// monitor our div
	document.getElementById('audioonly').addEventListener("click", function (e) {
		// set isAudioEnabledfromStorage and save it to storage
		if (isAudioEnabledfromStorage === 1) {
			isAudioEnabledfromStorage = 0;
			storDisableAudioOnly();
		} else {
			isAudioEnabledfromStorage = 1;
			storEnableAudioOnly();
		}
		
		// set the audioonly div to enabled/disabled
		if (this.getAttribute("aria-pressed") == "false") {
			this.setAttribute("aria-pressed", "true");
			// and request to play audio only
			playAudioOnly();
		} else {
			this.setAttribute("aria-pressed", "false");
			// or request to play video+audio
			playVideoWithAudio();
		}
	});
	
	// sometimes the user may click on a video resolution from the quality menu to leave "audio only" mode, so...
	// we are also hijacking this function to monitor for clicks on the youtube settings > quality element at the same time
	// ytp-id-XX is random, use 'ytp-popup ytp-settings-menu' class
	
	// can't monitor what doesn't exist yet
	while(!document.getElementById('movie_player')) {
		await new Promise(r => requestAnimationFrame(r));
	}
	
	// monitor the YT video quality buttons
	document.getElementsByClassName('ytp-popup ytp-settings-menu')[0].addEventListener("click", function (e) {
		// we only care if the audioonly div is enabled (faster than checking storage)
		if (document.getElementById('audioonly').getAttribute("aria-pressed") == "true") {
			// this is a hack, but when clicking on any child element in ytp-menuitem-label...
			var elT = document.getElementsByClassName('ytp-menuitem-label')[0].innerText;
			// ...that contains any of the following text values
			if (elT.includes("2160p") || elT.includes("1440p") || elT.includes("1080p") || elT.includes("720p") || elT.includes("480p") || elT.includes("360p") || elT.includes("240p") || elT.includes("144p")) {
				// set the audioonly div button to disabled
				document.getElementById('audioonly').setAttribute("aria-pressed", "false");
				// set audioonly storage to false
				storDisableAudioOnly();
				// set isAudioEnabledfromStorage var
				isAudioEnabledfromStorage = 0;
				// request to play video+audio
				playVideoWithAudio();
			}
		}
	});
}

// on document load only, mostly executed only once since yt is a dynamic website
document.addEventListener("DOMContentLoaded", function(){
	// if it's a video page
	if (document.location.href.includes('.youtube.com/watch?')) {
		urlChanged();
		createAudioDiv();
		console.log("dom loaded!: " + document.location.href);
	}
});

window.addEventListener("beforeunload", function (event) {
   //your code goes here on location change 
   console.log("URL changed beforeunload: " + document.location.href);
});

// looking for url changes (not the best idea to use MutationObserver for url changes but this would do for now on firefox)
// for chrome navigation.addEventListener seems a better solution
const observeUrlChange = () => {
  let oldHref = document.location.href;
  const body = document.querySelector("body");
  const observer = new MutationObserver(mutations => {
		if (oldHref !== document.location.href && document.location.href.includes('.youtube.com/watch?')) {
			oldHref = document.location.href;
      // on changes
      console.log("URL changed, not main page: " + oldHref);
			// send url to service worker
			urlChanged();
			// try to create our div if not already
			createAudioDiv();
			//
    } else if (document.location.href == 'https://www.youtube.com/' || document.location.href == 'https://m.youtube.com/') {
			console.log("url changed, main page!");
			// maybe check here for the mini player
		}
  });
  observer.observe(body, { childList: true, subtree: true });
};

window.onload = observeUrlChange;
//window.onload = function() { observeUrlChange() };

/*
window.addEventListener('popstate', listener);

const pushUrl = (href) => {
  history.pushState({}, '', href);
  window.dispatchEvent(new Event('popstate'));
  console.log("page changed new~!");
};
*/

// attempt to fix some media sources
async function redirectCases(url) {
	// no need to grab the whole thing, this is important because most of the times this could be a large-ish file
	fetch(url, {headers: {Range: `bytes=1990-1999`}}).then(response => {
		if (response.ok) {
			response.text().then(data => {
				console.log("redirectCases: received data (truncated): " + data);
				// if this is true we need the new data as the actual source to play
				if (data.indexOf("https://") >= 0) {
					console.log("Attempt to fix the source url: " + data);
					
					// this may create a race condition in some rare circunstances
					const videoElement = document.getElementsByTagName('video')[0];
					var playPromise = videoElement.play();

					if (playPromise !== undefined) {
							playPromise.then(function() {
								videoElement.src = data;
								setCurrentTime();
								videoElement.play();
								console.log("Attempt to fix Play promise succeed!");
							}).catch(function(error) {
								console.log("Attempt to fix Play promise failed: " + error);
								videoElement.src = data;
								setCurrentTime();
								videoElement.play();
							});
					}
				}
			})
		}
	});
}

// disable page-focus on mobile firefox to allow background play
// original code by Frank Dreßler https://addons.mozilla.org/firefox/addon/disable-page-visibility/
// https://github.com/gwarser @ https://gist.githubusercontent.com/gwarser/3b47b61863bffcfebe4498c77b2301cd/raw/disable-pageview-api.js

// visibilitychange events are captured and stopped 
document.addEventListener("visibilitychange", function(e) {
	e.stopImmediatePropagation();
}, true);

// document.visibilityState always returns false
Object.defineProperty(Document.prototype, "hidden", {
	get: function hidden() {
		return false;
	},
	enumerable: true,
	configurable: true
});

// document.visibilityState always returns "visible"
Object.defineProperty(Document.prototype, "visibilityState", {
	get: function visibilityState() {
		return "visible";
	},
	enumerable: true,
	configurable: true
});
