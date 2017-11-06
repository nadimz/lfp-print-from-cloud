var tokenCookie = "onedriveAccessToken";
var oneDriveEP = 'https://graph.microsoft.com';
var client;
var currentFile;

/*
* OneDrive config
*/
var config = {
  tenant: 'hp.com',
  clientId: '288d8b32-fec5-4026-878f-71e669399101',
  redirectUri: 'https://lfp-print-from-cloud.herokuapp.com/onedrive',
  callback: onUserLoggedIn
}

console.log('getting auth context');
var authenticationContext = new AuthenticationContext(config);

if (authenticationContext.isCallback(window.location.hash)) {
  console.log('handleWindowCallback');
  authenticationContext.handleWindowCallback();
} else {
  var user = authenticationContext.getCachedUser();
  if (user) {
    authenticationContext.acquireToken(oneDriveEP, function (errorDesc, token, error) {
      if (error) {
        authenticationContext.acquireTokenRedirect(oneDriveEP, null, null);
        console.log('acquireToken error: ' + error);
      } else {
        console.log('Using token: ' + token);
        startApp(token);
      }
    });
  } else {
    authenticationContext.login();
  }
}

function startApp(token) {
  console.log('starting onedrive app');
    client = MicrosoftGraph.Client.init({
      debugLogging: true,
      authProvider: function(done) {
        done(null, token);
      }
    });

    // list root folder
    listFolder('root');
    renderPath('root', 'root');
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
			onFileClicked(file.id, file.name, file.path, file.type);
		}, false);

		fileRowEntry.classList.add("color-darker-gray");
		/**
		 * Set the file icon
		 */
		if (file.type == 'folder') {
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
 * List a folder
 * @param  {string} folder [the path of the folder to list]
 */
function listFolder(folderId) {
  var folder = '/me/drive/items/' + folderId + '/children/';
	showSpinner();
  client
    .api(folder)
    .select('id,name,webUrl,folder')
    .get((err, res) => {
        if (err) {
          console.log(err);
          return;
        }
        var data = res.value;
        var entries = new Array();
        data.forEach(function(file) {
          var entry = {id: file.id, name: file.name, path: file.webUrl, type: ''};
          if (file.folder) {
            entry.type = 'folder';
          } else {
            entry.type = 'file';
          }
          entries.push(entry);
          console.log(file.name + ' ' + file.webUrl);
        });
        renderFiles(folder, entries);
  			hideSpinner();
        scrollToTop();
    });
}

function renderPathEntry(id, path, fullPath) {
	console.log('rendering ' + path);
	var pathContainer = document.getElementById("path");
	var pathEntry = document.createElement('div');
	pathEntry.setAttribute('id', id);
	pathEntry.classList.add("path-entry");
	pathEntry.classList.add("color-darker-gray");
	pathEntry.innerHTML = decodeURI(path);
	pathContainer.appendChild(pathEntry);
}

function setPathAncestorsAsLinks(id) {
	var pathContainer = document.getElementById("path");
	var children = pathContainer.children;
	for (var i = 0; i < children.length; i++) {
  	var child = children[i];
		if((child.id != 'undefined') && (child.id != id)) {
			console.log('setting ' + child.id + ' as a link');
			child.addEventListener("click", function() {
				onPathClicked(this.id);
			}, false);
			child.classList.remove("color-darker-gray");
			child.classList.add("color-hp-blue");
			child.style.cursor = "pointer";
		}
	}
}

function renderPath(id, path) {
	if(path === 'root') {
		renderPathEntry(id, 'Home', '/');
		return;
	}

	renderPathEntry(undefined, '>');

	var pathText = path.slice(path.lastIndexOf('/') + 1, path.length);
	renderPathEntry(id, pathText, path);

	setPathAncestorsAsLinks(id);
}

function onPathClicked(path) {
	console.log('onPathClicked: ' + path);
	/**
	 * List the folder and remove all children paths
	 */
	var found = false;
	var pathContainer = document.getElementById("path");
 	var children = pathContainer.children;
	var numOfChildren = children.length;
	for (var i = numOfChildren - 1; true ; i--) {
		var child = children[i];

		if (child.id === path) {
			found = true;
 			child.classList.remove("color-hp-blue");
			child.classList.add("color-darker-gray");
			child.style.cursor = "normal";
			break;
		} else {
			pathContainer.removeChild(child);
		}
 	}

	listFolder(path);
}

/**
 * Triggered when the user clicks on a file
 * @param  {string} id   [file id]
 * @param  {string} name [file name]
 * @param  {string} path [file path]
 * @param  {string} type [specifies whether a file is a folder or a normal file]
 */
function onFileClicked (id, name, path, type) {
	console.log('folder: ' + name + ' ' + path);
	if (type == 'folder') {
		listFolder(id);
		renderPath(id, path);
	} else {
		currentFile     = id;
		var printConfiration = document.getElementById("print-confirmation");
    printConfiration.classList.toggle("show-popup");
	}
}

function onUserLoggedIn(errorDescription, idToken, error) {
  if (error) {
    console.log('onUserLoggedIn: ' + error);
  } else {
    console.log('onUserLoggedIn: ' + idToken);
  }
}

function onPrintClicked() {
	// remove the popup
	var printConfiration = document.getElementById("print-confirmation");
	printConfiration.classList.toggle("show-popup");

	// send file for printing
	printDocument(currentFile);

	// notify the user
	var toast = document.getElementById("print-toast");
	toast.innerHTML = "File sent for printing";
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
 * @param  {string} id [id of the document]
 */
function printDocument(id) {
  var file = '/me/drive/items/' + id;
  client
    .api(file)
    .get((err, res) => {
      if (err) {
        console.log(err);
        return;
      }
      var fileUrl = res['@microsoft.graph.downloadUrl'];
      fetch(fileUrl, {mode: 'cors'})
        .then(function(response) {
          if (response.status !== 200) {
            console.log('failed downloading file');
            return;
          }
          return response.blob();
        }).then(function(blob) {
          var lfp = new Lfp();
          lfp.print("job", blob);
          console.log('printing');
        });
      });
}
