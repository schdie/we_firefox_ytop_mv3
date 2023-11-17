//only for chromium
//navigation.addEventListener('navigate', () => {
//  console.log('page changed!!');
//});

// TO-DO:
// throttle is an issue, especially on resume and more the time has elapsed from zero
// try to get the audio urls even when not exposed by ytInitialPlayerResponse
// monitor the settings > quality > button and disable audio only, also may use this for video+audio when disabling audio only toggle

// request service.js to remove the video stream block
function removeBlockMessage(e) {
  const sending = browser.runtime.sendMessage({
    greeting: "removeblock",
  });
}

// request service.js to block the video stream
function addBlockMessage(e) {
  const sending = browser.runtime.sendMessage({
    greeting: "addblock",
  });
}

// global scope, used to check if audioonly is enabled or not "currently"
var isAudioEnabledfromStorage;

// global scope, used to store original audio+video source
var originalSource;

// get stored values and set blocking rule(s) if needed 
async function getStoredValues() {
	const {audioonly} = await browser.storage.local.get('audioonly');
	const {commentsout} = await browser.storage.local.get('commentsout');

  if (audioonly === 1) {
		// enable video stream blocking rule
		addBlockMessage();
		// set default var
		isAudioEnabledfromStorage = 1;
		} else {
		// remove video stream blocking rule
		removeBlockMessage();
	}
	
	/*
	if (commentsout === 1) {
		// only audio is enabled
		console.log("commentsout igual a 1: " + commentsout); 
	} else {
		// only audio is disabled
		console.log("commentsout igual a 0: " + commentsout); 
	}
	*/
}

// this should be the first thing to execute
getStoredValues();

// this should be the second
document.addEventListener("DOMContentLoaded", function(){
	// if it's a video page
	if (document.location.href.includes('.youtube.com/watch?v=')) {
		// create our div(s)
		createButtonsDiv();
		console.log("create div from domcontentloaded.");
	}
});

// function to create our div(s)
async function createButtonsDiv() {
	// ytp-right-controls needs to be loaded before we can attach our div(s) to it
	while(!document.getElementsByClassName('ytp-right-controls')[0]) {
		await new Promise(r => requestAnimationFrame(r));
	}
	
	// once ytp-right-controls is found
	let ytpRightControlsElement = document.getElementsByClassName('ytp-right-controls')[0];

	// we create the new div(s) to append right before ytp-right-controls
  let audiotdiv = document.createElement("div");
  let commentstdiv = document.createElement("div");

  // and check for the initial state our div(s) should have
  if (isAudioEnabledfromStorage === 1) {
		audiotdiv.innerHTML = '<button id="audioonly" class="ytp-audioonly-button ytp-button" data-priority="3" data-title-no-tooltip="Audio-only Toggle" aria-pressed="true" aria-label="Audio-only Toggle" title="Audio-only Toggle"><svg class="ytp-subtitles-button-icon" height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><use class="ytp-svg-shadow" xlink:href="#ytp-id-ao17"></use><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg></button>';
		// set audio url on startup when enabled
		setUrl(1, 0);
	} else {
		audiotdiv.innerHTML = '<button id="audioonly" class="ytp-audioonly-button ytp-button" data-priority="3" data-title-no-tooltip="Audio-only Toggle" aria-pressed="false" aria-label="Audio-only Toggle" title="Audio-only Toggle"><svg class="ytp-subtitles-button-icon" height="100%" version="1.1" viewBox="-10.5 -11 45 45" width="100%" fill-opacity="1"><use class="ytp-svg-shadow" xlink:href="#ytp-id-ao17"></use><path d="M20 12v-1.707c0-4.442-3.479-8.161-7.755-8.29-2.204-.051-4.251.736-5.816 2.256A7.933 7.933 0 0 0 4 10v2c-1.103 0-2 .897-2 2v4c0 1.103.897 2 2 2h2V10a5.95 5.95 0 0 1 1.821-4.306 5.977 5.977 0 0 1 4.363-1.691C15.392 4.099 18 6.921 18 10.293V20h2c1.103 0 2-.897 2-2v-4c0-1.103-.897-2-2-2z" fill="#fff"></path></svg></button>';
	}

	//commentstdiv.innerHTML = '<button id="commentsout" class="ytp-commentsout-button ytp-button" data-priority="3" data-title-no-tooltip="Disable comments Toggle" aria-pressed="false" aria-label="Disable comments Toggle" title="Disable comments Toggle"><svg class="ytp-subtitles-button-icon" height="100%" version="1.1" viewBox="-9 -10 39 39" width="100%" fill-opacity="1"><use class="ytp-svg-shadow" xlink:href="#ytp-id-co17"></use><path d="M7 18a1 1 0 0 1-1-1v-3H3.75A1.752 1.752 0 0 1 2 12.25v-8.5A1.752 1.752 0 0 1 3.75 2h12.5A1.752 1.752 0 0 1 18 3.75v8.5a1.762 1.762 0 0 1-.514 1.238A1.736 1.736 0 0 1 16.25 14h-4.836l-3.707 3.707A1 1 0 0 1 7 18zm-3-6h3a1 1 0 0 1 1 1v1.586l2.293-2.293A1 1 0 0 1 11 12h5V4H4v8z" fill="#fff"></path></svg></button>';

  // Get the reference element, in this case the bottom right controls
  //let ytpcontrolsdiv = document.getElementsByClassName('ytp-right-controls')[0];
  //console.log("ytpcontrolsdiv: " + ytpcontrolsdiv);
  // Get the parent element
  //let parentDiv = ytpcontrolsdiv.parentNode;
	let parentDiv = ytpRightControlsElement.parentNode;

  // insert the new elements to the left of the ytp-right-controls div
  parentDiv.insertBefore(audiotdiv, ytpRightControlsElement);
  //parentDiv.insertBefore(commentstdiv, ytpcontrolsdiv);
  
  // add the event listener for clicks on the created div
	monitorForClicks();
	
	// get the original playback source and set the global var
	const videoElement = document.getElementsByTagName('video')[0];
	//original video source
	var originalSource = videoElement.src;
}

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
      
      // if the audioonly element is loaded
      if (document.getElementById('audioonly') !== null) {
				console.log("is NOT null!!!");
				// if audio audioonly is enabled
				if (document.getElementById('audioonly').getAttribute("aria-pressed") == "true") {
					// set playback to audio only
					setUrl(1, 0);
				}
			} else {
				// create the div with the audioonly element
				console.log("create div from url change.");
				createButtonsDiv();
				// if audio audioonly is enabled
				if (document.getElementById('audioonly').getAttribute("aria-pressed") == "true") {
					// set playback to audio only
					setUrl(1, 0);
				}
			}
    } else if (document.location.href == 'https://www.youtube.com/') {
		console.log("url changed, main page!");
		// maybe check here for the mini player
		}
  });
  observer.observe(body, { childList: true, subtree: true });
};

