var tokenCookie = "dropboxAccessToken";
var CLIENT_ID = 'dn9zszriuvvvtn1';
var dbx;
var currentFile;
var currentFilePath;

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

/**
 * List a folder
 * @param  {string} folder [the path of the folder to list]
 */
function listFolder(folder) {
	dbx.filesListFolder({path: folder})
		.then(function(response) {
			renderFiles(folder, response.entries);
			if(folder == '') {
				renderPath('Dropbox');
			} else {
				renderPath(folder);
			}
		})
		.catch(function(error) {
			console.error(error);
		});
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

		fileRowEntry.classList.add("color-darker-gray");
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

function renderPathEntry(path, fullPath) {
	console.log('rendering ' + path);
	var pathContainer = document.getElementById("path");
	var pathEntry = document.createElement('div');
	pathEntry.classList.add("path-entry");
	pathEntry.classList.add("color-darker-gray");
	pathEntry.innerHTML = path;
	pathEntry.addEventListener("click", function() {
		listFolder(path);
	}, false);
	pathContainer.appendChild(pathEntry);
}

function renderPath(currentPath) {
	if(!currentPath) {
		return;
	}
	var idxBegin = 1;
	var idxEnd;
	if ((idxEnd = currentPath.indexOf('/', idxBegin)) < 0) {
		idxEnd = currentPath.length;
	}

	var pathText = currentPath.slice(idxBegin, idxEnd);
	renderPathEntry(pathText);
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
		currentFile     = name;
		currentFilePath = path;
		var printConfiration = document.getElementById("print-confirmation");
    printConfiration.classList.toggle("show-popup");
	}
}

function onPrintClicked() {
	// remove the popup
	var printConfiration = document.getElementById("print-confirmation");
	printConfiration.classList.toggle("show-popup");

	// send file for printing
	//printDocument(currentFile, currentFilePath);

	// notify the user
	var toast = document.getElementById("print-toast");
	toast.innerHTML = "File will now be printed";
	toast.classList.toggle("show-toast");
	setTimeout(function(){toast.classList.toggle("show-toast");}, 3000);
}

function onCancelClicked() {
	// remove the popup
	var printConfiration = document.getElementById("print-confirmation");
	printConfiration.classList.toggle("show-popup");
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
