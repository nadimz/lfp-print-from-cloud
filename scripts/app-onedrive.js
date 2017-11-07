var tokenCookie = "onedriveAccessToken";
var oneDriveEP = 'https://graph.microsoft.com';
var client;

/*
* OneDrive config
*/
var config = {
  tenant: 'hp.com',
  clientId: '288d8b32-fec5-4026-878f-71e669399101',
  redirectUri: 'https://127.0.0.1:4443/onedrive',
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
    listFolder('');
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
		/*fileRowEntry.addEventListener("click", function() {
			onFileClicked(file.name, file.path_display, file['.tag'])
		}, false);*/

		fileRowEntry.classList.add("color-darker-gray");
		/**
		 * Set the file icon
		 */
		/*if (file['.tag'] == 'folder') {
			fileRowEntry.style.backgroundImage = "url('/resources/folder.svg')";
		} else {
			fileRowEntry.style.backgroundImage = getFileIcon(file.name);
		}*/

		/**
		 * If we did not get an icon, it means we don't support
		 * this file type. So we just ignore it.
		 */
		//if (fileRowEntry.style.backgroundImage) {
			fileRowEntry.innerHTML = file.name;
			table.appendChild(fileRow);
			fileRow.appendChild(fileRowEntry);
		//}
	});
}

/**
 * List a folder
 * @param  {string} folder [the path of the folder to list]
 */
function listFolder(folder) {
  console.log('listing folder: ' + folder);

	showSpinner();
  client
    .api('/me/drive/root/children/')
    .select('name,webUrl')
    .get((err, res) => {
        if (err) {
          console.log(err);
          return;
        }
        var entries = res.value;
        entries.forEach(function(file) {
          console.log(file.name + file.webUrl);
        });
        renderFiles(folder, entries);
  			hideSpinner();
    });
}

function onUserLoggedIn(errorDescription, idToken, error) {
  if (error) {
    console.log('onUserLoggedIn: ' + error);
  } else {
    console.log('onUserLoggedIn: ' + idToken);
  }
}
