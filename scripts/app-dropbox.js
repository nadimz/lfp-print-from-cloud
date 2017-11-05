var tokenCookie = "dropboxAccessToken";
var CLIENT_ID = 'dn9zszriuvvvtn1';
var dbx;

if (isAuthenticated()) {
	showPageSection('files-table');

	/**
	 * Create a new instance of Dropbox with the access token
	 * and get the list of files found the user's root folder.
	 */
	dbx = new Dropbox({ accessToken: getAccessToken() });
	listFolder('');
} else {
	/**
	 * Start OAuth2 process
	 */
	var dbx = new Dropbox({clientId: CLIENT_ID});
	var authUrl = dbx.getAuthenticationUrl('http://127.0.0.1:8080/dropbox');
	window.location = authUrl;
}

/**
 * Check whether the user has authenticated
 * @return {Boolean} true if authenticated
 */
function isAuthenticated() {
	return !!getAccessToken();
}

/**
 * Try to get the aceess token from a cookie we have stored.
 * If no cookie is found, try to get it by parsing the hash
 * parameters of the URL in case this was a redirection
 * @return {string} [the access token]
 */
function getAccessToken() {
	var accessToken = getCookie(tokenCookie);
	if (!accessToken) {
		// no access token in cookie. Look for it in the URL
		accessToken = utils.parseQueryString(window.location.hash).access_token;
	}

	if (accessToken) {
		// we got an access token, set a cookie
		setCookie(tokenCookie, accessToken, 1);
	}

	return accessToken;
}

function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays*24*60*60*1000));
	var expires = "expires="+ d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for(var i = 0; i <ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

/**
 * List a folder
 * @param  {string} folder [the path of the folder to list]
 */
function listFolder(folder) {
	dbx.filesListFolder({path: folder})
		.then(function(response) {
			renderFiles(folder, response.entries);
		})
		.catch(function(error) {
			console.error(error);
		});
}

function getFileType(file) {
	var n = file.lastIndexOf(".");
	return file.substring(n + 1, file.length);
}

function getFileIcon(file) {
	var type = getFileType(file);
	if (type == 'txt') {
		return "url('/resources/txt.svg')"
	} else if (type == 'pdf') {
		return "url('/resources/pdf.svg')"
	} else if (type == 'jpg') {
		return "url('/resources/jpg.svg')"
	} else if (type == 'png') {
		return "url('/resources/png.svg')"
	} else if (type == 'doc') {
		return "url('/resources/doc.svg')"
	}

	return "";
}

/**
 * Renders a list of files
 * @param  {string[]} files [list of files to render]
 */
function renderFiles(folder, files) {
	/**
	 * Add the files as table rows
	 */
	var table = document.getElementById('files-table-body');
	table.innerHTML = '';
	files.forEach(function(file) {
		var fileRow = document.createElement('tr');
		var fileRowEntry = document.createElement('td');
		fileRowEntry.addEventListener("click", function() {
			onFileClicked(file.name, file.path_display, file['.tag'])
		}, false);

		/**
		 * Set the file icon
		 */
		if (file['.tag'] == 'folder') {
			fileRowEntry.style.backgroundImage = "url('/resources/folder.svg')";
		} else {
			fileRowEntry.style.backgroundImage = getFileIcon(file.name);
		}

		/**
		 * If we did not get an icon, it means we don't support
		 * this file type. So we just ignore it.
		 */
		if (fileRowEntry.style.backgroundImage) {
			fileRowEntry.innerHTML = file.name;
			table.appendChild(fileRow);
			fileRow.appendChild(fileRowEntry);
		}
	});
}

/**
 * Triggered when the user clicks on a file
 * @param  {string} name [file name]
 * @param  {string} path [file path]
 * @param  {string} tag  [specifies whether a file is a folder or a normal file]
 */
function onFileClicked (name, path, tag) {
	console.log('folder: ' + name + ' ' + path);
	if (tag == 'folder') {
		listFolder(path);
	} else {
		var printConfiration = document.getElementById("print-confirmation");
    printConfiration.classList.toggle("show");
	}
}

/**
 * Send a document for printing
 * @param  {string} name [name of the document]
 * @param  {string} path [path of the document]
 * @return {[type]}      [description]
 */
function printDocument(name, path) {
	console.log(name, path);
	var doc = document.getElementById('doc');
	doc.innerHTML = name;
	showPageSection('print-section');
	dbx.filesDownload({path: path})
		.then(function(response) {
			if(response.fileBlob !== undefined) {
				console.log('Downloaded ' + response.name + '. Saving it..');
				var lfp = new Lfp();
				lfp.printFileIPP(response.name, response.fileBlob);
			}
		})
		.catch(function(error) {
			console.error(error);
		});

	return false;
}

// This example keeps both the authenticate and non-authenticated setions
// in the DOM and uses this function to show/hide the correct section.
function showPageSection(elementId) {
	document.getElementById(elementId).style.display = 'block';
}