window.onload = observeUrlChange;

// adds an event listener to monitor our element(s) for clicks
function monitorForClicks() {
	document.getElementById('audioonly').addEventListener("click", function (e) {
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

		// when the audioonly element is clicked...
		if (this.getAttribute("aria-pressed") == "false") {
			// ...and set to enable, we save to storage
			storEnableAudioOnly();
			// change the audioonly element to enabled
			this.setAttribute("aria-pressed", "true");
			// set the video blocking rule
			addBlockMessage();
			// and call for audio only playback
			setUrl(1, 0);
		} else {
			// ...and set to disabled, we save to storage
			storDisableAudioOnly();
			// change the audioonly element to disabled
			this.setAttribute("aria-pressed", "false");
			// remove the video blocking rule
			removeBlockMessage();
			// and call for vide+audio playback
			setUrl(0, 1);
		}
	});
	
	// only add the eventlistener if audioonly.getAttribute("aria-pressed") == "true")
	// if () {
	// we are also hijacking this function to monitor for clicks on the youtube settings > quality element at the same time
	document.getElementById('ytp-id-18').addEventListener("click", function (e) {
		
		if (document.getElementById('audioonly').getAttribute("aria-pressed") == "true") {
		// this is a hack, but when clicking on any child element in ytp-id-18...
		var elT = document.getElementsByClassName('ytp-menuitem-label')[0].innerText;
		console.log("elText outside: " + elT);
		// ...that contains any of the following text values (doesn't work with "Auto")
		if (elT.includes("2160p") || elT.includes("1440p") || elT.includes("1080p") || elT.includes("720p") || elT.includes("480p") || elT.includes("360p") || elT.includes("240p") || elT.includes("144p")) {
			console.log("elText inside: " + elT);
			// we disable the video blocking rule
			removeBlockMessage();
			// and set the audioonly div button to disabled
			document.getElementById('audioonly').setAttribute("aria-pressed", "false");
			// set audioonly storage to false
			
			// set video source and play
			setUrl(0, 1);
			// remove event listener
			//document.getElementById('ytp-id-18').removeEventListener("click", e);
			//this.removeEventListener('click', arguments.callee, false);
			
		} //else if {
			// especial case when selecting "Auto"
			//console.log("some bullshit");
		//}
		}
	});
}

