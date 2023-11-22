'use strict';

/*
I tried several approaches and I feel this is the best option when using the website
It is not the cleanest but requires the least amount of code and doesn't have to deal
with ciphers and most of the never ending yt changes...

remaining bugs:
1. Uncaught (in promise) DOMException: The media resource indicated by the src attribute or assigned media provider object was not suitable.
is caused because sometimes yt returns an unplayable audio source, I need to add a logic for a re-request

2. fixed
*/

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
		console.log("startup: audioonly is enabled");
		isAudioEnabledfromStorage = 1;
	} else {
		isAudioEnabledfromStorage = 0;
		console.log("startup: audioonly is disabled");
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
	// find the video element
	const videoElement = document.getElementsByTagName('video')[0];
	// save the current player time
	var currentTime = document.getElementsByClassName("ytp-time-current")[0];
	// convert the time into seconds
	var currentTimeSeconds = +(currentTime.innerText.split(':').reduce((acc,time) => (60 * acc) + +time));
	// set the current time for the video element
	videoElement.currentTime = currentTimeSeconds;
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
		if (document.getElementById('audioonly').getAttribute("aria-pressed") == "true") {
			// request playback to audio only
			//playAudioOnly();
		}
		console.log("audioonly div already exists, bailing.");
		return;
	}
	
	
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
		console.log("isAudioEnabledfromStorage? true: " + isAudioEnabledfromStorage);
		audiotdiv.innerHTML = '<button id="audioonly" class="ytp-audioonly-button ytp-button" data-priority="3" data-title-no-tooltip="Audio-only Toggle" aria-pressed="true" aria-label="Audio-only Toggle" title="Audio-only Toggle"><svg class="ytp-subtitles-button-icon" height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><use class="ytp-svg-shadow" xlink:href="#ytp-id-ao17"></use><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg></button>';
		// set audio url on startup when enabled
		//playAudioOnly();
	} else {
		console.log("isAudioEnabledfromStorage? false: " + isAudioEnabledfromStorage);
		audiotdiv.innerHTML = '<button id="audioonly" class="ytp-audioonly-button ytp-button" data-priority="3" data-title-no-tooltip="Audio-only Toggle" aria-pressed="false" aria-label="Audio-only Toggle" title="Audio-only Toggle"><svg class="ytp-subtitles-button-icon" height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><use class="ytp-svg-shadow" xlink:href="#ytp-id-ao17"></use><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg></button>';
	}

	// get the parent node
	let parentDiv = ytpRightControlsElement.parentNode;

  // insert the new elements to the left of the ytp-right-controls div
  parentDiv.insertBefore(audiotdiv, ytpRightControlsElement);
  
  // add an event listener for clicks on the created div and the quality menu of yt
	monitorForClicks();
	
	// get the original playback source and set the global var
	//const videoElement = document.getElementsByTagName('video')[0];
	//var originalVideoSource = videoElement.src;
}

// monitoring for clicks on our div and the quality menu of yt
async function monitorForClicks() {
	document.getElementById('audioonly').addEventListener("click", function (e) {
		// set isAudioEnabledfromStorage
		if (isAudioEnabledfromStorage === 1) {
			isAudioEnabledfromStorage = 0;
			storDisableAudioOnly();
		} else {
			isAudioEnabledfromStorage =1;
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
	
	/*
	// we also monitor the change resolution button
	//document.getElementById('ytp-id-18').addEventListener("click", function (e) {
		document.getElementsByClassName('ytp-popup ytp-settings-menu')[0].addEventListener("click", function (e) {
		
		if (document.getElementById('audioonly').getAttribute("aria-pressed") == "true") {
		// this is a hack, but when clicking on any child element in ytp-id-18...
		var elT = document.getElementsByClassName('ytp-menuitem-label')[0].innerText;
		console.log("elText outside: " + elT);
		// ...that contains any of the following text values (doesn't work with "Auto")
		if (elT.includes("2160p") || elT.includes("1440p") || elT.includes("1080p") || elT.includes("720p") || elT.includes("480p") || elT.includes("360p") || elT.includes("240p") || elT.includes("144p")) {
			console.log("elText inside: " + elT);
			// and set the audioonly div button to disabled
			document.getElementById('audioonly').setAttribute("aria-pressed", "false");
			// set audioonly storage to false
			storDisableAudioOnly();
			// remove event listener
			//document.getElementById('ytp-id-18').removeEventListener("click", e);
			//this.removeEventListener('click', arguments.callee, false);
			
		} //else if {
			// especial case when selecting "Auto"
			//console.log("some bullshit");
		//}
		}
	});
	*/
}

// on document load only, mostly executed only once since yt is a dynamic website
document.addEventListener("DOMContentLoaded", function(){
	// if it's a video page
	if (document.location.href.includes('.youtube.com/watch?v=')) {
		urlChanged();
		createAudioDiv();
	}
});

// looking for url changes (not the best idea to use MutationObserver for url changes but this would do for now on firefox)
// for chrome navigation.addEventListener seems a better solution
const observeUrlChange = () => {
  let oldHref = document.location.href;
  const body = document.querySelector("body");
  const observer = new MutationObserver(mutations => {
		if (oldHref !== document.location.href && document.location.href.includes('.youtube.com/watch?v=')) {
			oldHref = document.location.href;
      // on changes
      console.log("URL changed, not main page: " + oldHref);
			// send url to service worker
			urlChanged();
			// try to create our div if not already
			createAudioDiv();
			//
    } else if (document.location.href == 'https://www.youtube.com/') {
			console.log("url changed, main page!");
			// maybe check here for the mini player
		}
  });
  observer.observe(body, { childList: true, subtree: true });
};

window.onload = observeUrlChange;

// original code from https://github.com/craftwar/youtube-audio
chrome.runtime.sendMessage('1');

chrome.runtime.onMessage.addListener(
	(request, sender, sendResponse) => {
		console.log("main function, document.location.href : " + document.location.href);
		const url = request.url;
		console.log("main function, url: " + url);
		const curl = request.curl;
		console.log("main function, curl: " + curl);
		// save the audio only source in case of a switch
		recoveredAudioSource = url;

		const videoElement = document.getElementsByTagName('video')[0];
				
		// save the video+audio source in case of a switch
		if (videoElement.src.indexOf("blob:") >= 0) {
			originalVideoSource = videoElement.src;
		}

		if (videoElement.src != url && isAudioEnabledfromStorage === 1) {
			// https://developer.chrome.com/blog/play-request-was-interrupted/
			var playPromise = videoElement.play();

			if (playPromise !== undefined) {
					playPromise.then(function() {
						videoElement.src = url;
						setCurrentTime();
						videoElement.play();
						console.log("play promise success!");
						//console.log("play promise success!" + videoElement.src);
					// Automatic playback started!
					}).catch(function(error) {
						// we are just going to brute force or way because youtube doesn't play nice sometimes
						console.log("play promise error: " + error);
						//console.log("play promise error" + videoElement.src);
						videoElement.src = url;
						setCurrentTime();
						videoElement.play();
					});
			}
		}
	}
);
