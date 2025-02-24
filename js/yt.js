//'use strict';

// global scope, saved JSON response from video info request
var jsonPlayerInfo;

// global scope, to avoid cors choose the correct API key
var API_KEY;

// global scope, the current video_id value
var CLIENT_VIDEO_ID; 

// global scope, used to check if audioonly is enabled or not "currently"
var AUDIO_ONLY_ENABLED;

// global scope, used to store original audio+video source
var VIDEO_SOURCE;

// global scope, used to store the recovered audio source
var AUDIO_SOURCE;

// global scope, visitor data
var VISITOR_DATA; // should refresh on page/extension reload, needed once

// global scope, poToKen
var POTOKEN;

// global scope, used to check if we already got the base.js file
var wasBasedotjsRetrieved;

// global scope, list of vars for the signatureCipher
var decodedloopsize;
var decodedvarb = [];
var decodedchoice = [];

var decodedsplice;
var decodedswap;
var decodedreverse;
var bjstimestamp;

var decodedsig;

// decrypt the signatureCipher
var basejscipherfunction;

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------

// get the stored value of audioonly and set the AUDIO_ONLY_ENABLED var
async function getStoredValues() {
	const {audioonly} = await browser.storage.local.get('audioonly');

  if (audioonly === 1) {
		console.log("TAO | Startup: audioonly is enabled.");
		AUDIO_ONLY_ENABLED = 1;
	} else {
		AUDIO_ONLY_ENABLED = 0;
		console.log("TAO | Startup: audioonly is disabled.");
	}
}

getStoredValues(); // this should be one of the first things to execute

// sets the API key and countermeasures
function runningDevice() {
	if (navigator.userAgent.includes('Mobile')) {
		console.log("TAO | Running on mobile device, setting API_KEY and countermeasures.")
		API_KEY = "https://m.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
		countermeasures_android();
	} else {
		console.log("TAO | Running on desktop, setting API_KEY and countermeasures.")
		API_KEY = "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
		countermeasures_desktop();
	}
}

runningDevice();

// video player status
async function onVideoPlaybackStartup() {

	while(!document.getElementById('movie_player')) {
		await new Promise(r => requestAnimationFrame(r));
	}
	
	let currentVideoPlayer = document.getElementById('movie_player').wrappedJSObject;
	
	document.addEventListener('playing', function(e) {
		console.log("TAO | Video player started playback.");

		console.log("TAO | CLIENT_VIDEO_ID old: ", CLIENT_VIDEO_ID);
		console.log("TAO | CLIENT_VIDEO_ID new: ", currentVideoPlayer.getVideoData().video_id);
		
		if (CLIENT_VIDEO_ID != currentVideoPlayer.getVideoData().video_id) { // compare current video_id to previously saved video_id if any
			console.log("TAO | New video detected, retrieving data...");
			CLIENT_VIDEO_ID = currentVideoPlayer.getVideoData().video_id;
			postJSON(); // if video_id's differ try to retrieve the audio source for the new video_id
		} else {
			console.log("TAO | Previous saved video id hasn't changed.");
			/*
			let videoElement = document.getElementsByClassName('video-stream')[0];
			// for some rare cases (autoplay mostly) we should check if audio only is enabled and if the url is the right one
			if (AUDIO_ONLY_ENABLED === 1 && videoElement.src.indexOf("blob:") >= 0) {
				videoElement.src = AUDIO_SOURCE;
				videoElement.play();
				console.log("TAO | Looks like audioonly is enabled but the source of the video did not change");
			}
			*/
		}
		
	}, true);

}

onVideoPlaybackStartup();