// thanks to https://stackoverflow.com/questions/8690255/how-to-play-only-the-audio-of-a-youtube-video-using-html-5/45375023#45375023 for the idea
// less taxing, most likely to get a viable URL for playback
function setUrl(audio, video) {
	// audio streams
	as = {},
	// video streams
	vs = {},

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
	
				audioStreams.forEach((stream, n) => {
					var itag = stream.itag * 1;
					audioid = false;
					switch (itag) {
						// audio
						case 258: // aac 384 Kbps 5.1
							audioid = '258';
							console.log("stream 251 found! " + stream.url);
							break;
						case 256: // aac 192 Kbps 5.1
							audioid = '256';
							console.log("stream 251 found! " + stream.url);
							break;
						case 251: // webm (vbr) up to 160 Kbps (currently popular)
							audioid = '251';
							console.log("stream 251 found! " + stream.url);
							break;
						case 250: // webm (vbr) ~70 Kbps (currently popular)
							audioid = '250'; 
							console.log("stream 250 found! " + stream.url);
							break;
						case 249: // webm (vbr) ~50 Kbps (currently popular)
							audioid = '249';
							console.log("stream 249 found! " + stream.url);
							break;
						case 141: // aac 256 Kbps
							audioid = '141';
							console.log("stream 141 found! " + stream.url);
							break;
						case 140: // aac 48 Kbps (currently popular)
							audioid = '140';
							console.log("stream 140 found! " + stream.url);
							break;
						case 139: // aac 48 Kbps
							audioid = '139';
							console.log("stream 139 found! " + stream.url);
							break;
						}
						if (audioid) as[audioid] = stream.url;
				});
				
				// some ids are throttled, change as needed
				var audioURL = as['258'] || as['256'] || as['251'] || as['250'] || as['249'] || as['141'] || as['140'] || as['139'];
				console.log("audioURL = " + audioURL);
				
				// sometimes the audioURL returns 403
				// if blah blah
				// setUrl(0, 1);
				// return;
				
				videoStreams.forEach((stream, n) => {
					var itag = stream.itag * 1; // no idea why the multiplacation
					videoid = false;
					switch (itag) {
						// video+audio
						case 59: // mp4+aac 480p 
							videoid = '59';
							console.log("stream 59 found! " + stream.url);
							break;
						case 37: // mp4+aac 1080p 
							videoid = '37';
							console.log("stream 37 found! " + stream.url);
							break;
						case 22: // mp4+aac 720p
							videoid = '22';
							console.log("stream 22 found! " + stream.url);
							break;
						case 18: // mp4+aac 360p 
							videoid = '18'; 
							console.log("stream 18 found! " + stream.url);
							break;
						}
						if (videoid) vs[videoid] = stream.url;
				});
				
				var videoURL = vs['22'] || vs['18'] || vs['59'] || vs['37'];
				console.log("videoURL = " + videoURL);
				
				// get player's current time
				const videoElement = document.getElementsByTagName('video')[0];
				// get current player time
				var currentTime = document.getElementsByClassName("ytp-time-current")[0];
				// convert time into seconds
				var currentTimeSeconds = +(currentTime.innerText.split(':').reduce((acc,time) => (60 * acc) + +time));
				// original video source
				if (videoElement.src.indexOf("blob:") >= 0) {
					console.log("originalSource before: " + originalSource);
					originalSource = videoElement.src;
					console.log("originalSource after: " + originalSource);
				}
				// play the audio only
				if (arguments[0] === 1) {
					if (audioURL) {
						console.log("Available audio stream found.");
						if (videoElement.src != audioURL) {
							console.log("original video source in audio playback: " + originalSource);
							videoElement.src = audioURL;
							videoElement.currentTime = currentTimeSeconds;
							videoElement.play();
							console.log("player source is audio only.");
						}
					} else {
						console.log("No available audio stream using getUrl() for: " + document.location.href);
					}
				}
				
				// play video+audio
				if (arguments[1] === 1) {
					videoElement.src = originalSource;
					console.log("original video source in video playback: " + originalSource);
					videoElement.currentTime = currentTimeSeconds;
					videoElement.play();
					/*
					if (videoURL) {
						console.log("Available video+audio stream found.");
						if (videoElement.src != videoURL) {
							//videoElement.src = videoURL;
							console.log("original video source in video playback: " + originalSource);
							videoElement.src = originalSource;
							//videoElement.src = ""; 
							console.log("using original source for video: " + originalSource);
							videoElement.currentTime = currentTimeSeconds;
							videoElement.play();
							console.log("player source is video+audio.");
						}
					} else {
						console.log("No available video+audio stream using getUrl() for: " + document.location.href);
					}
					*/
				}
			})
		}
	});
}

// more taxing, needed when we don't get any URL from getUrl() using ytInitialPlayerResponse
