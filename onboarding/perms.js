/*
var permsButton = document.getElementById("grantPerms");

permsButton.addEventListener("click", function(event){
	browser.permissions.request({
		origins: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"]
	})
});
*/

var permsButton = document.getElementById("close");

permsButton.addEventListener("click", function(event){
	window.close();
});

//https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
const permissionsToRequest = {
  //permissions: ["storage", "webRequest"],
  origins: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"],
};

async function requestPermissions() {
  function onResponse(response) {
    if (response) {
      console.log("Permission was granted");
      // change html to explain usage and acknowledge the user response
      document.getElementById("main").style.display = 'none';
      document.getElementById("sec").style.display = 'block';
    } else {
      console.log("Permission was refused");
      document.getElementById("main").style.display = 'block';
      document.getElementById("sec").style.display = 'none';
      alert("Permissions denied.\nThe extension can't work without them.");
    }
    return browser.permissions.getAll();
  }

  const response = await browser.permissions.request(permissionsToRequest);
  const currentPermissions = await onResponse(response);

  console.log(`Current permissions:`, currentPermissions);
}

document.getElementById("grantPerms").addEventListener("click", requestPermissions);