// retrieve video info using custom client data
async function postJSON() {
  try {
    const response = await fetch(API_KEY, {
      method: "POST", // or 'PUT'
      credentials: 'include',
      mode: 'cors',
      //credentials: 'include',
      headers: {
				'Accept': 'application/json',
        'Content-Type': "application/json",
        //'Access-Control-Allow-Origin': '*',
        //'credentials': "same-origin",
        //'Cookie': 'VISITOR_INFO1_LIVE=cgR-rSu9S5Q; VISITOR_PRIVACY_METADATA=CgJBUhIEGgAgGw%3D%3D; PREF=f6=40000000&tz=America.Argentina%2FTucuman&f5=30000&f7=140&f4=4010000&guide_collapsed=false&gl=US&repeat=NONE; __Secure-1PSIDTS=sidts-CjIBmiPuTcMwZBuORTJz9yl7RPcXvuqHrk1NE_sBAb1zymHTQ09QoNGrBLlqI4oerhsX8xAA; __Secure-3PSIDTS=sidts-CjIBmiPuTcMwZBuORTJz9yl7RPcXvuqHrk1NE_sBAb1zymHTQ09QoNGrBLlqI4oerhsX8xAA; HSID=AWR83uhWOW1mvLyHA; SSID=ABKyFIxZNiqZIRcUK; APISID=70GlldjQcNYussFL/ABAfFkB5dc4x9HkKC; SAPISID=x7nJoSQ82lhmBVJ6/AmkiNtjV7P5b87CUM; __Secure-1PAPISID=x7nJoSQ82lhmBVJ6/AmkiNtjV7P5b87CUM; __Secure-3PAPISID=x7nJoSQ82lhmBVJ6/AmkiNtjV7P5b87CUM; SID=g.a000sgiEYiN9foraF9mQAe4y1ftIDByyChIVylg74W1VXCU8P4F4yUiL3gRkOSNL8n7uZqgLggACgYKAdMSARISFQHGX2Miq3dEhE8R1eG3f8CIax727xoVAUF8yKpsU1YjkJsnx8TZFxpWxwN20076; __Secure-1PSID=g.a000sgiEYiN9foraF9mQAe4y1ftIDByyChIVylg74W1VXCU8P4F44j1pQWuro2IshtT8a4pN1wACgYKAUoSARISFQHGX2MiQ1l9pdkV5AgUVLeY4jHEMBoVAUF8yKrRD8XOclmvQ3vvR6h0Vwnq0076; __Secure-3PSID=g.a000sgiEYiN9foraF9mQAe4y1ftIDByyChIVylg74W1VXCU8P4F4liohlqFydwcV_qXf2vNSkQACgYKAaMSARISFQHGX2Mi5C3UZZX6tK2A_PRSBYQRwxoVAUF8yKrmqnzQ67g1pnCD032NhFhg0076; LOGIN_INFO=AFmmF2swRgIhAJjr96hHZCPyhLfVoelbWRSuwKRHW3GCkTGUe2CEC2MHAiEAuV8ZBh_F00NJsCFra8k_6pWjhO-kRIbvRk-qcxrUPJ0:QUQ3MjNmd1B2ZDB1RFozc0J4Rlp3S2QyM2wtZW1tSGI3UzJtNndsS0VJVjI3ZG16cnNfNnM1eEhXd0xYejNhdzhncXJ0UDFDWmc1ZWFQeEl5bnRMUWltcFZNOG4tUVJMMjJldXVhV042a0EwWjhkQ1ZWb01BZGhQbGZfaUVXbHhkY0NjLVhJUlJyT2F4dVhEMFRzcGdYWTBhWjhra2JfaEJ3; SIDCC=AKEyXzWJg0xizHOOGf_4dIelUJVZHzvCVGPr9rDcEAz76LbrqBPycB_oEXLzCFBnk8FdZDjF4MtH; __Secure-1PSIDCC=AKEyXzV3txAu-Rhjc4pknCJaKAK47Ou_ILBV0Y11EwTedl6olZUuSqeYG9qAxj0EaKcf8TMl7FA; __Secure-3PSIDCC=AKEyXzU923O6WP7dTBKmYT4XXA7coEwgmPZtkZGHUYRWqQEMZXRaBs4YjQj2gQWJsJb4Eo8q1J4; __Secure-ROLLOUT_TOKEN=CKSt3IyT_ZmZ9QEQzL743cq5igMYoI77yZiNiwM%3D; YSC=1OJGtaZleFM; wide=1',
        //'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ "context":
							{ "client":
								{ 'clientName': 'IOS',
                'clientVersion': '20.03.02',
                'deviceMake': 'Apple',
                'deviceModel': 'iPhone16,2',
                'userAgent': 'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)',
                'osName': 'iPhone',
                'osVersion': '18.2.1.22C161',
                'visitorData': VISITOR_DATA,
								},
								//"contentCheckOk": "True",
								//"racyCheckOk": "True"
								//"thirdParty": {
								//	"embedUrl": "https://www.youtube.com"
								//}
							},
							//"serviceIntegrityDimensions": {
							//	"poToken": POTOKEN,
							//},
							//"racyCheckOk": "true",
              //"contentCheckOk": "true",
							"videoId": CLIENT_VIDEO_ID}),			
    });

    jsonPlayerInfo = await response.json();
    console.log("TAO | jsonPlayerInfo response retrieved successfully.");
    if (jsonPlayerInfo.streamingData) {
			console.log("TAO | jsonPlayerInfo response has streams.");
			//console.log("TAO | jsonPlayerInfo response has streams.", jsonPlayerInfo);
			//console.log("TAO | jsonPlayerInfo response has streams.", jsonPlayerInfo.videoDetails.videoId);
			setUrl(); // once everything is retrieved we do our logic
		} else {
			if ((!VISITOR_DATA) && (jsonPlayerInfo.responseContext.visitorData)) {
				VISITOR_DATA = jsonPlayerInfo.responseContext.visitorData;
				console.log("TAO | Retrying request with visitorData if available.");
				postJSON(); // retry with visitorData
			} else {
				postJSONsansh(); // trying to see if we can get the streams with the s&sh bypass
			}
			console.log("TAO | jsonPlayerInfo response has no streams but may have visitorData: ", jsonPlayerInfo.responseContext.visitorData);
		}
  } catch (error) {
    console.error("TAO | jsonPlayerInfo response Error:", error);
  }
}

