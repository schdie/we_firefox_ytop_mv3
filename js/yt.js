'use strict';

/*
I tried several approaches and I feel this is the best option when using the website.
It is not the cleanest but requires the least amount of code.
We don't have to deal with ciphers and it's probably the most resistant to YT changes.
*/

// original logic code from https://github.com/craftwar/youtube-audio
browser.runtime.onMessage.addListener(
	(request, sender, sendResponse) => {
		if (request.url) {
			console.log("main function, document.location.href : " + document.location.href);
			// requested source URL
			const url = request.url;
			console.log("main function, url: " + url);
			// requested current URL
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

			// try to play the new source
			if (videoElement.src != url && isAudioEnabledfromStorage === 1) {
				// https://developer.chrome.com/blog/play-request-was-interrupted/
				let playPromise = videoElement.play();

				if (playPromise !== undefined) {
						playPromise.then(function() {
							videoElement.src = url;
							setCurrentTime();
							videoElement.play();
							console.log("main function, Play promise succeed!");
						}).catch(function(error) {
							console.log("main function, Play promise failed: " + error);
							// we are just going to brute force or way because youtube doesn't play nice sometimes
							videoElement.src = url;
							setCurrentTime();
							videoElement.play();
						});
				}
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

	// on rare ocassions recoveredAudioSource is null
	if (recoveredAudioSource) {
		// check the url for special cases
		redirectCases(recoveredAudioSource);
		
		videoElement.src = recoveredAudioSource;
		setCurrentTime();
		videoElement.play();
	} else {
		// let's try to fix it
		console.log("recovered audio was null: " + recoveredAudioSource);
		urlChanged();
	}
	
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
		let currentTime = document.getElementsByClassName("ytp-time-current")[0];
		// convert the time into seconds
		let currentTimeSeconds = +(currentTime.innerText.split(':').reduce((acc,time) => (60 * acc) + +time));
		// set the current time for the video element
		videoElement.currentTime = currentTimeSeconds;
	} else { // mobile
		// find the video element
		const videoElement = document.getElementsByTagName('video')[0];
		
		// this works when switching because the time is usually not 0
		let currentTimeSwitch = document.getElementsByClassName('time-first')[0];
		if ((currentTimeSwitch) && currentTimeSwitch.textContent !== "0:00") {
			let currentTimeSwitchSeconds = +(currentTimeSwitch.textContent.split(':').reduce((acc,time) => (60 * acc) + +time));
			videoElement.currentTime = currentTimeSwitchSeconds;
		} else { // this is hacky at best, if time is zero but the url has a timestamp we use that
			// get the time from href
			let urlTime = document.location.href.split('&t=');
			// only when there may be some time
			if (urlTime.length >= 2) {
				//let mobTime = Number(urlTime[1].slice(0, -1)); // for some reason it needs to be a string and not a number
				let mobTime = urlTime[1].split('s');
				// set the current time for the video element
				videoElement.currentTime = mobTime[0];
			}
		}
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
	if (document.getElementById('audioonly') || document.getElementById('audioonlym')) {
		console.log("audioonly or audioonlym div already exists, bailing.");
		// in case the mobile button is already loaded but not visible
		if (document.getElementById('audioonlym')) {
			document.getElementById('audioonlym').style.display = "block";
		}
		return;
	}
	
	// ytp-right-controls only exists on desktop
	if (document.getElementsByClassName('ytp-right-controls')[0]) {
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
		
		// add an event listener for clicks on the created div and the quality menu of yt (desktop)
		monitorForClicks();
	} else {
		// mobile div button, wait for the app element
		while(!document.getElementById('app')) {
			await new Promise(r => requestAnimationFrame(r));
		}
		
		// It's always better to create a proper css file but since this is only a small button ¯\_(ツ)_/¯
		// style element + template
		const style = document.createElement('style');

		style.appendChild(document.createTextNode(`
			.float{
			position:fixed;
			width:5.5rem;
			height:5.5rem;
			bottom:3rem;
			left:1rem;
			border-radius:50px;
			text-align:center;
			box-shadow: 0.7rem 0.7rem 1.1rem #000;
			z-index: 9999;
			opacity: 0.69;
			border-color:blue;
			}`
		));

		// append the style to the head
		const head = document.getElementsByTagName('head')[0];
		head.appendChild(style);
			
		// create our floaty button
		const mobileFloatButton = document.createElement("button");
		mobileFloatButton.setAttribute("id", "audioonlym");
		mobileFloatButton.setAttribute("class", "float");

		// check the initial state our button should have
		if (isAudioEnabledfromStorage === 1) {
			mobileFloatButton.style.background = "#F24033";
			mobileFloatButton.setAttribute("aria-pressed", "true");
			mobileFloatButton.innerHTML = '<svg height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg>';
		} else {
			mobileFloatButton.style.background = "#DDDDDD";
			mobileFloatButton.setAttribute("aria-pressed", "false");
			mobileFloatButton.innerHTML = '<svg height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#797979"></path></svg>';
		}
		
		// prepend (we go old school here) the button to the body
		document.body.prepend(mobileFloatButton);
		
		// add an event listener for touches on the created mobile button
		monitorForClicksMobile();
	}
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
		
		// a small cooldown to avoid toggle spam
		document.getElementById("audioonly").disabled = true;
		setTimeout(function(){
			document.getElementById("audioonly").disabled = false;
		},1700);
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
			let elT = document.getElementsByClassName('ytp-menuitem-label')[0].innerText;
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

// monitoring for touches on our mobile button
async function monitorForClicksMobile() {
	// monitor our mobile button
	document.getElementById('audioonlym').addEventListener("click", function (e) {
		// set isAudioEnabledfromStorage and save it to storage
		if (isAudioEnabledfromStorage === 1) {
			isAudioEnabledfromStorage = 0;
			storDisableAudioOnly();
		} else {
			isAudioEnabledfromStorage = 1;
			storEnableAudioOnly();
		}
		
		// set the audioonlym button to enabled/disabled
		if (this.getAttribute("aria-pressed") == "false") {
			this.setAttribute("style", "background-color:#F24033");
			this.setAttribute("aria-pressed", "true");
			this.innerHTML = '<svg height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg>';
			// and request to play audio only
			playAudioOnly();
		} else {
			this.setAttribute("style", "background-color:#DDDDDD");
			this.setAttribute("aria-pressed", "false");
			this.innerHTML = '<svg height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#797979"></path></svg>';
			// or request to play video+audio
			playVideoWithAudio();
		}
		
		// a small cooldown to avoid button spamming
		document.getElementById("audioonlym").disabled = true;
		setTimeout(function(){
			document.getElementById("audioonlym").disabled = false;
		},1700);
	});
}

// on document load only, mostly executed only once since yt is a dynamic website
document.addEventListener("DOMContentLoaded", function(){
	// if it's a video page
	if (document.location.href.includes('.youtube.com/watch?')) {
		setUrl();
		urlChanged();
		createAudioDiv();
		console.log("DOMContentLoaded, '.youtube.com/watch?': " + document.location.href);
	}
});

// looking for url changes (not the best idea to use MutationObserver for this but on ff it seems to be the best option)
// for chrome navigation.addEventListener seems a better solution
// document title seems to be more consistent than document.location.href but still not good enough, yt changes the document title every time it changes to a new video
// unless the video has the exact same title name? and/or you get a notification
window.addEventListener("load", () => {
  let oldHref = "";
  const body = document.querySelector("body");
  const observer = new MutationObserver(mutations => {
		if (oldHref !== document.location.href && document.location.href.includes('.youtube.com/watch?')) {
			oldHref = document.location.href;
      // on changes
      setUrl();
      //console.log("URL changed, not on main page: " + oldHref);
			// send the URL to service worker
			urlChanged();
			// try to create our div if not already
			createAudioDiv();
    } else if (document.location.href == 'https://www.youtube.com/' || document.location.href == 'https://m.youtube.com/') {
			//console.log("URL changed, main page!");
			// clean old title
			oldHref = "";
			// although not playing anything on the main site we need to request a url change
			// just in case the user goes back and forth between the main site and the last video
			urlChanged();
			// change the mobile button visibility while on the main site
			if (document.location.href == 'https://m.youtube.com/' && (document.getElementById('audioonlym'))) {
				document.getElementById('audioonlym').style.display = "none";
			}
			// maybe check here for the mini player
		}
  });
  observer.observe(body, { childList: true, subtree: true });
});

// attempt to fix some media sources
async function redirectCases(url) {
	// no need to grab the whole thing, this is important because most of the times this could be a large-ish file
	fetch(url, {headers: {Range: `bytes=1990-1999`}}).then(response => {
		if (response.ok) {
			response.text().then(data => {
				console.log("redirectCases: received data (truncated): " + data);
				// if this is true we need the new data as the actual source to play
				if (data.indexOf("https://") >= 0) {
					console.log("redirectCases, Attempt to fix the source url: " + data);
					
					// this may create a race condition in some rare circunstances
					const videoElement = document.getElementsByTagName('video')[0];
					let playPromise = videoElement.play();

					if (playPromise !== undefined && isAudioEnabledfromStorage === 1) {
							playPromise.then(function() {
								videoElement.src = data;
								setCurrentTime();
								videoElement.play();
								console.log("redirectCases, Attempt to fix Play promise succeed!");
							}).catch(function(error) {
								console.log("redirectCases, Attempt to fix Play promise failed: " + error);
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

// if permissions are removed we politely remind the user
chrome.runtime.onMessage.addListener((message) => {
	if (message.weneedpermissions) {
		console.log("we need permissions!");
		if (document.location.href.includes('.youtube.com/')) {
			// I still haven't decided on how to do this, I rather not be intrusive to the user
			// decide what to do if we don't have the required permissions
			//alert("Some permissions were removed from the\nTube Audio Options+ extension.\nIt can't work without them.\nConsider granting them manually if you need\nthe extension working.");
		}
	}
});

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

// thanks to https://stackoverflow.com/questions/8690255/how-to-play-only-the-audio-of-a-youtube-video-using-html-5/45375023#45375023 for the idea
var as;
var asc;
var vs;

function setUrl() {
	as = {},  // audio streams
	asc = {}, // ciphered audio streams 
	vs = {},  // video streams

	fetch(document.location.href).then(response => {
		if (response.ok) {
			response.text().then(data => {

				var regex = /(?:ytplayer\.config\s*=\s*|ytInitialPlayerResponse\s?=\s?)(.+?)(?:;var|;\(function|\)?;\s*if|;\s*if|;\s*ytplayer\.|;\s*<\/script)/gmsu;

				data = data.split('window.getPageData')[0];
				data = data.replace('ytInitialPlayerResponse = null', '');
				data = data.replace('ytInitialPlayerResponse=window.ytInitialPlayerResponse', '');
				data = data.replace('ytplayer.config={args:{raw_player_response:ytInitialPlayerResponse}};', '');
				//data = data.replace('ytplayer.config={args:{raw_player_response.streamingData.adaptiveFormats:ytInitialPlayerResponse}};', '');

				var matches = regex.exec(data);
				var data = matches && matches.length > 1 ? JSON.parse(matches[1]) : false;
				console.log("data:");
				console.log(data);

				var streams = [],
				result = {};
				
				// 
				if (data.streamingData) {
					// raw_player_response.streamingData.adaptiveFormats
					if (data.streamingData.adaptiveFormats) {
						streams = streams.concat(data.streamingData.adaptiveFormats);
					}
					// raw_player_response.streamingData.formats
					if (data.streamingData.formats) {
						streams = streams.concat(data.streamingData.formats);
					}
				} else {
					return false;
				}
				
				// get base.js
				var basejsurl = document.querySelectorAll("[href*='base.js']");
				console.log("TAO base.js url: ", basejsurl[0].href);
				
				// get current page video id
				let vidID;
				if (data.videoDetails.videoId) {
					vidID = data.videoDetails.videoId;
					console.log("TAO video id: ", vidID);
				}
				
				// get n parameter
				let nParam;
				if (data.streamingData.serverAbrStreamingUrl) {
					let nParamurl = decodeURIComponent(data.streamingData.serverAbrStreamingUrl);
					const urlParams = new URLSearchParams(nParamurl);
					const nparamvalue = urlParams.get('n')

					console.log("TAO n parameter: ", nparamvalue);
				}	
				
				//console.log(streams);

				// audio only streams array
				var audioStreams = streams.filter(function (el) {
					//return el.mimeType == 'audio/webm; codecs="opus"';
					return el.mimeType.startsWith('audio');
				});
				
				console.log(audioStreams);
				
				// video+audio only streams array
				var videoStreams = streams.filter(function (el) {
					return el.mimeType.includes(',');
				});

				console.log(videoStreams);
	
				let audioid;
	
				audioStreams.forEach((stream, n) => {
					var itag = stream.itag * 1;
					audioid = false;
					switch (itag) {
						// audio
						case 258: // aac 384 Kbps 5.1
							audioid = '258';
							console.log("TAO audio stream 258 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 258 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 258 url: " + stream.url);
							break;
						case 256: // aac 192 Kbps 5.1
							audioid = '256';
							console.log("TAO audio stream 256 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 256 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 256 url: " + stream.url);
							break;
						case 251: // webm (vbr) up to 160 Kbps (currently popular)
							audioid = '251';
							console.log("TAO audio stream 251 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 251 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 251 url: " + stream.url);
							break;
						case 250: // webm (vbr) ~70 Kbps (currently popular)
							audioid = '250'; 
							console.log("TAO audio stream 250 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 250 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 250 url: " + stream.url);
							break;
						case 249: // webm (vbr) ~50 Kbps (currently popular)
							audioid = '249';
							console.log("TAO audio stream 249 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 249 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 249 url: " + stream.url);
							break;
						case 141: // aac 256 Kbps
							audioid = '141';
							console.log("TAO audio stream 141 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 141 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 141 url: " + stream.url);
							break;
						case 140: // aac 48 Kbps (currently popular)
							audioid = '140';
							console.log("TAO audio stream 140 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 140 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 140 url: " + stream.url);
							break;
						case 139: // aac 48 Kbps
							audioid = '139';
							console.log("TAO audio stream 139 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 139 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 139 url: " + stream.url);
							break;
						case 171: // aac 48 Kbps
							audioid = '171';
							console.log("TAO audio stream 171 available, stream.url: ", stream.url);
							//console.log("TAO audio stream 139 signatureCipher: ", stream.signatureCipher);
							//console.log("TAO audio stream 139 url: " + stream.url);
							break;
						}
						//console.log("TAO stream.signatureCipher " + stream.signatureCipher);
						if (audioid) as[audioid] = stream.url;
						if (audioid) asc[audioid] = stream.signatureCipher;
				});
				
				// some ids are throttled, change as needed
				let audioURL = as['258'] || as['256'] || as['251'] || as['250'] || as['249'] || as['141'] || as['140'] || as['139'] || as['171'];
				let cipherurl = asc['258'] || asc['256'] || asc['251'] || asc['250'] || asc['249'] || asc['141'] || asc['140'] || asc['139'] || asc['171'];
				//console.log("TAO audioURL " + audioURL);
				//console.log("TAO cipherurl " + cipherurl);
				
				if ((audioURL) && (!cipherurl)) { // regular audio stream
					console.log("TAO using regular audio only stream");
					console.log("TAO audio-only url: ", audioURL);
					recoveredAudioSource = audioURL; // making the audio source ready
					playAudioOnly(); // play the audio source
					
				} else if ((!audioURL) && (cipherurl)) { // ciphered stream
					console.log("TAO using ciphered audio only stream");
					
					// split the signatureCipher
					const splitedcipherurl = cipherurl.split('&');
					let signaturecipher = splitedcipherurl[0].split('=').pop();
					signaturecipher = decodeURIComponent(signaturecipher);
					console.log("TAO signatureCipher s: ", splitedcipherurl[0].split('=').pop());
					let signatureurl = splitedcipherurl[2].split('=').pop();
					console.log("TAO signatureCipher url: ", splitedcipherurl[2].split('=').pop());
					
					// decrypt the signatureCipher
					let decodedsig;
					//decodedsig = xPa(signaturecipher);
					decodedsig = APa(signaturecipher);
					console.log("TAO signatureCipher decrypted s: ", decodedsig);
					
					// generate final url
					let audioURLciphered = decodeURIComponent(signatureurl) + "&sig=" + decodedsig;
					console.log("TAO audio-only ciphered url: ", audioURLciphered);
					//console.log(decodeURIComponent(signatureurl));
					recoveredAudioSource = audioURLciphered; // making the audio source ready
					playAudioOnly(); // play the audio source
				}				
			})
		}
	});
}

// https://www.youtube.com/s/player/4fc7f9fa/player_ias.vflset/en_US/base.js
function xPa (a) {
    a = a.split("");
    WO.xX(a, 62);
    WO.lp(a, 2);
    WO.FW(a, 50);
    WO.xX(a, 1);
    WO.FW(a, 26);
    WO.xX(a, 11);
    return a.join("") 
};

var WO = {
    lp: function(a, b) {
        a.splice(0, b)
    },
    FW: function(a) {
        a.reverse()
    },
    xX: function(a, b) {
        var c = a[0];
        a[0] = a[b % a.length];
        a[b % a.length] = c
    }
};

// https://www.youtube.com/s/player/4fc7f9fa/player_ias.vflset/en_US/base.js
function APa (a) {
    a = a.split("");
    TO.nE(a, 2);
    TO.Ud(a, 46);
    TO.te(a, 62);
    TO.nE(a, 1);
    TO.te(a, 61);
    TO.Ud(a, 40);
    TO.te(a, 65);
    TO.Ud(a, 54);
    return a.join("")
};

var TO = {
    nE: function(a, b) {
        a.splice(0, b)
    },
    te: function(a, b) {
        var c = a[0];
        a[0] = a[b % a.length];
        a[b % a.length] = c
    },
    Ud: function(a) {
        a.reverse()
    }
}
