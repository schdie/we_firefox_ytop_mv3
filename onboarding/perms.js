var permsButton = document.getElementById("grantPerms");

permsButton.addEventListener("click", function(event){
	browser.permissions.request({
		origins: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"]
	})
});