// retrieve video info using custom client data for self harm warning videos
async function postJSONsansh() {
  try {
    const response = await fetch(API_KEY, {
      method: "POST", // or 'PUT'
      mode: 'cors',
      credentials: 'include',
      headers: {
				'Accept': 'application/json',
        'Content-Type': "application/json",
        'Access-Control-Allow-Origin': '*',
        //'credentials': "same-origin",
      },
      body: JSON.stringify({ "context":
							{ "client":
								{ 'clientName': 'IOS',
                'clientVersion': '20.03.02',
                'deviceMake': 'Apple',
                'deviceModel': 'iPhone16,2',
                'userAgent': 'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)',
                'osName': 'iPhone',
                'osVersion': '18.2.1.22C161',
                'visitorData': VISITOR_DATA,
								}
							},
							//"serviceIntegrityDimensions": {
							//	"poToken": POTOKEN,
							//},
							"thirdParty": {
									"embedUrl": "https://www.youtube.com"
							},
							"racyCheckOk": true,
              "contentCheckOk": true,
							//"playbackContext": {
							//	"contentPlaybackContext": {
							//		"signatureTimestamp": "19997"
							//	}
							//},
							"videoId": CLIENT_VIDEO_ID}),				
    });

    jsonPlayerInfo = await response.json();
    console.log("TAO | jsonPlayerInfo (s&sh topics) response retrieved successfully.");
    if (jsonPlayerInfo.streamingData) {
			console.log("TAO | jsonPlayerInfo (s&sh topics) response has streams.");
			//console.log("TAO | jsonPlayerInfo (s&sh topics) response has streams.", jsonPlayerInfo);
			//console.log("TAO | jsonPlayerInfo (s&sh topics) visitorData:", jsonPlayerInfo.responseContext.visitorData);
			setUrl(); // once everything is retrieved we do our logic
		} else {
			console.log("TAO | jsonPlayerInfo (s&sh topics) response has no streams.");
		}
  } catch (error) {
			console.error("TAO | jsonPlayerInfo (s&sh topics) response Error:", error);
  }
}

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
async function playAudioOnly() {
	console.log("TAO | playAudioOnly called: " + AUDIO_SOURCE);
	if (AUDIO_ONLY_ENABLED !== 1) { return }; // only change to audio only if the toggle is enabled

	const videoElement = document.getElementsByClassName('video-stream')[0];
	let cTime = videoElement.currentTime; // save the current video player time
	
	// brute-forcing our way
	async function playVideo() {
		
	if (navigator.getAutoplayPolicy("mediaelement") === "allowed") { // checking autoplay
		console.log('TAO | Autoplay is allowed.');
		// Create and play a new media element.
		} else if (navigator.getAutoplayPolicy("mediaelement") === "allowed-muted") {
			console.log('TAO | Autoplay is allowed while muted.');
			// Create a new media element, and play it in muted.
		} else {
			// Autoplay is disallowed, maybe show a poster instead.
			console.log('TAO | Autoplay is NOT allowed!');
		}
		
		try {
			await videoElement.play();
			videoElement.fastSeek(cTime,true);
			console.log("TAO | playAudioOnly current time: ", cTime);
		} catch (err) {
			console.log("err ", err);

			setTimeout(function(){ // fixes the high cpu usage when autoplay is disabled
				videoElement.fastSeek(0,true);
			},2000);
		}
	}

	let playPromise = videoElement.play(); //https://developer.chrome.com/blog/play-request-was-interrupted#danger-zone

	if (playPromise !== undefined) {
		playPromise.then(_ => {
			videoElement.pause();
			
			if (videoElement.src.indexOf("blob:") >= 0) { VIDEO_SOURCE = videoElement.src; } // needed when: there's no autoplay, video started without audio-only, the user switched to video again
			
			videoElement.src = AUDIO_SOURCE;		
			//setCurrentTime();
			playVideo();
			console.log("TAO | playAudioOnly playPromise started with no errors", videoElement.src);
		})
		.catch(error => {
			console.log("TAO | playAudioOnly playPromise did not start, error: ", error);
			
			// fix when autoplay is not enabled and audio only was requested before the video ever played
			if (videoElement.src.indexOf("blob:") >= 0) {
				videoElement.src = AUDIO_SOURCE;
				setTimeout(function(){
					videoElement.fastSeek(0,true);
				},2000);
			}
			
			return;
			//return playAudioOnly();
		});
	}
}

// function to play the original stream with video+audio
function playVideoWithAudio() {
	console.log("TAO playVideoWithAudio called: " + VIDEO_SOURCE);
	const videoElement = document.getElementsByTagName('video')[0];
	console.log("TAO playVideoWithAudio current time: ", videoElement.currentTime);
	videoElement.src = VIDEO_SOURCE;
	videoElement.fastSeek(videoElement.currentTime,true); // set current time
	//setCurrentTime();
	videoElement.play();
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
		console.log("TAO audioonly or audioonlym divs already exist, bailing.");
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
		while(AUDIO_ONLY_ENABLED == null) {
			await new Promise(r => requestAnimationFrame(r));
		}

		// check the initial state our div should have
		if (AUDIO_ONLY_ENABLED === 1) {
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
		if (AUDIO_ONLY_ENABLED === 1) {
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
		// set AUDIO_ONLY_ENABLED and save it to storage
		if (AUDIO_ONLY_ENABLED === 1) {
			AUDIO_ONLY_ENABLED = 0;
			storDisableAudioOnly();
		} else {
			AUDIO_ONLY_ENABLED = 1;
			storEnableAudioOnly();
		}

		// set the audioonly div to enabled/disabled
		if (this.getAttribute("aria-pressed") == "false") {
			this.setAttribute("aria-pressed", "true");
			if (AUDIO_SOURCE) {
				playAudioOnly(); // play the saved audio source
			} else {
				setUrl(); // find the audio only streams
			}
			
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
				// set AUDIO_ONLY_ENABLED var
				AUDIO_ONLY_ENABLED = 0;
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
		// set AUDIO_ONLY_ENABLED and save it to storage
		if (AUDIO_ONLY_ENABLED === 1) {
			AUDIO_ONLY_ENABLED = 0;
			storDisableAudioOnly();
		} else {
			AUDIO_ONLY_ENABLED = 1;
			storEnableAudioOnly();
		}
		
		// set the audioonlym button to enabled/disabled
		if (this.getAttribute("aria-pressed") == "false") {
			this.setAttribute("style", "background-color:#F24033");
			this.setAttribute("aria-pressed", "true");
			this.innerHTML = '<svg height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg>';
			playAudioOnly(); // and request to play audio only
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
document.addEventListener("DOMContentLoaded", function() {
	createAudioDiv(); // always create our div after the DOM is done
});

// find the current base.js in use
async function getbasejs() {
	if (wasBasedotjsRetrieved) { console.log("TAO base.js already retrieved, bailing."); return }; // proceed only if base.js was not yet retrieved
	
	// after the movie_player has loaded...
	while(!document.getElementById('movie_player')) { // patience
		await new Promise(r => requestAnimationFrame(r));
	}
	
	// ...we get the base.js url
	const basejsurl = "https://www.youtube.com" + document.getElementById('movie_player').getAttribute("data-version");
	if (basejsurl) {
		console.log("TAO CIPHER base.js found: ", basejsurl);
		
		//fetch(basejsurl, {headers: {Range: `bytes=1990-1999`}}).then(response => {
		fetch(basejsurl).then(response => { // get the file
			if (response.ok) {
				response.text().then(data => {
					wasBasedotjsRetrieved = data; // save it, no need to retrieve it again for the session
					
					// base.js aliases
					//console.log("TAO CIPHER data: ", data);
					bjstimestamp = data.split(',signatureTimestamp:')[1].split('}')[0];
					console.log("TAO CIPHER function timestamp: ", bjstimestamp);
					decodedreverse = data.split(':function(a){a.reverse()')[0].slice(-2); // reverse alias
					console.log("TAO CIPHER function reverse: ", decodedreverse);
					decodedswap = data.split(':function(a,b){var c=a[')[0].slice(-2); // swap alias
					console.log("TAO CIPHER function swap: ", decodedswap);
					decodedsplice = data.split(':function(a,b){a.splice')[0].slice(-2); // splice alias
					console.log("TAO CIPHER function splice: ", decodedsplice);
					
					// retrieve the cipher function
					let lines = data.split('\n');
					lines.forEach(l => {
						if (l.indexOf('a.split("");') > -1) { // retrieve the current signatureCipher function
							console.log('TAO CIPHER main function splited: ', l.slice(30).split('return')[0]);
							decodedloopsize = l.slice(30).split('return')[0];
							decodedloopsize = decodedloopsize.split(";");
							
							// retrieve the b parameter and check if it's splice
							for (let i = 0; i < decodedloopsize.length -1; i++) {
								decodedvarb[i] = decodedloopsize[i].split(',').pop().slice(0, -1); // save parameter b
								//console.log("TAO cipher parameter b" + [i] + ": ", decodedvarb[i]);
								
								decodedchoice[i] = decodedloopsize[i].split('(')[0].split('.')[1]; // save function alias
								console.log("TAO function alias and parameter: "+[i]+": ", decodedchoice[i], decodedvarb[i]);
							} 
						}
					});
				})
			}
		});
	} else {
		console.log("TAO base.js not found");
	}
}

// if permissions are removed we politely remind the user
browser.runtime.onMessage.addListener((message) => {
	if (message.weneedpermissions) {
		console.log("we need permissions!");
		if (document.location.href.includes('.youtube.com/')) {
			// I still haven't decided on how to do this, I rather not be intrusive to the user
			// decide what to do if we don't have the required permissions
			//alert("Some permissions were removed from the\nTube Audio Options+ extension.\nIt can't work without them.\nConsider granting them manually if you need\nthe extension working.");
		}
	}
});

// thanks to https://stackoverflow.com/questions/8690255/how-to-play-only-the-audio-of-a-youtube-video-using-html-5/45375023#45375023 for the idea
var as;
var asc;
var vs;

async function setUrl() {
	//if (AUDIO_ONLY_ENABLED !== 1) { return }; // proceed only if audio only is enabled
 
  // wait for videoElement to be ready
	while(!document.getElementById('movie_player')) { // patience
			await new Promise(r => requestAnimationFrame(r));
	}
	
	const videoElement = document.getElementsByTagName('video')[0];
	if (videoElement.src.indexOf("blob:") >= 0) { // if the user has no autoplay enabled this will be null, fix later...
		VIDEO_SOURCE = videoElement.src;	console.log("TAO original video element src: ", videoElement.src); // save the original video+audio source
	}
	
	as = {},  // audio streams
	asc = {}, // ciphered audio streams 
	vs = {},  // video streams

	streams = [],
	result = {};
				
	// creating the streams from our data
	if (jsonPlayerInfo.streamingData) {
		// raw_player_response.streamingData.adaptiveFormats
		if (jsonPlayerInfo.streamingData.adaptiveFormats) {
			streams = streams.concat(jsonPlayerInfo.streamingData.adaptiveFormats);
		}
		// raw_player_response.streamingData.formats
		if (jsonPlayerInfo.streamingData.formats) {
			streams = streams.concat(jsonPlayerInfo.streamingData.formats);
		}
	} else {
		return false;
	}
	
	/*
	// get current page video id
	let vidID;
	if (jsonPlayerInfo.videoDetails.videoId) {
		vidID = jsonPlayerInfo.videoDetails.videoId;
		console.log("TAO video id: ", vidID);
	}
	*/
				
	// get n parameter
	let nParam;
	if (jsonPlayerInfo.streamingData.serverAbrStreamingUrl) {
		let nParamurl = decodeURIComponent(jsonPlayerInfo.streamingData.serverAbrStreamingUrl);
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
				
	//console.log(audioStreams); // array with the available audio streams
				
	// video+audio only streams array
	var videoStreams = streams.filter(function (el) {
		return el.mimeType.includes(',');
	});

	//console.log(videoStreams); // array with the available video streams
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
		console.log("TAO using regular audio only stream", audioURL);
		AUDIO_SOURCE = audioURL; // making the audio source ready
		//AUDIO_SOURCE = decodeURIComponent(audioURL); // making the audio source ready
		//if (AUDIO_ONLY_ENABLED !== 1) { return }; // proceed only if audio only is enabled
		playAudioOnly(); // play the audio source
		//setTimeout(playAudioOnly, 3000); // I need to do better than this but for now it works tm
		
	} else if ((!audioURL) && (cipherurl)) { // ciphered stream
		//console.log("TAO using ciphered audio only stream:", cipherurl);
		
		// split the signatureCipher
		const splitedcipherurl = cipherurl.split('&');
		
		let signaturecipher = splitedcipherurl[0].slice(2);
		let signaturespparam = splitedcipherurl[1].slice(3);
		let signatureurlparam = decodeURIComponent(splitedcipherurl[2].slice(4));
		console.log("signaturecipher: ", signaturecipher);
		console.log("signaturespparam: ", signaturespparam);
		console.log("signatureurlparam: ", signatureurlparam);
		
		// without base.js we can't decode anything
		if (!wasBasedotjsRetrieved || !decodedvarb) { // patience
			//setUrl(); // reboot
		}
		
		// 2025-01 YT completely changed the way the base.js handles the cipher, good luck figuring it out
		//signaturecipher = encodeURI(signaturecipher);	 //test
		decodedsig = signaturecipher.split(""); // split before the loop
		console.log("decodedloopsize: ", decodedloopsize);
		for (let i = 0; i < decodedloopsize.length -1; i++) {
			// what should we do?
			if (decodedchoice[i] == decodedsplice) { // slice
				cipherTools.spl(decodedsig, decodedvarb[i]);
				//console.log("TAO cipher splice match! ", decodedchoice[i], decodedsplice);
			} else if (decodedchoice[i] == decodedswap) { // swap
				cipherTools.swa(decodedsig, decodedvarb[i]);
				//console.log("TAO cipher Swap match! ", decodedchoice[i], decodedswap);
			} else if (decodedchoice[i] == decodedreverse) { // reverse
				cipherTools.rev(decodedsig, decodedvarb[i]);
				//console.log("TAO cipher reverse match! ", decodedchoice[i], decodedreverse);
			}
		}
		decodedsig = decodedsig.join(""); // join after the loop
		console.log("TAO signatureCipher s decrypted: ", decodedsig);
					
		// generate final url
		let audioURLciphered = signatureurlparam + "&" + signaturespparam +"=" + decodedsig;
		//let audioURLciphered = decodeURIComponent(signatureurl) + "&sp=" + decodedsig;
		//let audioURLciphered = signatureurl + "&sp=" + decodedsig;
		console.log("TAO audio-only ciphered url: ", audioURLciphered);
		//console.log(decodeURIComponent(signatureurl));
		AUDIO_SOURCE = audioURLciphered; // making the audio source ready
		playAudioOnly(); // play the audio source
		// unless we fix the n parameter we have to do this check
		fetch(audioURLciphered, { method: 'HEAD' }).then((response) => {
			if (!response.ok && response.status === 403) {
				console.log("TAO audio stream ciphered response, rebooting... ", response.status);
				//setUrl(); // reboot
				return;
			}    
		});
	}							
}

function countermeasures_desktop() { // desktop countermeasures
	document.addEventListener("DOMContentLoaded", function() {
		setInterval(() => window._lact = Date.now(), 600000); // bypass for "Are You Still There?" on Desktop
		
		const observer = new MutationObserver((mutations, observer) => { // for self-harm topic videos, may work for other errors too
			const error_button = document.getElementById('player-error-message-container');
			if (error_button) {
				observer.disconnect();
				console.log("TAO | Error-message button auto-clicked.");
				document.getElementById('player-error-message-container').querySelector('button').click();
				
				// re-observe
				setTimeout(function(){
					observer.observe(document.body, {
						childList: true,
						subtree: true,
					});
				},10000);
			}
    });

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
		
	});
}

// disable page-focus on mobile firefox to allow background play
// original code by Frank Dreßler https://addons.mozilla.org/firefox/addon/disable-page-visibility/
// https://github.com/gwarser @ https://gist.githubusercontent.com/gwarser/3b47b61863bffcfebe4498c77b2301cd/raw/disable-pageview-api.js
function countermeasures_android() {
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
	
	document.addEventListener('pause', function(e) {
		console.log("TAO | Video player is paused.");
		//let confirmdialog = document.getElementsByClassName('confirm-dialog-messages');
		let videoPausedConfirmButton = document.getElementsByClassName('dialog-flex-button'); // "Video paused. Continue watching?"
		let stillWatchingConfirmButton = document.getElementsByClassName('notification-action-response-text'); // "Still watching? Video will pause soon"
		
		/*
		for (let y = 0; y < confirmdialog.length; y++) {
			console.log("TAO preif a confirmdialog appears after a player pause: " + y, confirmdialog[y]);
		}
		
		for (let z = 0; z < videoPausedConfirmButton.length; z++) {
			console.log("TAO preif a confirmbutton appears after a player pause: " + z, videoPausedConfirmButton[z]);
		}
		
		for (let w = 0; w < stillWatchingConfirmButton.length; w++) {
			console.log("TAO preif a stillWatchingConfirmButton appears after a player pause: " + w, stillWatchingConfirmButton[w]);
			console.log("TAO preif a stillWatchingConfirmButton appears after a player pause length: " + w, stillWatchingConfirmButton[w].length);
		}
		*/

		// workaround for "Still watching? Video will pause soon"
		if (stillWatchingConfirmButton.length > 0) {
			document.dispatchEvent( new KeyboardEvent( 'keyup', { bubbles: true, cancelable: true, keyCode: 143, which: 143 } ) );
			console.log("TAO stillWatchingConfirmButton appears after a player pause, keyup event triggered.", stillWatchingConfirmButton);
		}
		
		// workaround for "Video paused. Continue watching?"
		if ((videoPausedConfirmButton) && (videoPausedConfirmButton.length >= 1)) {
			console.log("TAO videoPausedConfirmButton appears after a player pause: ", videoPausedConfirmButton);
			for (let i = 0; i < videoPausedConfirmButton.length; i++) {
				if (videoPausedConfirmButton[i].innerText) {
					console.log("TAO auto-clicked videoPausedConfirmButton: " + i, videoPausedConfirmButton[i]);
					videoPausedConfirmButton[i].click();
				}
			}
		}
	}, true);
	
}

// our cloned version of the yt cipherSignature
var cipherTools = {
    spl: function(a, b) {
        a.splice(0, b)
    },
    rev: function(a) {
        a.reverse()
    },
    swa: function(a, b) {
        var c = a[0];
        a[0] = a[b % a.length];
        a[b % a.length] = c
    }
};
