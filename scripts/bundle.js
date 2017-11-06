(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* jshint -W079 */
var Blob = require('blob');
var Promise = require('native-or-lie');

//
// PRIVATE
//

// From http://stackoverflow.com/questions/14967647/ (continues on next line)
// encode-decode-image-with-base64-breaks-image (2013-04-21)
function binaryStringToArrayBuffer(binary) {
  var length = binary.length;
  var buf = new ArrayBuffer(length);
  var arr = new Uint8Array(buf);
  var i = -1;
  while (++i < length) {
    arr[i] = binary.charCodeAt(i);
  }
  return buf;
}

// Can't find original post, but this is close
// http://stackoverflow.com/questions/6965107/ (continues on next line)
// converting-between-strings-and-arraybuffers
function arrayBufferToBinaryString(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var length = bytes.byteLength;
  var i = -1;
  while (++i < length) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

// doesn't download the image more than once, because
// browsers aren't dumb. uses the cache
function loadImage(src, crossOrigin) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    img.onload = function () {
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function imgToCanvas(img) {
  var canvas = document.createElement('canvas');

  canvas.width = img.width;
  canvas.height = img.height;

  // copy the image contents to the canvas
  var context = canvas.getContext('2d');
  context.drawImage(
    img,
    0, 0,
    img.width, img.height,
    0, 0,
    img.width, img.height);

  return canvas;
}

//
// PUBLIC
//

/**
 * Shim for
 * [new Blob()]{@link https://developer.mozilla.org/en-US/docs/Web/API/Blob.Blob}
 * to support
 * [older browsers that use the deprecated <code>BlobBuilder</code> API]{@link http://caniuse.com/blob}.
 *
 * @param {Array} parts - content of the <code>Blob</code>
 * @param {Object} options - usually just <code>{type: myContentType}</code>
 * @returns {Blob}
 */
function createBlob(parts, options) {
  options = options || {};
  if (typeof options === 'string') {
    options = {type: options}; // do you a solid here
  }
  return new Blob(parts, options);
}

/**
 * Shim for
 * [URL.createObjectURL()]{@link https://developer.mozilla.org/en-US/docs/Web/API/URL.createObjectURL}
 * to support browsers that only have the prefixed
 * <code>webkitURL</code> (e.g. Android <4.4).
 * @param {Blob} blob
 * @returns {string} url
 */
function createObjectURL(blob) {
  return (window.URL || window.webkitURL).createObjectURL(blob);
}

/**
 * Shim for
 * [URL.revokeObjectURL()]{@link https://developer.mozilla.org/en-US/docs/Web/API/URL.revokeObjectURL}
 * to support browsers that only have the prefixed
 * <code>webkitURL</code> (e.g. Android <4.4).
 * @param {string} url
 */
function revokeObjectURL(url) {
  return (window.URL || window.webkitURL).revokeObjectURL(url);
}

/**
 * Convert a <code>Blob</code> to a binary string. Returns a Promise.
 *
 * @param {Blob} blob
 * @returns {Promise} Promise that resolves with the binary string
 */
function blobToBinaryString(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    var hasBinaryString = typeof reader.readAsBinaryString === 'function';
    reader.onloadend = function (e) {
      var result = e.target.result || '';
      if (hasBinaryString) {
        return resolve(result);
      }
      resolve(arrayBufferToBinaryString(result));
    };
    reader.onerror = reject;
    if (hasBinaryString) {
      reader.readAsBinaryString(blob);
    } else {
      reader.readAsArrayBuffer(blob);
    }
  });
}

/**
 * Convert a base64-encoded string to a <code>Blob</code>. Returns a Promise.
 * @param {string} base64
 * @param {string|undefined} type - the content type (optional)
 * @returns {Promise} Promise that resolves with the <code>Blob</code>
 */
function base64StringToBlob(base64, type) {
  return Promise.resolve().then(function () {
    var parts = [binaryStringToArrayBuffer(atob(base64))];
    return type ? createBlob(parts, {type: type}) : createBlob(parts);
  });
}

/**
 * Convert a binary string to a <code>Blob</code>. Returns a Promise.
 * @param {string} binary
 * @param {string|undefined} type - the content type (optional)
 * @returns {Promise} Promise that resolves with the <code>Blob</code>
 */
function binaryStringToBlob(binary, type) {
  return Promise.resolve().then(function () {
    return base64StringToBlob(btoa(binary), type);
  });
}

/**
 * Convert a <code>Blob</code> to a binary string. Returns a Promise.
 * @param {Blob} blob
 * @returns {Promise} Promise that resolves with the binary string
 */
function blobToBase64String(blob) {
  return blobToBinaryString(blob).then(function (binary) {
    return btoa(binary);
  });
}

/**
 * Convert a data URL string
 * (e.g. <code>'data:image/png;base64,iVBORw0KG...'</code>)
 * to a <code>Blob</code>. Returns a Promise.
 * @param {string} dataURL
 * @returns {Promise} Promise that resolves with the <code>Blob</code>
 */
function dataURLToBlob(dataURL) {
  return Promise.resolve().then(function () {
    var type = dataURL.match(/data:([^;]+)/)[1];
    var base64 = dataURL.replace(/^[^,]+,/, '');

    var buff = binaryStringToArrayBuffer(atob(base64));
    return createBlob([buff], {type: type});
  });
}

/**
 * Convert a <code>Blob</code> to a data URL string
 * (e.g. <code>'data:image/png;base64,iVBORw0KG...'</code>).
 * Returns a Promise.
 * @param {Blob} blob
 * @returns {Promise} Promise that resolves with the data URL string
 */
function blobToDataURL(blob) {
  return blobToBase64String(blob).then(function (base64String) {
    return 'data:' + blob.type + ';base64,' + base64String;
  });
}

/**
 * Convert an image's <code>src</code> URL to a data URL by loading the image and painting
 * it to a <code>canvas</code>. Returns a Promise.
 *
 * <p/>Note: this will coerce the image to the desired content type, and it
 * will only paint the first frame of an animated GIF.
 *
 * @param {string} src
 * @param {string|undefined} type - the content type (optional, defaults to 'image/png')
 * @param {string|undefined} crossOrigin - for CORS-enabled images, set this to
 *                                         'Anonymous' to avoid "tainted canvas" errors
 * @param {number|undefined} quality - a number between 0 and 1 indicating image quality
 *                                     if the requested type is 'image/jpeg' or 'image/webp'
 * @returns {Promise} Promise that resolves with the data URL string
 */
function imgSrcToDataURL(src, type, crossOrigin, quality) {
  type = type || 'image/png';

  return loadImage(src, crossOrigin).then(function (img) {
    return imgToCanvas(img);
  }).then(function (canvas) {
    return canvas.toDataURL(type, quality);
  });
}

/**
 * Convert a <code>canvas</code> to a <code>Blob</code>. Returns a Promise.
 * @param {string} canvas
 * @param {string|undefined} type - the content type (optional, defaults to 'image/png')
 * @param {number|undefined} quality - a number between 0 and 1 indicating image quality
 *                                     if the requested type is 'image/jpeg' or 'image/webp'
 * @returns {Promise} Promise that resolves with the <code>Blob</code>
 */
function canvasToBlob(canvas, type, quality) {
  return Promise.resolve().then(function () {
    if (typeof canvas.toBlob === 'function') {
      return new Promise(function (resolve) {
        canvas.toBlob(resolve, type, quality);
      });
    }
    return dataURLToBlob(canvas.toDataURL(type, quality));
  });
}

/**
 * Convert an image's <code>src</code> URL to a <code>Blob</code> by loading the image and painting
 * it to a <code>canvas</code>. Returns a Promise.
 *
 * <p/>Note: this will coerce the image to the desired content type, and it
 * will only paint the first frame of an animated GIF.
 *
 * @param {string} src
 * @param {string|undefined} type - the content type (optional, defaults to 'image/png')
 * @param {string|undefined} crossOrigin - for CORS-enabled images, set this to
 *                                         'Anonymous' to avoid "tainted canvas" errors
 * @param {number|undefined} quality - a number between 0 and 1 indicating image quality
 *                                     if the requested type is 'image/jpeg' or 'image/webp'
 * @returns {Promise} Promise that resolves with the <code>Blob</code>
 */
function imgSrcToBlob(src, type, crossOrigin, quality) {
  type = type || 'image/png';

  return loadImage(src, crossOrigin).then(function (img) {
    return imgToCanvas(img);
  }).then(function (canvas) {
    return canvasToBlob(canvas, type, quality);
  });
}

/**
 * Convert an <code>ArrayBuffer</code> to a <code>Blob</code>. Returns a Promise.
 *
 * @param {ArrayBuffer} buffer
 * @param {string|undefined} type - the content type (optional)
 * @returns {Promise} Promise that resolves with the <code>Blob</code>
 */
function arrayBufferToBlob(buffer, type) {
  return Promise.resolve().then(function () {
    return createBlob([buffer], type);
  });
}

/**
 * Convert a <code>Blob</code> to an <code>ArrayBuffer</code>. Returns a Promise.
 * @param {Blob} blob
 * @returns {Promise} Promise that resolves with the <code>ArrayBuffer</code>
 */
function blobToArrayBuffer(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onloadend = function (e) {
      var result = e.target.result || new ArrayBuffer(0);
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

module.exports = {
  createBlob         : createBlob,
  createObjectURL    : createObjectURL,
  revokeObjectURL    : revokeObjectURL,
  imgSrcToBlob       : imgSrcToBlob,
  imgSrcToDataURL    : imgSrcToDataURL,
  canvasToBlob       : canvasToBlob,
  dataURLToBlob      : dataURLToBlob,
  blobToDataURL      : blobToDataURL,
  blobToBase64String : blobToBase64String,
  base64StringToBlob : base64StringToBlob,
  binaryStringToBlob : binaryStringToBlob,
  blobToBinaryString : blobToBinaryString,
  arrayBufferToBlob  : arrayBufferToBlob,
  blobToArrayBuffer  : blobToArrayBuffer
};

},{"blob":2,"native-or-lie":17}],2:[function(require,module,exports){
(function (global){
/**
 * Create a blob builder even when vendor prefixes exist
 */

var BlobBuilder = global.BlobBuilder
  || global.WebKitBlobBuilder
  || global.MSBlobBuilder
  || global.MozBlobBuilder;

/**
 * Check if Blob constructor is supported
 */

var blobSupported = (function() {
  try {
    var a = new Blob(['hi']);
    return a.size === 2;
  } catch(e) {
    return false;
  }
})();

/**
 * Check if Blob constructor supports ArrayBufferViews
 * Fails in Safari 6, so we need to map to ArrayBuffers there.
 */

var blobSupportsArrayBufferView = blobSupported && (function() {
  try {
    var b = new Blob([new Uint8Array([1,2])]);
    return b.size === 2;
  } catch(e) {
    return false;
  }
})();

/**
 * Check if BlobBuilder is supported
 */

var blobBuilderSupported = BlobBuilder
  && BlobBuilder.prototype.append
  && BlobBuilder.prototype.getBlob;

/**
 * Helper function that maps ArrayBufferViews to ArrayBuffers
 * Used by BlobBuilder constructor and old browsers that didn't
 * support it in the Blob constructor.
 */

function mapArrayBufferViews(ary) {
  for (var i = 0; i < ary.length; i++) {
    var chunk = ary[i];
    if (chunk.buffer instanceof ArrayBuffer) {
      var buf = chunk.buffer;

      // if this is a subarray, make a copy so we only
      // include the subarray region from the underlying buffer
      if (chunk.byteLength !== buf.byteLength) {
        var copy = new Uint8Array(chunk.byteLength);
        copy.set(new Uint8Array(buf, chunk.byteOffset, chunk.byteLength));
        buf = copy.buffer;
      }

      ary[i] = buf;
    }
  }
}

function BlobBuilderConstructor(ary, options) {
  options = options || {};

  var bb = new BlobBuilder();
  mapArrayBufferViews(ary);

  for (var i = 0; i < ary.length; i++) {
    bb.append(ary[i]);
  }

  return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
};

function BlobConstructor(ary, options) {
  mapArrayBufferViews(ary);
  return new Blob(ary, options || {});
};

module.exports = (function() {
  if (blobSupported) {
    return blobSupportsArrayBufferView ? global.Blob : BlobConstructor;
  } else if (blobBuilderSupported) {
    return BlobBuilderConstructor;
  } else {
    return undefined;
  }
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
(function (global){
'use strict';
var Mutation = global.MutationObserver || global.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = global.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
    var channel = new global.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = global.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      global.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

module.exports = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){

var util = require('./lib/ipputil');

module.exports = {
	parse: require('./lib/parser'),
	serialize: require('./lib/serializer'),
	request: require('./lib/request'),
	Printer: require('./lib/printer'),
	versions: require('./lib/versions'),
	attributes: require('./lib/attributes'),
	keywords: require('./lib/keywords'),
	enums: require('./lib/enums'),
	tags: require('./lib/tags'),
	statusCodes: require('./lib/status-codes')
};
module.exports.operations = module.exports.enums['operations-supported'];
module.exports.attribute = {
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-7
	groups: util.xref(module.exports.tags.lookup.slice(0x00, 0x0F)),
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-8
	values: util.xref(module.exports.tags.lookup.slice(0x10, 0x1F)),
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-9
	syntaxes: util.xref(module.exports.tags.lookup.slice(0x20))
}

},{"./lib/attributes":5,"./lib/enums":6,"./lib/ipputil":7,"./lib/keywords":8,"./lib/parser":9,"./lib/printer":10,"./lib/request":11,"./lib/serializer":12,"./lib/status-codes":13,"./lib/tags":14,"./lib/versions":15}],5:[function(require,module,exports){

/*

The attributes and their syntaxes are complicated. The functions in this 
file serve as syntactic sugar that allow the attribute definitions to remain 
close to what you will see in the spec. A bit of processing is done at the end
to convert it to one big object tree. If you want to understand what is going on,
uncomment the console.log() at the end of this file.

 */
var tags = require('./tags');

function text(max){
	if(!max) max = 1023;
	return { type:arguments.callee.name, max: max };
}
function integer(min,max){
	if(max==MAX || max===undefined) max = 2147483647;
	if(min===undefined) min = -2147483648;
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], min: min, max: max };
}
function rangeOfInteger(min,max){
	if(max==MAX || max===undefined) max = 2147483647;
	if(min===undefined) min = -2147483648;
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], min: min, max: max };
}
function boolean(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name] };
}
function charset(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], max: 63 };
}
function keyword(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], min:1, max:1023 };
}
function naturalLanguage(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], max: 63 };
}
function dateTime(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name] };
}
function mimeMediaType(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], max: 255 };
}
function uri(max){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], max: max||1023 };
}
function uriScheme(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], max: 63 };
}
function enumeration(){
	return { type:arguments.callee.name, tag:tags['enum'] };
}
function resolution(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name] };
}
function unknown(){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name] };
}
function name(max){
	return { type:arguments.callee.name, max: max||1023 };
}
function novalue(){
	return { type:arguments.callee.name, tag:tags['no-value'] };
}
function octetString(max){
	return { type:arguments.callee.name, tag:tags[arguments.callee.name], max: max||1023 };
}

//Some attributes allow alternate value syntaxes.
//I want to keep the look and feel of the code close to
//that of the RFCs. So, this _ (underscore) function is
//used to group alternates and not be intrusive visually.
function _(arg1, arg2, arg3){
	var args = Array.prototype.slice.call(arguments);
	args.lookup = {};
	function deferred(){
		args.forEach(function(a,i){
			if(typeof a==="function")
				args[i] = a();
			args.lookup[args[i].type] = args[i];
		});
		args.alts = Object.keys(args.lookup).sort().join();
		return args;
	}
	return args.some(function(a){ return a.name==="deferred" }) ? deferred : deferred();
}

// In IPP, "1setOf" just means "Array"... but it must 1 or more items
// In javascript, functions can't start with a number- so let's just use...
function setof(type){
	if(type.name === "deferred"){
		return function deferred(){
			type = type();
			type.setof=true;
			return type;
		}
	}
	if(typeof type === "function" && type.name != "deferred"){
		type = type();
	}
	type.setof=true;
	return type;
}

// In IPP, a "collection" is an set of name-value
// pairs. In javascript, we call them "Objects".
function collection(group, name){
	if(!arguments.length)
		return { type: "collection", tag:tags.begCollection }

	if(typeof group === "string"){
		return function deferred(){
			return {
				type: "collection",
				tag:tags.begCollection,
				members: attributes[group][name].members
			}
		}
	}
	var defer = Object.keys(group).some(function(key){
		return group[key].name==="deferred"
	})
	function deferred(){
		return {
			type: "collection",
			tag:tags.begCollection,
			members: resolve(group)
		}
	}
	return defer? deferred : deferred();
}



var MAX = {};

var attributes = {};
attributes["Document Description"] = {
	"attributes-charset":							charset,
	"attributes-natural-language":					naturalLanguage,
	"compression":									keyword,
	"copies-actual":								setof(integer(1,MAX)),
	"cover-back-actual":							setof(collection("Job Template","cover-back")),
	"cover-front-actual":							setof(collection("Job Template", "cover-front")),
	"current-page-order":							keyword,
	"date-time-at-completed":						_(dateTime, novalue),
	"date-time-at-creation":						dateTime,
	"date-time-at-processing":						_(dateTime, novalue),
	"detailed-status-messages":						setof(text),
	"document-access-errors":						setof(text),
	"document-charset":								charset,
	"document-digital-signature":					keyword,
	"document-format":								mimeMediaType,
	"document-format-details":						setof(collection("Operation", "document-format-details")),
	"document-format-details-detected":				setof(collection("Operation","document-format-details")),
	"document-format-detected":						mimeMediaType,
	"document-format-version":						text(127),
	"document-format-version-detected":				text(127),
	"document-job-id":								integer(1, MAX),
	"document-job-uri":								uri,
	"document-message":								text,
	"document-metadata":							setof(octetString),
	"document-name":								name,
	"document-natural-language":					naturalLanguage,
	"document-number":								integer(1,MAX),
	"document-printer-uri":							uri,
	"document-state":								enumeration,
	"document-state-message":						text,
	"document-state-reasons":						setof(keyword),
	"document-uri":									uri,															
	"document-uuid":								uri(45),
	"errors-count":									integer(0,MAX),
	"finishings-actual":							setof(enumeration),
	"finishings-col-actual":						setof(collection("Job Template","finishings-col")),
	"force-front-side-actual":						setof(integer(1,MAX)),
	"imposition-template-actual":					setof(_(keyword, name)),
	"impressions":									integer(0,MAX),
	"impressions-completed":						integer(0,MAX),
	"impressions-completed-current-copy":			integer(0,MAX),
	"insert-sheet-actual":							setof(collection("Job Template","insert-sheet")),
	"k-octets":										integer(0,MAX),
	"k-octets-processed":							integer(0,MAX),
	"last-document":								boolean,
	"media-actual":									setof(_(keyword, name)),
	"media-col-actual":								setof(collection("Job Template","media-col")),
	"media-input-tray-check-actual":				setof(_(keyword, name)),
	"media-sheets":									integer(0,MAX),
	"media-sheets-completed":						integer(0,MAX),
	"more-info":									uri,
	"number-up-actual":								setof(integer),
	"orientation-requested-actual":					setof(enumeration),
	"output-bin-actual":							setof(name),
	"output-device-assigned":						name(127),
	"overrides-actual":								setof(collection("Document Template","overrides")),
	"page-delivery-actual":							setof(keyword),
	"page-order-received-actual":					setof(keyword),
	"page-ranges-actual":							setof(rangeOfInteger(1,MAX)),
	"pages":										integer(0,MAX),
	"pages-completed":								integer(0,MAX),
	"pages-completed-current-copy":					integer(0,MAX),
	"presentation-direction-number-up-actual":		setof(keyword),
	"print-content-optimize-actual":				setof(keyword),
	"print-quality-actual":							setof(enumeration),
	"printer-resolution-actual":					setof(resolution),
	"printer-up-time":								integer(1,MAX),
	"separator-sheets-actual":						setof(collection("Job Template","separator-sheets")),
	"sheet-completed-copy-number":					integer(0,MAX),
	"sides-actual":									setof(keyword),
	"time-at-completed":							_(integer, novalue),
	"time-at-creation":								integer,
	"time-at-processing":							_(integer, novalue),
	"x-image-position-actual":						setof(keyword),
	"x-image-shift-actual":							setof(integer),
	"x-side1-image-shift-actual":					setof(integer),
	"x-side2-image-shift-actual":					setof(integer),
	"y-image-position-actual":						setof(keyword),
	"y-image-shift-actual":							setof(integer),
	"y-side1-image-shift-actual":					setof(integer),
	"y-side2-image-shift-actual":					setof(integer)
};
attributes["Document Template"] = {
	"copies":integer(1,MAX),
	"cover-back":									collection("Job Template","cover-back"),
	"cover-front":									collection("Job Template","cover-front"),
	"feed-orientation":								keyword,
	"finishings":									setof(enumeration),
	"finishings-col":								collection("Job Template","finishings-col"),
	"font-name-requested":							name,
	"font-size-requested":							integer(1,MAX),
	"force-front-side":								setof(integer(1,MAX)),
	"imposition-template":							_(keyword, name),
	"insert-sheet":									setof(collection("Job Template","insert-sheet")),
	"media":										_(keyword, name),
	"media-col":									collection("Job Template","media-col"),
	"media-input-tray-check":						_(keyword, name),
	"number-up":									integer(1,MAX),
	"orientation-requested":						enumeration,
	"overrides":									setof(collection({
		//Any Document Template attribute (TODO)
		"document-copies":							setof(rangeOfInteger),
		"document-numbers":							setof(rangeOfInteger),
		"pages":									setof(rangeOfInteger)
	})),
	"page-delivery":								keyword,
	"page-order-received":							keyword,
	"page-ranges":									setof(rangeOfInteger(1,MAX)),
	"pdl-init-file":								setof(collection("Job Template","pdl-init-file")),
	"presentation-direction-number-up":				keyword,
	"print-color-mode":								keyword,
	"print-content-optimize":						keyword,
	"print-quality":								enumeration,
	"print-rendering-intent":						keyword,
	"printer-resolution":							resolution,
	"separator-sheets":								collection("Job Template","separator-sheets"),
	"sheet-collate":								keyword,
	"sides":										keyword,
	"x-image-position":								keyword,
	"x-image-shift":								integer,
	"x-side1-image-shift":							integer,
	"x-side2-image-shift":							integer,
	"y-image-position":								keyword,
	"y-image-shift":								integer,
	"y-side1-image-shift":							integer,
	"y-side2-image-shift":							integer
};
attributes["Event Notifications"] = {
	"notify-subscribed-event":						keyword,
	"notify-text":									text
};
attributes["Job Description"] = {
	"attributes-charset":							charset,
	"attributes-natural-language":					naturalLanguage,
	"compression-supplied":							keyword,
	"copies-actual":								setof(integer(1,MAX)),
	"cover-back-actual":							setof(collection("Job Template","cover-back")),
	"cover-front-actual":							setof(collection("Job Template","cover-front")),
	"current-page-order":							keyword,
	"date-time-at-completed":						_(dateTime, novalue),
	"date-time-at-creation":						dateTime,
	"date-time-at-processing":						_(dateTime, novalue),
	"document-charset-supplied":					charset,
	"document-digital-signature-supplied":			keyword,
	"document-format-details-supplied":				setof(collection("Operation","document-format-details")),
	"document-format-supplied":						mimeMediaType,
	"document-format-version-supplied":				text(127),
	"document-message-supplied":					text,
	"document-metadata":							setof(octetString),
	"document-name-supplied":						name,
	"document-natural-language-supplied":			naturalLanguage,
	"document-overrides-actual":					setof(collection),
	"errors-count":									integer(0,MAX),
	"finishings-actual":							setof(enumeration),
	"finishings-col-actual":						setof(collection("Job Template","finishings-col")),
	"force-front-side-actual":						setof(setof(integer(1, MAX))),
	"imposition-template-actual":					setof(_(keyword, name)),
	"impressions-completed-current-copy":			integer(0,MAX),
	"insert-sheet-actual":							setof(collection("Job Template","insert-sheet")),
	"job-account-id-actual":						setof(name),
	"job-accounting-sheets-actual":					setof(collection("Job Template","job-accounting-sheets")),
	"job-accounting-user-id-actual":				setof(name),
	"job-attribute-fidelity":						boolean,
	"job-collation-type":							enumeration,
	"job-collation-type-actual":					setof(keyword),
	"job-copies-actual":							setof(integer(1,MAX)),
	"job-cover-back-actual":						setof(collection("Job Template","cover-back")),
	"job-cover-front-actual":						setof(collection("Job Template","cover-front")),
	"job-detailed-status-messages":					setof(text),
	"job-document-access-errors":					setof(text),
	"job-error-sheet-actual":						setof(collection("Job Template","job-error-sheet")),
	"job-finishings-actual":						setof(enumeration),
	"job-finishings-col-actual":					setof(collection("Job Template","media-col")),
	"job-hold-until-actual":						setof(_(keyword, name)),
	"job-id":										integer(1,MAX),
	"job-impressions":								integer(0,MAX),
	"job-impressions-completed":					integer(0,MAX),
	"job-k-octets":									integer(0,MAX),
	"job-k-octets-processed":						integer(0,MAX),
	"job-mandatory-attributes":						setof(keyword),
	"job-media-sheets":								integer(0,MAX),
	"job-media-sheets-completed":					integer(0,MAX),
	"job-message-from-operator":					text(127),
	"job-message-to-operator-actual":				setof(text),
	"job-more-info":								uri,
	"job-name":										name,
	"job-originating-user-name":					name,
	"job-originating-user-uri":						uri,
	"job-pages":									integer(0,MAX),
	"job-pages-completed":							integer(0,MAX),
	"job-pages-completed-current-copy":				integer(0,MAX),
	"job-printer-up-time":							integer(1,MAX),
	"job-printer-uri":								uri,
	"job-priority-actual":							setof(integer(1,100)),
	"job-save-printer-make-and-model":				text(127),
	"job-sheet-message-actual":						setof(text),
	"job-sheets-actual":							setof(_(keyword, name)),
	"job-sheets-col-actual":						setof(collection("Job Template","job-sheets-col")),
	"job-state":									_(enumeration, unknown),
	"job-state-message":							text,
	"job-state-reasons":							setof(keyword),
	"job-uri":										uri,
	"job-uuid":										uri(45),
	"media-actual":									setof(_(keyword, name)),
	"media-col-actual":								setof(collection("Job Template","media-col")),
	"media-input-tray-check-actual":				setof(_(keyword, name)),
	"multiple-document-handling-actual":			setof(keyword),
	"number-of-documents":							integer(0,MAX),
	"number-of-intervening-jobs":					integer(0,MAX),
	"number-up-actual":								setof(integer(1,MAX)),
	"orientation-requested-actual":					setof(enumeration),
	"original-requesting-user-name":				name,
	"output-bin-actual":							setof(_(keyword, name)),
	"output-device-actual":							setof(name(127)),
	"output-device-assigned":						name(127),
	"overrides-actual":								setof(collection("Job Template","overrides")),
	"page-delivery-actual":							setof(keyword),
	"page-order-received-actual":					setof(keyword),
	"page-ranges-actual":							setof(rangeOfInteger(1,MAX)),
	"presentation-direction-number-up-actual":		setof(keyword),
	"print-content-optimize-actual":				setof(keyword),
	"print-quality-actual":							setof(enumeration),
	"printer-resolution-actual":					setof(resolution),
	"separator-sheets-actual":						setof(collection("Job Template", "separator-sheets")),
	"sheet-collate-actual":							setof(keyword),
	"sheet-completed-copy-number":					integer(0,MAX),
	"sheet-completed-document-number":				integer(0,MAX),
	"sides-actual":									setof(keyword),
	"time-at-completed":							_(integer, novalue),
	"time-at-creation":								integer,
	"time-at-processing":							_(integer, novalue),
	"warnings-count":								integer(0,MAX),
	"x-image-position-actual":						setof(keyword),
	"x-image-shift-actual":							setof(integer),
	"x-side1-image-shift-actual":					setof(integer),
	"x-side2-image-shift-actual":					setof(integer),
	"y-image-position-actual":						setof(keyword),
	"y-image-shift-actual":							setof(integer),
	"y-side1-image-shift-actual":					setof(integer),
	"y-side2-image-shift-actual":					setof(integer)
};
attributes["Job Template"] = {
	"copies":										integer(1,MAX),
	"cover-back":									collection({
		"cover-type":								keyword,
		"media":									_(keyword, name),
		"media-col":								collection("Job Template","media-col")
	}),
	"cover-front":									collection({
		"cover-type":								keyword,
		"media":									_(keyword, name),
		"media-col":								collection("Job Template","media-col")
	}),
	"feed-orientation":								keyword,
	"finishings":									setof(enumeration),
	"finishings-col":								collection({
		"finishing-template":						name,
		"stitching":								collection({
			"stitching-locations":					setof(integer(0,MAX)),
			"stitching-offset":						integer(0,MAX),
			"stitching-reference-edge":				keyword
		})
	}),
	"font-name-requested":							name,
	"font-size-requested":							integer(1,MAX),
	"force-front-side":								setof(integer(1,MAX)),
	"imposition-template":							_(keyword, name),
	"insert-sheet":									setof(collection({
		"insert-after-page-number":					integer(0,MAX),
		"insert-count":								integer(0,MAX),
		"media":									_(keyword, name),
		"media-col":								collection("Job Template","media-col")
	})),
	"job-account-id":								name,
	"job-accounting-sheets":						collection({
		"job-accounting-output-bin":				_(keyword, name),
		"job-accounting-sheets-type":				_(keyword, name),
		"media":									_(keyword, name),
		"media-col":								collection("Job Template","media-col")
	}),
	"job-accounting-user-id":						name,
	"job-copies":									integer(1,MAX),
	"job-cover-back":								collection("Job Template","cover-back"),
	"job-cover-front":								collection("Job Template","cover-front"),
	"job-delay-output-until":						_(keyword, name),
	"job-delay-output-until-time":					dateTime,
	"job-error-action":								keyword,
	"job-error-sheet":								collection({
		"job-error-sheet-type":						_(keyword, name),
		"job-error-sheet-when":						keyword,
		"media":									_(keyword, name),
		"media-col":								collection("Job Template","media-col")
	}),
	"job-finishings":								setof(enumeration),
	"job-finishings-col":							collection("Job Template","finishings-col"),
	"job-hold-until":								_(keyword, name),
	"job-hold-until-time":							dateTime,
	"job-message-to-operator":						text,
	"job-phone-number":								uri,
	"job-priority":									integer(1,100),
	"job-recipient-name":							name,
	"job-save-disposition":							collection({
		"save-disposition":							keyword,
		"save-info":							    setof(collection({
			"save-document-format":					mimeMediaType,
			"save-location":						uri,
			"save-name":							name
		}))
	}),
	"job-sheet-message":							text,
	"job-sheets":									_(keyword, name),
	"job-sheets-col":								collection({
		"job-sheets":								_(keyword,name),
		"media":									_(keyword,name),
		"media-col":								collection("Job Template","media-col")
	}),
	"media":                                        _(keyword,name),
	"media-col":									collection({
		"media-back-coating":						_(keyword,name),
		"media-bottom-margin":						integer(0,MAX),
		"media-color":								_(keyword,name),
		"media-front-coating":						_(keyword,name),
		"media-grain":								_(keyword,name),
		"media-hole-count":							integer(0,MAX),
		"media-info":								text(255),
		"media-key":								_(keyword,name),
		"media-left-margin":						integer(0,MAX),
		"media-order-count":						integer(1,MAX),
		"media-pre-printed":						_(keyword,name),
		"media-recycled":							_(keyword,name),
		"media-right-margin":						integer(0,MAX),
		"media-size":								collection({
      "x-dimension":								integer(0,MAX),
      "y-dimension":								integer(0,MAX),
		}),
		"media-size-name":							_(keyword,name),
		"media-source":								_(keyword,name),
		"media-thickness":							integer(1,MAX),
		"media-tooth":								_(keyword,name),
		"media-top-margin":							integer(0,MAX),
		"media-type":								_(keyword,name),
		"media-weight-metric":						integer(0,MAX)
	}),
	"media-input-tray-check":						_(keyword, name),
	"multiple-document-handling":					keyword,
	"number-up":									integer(1,MAX),
	"orientation-requested":						enumeration,
	"output-bin":									_(keyword, name),
	"output-device":								name(127),
	"overrides":									setof(collection({
		//Any Job Template attribute (TODO)
		"document-copies":							setof(rangeOfInteger),
		"document-numbers":							setof(rangeOfInteger),
		"pages":									setof(rangeOfInteger)
	})),
	"page-delivery":								keyword,
	"page-order-received":							keyword,
	"page-ranges":									setof(rangeOfInteger(1,MAX)),
	"pages-per-subset":								setof(integer(1,MAX)),
	"pdl-init-file":								collection({
		"pdl-init-file-entry":						name,
		"pdl-init-file-location":					uri,
		"pdl-init-file-name":						name
	}),
	"presentation-direction-number-up":				keyword,
	"print-color-mode":								keyword,
	"print-content-optimize":						keyword,
	"print-quality":								enumeration,
	"print-rendering-intent":						keyword,
	"printer-resolution":							resolution,
	"proof-print":									collection({
		"media":									_(keyword, name),
		"media-col":								collection("Job Template", "media-col"),
		"proof-print-copies":						integer(0,MAX)
	}),
	"separator-sheets":								collection({
		"media":									_(keyword, name),
		"media-col":								collection("Job Template", "media-col"),
		"separator-sheets-type":					setof(keyword)
	}),
	"sheet-collate":								keyword,
	"sides":										keyword,
	"x-image-position":								keyword,
	"x-image-shift":								integer,
	"x-side1-image-shift":							integer,
	"x-side2-image-shift":							integer,
	"y-image-position":								keyword,
	"y-image-shift":								integer,
	"y-side1-image-shift":							integer,
	"y-side2-image-shift":							integer
};
attributes["Operation"] = {
	"attributes-charset":							charset,
	"attributes-natural-language":					naturalLanguage,
	"compression":									keyword,
	"detailed-status-message":						text,
	"document-access-error":						text,
	"document-charset":								charset,
	"document-digital-signature":					keyword,
	"document-format":								mimeMediaType,
	"document-format-details":						setof(collection({
		"document-format":							mimeMediaType,
		"document-format-device-id":				text(127),
		"document-format-version":					text(127),
		"document-natural-language":				setof(naturalLanguage),
		"document-source-application-name":			name,
		"document-source-application-version":		text(127),
		"document-source-os-name":					name(40),
		"document-source-os-version":				text(40)
	})),
	"document-message":								text,
	"document-metadata":							setof(octetString),
	"document-name":								name,
	"document-natural-language":					naturalLanguage,
	"document-password":							octetString,
	"document-uri":									uri,
	"first-index":									integer(1,MAX),
	"identify-actions":								setof(keyword),
	"ipp-attribute-fidelity":						boolean,
	"job-hold-until":								_(keyword, name),
	"job-id":										integer(1,MAX),
	"job-ids":										setof(integer(1,MAX)),
	"job-impressions":								integer(0,MAX),
	"job-k-octets":									integer(0,MAX),
	"job-mandatory-attributes":						setof(keyword),
	"job-media-sheets":								integer(0,MAX),
	"job-message-from-operator":					text(127),
	"job-name":										name,
	"job-password":									octetString(255),
	"job-password-encryption":						_(keyword, name),
	"job-state":									enumeration,
	"job-state-message":							text,
	"job-state-reasons":							setof(keyword),
	"job-uri":										uri,
	"last-document":								boolean,
	"limit":										integer(1,MAX),
	"message":										text(127),
	"my-jobs":										boolean,
	"original-requesting-user-name":				name,
	"preferred-attributes":							collection,
	"printer-message-from-operator":				text(127),
	"printer-uri":									uri,
	"requested-attributes":							setof(keyword),
	"requesting-user-name":							name,
	"requesting-user-uri":							uri,
	"status-message":								text(255),
	"which-jobs":									keyword
};
attributes["Printer Description"] = {
	"charset-configured":							charset,
	"charset-supported":							setof(charset),
	"color-supported":								boolean,
	"compression-supported":						setof(keyword),
	"copies-default":								integer(1,MAX),
	"copies-supported":								rangeOfInteger(1,MAX),
	"cover-back-default":							collection("Job Template","cover-back"),
	"cover-back-supported":							setof(keyword),
	"cover-front-default":							collection("Job Template","cover-front"),
	"cover-front-supported":						setof(keyword),
	"device-service-count":							integer(1,MAX),
	"device-uuid":									uri(45),
	"document-charset-default":						charset,
	"document-charset-supported":					setof(charset),
	"document-creation-attributes-supported":		setof(keyword),
	"document-digital-signature-default":			keyword,
	"document-digital-signature-supported":			setof(keyword),
	"document-format-default":						mimeMediaType,
	"document-format-details-default":				collection("Operation","document-format-details"),
	"document-format-details-supported":			setof(keyword),
	"document-format-supported":					setof(mimeMediaType),
	"document-format-varying-attributes":			setof(keyword),
	"document-format-version-default":				text(127),
	"document-format-version-supported":			setof(text(127)),
	"document-natural-language-default":			naturalLanguage,
	"document-natural-language-supported":			setof(naturalLanguage),
	"document-password-supported":					integer(0,1023),
	"feed-orientation-default":						keyword,
	"feed-orientation-supported":					keyword,
	"finishings-col-default":						collection("Job Template","finishings-col"),
	"finishings-col-ready":							setof(collection("Job Template","finishings-col")),
	"finishings-col-supported":						setof(keyword),
	"finishings-default":							setof(enumeration),
	"finishings-ready":								setof(enumeration),
	"finishings-supported":							setof(enumeration),
	"font-name-requested-default":					name,
	"font-name-requested-supported":				setof(name),
	"font-size-requested-default":					integer(1,MAX),
	"font-size-requested-supported":				setof(rangeOfInteger(1,MAX)),
	"force-front-side-default (under review)":		setof(integer(1,MAX)),
	"force-front-side-supported (under review)":	rangeOfInteger(1,MAX),
	"generated-natural-language-supported":			setof(naturalLanguage),
	"identify-actions-default":						setof(keyword),
	"identify-actions-supported":					setof(keyword),
	"imposition-template-default":					_(keyword, name),
	"imposition-template-supported":				setof(_(keyword, name)),
	"insert-after-page-number-supported":			rangeOfInteger(0,MAX),
	"insert-count-supported":						rangeOfInteger(0,MAX),
	"insert-sheet-default":							setof(collection("Job Template","insert-sheet")),
	"insert-sheet-supported":						setof(keyword),
	"ipp-features-supported":						setof(keyword),
	"ipp-versions-supported":						setof(keyword),
	"ippget-event-life":							integer(15,MAX),
	"job-account-id-default":						_(name, novalue),
	"job-account-id-supported":						boolean,
	"job-accounting-sheets-default":				_(collection("Job Template", "job-accounting-sheets"), novalue),
	"job-accounting-sheets-supported":				setof(keyword),
	"job-accounting-user-id-default":				_(name, novalue),
	"job-accounting-user-id-supported":				boolean,
	"job-constraints-supported":					setof(collection),
	"job-copies-default":							integer(1,MAX),
	"job-copies-supported":							rangeOfInteger(1,MAX),
	"job-cover-back-default":						collection("Job Template","cover-back"),
	"job-cover-back-supported":						setof(keyword),
	"job-cover-front-default":						collection("Job Template","cover-front"),
	"job-cover-front-supported":					setof(keyword),
	"job-creation-attributes-supported":			setof(keyword),
	"job-delay-output-until-default":				_(keyword, name),
	"job-delay-output-until-supported":				setof(_(keyword, name)),
	"job-delay-output-until-time-supported":		rangeOfInteger(0,MAX),
	"job-error-action-default":						keyword,
	"job-error-action-supported":					setof(keyword),
	"job-error-sheet-default":						_(collection("Job Template", "job-error-sheet"), novalue),
	"job-error-sheet-supported":					setof(keyword),
	"job-finishings-col-default":					collection("Job Template","finishings-col"),
	"job-finishings-col-ready":						setof(collection("Job Template","finishings-col")),
	"job-finishings-col-supported":					setof(keyword),
	"job-finishings-default":						setof(enumeration),
	"job-finishings-ready":							setof(enumeration),
	"job-finishings-supported":						setof(enumeration),
	"job-hold-until-default":						_(keyword, name),
	"job-hold-until-supported":						setof(_(keyword, name)),
	"job-hold-until-time-supported":				rangeOfInteger(0,MAX),
	"job-ids-supported":							boolean,
	"job-impressions-supported":					rangeOfInteger(0,MAX),
	"job-k-octets-supported":						rangeOfInteger(0,MAX),
	"job-media-sheets-supported":					rangeOfInteger(0,MAX),
	"job-message-to-operator-default":				text,
	"job-message-to-operator-supported":			boolean,
	"job-password-encryption-supported":			setof(_(keyword, name)),
	"job-password-supported":						integer(0,255),
	"job-phone-number-default":						_(uri, novalue),
	"job-phone-number-supported":					boolean,
	"job-priority-default":							integer(1,100),
	"job-priority-supported":						integer(1,100),
	"job-recipient-name-default":					_(name, novalue),
	"job-recipient-name-supported":					boolean,
	"job-resolvers-supported":						setof(collection({
		"resolver-name":							name
	})),
	"job-settable-attributes-supported":			setof(keyword),
	"job-sheet-message-default":					text,
	"job-sheet-message-supported":					boolean,
	"job-sheets-col-default":						collection("Job Template","job-sheets-col"),
	"job-sheets-col-supported":						setof(keyword),
	"job-sheets-default":							_(keyword, name),
	"job-sheets-supported":							setof(_(keyword, name)),
	"job-spooling-supported":						keyword,
	"max-save-info-supported":						integer(1,MAX),
	"max-stitching-locations-supported":			integer(1,MAX),
	"media-back-coating-supported":					setof(_(keyword, name)),
	"media-bottom-margin-supported":				setof(integer(0,MAX)),
	"media-col-database":							setof(collection({
		//TODO: Member attributes are the same as the "media-col" Job Template attribute
		"media-source-properties":					collection({
			"media-source-feed-direction":			keyword,
			"media-source-feed-orientation":		enumeration
		})
	})),
	"media-col-default":							collection("Job Template","media-col"),
	"media-col-ready":								setof(collection({
		//TODO: Member attributes are the same as the "media-col" Job Template attribute
		"media-source-properties":					collection({
			"media-source-feed-direction":			keyword,
			"media-source-feed-orientation":		enumeration
		})
	})),
	"media-col-supported":							setof(keyword),
	"media-color-supported":						setof(_(keyword, name)),
	"media-default":								_(keyword, name, novalue),
	"media-front-coating-supported":				setof(_(keyword, name)),
	"media-grain-supported":						setof(_(keyword, name)),
	"media-hole-count-supported":					setof(rangeOfInteger(0,MAX)),
	"media-info-supported":							boolean,
	"media-input-tray-check-default":				_(keyword, name, novalue),
	"media-input-tray-check-supported":				setof(_(keyword, name)),
	"media-key-supported":							setof(_(keyword, name)),
	"media-left-margin-supported":					setof(integer(0,MAX)),
	"media-order-count-supported":					setof(rangeOfInteger(1,MAX)),
	"media-pre-printed-supported":					setof(_(keyword, name)),
	"media-ready":									setof(_(keyword, name)),
	"media-recycled-supported":						setof(_(keyword, name)),
	"media-right-margin-supported":					setof(integer(0,MAX)),
	"media-size-supported":							setof(collection({
		"x-dimension":								_(integer(1,MAX),rangeOfInteger(1,MAX)),
		"y-dimension":								_(integer(1,MAX),rangeOfInteger(1,MAX))
	})),
	"media-source-supported":						setof(_(keyword, name)),
	"media-supported":								setof(_(keyword, name)),
	"media-thickness-supported":					rangeOfInteger(1,MAX),
	"media-tooth-supported":						setof(_(keyword, name)),
	"media-top-margin-supported":					setof(integer(0,MAX)),
	"media-type-supported":							setof(_(keyword, name)),
	"media-weight-metric-supported":				setof(rangeOfInteger(0,MAX)),
	"multiple-document-handling-default":			keyword,
	"multiple-document-handling-supported":			setof(keyword),
	"multiple-document-jobs-supported":				boolean,
	"multiple-operation-time-out":					integer(1,MAX),
	"multiple-operation-timeout-action":			keyword,
	"natural-language-configured":					naturalLanguage,
	"number-up-default":							integer(1,MAX),
	"number-up-supported":							_(integer(1,MAX), rangeOfInteger(1,MAX)),
	"operations-supported":							setof(enumeration),
	"orientation-requested-default":				_(novalue, enumeration),
	"orientation-requested-supported":				setof(enumeration),
	"output-bin-default":							_(keyword, name),
	"output-bin-supported":							setof(_(keyword, name)),
	"output-device-supported":						setof(name(127)),
	"overrides-supported":							setof(keyword),
	"page-delivery-default":						keyword,
	"page-delivery-supported":						setof(keyword),
	"page-order-received-default":					keyword,
	"page-order-received-supported":				setof(keyword),
	"page-ranges-supported":						boolean,
	"pages-per-minute":								integer(0,MAX),
	"pages-per-minute-color":						integer(0,MAX),
	"pages-per-subset-supported":					boolean,
	"parent-printers-supported":					setof(uri),
	"pdl-init-file-default":						_(collection("Job Template","pdl-init-file"), novalue),
	"pdl-init-file-entry-supported":				setof(name),
	"pdl-init-file-location-supported":				setof(uri),
	"pdl-init-file-name-subdirectory-supported":	boolean,
	"pdl-init-file-name-supported":					setof(name),
	"pdl-init-file-supported":						setof(keyword),
	"pdl-override-supported":						keyword,
	"preferred-attributes-supported":				boolean,
	"presentation-direction-number-up-default":		keyword,
	"presentation-direction-number-up-supported":	setof(keyword),
	"print-color-mode-default":						keyword,
	"print-color-mode-supported":					setof(keyword),
	"print-content-optimize-default":				keyword,
	"print-content-optimize-supported":				setof(keyword),
	"print-quality-default":						enumeration,
	"print-quality-supported":						setof(enumeration),
	"print-rendering-intent-default":				keyword,
	"print-rendering-intent-supported":				setof(keyword),
	"printer-alert":								setof(octetString),
	"printer-alert-description":					setof(text),
	"printer-charge-info":							text,
	"printer-charge-info-uri":						uri,
	"printer-current-time":							dateTime,
	"printer-detailed-status-messages":				setof(text),
	"printer-device-id":							text(1023),
	"printer-driver-installer":						uri,
	"printer-geo-location":							uri,
	"printer-get-attributes-supported":				setof(keyword),
	"printer-icc-profiles":							setof(collection({
		"xri-authentication":						name,
		"profile-url":								uri
	})),
	"printer-icons":								setof(uri),
	"printer-info":									text(127),
	"printer-is-accepting-jobs":					boolean,
	"printer-location":								text(127),
	"printer-make-and-model":						text(127),
	"printer-mandatory-job-attributes":				setof(keyword),
	"printer-message-date-time":					dateTime,
	"printer-message-from-operator":				text(127),
	"printer-message-time":							integer,
	"printer-more-info":							uri,
	"printer-more-info-manufacturer":				uri,
	"printer-name":									name(127),
	"printer-organization":							setof(text),
	"printer-organizational-unit":					setof(text),
	"printer-resolution-default":					resolution,
	"printer-resolution-supported":					resolution,
	"printer-settable-attributes-supported":		setof(keyword),
	"printer-state":								enumeration,
	"printer-state-change-date-time":				dateTime,
	"printer-state-change-time":					integer(1,MAX),
	"printer-state-message":						text,
	"printer-state-reasons":						setof(keyword),
	"printer-supply":								setof(octetString),
	"printer-supply-description":					setof(text),
	"printer-supply-info-uri":						uri,
	"printer-up-time":								integer(1,MAX),
	"printer-uri-supported":						setof(uri),
	"printer-uuid":									uri(45),
	"printer-xri-supported":						setof(collection({
		"xri-authentication":						keyword,
		"xri-security":								keyword,
		"xri-uri":									uri
	})),
	"proof-print-default":							_(collection("Job Template", "proof-print"), novalue),
	"proof-print-supported":						setof(keyword),
	"pwg-raster-document-resolution-supported":		setof(resolution),
	"pwg-raster-document-sheet-back":				keyword,
	"pwg-raster-document-type-supported":			setof(keyword),
	"queued-job-count":								integer(0,MAX),
	"reference-uri-schemes-supported":				setof(uriScheme),
	"repertoire-supported":							setof(_(keyword, name)),
	"requesting-user-uri-supported":				boolean,
	"save-disposition-supported":					setof(keyword),
	"save-document-format-default":					mimeMediaType,
	"save-document-format-supported":				setof(mimeMediaType),
	"save-location-default":						uri,
	"save-location-supported":						setof(uri),
	"save-name-subdirectory-supported":				boolean,
	"save-name-supported":							boolean,
	"separator-sheets-default":						collection("Job Template","separator-sheets"),
	"separator-sheets-supported":					setof(keyword),
	"sheet-collate-default":						keyword,
	"sheet-collate-supported":						setof(keyword),
	"sides-default":								keyword,
	"sides-supported":								setof(keyword),
	"stitching-locations-supported":				setof(_(integer(0,MAX), rangeOfInteger(0,MAX))),
	"stitching-offset-supported":					setof(_(integer(0,MAX), rangeOfInteger(0,MAX))),
	"subordinate-printers-supported":				setof(uri),
	"uri-authentication-supported":					setof(keyword),
	"uri-security-supported":						setof(keyword),
	"user-defined-values-supported":				setof(keyword),
	"which-jobs-supported":							setof(keyword),
	"x-image-position-default":						keyword,
	"x-image-position-supported":					setof(keyword),
	"x-image-shift-default":						integer,
	"x-image-shift-supported":						rangeOfInteger,
	"x-side1-image-shift-default":					integer,
	"x-side1-image-shift-supported":				rangeOfInteger,
	"x-side2-image-shift-default":					integer,
	"x-side2-image-shift-supported":				rangeOfInteger,
	"xri-authentication-supported":					setof(keyword),
	"xri-security-supported":						setof(keyword),
	"xri-uri-scheme-supported":						setof(uriScheme),
	"y-image-position-default":						keyword,
	"y-image-position-supported":					setof(keyword),
	"y-image-shift-default":						integer,
	"y-image-shift-supported":						rangeOfInteger,
	"y-side1-image-shift-default":					integer,
	"y-side1-image-shift-supported":				rangeOfInteger,
	"y-side2-image-shift-default":					integer,
	"y-side2-image-shift-supported":				rangeOfInteger
};
attributes["Subscription Description"] = {
	"notify-job-id":								integer(1,MAX),
	"notify-lease-expiration-time":					integer(0,MAX),
	"notify-printer-up-time":						integer(1,MAX),
	"notify-printer-uri":							uri,
	"notify-sequence-number":						integer(0,MAX),
	"notify-subscriber-user-name":					name,
	"notify-subscriber-user-uri":					uri,
	"notify-subscription-id":						integer(1,MAX),
	"subscription-uuid":							uri
};
attributes["Subscription Template"] = {
	"notify-attributes":							setof(keyword),
	"notify-attributes-supported":					setof(keyword),
	"notify-charset":								charset,
	"notify-events":								setof(keyword),
	"notify-events-default":						setof(keyword),
	"notify-events-supported":						setof(keyword),
	"notify-lease-duration":						integer(0,67108863),
	"notify-lease-duration-default":				integer(0,67108863),
	"notify-lease-duration-supported":				setof(_(integer(0, 67108863), rangeOfInteger(0, 67108863))),
	"notify-max-events-supported":					integer(2,MAX),
	"notify-natural-language":						naturalLanguage,
	"notify-pull-method":							keyword,
	"notify-pull-method-supported":					setof(keyword),
	"notify-recipient-uri":							uri,
	"notify-schemes-supported":						setof(uriScheme),
	"notify-time-interval":							integer(0,MAX),
	"notify-user-data":								octetString(63)
}

//convert all the syntactical sugar to an object tree
function resolve(obj){
	if(obj.type) return obj;
	Object.keys(obj).forEach(function(name){
		var item = obj[name];
		if(typeof item === "function")
			obj[name] = item();
		else if(typeof item === "object" && !item.type)
			obj[name] = resolve(item);
	});
	return obj;
}
resolve(attributes);

module.exports = attributes;
//console.log("var x = ",JSON.stringify(attributes, null, '\t'));

},{"./tags":14}],6:[function(require,module,exports){

var xref = require('./ipputil').xref;
var enums = {
	"document-state": xref([			// ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
		,,,				// 0x00-0x02
		"pending",		// 0x03
		,				// 0x04
		"processing",	// 0x05
		,				// 0x06
		"canceled",		// 0x07
		"aborted",		// 0x08
		"completed"		// 0x09
	]),
	"finishings": xref([
		,,,// 0x00 - 0x02
		"none",						// 0x03 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"staple",					// 0x04 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"punch",					// 0x05 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"cover",					// 0x06 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"bind",						// 0x07 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"saddle-stitch",			// 0x08 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"edge-stitch",				// 0x09 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"fold",						// 0x0A http://tools.ietf.org/html/rfc2911#section-4.2.6
		"trim",						// 0x0B ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
		"bale",						// 0x0C ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
		"booklet-maker",			// 0x0D ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
		"jog-offset",				// 0x0E ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
		,,,,,						// 0x0F - 0x13 reserved for future generic finishing enum values.
		"staple-top-left",			// 0x14 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"staple-bottom-left",		// 0x15 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"staple-top-right",			// 0x16 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"staple-bottom-right",		// 0x17 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"edge-stitch-left",			// 0x18 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"edge-stitch-top",			// 0x19 http://tools.ietf.org/html/rfc2911#section-4.2.6
		"edge-stitch-right",		// 0x1A http://tools.ietf.org/html/rfc2911#section-4.2.6
		"edge-stitch-bottom",		// 0x1B http://tools.ietf.org/html/rfc2911#section-4.2.6
		"staple-dual-left",			// 0x1C http://tools.ietf.org/html/rfc2911#section-4.2.6
		"staple-dual-top",			// 0x1D http://tools.ietf.org/html/rfc2911#section-4.2.6
		"staple-dual-right",		// 0x1E http://tools.ietf.org/html/rfc2911#section-4.2.6
		"staple-dual-bottom",		// 0x1F http://tools.ietf.org/html/rfc2911#section-4.2.6
		,,,,,,,,,,,,,,,,,,			// 0x20 - 0x31 reserved for future specific stapling and stitching enum values.
		"bind-left",				// 0x32 ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
		"bind-top",					// 0x33 ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
		"bind-right",				// 0x34 ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
		"bind-bottom",				// 0x35 ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
		,,,,,,						// 0x36 - 0x3B
		"trim-after-pages",			// 0x3C ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf (IPP Everywhere)
		"trim-after-documents",		// 0x3D ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf (IPP Everywhere)
		"trim-after-copies",		// 0x3E ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf (IPP Everywhere)
		"trim-after-job"			// 0x3F ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf (IPP Everywhere)
	]),
	"operations-supported": xref([
		,									// 0x00
		,									// 0x01
		"Print-Job",						// 0x02 http://tools.ietf.org/html/rfc2911#section-3.2.1
		"Print-URI",						// 0x03 http://tools.ietf.org/html/rfc2911#section-3.2.2
		"Validate-Job",						// 0x04 http://tools.ietf.org/html/rfc2911#section-3.2.3
		"Create-Job",						// 0x05 http://tools.ietf.org/html/rfc2911#section-3.2.4
		"Send-Document",					// 0x06 http://tools.ietf.org/html/rfc2911#section-3.3.1
		"Send-URI",							// 0x07 http://tools.ietf.org/html/rfc2911#section-3.3.2
		"Cancel-Job",						// 0x08 http://tools.ietf.org/html/rfc2911#section-3.3.3
		"Get-Job-Attributes",				// 0x09 http://tools.ietf.org/html/rfc2911#section-3.3.4
		"Get-Jobs",							// 0x0A http://tools.ietf.org/html/rfc2911#section-3.2.6
		"Get-Printer-Attributes",			// 0x0B http://tools.ietf.org/html/rfc2911#section-3.2.5
		"Hold-Job",							// 0x0C http://tools.ietf.org/html/rfc2911#section-3.3.5
		"Release-Job",						// 0x0D http://tools.ietf.org/html/rfc2911#section-3.3.6
		"Restart-Job",						// 0x0E http://tools.ietf.org/html/rfc2911#section-3.3.7
		,									// 0x0F
		"Pause-Printer",					// 0x10 http://tools.ietf.org/html/rfc2911#section-3.2.7
		"Resume-Printer",					// 0x11 http://tools.ietf.org/html/rfc2911#section-3.2.8
		"Purge-Jobs",						// 0x12 http://tools.ietf.org/html/rfc2911#section-3.2.9
		"Set-Printer-Attributes",			// 0x13 IPP2.1 http://tools.ietf.org/html/rfc3380#section-4.1
		"Set-Job-Attributes",				// 0x14 IPP2.1 http://tools.ietf.org/html/rfc3380#section-4.2
		"Get-Printer-Supported-Values",		// 0x15 IPP2.1 http://tools.ietf.org/html/rfc3380#section-4.3
		"Create-Printer-Subscriptions",		// 0x16 IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.1.2
		"Create-Job-Subscription",			// 0x17 IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.1.1
		"Get-Subscription-Attributes",		// 0x18 IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.2.4
		"Get-Subscriptions",				// 0x19 IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.2.5
		"Renew-Subscription",				// 0x1A IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.2.6
		"Cancel-Subscription",				// 0x1B IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.2.7
		"Get-Notifications",				// 0x1C IPP2.1 IPP2.1 http://tools.ietf.org/html/rfc3996#section-9.2 && http://tools.ietf.org/html/rfc3996#section-5
		"ipp-indp-method",					// 0x1D did not get standardized
		"Get-Resource-Attributes",			// 0x1E http://tools.ietf.org/html/draft-ietf-ipp-get-resource-00#section-4.1 did not get standardized
		"Get-Resource-Data",				// 0x1F http://tools.ietf.org/html/draft-ietf-ipp-get-resource-00#section-4.2 did not get standardized
		"Get-Resources",					// 0x20 http://tools.ietf.org/html/draft-ietf-ipp-get-resource-00#section-4.3 did not get standardized
		"ipp-install",						// 0x21 did not get standardized
		"Enable-Printer",					// 0x22 http://tools.ietf.org/html/rfc3998#section-3.1.1
		"Disable-Printer",					// 0x23 http://tools.ietf.org/html/rfc3998#section-3.1.2
		"Pause-Printer-After-Current-Job",	// 0x24 http://tools.ietf.org/html/rfc3998#section-3.2.1
		"Hold-New-Jobs",					// 0x25 http://tools.ietf.org/html/rfc3998#section-3.3.1
		"Release-Held-New-Jobs",			// 0x26 http://tools.ietf.org/html/rfc3998#section-3.3.2
		"Deactivate-Printer",				// 0x27 http://tools.ietf.org/html/rfc3998#section-3.4.1
		"Activate-Printer",					// 0x28 http://tools.ietf.org/html/rfc3998#section-3.4.2
		"Restart-Printer",					// 0x29 http://tools.ietf.org/html/rfc3998#section-3.5.1
		"Shutdown-Printer",					// 0x2A http://tools.ietf.org/html/rfc3998#section-3.5.2
		"Startup-Printer",					// 0x2B http://tools.ietf.org/html/rfc3998#section-3.5.3
		"Reprocess-Job",					// 0x2C http://tools.ietf.org/html/rfc3998#section-4.1
		"Cancel-Current-Job",				// 0x2D http://tools.ietf.org/html/rfc3998#section-4.2
		"Suspend-Current-Job",				// 0x2E http://tools.ietf.org/html/rfc3998#section-4.3.1
		"Resume-Job",						// 0x2F http://tools.ietf.org/html/rfc3998#section-4.3.2
		"Promote-Job",						// 0x30 http://tools.ietf.org/html/rfc3998#section-4.4.1
		"Schedule-Job-After",				// 0x31 http://tools.ietf.org/html/rfc3998#section-4.4.2
		,									// 0x32
		"Cancel-Document",					// 0x33 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
		"Get-Document-Attributes",			// 0x34 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
		"Get-Documents",					// 0x35 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
		"Delete-Document",					// 0x36 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
		"Set-Document-Attributes",			// 0x37 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
		"Cancel-Jobs",						// 0x38 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext10-20101030-5100.11.pdf
		"Cancel-My-Jobs",					// 0x39 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext10-20101030-5100.11.pdf
		"Resubmit-Job",						// 0x3A ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext10-20101030-5100.11.pdf
		"Close-Job",						// 0x3B ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext10-20101030-5100.11.pdf
		"Identify-Printer",					// 0x3C ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf
		"Validate-Document"					// 0x3D ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf
	]),
	"job-collation-type": xref([	// IPP2.1 http://tools.ietf.org/html/rfc3381#section-6.3
		"other",				// 0x01
		"unknown",				// 0x02
		"uncollated-documents",	// 0x03
		'collated-documents',	// 0x04
		'uncollated-documents'	// 0x05
	]),
	"job-state": xref([			//http://tools.ietf.org/html/rfc2911#section-4.3.7
		,,,						// 0x00-0x02
		"pending",				// 0x03
		"pending-held",			// 0x04
		"processing",			// 0x05
		"processing-stopped",	// 0x06
		"canceled",				// 0x07
		"aborted",				// 0x08
		"completed"				// 0x09
	]),
	"orientation-requested": xref([// http://tools.ietf.org/html/rfc2911#section-4.2.10
		,,,						// 0x00-0x02
		"portrait",				// 0x03
		"landscape",			// 0x04
		"reverse-landscape",	// 0x05
		"reverse-portrait",		// 0x06
		"none"					// 0x07 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf
	]),
	"print-quality": xref([		// http://tools.ietf.org/html/rfc2911#section-4.2.13
		,,,						// 0x00-0x02
		"draft",				// 0x03
		"normal",				// 0x04
		"high"					// 0x05
	]),
	"printer-state": xref([		// http://tools.ietf.org/html/rfc2911#section-4.4.11
		,,,						// 0x00-0x02
		"idle",					// 0x03
		"processing",			// 0x04
		"stopped"				// 0x05
	])
};
enums["finishings-default"] = enums.finishings;
enums["finishings-ready"] = enums.finishings;
enums["finishings-supported"] = enums.finishings;
enums["media-source-feed-orientation"] = enums["orientation-requested"];
enums["orientation-requested-default"] = enums["orientation-requested"];
enums["orientation-requested-supported"] = enums["orientation-requested"];//1setOf
enums["print-quality-default"] = enums["print-quality"];
enums["print-quality-supported"] = enums["print-quality"];//1setOf



module.exports = enums;
},{"./ipputil":7}],7:[function(require,module,exports){


//  To serialize and deserialize, we need to be able to look
//  things up by key or by value. This little helper just
//  converts the arrays to objects and tacks on a 'lookup' property.
function xref(arr){
	var obj = {};
	arr.forEach(function(item, index){
		obj[item] = index;
	});
	obj.lookup = arr;
	return obj;
}

exports.xref = xref;

exports.extend  = function extend(destination, source) {
	for(var property in source) {
		if (source[property] && source[property].constructor === Object) {
			destination[property] = destination[property] || {};
			extend(destination[property], source[property]);
		}
		else {
			destination[property] = source[property];
		}
	}
	return destination;
};

},{}],8:[function(require,module,exports){

var attributes = require('./attributes');

//the only possible values for the keyword
function keyword(arr){
	arr = arr.slice(0);
	arr.type = "keyword";
	return arr;
}
//some values for the keyword- but can include other 'name's
function keyword_name(arr){
	arr = arr.slice(0);
	arr.type = "keyword | name";
	return arr;
}
//a keyword, name, or empty value
function keyword_name_novalue(arr){
	arr = arr.slice(0);
	arr.type = "keyword | name | no-value";
	return arr;
}
//a keyword that groups another keyword's values together
function setof_keyword(arr){
	arr = arr.slice(0);
	arr.type = "1setOf keyword";
	return arr;
}
//a keyword that groups [another keyword's values] or [names] together
function setof_keyword_name(arr){
	arr = arr.slice(0);
	arr.type = "1setOf keyword | name";
	return arr;
}

//media is different from the others because it has sub-groups
var media = {
	"size name": [
		"a",
		"arch-a",
		"arch-b",
		"arch-c",
		"arch-d",
		"arch-e",
		"asme_f_28x40in",
		"b",
		"c",
		"choice_iso_a4_210x297mm_na_letter_8.5x11in",
		"d",
		"e",
		"executive",
		"f",
		"folio",
		"invoice",
		"iso-a0",
		"iso-a1",
		"iso-a2",
		"iso-a3",
		"iso-a4",
		"iso-a5",
		"iso-a6",
		"iso-a7",
		"iso-a8",
		"iso-a9",
		"iso-a10",
		"iso-b0",
		"iso-b1",
		"iso-b2",
		"iso-b3",
		"iso-b4",
		"iso-b5",
		"iso-b6",
		"iso-b7",
		"iso-b8",
		"iso-b9",
		"iso-b10",
		"iso-c3",
		"iso-c4",
		"iso-c5",
		"iso-c6",
		"iso-designated-long",
		"iso_2a0_1189x1682mm",
		"iso_a0_841x1189mm",
		"iso_a1_594x841mm",
		"iso_a1x3_841x1783mm",
		"iso_a1x4_841x2378mm",
		"iso_a2_420x594mm",
		"iso_a2x3_594x1261mm",
		"iso_a2x4_594x1682mm",
		"iso_a2x5_594x2102mm",
		"iso_a3-extra_322x445mm",
		"iso_a3_297x420mm",
		"iso_a0x3_1189x2523mm",
		"iso_a3x3_420x891mm",
		"iso_a3x4_420x1189mm",
		"iso_a3x5_420x1486mm",
		"iso_a3x6_420x1783mm",
		"iso_a3x7_420x2080mm",
		"iso_a4-extra_235.5x322.3mm",
		"iso_a4-tab_225x297mm",
		"iso_a4_210x297mm",
		"iso_a4x3_297x630mm",
		"iso_a4x4_297x841mm",
		"iso_a4x5_297x1051mm",
		"iso_a4x6_297x1261mm",
		"iso_a4x7_297x1471mm",
		"iso_a4x8_297x1682mm",
		"iso_a4x9_297x1892mm",
		"iso_a5-extra_174x235mm",
		"iso_a5_148x210mm",
		"iso_a6_105x148mm",
		"iso_a7_74x105mm",
		"iso_a8_52x74mm",
		"iso_a9_37x52mm",
		"iso_a10_26x37mm",
		"iso_b0_1000x1414mm",
		"iso_b1_707x1000mm",
		"iso_b2_500x707mm",
		"iso_b3_353x500mm",
		"iso_b4_250x353mm",
		"iso_b5-extra_201x276mm",
		"iso_b5_176x250mm",
		"iso_b6_125x176mm",
		"iso_b6c4_125x324mm",
		"iso_b7_88x125mm",
		"iso_b8_62x88mm",
		"iso_b9_44x62mm",
		"iso_b10_31x44mm",
		"iso_c0_917x1297mm",
		"iso_c1_648x917mm",
		"iso_c2_458x648mm",
		"iso_c3_324x458mm",
		"iso_c4_229x324mm",
		"iso_c5_162x229mm",
		"iso_c6_114x162mm",
		"iso_c6c5_114x229mm",
		"iso_c7_81x114mm",
		"iso_c7c6_81x162mm",
		"iso_c8_57x81mm",
		"iso_c9_40x57mm",
		"iso_c10_28x40mm",
		"iso_dl_110x220mm",
		"iso_ra0_860x1220mm",
		"iso_ra1_610x860mm",
		"iso_ra2_430x610mm",
		"iso_sra0_900x1280mm",
		"iso_sra1_640x900mm",
		"iso_sra2_450x640mm",
		"jis-b0",
		"jis-b1",
		"jis-b2",
		"jis-b3",
		"jis-b4",
		"jis-b5",
		"jis-b6",
		"jis-b7",
		"jis-b8",
		"jis-b9",
		"jis-b10",
		"jis_b0_1030x1456mm",
		"jis_b1_728x1030mm",
		"jis_b2_515x728mm",
		"jis_b3_364x515mm",
		"jis_b4_257x364mm",
		"jis_b5_182x257mm",
		"jis_b6_128x182mm",
		"jis_b7_91x128mm",
		"jis_b8_64x91mm",
		"jis_b9_45x64mm",
		"jis_b10_32x45mm",
		"jis_exec_216x330mm",
		"jpn_chou2_111.1x146mm",
		"jpn_chou3_120x235mm",
		"jpn_chou4_90x205mm",
		"jpn_hagaki_100x148mm",
		"jpn_kahu_240x322.1mm",
		"jpn_kaku2_240x332mm",
		"jpn_oufuku_148x200mm",
		"jpn_you4_105x235mm",
		"ledger",
		"monarch",
		"na-5x7",
		"na-6x9",
		"na-7x9",
		"na-8x10",
		"na-9x11",
		"na-9x12",
		"na-10x13",
		"na-10x14",
		"na-10x15",
		"na-legal",
		"na-letter",
		"na-number-9",
		"na-number-10",
		"na_5x7_5x7in",
		"na_6x9_6x9in",
		"na_7x9_7x9in",
		"na_9x11_9x11in",
		"na_10x11_10x11in",
		"na_10x13_10x13in",
		"na_10x14_10x14in",
		"na_10x15_10x15in",
		"na_11x12_11x12in",
		"na_11x15_11x15in",
		"na_12x19_12x19in",
		"na_a2_4.375x5.75in",
		"na_arch-a_9x12in",
		"na_arch-b_12x18in",
		"na_arch-c_18x24in",
		"na_arch-d_24x36in",
		"na_arch-e_36x48in",
		"na_b-plus_12x19.17in",
		"na_c5_6.5x9.5in",
		"na_c_17x22in",
		"na_d_22x34in",
		"na_e_34x44in",
		"na_edp_11x14in",
		"na_eur-edp_12x14in",
		"na_executive_7.25x10.5in",
		"na_f_44x68in",
		"na_fanfold-eur_8.5x12in",
		"na_fanfold-us_11x14.875in",
		"na_foolscap_8.5x13in",
		"na_govt-legal_8x13in",
		"na_govt-letter_8x10in",
		"na_index-3x5_3x5in",
		"na_index-4x6-ext_6x8in",
		"na_index-4x6_4x6in",
		"na_index-5x8_5x8in",
		"na_invoice_5.5x8.5in",
		"na_ledger_11x17in",
		"na_legal-extra_9.5x15in",
		"na_legal_8.5x14in",
		"na_letter-extra_9.5x12in",
		"na_letter-plus_8.5x12.69in",
		"na_letter_8.5x11in",
		"na_monarch_3.875x7.5in",
		"na_number-9_3.875x8.875in",
		"na_number-10_4.125x9.5in",
		"na_number-11_4.5x10.375in",
		"na_number-12_4.75x11in",
		"na_number-14_5x11.5in",
		"na_personal_3.625x6.5in",
		"na_quarto_8.5x10.83in",
		"na_super-a_8.94x14in",
		"na_super-b_13x19in",
		"na_wide-format_30x42in",
		"om_dai-pa-kai_275x395mm",
		"om_folio-sp_215x315mm",
		"om_folio_210x330mm",
		"om_invite_220x220mm",
		"om_italian_110x230mm",
		"om_juuro-ku-kai_198x275mm",
		"om_large-photo_200x300",
		"om_pa-kai_267x389mm",
		"om_postfix_114x229mm",
		"om_small-photo_100x150mm",
		"prc_1_102x165mm",
		"prc_2_102x176mm",
		"prc_3_125x176mm",
		"prc_4_110x208mm",
		"prc_5_110x220mm",
		"prc_6_120x320mm",
		"prc_7_160x230mm",
		"prc_8_120x309mm",
		"prc_10_324x458mm",
		"prc_16k_146x215mm",
		"prc_32k_97x151mm",
		"quarto",
		"roc_8k_10.75x15.5in",
		"roc_16k_7.75x10.75in",
		"super-b",
		"tabloid"
	],
	"media name": [
		"a-translucent",
		"a-transparent",
		"a-white",
		"arch-a-translucent",
		"arch-a-transparent",
		"arch-a-white",
		"arch-axsynchro-translucent",
		"arch-axsynchro-transparent",
		"arch-axsynchro-white",
		"arch-b-translucent",
		"arch-b-transparent",
		"arch-b-white",
		"arch-bxsynchro-translucent",
		"arch-bxsynchro-transparent",
		"arch-bxsynchro-white",
		"arch-c-translucent",
		"arch-c-transparent",
		"arch-c-white",
		"arch-cxsynchro-translucent",
		"arch-cxsynchro-transparent",
		"arch-cxsynchro-white",
		"arch-d-translucent",
		"arch-d-transparent",
		"arch-d-white",
		"arch-dxsynchro-translucent",
		"arch-dxsynchro-transparent",
		"arch-dxsynchro-white",
		"arch-e-translucent",
		"arch-e-transparent",
		"arch-e-white",
		"arch-exsynchro-translucent",
		"arch-exsynchro-transparent",
		"arch-exsynchro-white",
		"auto-fixed-size-translucent",
		"auto-fixed-size-transparent",
		"auto-fixed-size-white",
		"auto-synchro-translucent",
		"auto-synchro-transparent",
		"auto-synchro-white",
		"auto-translucent",
		"auto-transparent",
		"auto-white",
		"axsynchro-translucent",
		"axsynchro-transparent",
		"axsynchro-white",
		"b-translucent",
		"b-transparent",
		"b-white",
		"bxsynchro-translucent",
		"bxsynchro-transparent",
		"bxsynchro-white",
		"c-translucent",
		"c-transparent",
		"c-white",
		"custom1",
		"custom2",
		"custom3",
		"custom4",
		"custom5",
		"custom6",
		"custom7",
		"custom8",
		"custom9",
		"custom10",
		"cxsynchro-translucent",
		"cxsynchro-transparent",
		"cxsynchro-white",
		"d-translucent",
		"d-transparent",
		"d-white",
		"default",
		"dxsynchro-translucent",
		"dxsynchro-transparent",
		"dxsynchro-white",
		"e-translucent",
		"e-transparent",
		"e-white",
		"executive-white",
		"exsynchro-translucent",
		"exsynchro-transparent",
		"exsynchro-white",
		"folio-white",
		"invoice-white",
		"iso-a0-translucent",
		"iso-a0-transparent",
		"iso-a0-white",
		"iso-a0xsynchro-translucent",
		"iso-a0xsynchro-transparent",
		"iso-a0xsynchro-white",
		"iso-a1-translucent",
		"iso-a1-transparent",
		"iso-a1-white",
		"iso-a1x3-translucent",
		"iso-a1x3-transparent",
		"iso-a1x3-white",
		"iso-a1x4- translucent",
		"iso-a1x4-transparent",
		"iso-a1x4-white",
		"iso-a1xsynchro-translucent",
		"iso-a1xsynchro-transparent",
		"iso-a1xsynchro-white",
		"iso-a2-translucent",
		"iso-a2-transparent",
		"iso-a2-white",
		"iso-a2x3-translucent",
		"iso-a2x3-transparent",
		"iso-a2x3-white",
		"iso-a2x4-translucent",
		"iso-a2x4-transparent",
		"iso-a2x4-white",
		"iso-a2x5-translucent",
		"iso-a2x5-transparent",
		"iso-a2x5-white",
		"iso-a2xsynchro-translucent",
		"iso-a2xsynchro-transparent",
		"iso-a2xsynchro-white",
		"iso-a3-colored",
		"iso-a3-translucent",
		"iso-a3-transparent",
		"iso-a3-white",
		"iso-a3x3-translucent",
		"iso-a3x3-transparent",
		"iso-a3x3-white",
		"iso-a3x4-translucent",
		"iso-a3x4-transparent",
		"iso-a3x4-white",
		"iso-a3x5-translucent",
		"iso-a3x5-transparent",
		"iso-a3x5-white",
		"iso-a3x6-translucent",
		"iso-a3x6-transparent",
		"iso-a3x6-white",
		"iso-a3x7-translucent",
		"iso-a3x7-transparent",
		"iso-a3x7-white",
		"iso-a3xsynchro-translucent",
		"iso-a3xsynchro-transparent",
		"iso-a3xsynchro-white",
		"iso-a4-colored",
		"iso-a4-translucent",
		"iso-a4-transparent",
		"iso-a4-white",
		"iso-a4x3-translucent",
		"iso-a4x3-transparent",
		"iso-a4x3-white",
		"iso-a4x4-translucent",
		"iso-a4x4-transparent",
		"iso-a4x4-white",
		"iso-a4x5-translucent",
		"iso-a4x5-transparent",
		"iso-a4x5-white",
		"iso-a4x6-translucent",
		"iso-a4x6-transparent",
		"iso-a4x6-white",
		"iso-a4x7-translucent",
		"iso-a4x7-transparent",
		"iso-a4x7-white",
		"iso-a4x8-translucent",
		"iso-a4x8-transparent",
		"iso-a4x8-white",
		"iso-a4x9-translucent",
		"iso-a4x9-transparent",
		"iso-a4x9-white",
		"iso-a4xsynchro-translucent",
		"iso-a4xsynchro-transparent",
		"iso-a4xsynchro-white",
		"iso-a5-colored",
		"iso-a5-translucent",
		"iso-a5-transparent",
		"iso-a5-white",
		"iso-a6-white",
		"iso-a7-white",
		"iso-a8-white",
		"iso-a9-white",
		"iso-a10-white",
		"iso-b0-white",
		"iso-b1-white",
		"iso-b2-white",
		"iso-b3-white",
		"iso-b4-colored",
		"iso-b4-white",
		"iso-b5-colored",
		"iso-b5-white",
		"iso-b6-white",
		"iso-b7-white",
		"iso-b8-white",
		"iso-b9-white",
		"iso-b10-white",
		"jis-b0-translucent",
		"jis-b0-transparent",
		"jis-b0-white",
		"jis-b1-translucent",
		"jis-b1-transparent",
		"jis-b1-white",
		"jis-b2-translucent",
		"jis-b2-transparent",
		"jis-b2-white",
		"jis-b3-translucent",
		"jis-b3-transparent",
		"jis-b3-white",
		"jis-b4-colored",
		"jis-b4-translucent",
		"jis-b4-transparent",
		"jis-b4-white",
		"jis-b5-colored",
		"jis-b5-translucent",
		"jis-b5-transparent",
		"jis-b5-white",
		"jis-b6-white",
		"jis-b7-white",
		"jis-b8-white",
		"jis-b9-white",
		"jis-b10-white",
		"ledger-white",
		"na-legal-colored",
		"na-legal-white",
		"na-letter-colored",
		"na-letter-transparent",
		"na-letter-white",
		"quarto-white"
	],
	"media type": [
		"bond",
		"heavyweight",
		"labels",
		"letterhead",
		"plain",
		"pre-printed",
		"pre-punched",
		"recycled",
		"transparency"
	],
	"input tray": [
		"bottom",
		"by-pass-tray",
		"envelope",
		"large-capacity",
		"main",
		"manual",
		"middle",
		"side",
		"top",
		"tray-1",
		"tray-2",
		"tray-3",
		"tray-4",
		"tray-5",
		"tray-6",
		"tray-7",
		"tray-8",
		"tray-9",
		"tray-10"
	],
	"envelope name": [
		"iso-b4-envelope",
		"iso-b5-envelope",
		"iso-c3-envelope",
		"iso-c4-envelope",
		"iso-c5-envelope",
		"iso-c6-envelope",
		"iso-designated-long-envelope",
		"monarch-envelope",
		"na-6x9-envelope",
		"na-7x9-envelope",
		"na-9x11-envelope",
		"na-9x12-envelope",
		"na-10x13-envelope",
		"na-10x14-envelope",
		"na-10x15-envelope",
		"na-number-9-envelope",
		"na-number-10-envelope"
	]
}

var Job_Template_attribute_names = Object.keys(attributes["Job Template"]);
var Job_Template_and_Operation_attribute_names = Job_Template_attribute_names.concat(Object.keys(attributes["Operation"]))
var Printer_attribute_names = Object.keys(attributes["Job Template"]).concat(["none"]);
var media_name_or_size = media["media name"].concat(media["size name"]);

var keywords = {};
keywords["compression"]= 								keyword([
	"compress",
	"deflate",
	"gzip",
	"none"
]);
keywords["compression-supported"]=						setof_keyword(
	keywords["compression"]
);
keywords["cover-back-supported"]=						setof_keyword([
	"cover-type",
	"media",
	"media-col"
]);
keywords["cover-front-supported"]=						setof_keyword(
	keywords["cover-back-supported"]
);
keywords["cover-type"]=									keyword([
	"no-cover",
	"print-back",
	"print-both",
	"print-front",
	"print-none"
]);
keywords["document-digital-signature"]=					keyword([
	"dss",
	"none",
	"pgp",
	"smime",
	"xmldsig"
]);
keywords["document-digital-signature-default"]=			keyword(
	keywords["document-digital-signature"]
);
keywords["document-digital-signature-supported"]=		setof_keyword(
	keywords["document-digital-signature"]
);
keywords["document-format-details-supported"]=			setof_keyword([
	"document-format",
	"document-format-device-id",
	"document-format-version",
	"document-natural-language",
	"document-source-application-name",
	"document-source-application-version",
	"document-source-os-name",
	"document-source-os-version"
]);
keywords["document-format-varying-attributes"]=			setof_keyword(
	//Any Printer attribute keyword name
	Printer_attribute_names
);
keywords["document-state-reasons"]=						setof_keyword([
	"aborted-by-system",
	"canceled-at-device",
	"canceled-by-operator",
	"canceled-by-user",
	"completed-successfully",
	"completed-with-errors",
	"completed-with-warnings",
	"compression-error",
	"data-insufficient",
	"digital-signature-did-not-verify",
	"digital-signature-type-not-supported",
	"digital-signature-wait",
	"document-access-error",
	"document-format-error",
	"document-password-error",
	"document-permission-error",
	"document-security-error",
	"document-unprintable-error",
	"errors-detected",
	"incoming",
	"interpreting",
	"none",
	"outgoing",
	"printing",
	"processing-to-stop-point",
	"queued",
	"queued-for-marker",
	"queued-in-device",
	"resources-are-not-ready",
	"resources-are-not-supported",
	"submission-interrupted",
	"transforming",
	"unsupported-compression",
	"unsupported-document-format",
	"warnings-detected"
]);
keywords["feed-orientation"]=							keyword([
	"long-edge-first",
	"short-edge-first"
]);
keywords["feed-orientation-supported"]=					setof_keyword(
	keywords["feed-orientation"]
);
keywords["finishings-col-supported"]=					setof_keyword([
	"finishing-template",
	"stitching"
]);
keywords["identify-actions"]=							setof_keyword([
	"display",
	"flash",
	"sound",
	"speak"
]);
keywords["identify-actions-default"]=					setof_keyword(
	keywords["identify-actions"]
);
keywords["identify-actions-supported"]=					setof_keyword(
	keywords["identify-actions"]
);
keywords["imposition-template"]=						keyword_name([
	"none",
	"signature"
]);
keywords["ipp-features-supported"]=						setof_keyword([
	"document-object",
	"ipp-everywhere",
	"job-save",
	"none",
	"page-overrides",
	"proof-print",
	"subscription-object"
]);
keywords["ipp-versions-supported"]=						setof_keyword([
	"1.0",
	"1.1",
	"2.0",
	"2.1",
	"2.2"
]);
keywords["job-accounting-sheets-type"]=					keyword_name([
	"none",
	"standard"
]);
keywords["job-cover-back-supported"]=					setof_keyword(
	keywords["cover-back-supported"]
);
keywords["job-cover-front-supported"]=					setof_keyword(
	keywords["cover-front-supported"]
);
keywords["job-creation-attributes-supported"]=			setof_keyword(
//  Any Job Template attribute
//  Any job creation Operation attribute keyword name
	Job_Template_and_Operation_attribute_names
);
keywords["job-error-action"]=							keyword([
	"abort-job",
	"cancel-job",
	"continue-job",
	"suspend-job"
]);
keywords["job-error-action-default"]=					keyword(
	keywords["job-error-action"]
);
keywords["job-error-action-supported"]=					setof_keyword(
	keywords["job-error-action"]
);
keywords["job-error-sheet-type"]=						keyword_name([
	"none",
	"standard"
]);
keywords["job-error-sheet-when"]=						keyword([
	"always",
	"on-error"
]);
keywords["job-finishings-col-supported"]=				setof_keyword(
	keywords["finishings-col-supported"]
);
keywords["job-hold-until"]=								keyword_name([
	"day-time",
	"evening",
	"indefinite",
	"night",
	"no-hold",
	"second-shift",
	"third-shift",
	"weekend"
]);
keywords["job-hold-until-default"]=						keyword_name(
	keywords["job-hold-until"]
);
keywords["job-hold-until-supported"]=					setof_keyword_name(
	keywords["job-hold-until"]
);
keywords["job-mandatory-attributes"]=					setof_keyword(
//  Any Job Template attribute
	Job_Template_attribute_names
);
keywords["job-password-encryption"]=					keyword_name([
	"md2",
	"md4",
	"md5",
	"none",
	"sha"
]);
keywords["job-password-encryption-supported"]=			setof_keyword_name(
	keywords["job-password-encryption"]
);
keywords["job-save-disposition-supported"]=				setof_keyword([
	"save-disposition",
	"save-info"
]);
keywords["job-settable-attributes-supported"]=			setof_keyword(
//  Any Job Template attribute
	Job_Template_attribute_names
);
keywords["job-sheets"]=									keyword_name([
	"first-print-stream-page",
	"job-both-sheet",
	"job-end-sheet",
	"job-start-sheet",
	"none",
	"standard"
]);
keywords["job-sheets-default"]=							keyword_name(
	keywords["job-sheets"]
);
keywords["job-sheets-supported"]=						setof_keyword_name(
	keywords["job-sheets"]
);
keywords["job-spooling-supported"]=						keyword([
	"automatic",
	"spool",
	"stream"
]);
keywords["job-state-reasons"]=							setof_keyword([
	"aborted-by-system",
	"compression-error",
	"digital-signature-did-not-verify",
	"digital-signature-type-not-supported",
	"document-access-error",
	"document-format-error",
	"document-password-error",
	"document-permission-error",
	"document-security-error",
	"document-unprintable-error",
	"errors-detected",
	"job-canceled-at-device",
	"job-canceled-by-operator",
	"job-canceled-by-user",
	"job-completed-successfully",
	"job-completed-with-errors",
	"job-completed-with-warnings",
	"job-data-insufficient",
	"job-delay-output-until-specified",
	"job-digital-signature-wait",
	"job-hold-until-specified",
	"job-incoming",
	"job-interpreting",
	"job-outgoing",
	"job-password-wait",
	"job-printed-successfully",
	"job-printed-with-errors",
	"job-printed-with-warnings",
	"job-printing",
	"job-queued",
	"job-queued-for-marker",
	"job-restartable",
	"job-resuming",
	"job-saved-successfully",
	"job-saved-with-errors",
	"job-saved-with-warnings",
	"job-saving",
	"job-spooling",
	"job-streaming",
	"job-suspended",
	"job-suspended-by-operator",
	"job-suspended-by-system",
	"job-suspended-by-user",
	"job-suspending",
	"job-transforming",
	"none",
	"printer-stopped",
	"printer-stopped-partly",
	"processing-to-stop-point",
	"queued-in-device",
	"resources-are-not-ready",
	"resources-are-not-supported",
	"service-off-line",
	"submission-interrupted",
	"unsupported-compression",
	"unsupported-document-format",
	"warnings-detected"
]);
keywords["media"]=										keyword_name(
	[].concat(media["size name"],
		media["media name"],
		media["media type"],
		media["input tray"],
		media["envelope name"]
	)
);
keywords["media-back-coating"]=							keyword_name([
	"glossy",
	"high-gloss",
	"matte",
	"none",
	"satin",
	"semi-gloss"
]);
keywords["media-back-coating-supported"]=				setof_keyword_name(
	keywords["media-back-coating"]
);
keywords["media-col-supported"]=						setof_keyword([
	"media-bottom-margin",
	"media-left-margin",
	"media-right-margin",
	"media-size-name",
	"media-source",
	"media-top-margin"
]);
keywords["media-color"]=								keyword_name([
	"blue",
	"buff",
	"goldenrod",
	"gray",
	"green",
	"ivory",
	"no-color",
	"orange",
	"pink",
	"red",
	"white",
	"yellow"
]);
keywords["media-color-supported"]=						setof_keyword_name(
	keywords["media-color"]
);
keywords["media-default"]=								keyword_name_novalue(
	keywords["media"]
);
keywords["media-front-coating"]=						keyword_name(
	keywords["media-back-coating"]
);
keywords["media-front-coating-supported"]=				setof_keyword_name(
	keywords["media-back-coating"]
);
keywords["media-grain"]=								keyword_name([
	"x-direction",
	"y-direction"
]);
keywords["media-grain-supported"]=						setof_keyword_name(
	keywords["media-grain"]
);
keywords["media-input-tray-check"]=						keyword_name([
	media["input tray"]
]);
keywords["media-input-tray-check-default"]=				keyword_name([
	media["input tray"]
]);
keywords["media-input-tray-check-supported"]=			setof_keyword_name(
	media["input tray"]
);
keywords["media-key"]=									keyword_name(
//  Any "media" media or size keyword value
	media_name_or_size
);
keywords["media-key-supported"]=						setof_keyword_name([
//  Any "media" media or size keyword value
	media_name_or_size
]);
keywords["media-pre-printed"]=							keyword_name([
	"blank",
	"letter-head",
	"pre-printed"
]);
keywords["media-pre-printed-supported"]=				keyword_name(
	keywords["media-pre-printed"]
);
keywords["media-ready"]=								setof_keyword_name([
//  Any "media" media or size keyword value
	media_name_or_size
]);
keywords["media-recycled"]=								keyword_name([
	"none",
	"standard"
]);
keywords["media-recycled-supported"]=					keyword_name(
	keywords["media-recycled"]
);
keywords["media-source"]=								keyword_name([
	"alternate",
	"alternate-roll",
	"auto",
	"bottom",
	"by-pass-tray",
	"center",
	"disc",
	"envelope",
	"hagaki",
	"large-capacity",
	"left",
	"main",
	"main-roll",
	"manual",
	"middle",
	"photo",
	"rear",
	"right",
	"roll-1",
	"roll-2",
	"roll-3",
	"roll-4",
	"roll-5",
	"roll-6",
	"roll-7",
	"roll-8",
	"roll-9",
	"roll-10",
	"side",
	"top",
	"tray-1",
	"tray-2",
	"tray-3",
	"tray-4",
	"tray-5",
	"tray-6",
	"tray-7",
	"tray-8",
	"tray-9",
	"tray-10",
	"tray-11",
	"tray-12",
	"tray-13",
	"tray-14",
	"tray-15",
	"tray-16",
	"tray-17",
	"tray-18",
	"tray-19",
	"tray-20"
]);
keywords["media-source-feed-direction"]=				keyword(
	keywords["feed-orientation"]
);
keywords["media-source-supported"]=						setof_keyword_name(
	keywords["media-source"]
);
keywords["media-supported"]=							setof_keyword_name(
	keywords["media"]
);
keywords["media-tooth"]=								keyword_name([
	"antique",
	"calendared",
	"coarse",
	"fine",
	"linen",
	"medium",
	"smooth",
	"stipple",
	"uncalendared",
	"vellum"
]);
keywords["media-tooth-supported"]=						setof_keyword_name(
	keywords["media-tooth"]
);
keywords["media-type"]=									keyword_name([
	"aluminum",
	"back-print-film",
	"cardboard",
	"cardstock",
	"cd",
	"continuous",
	"continuous-long",
	"continuous-short",
	"corrugated-board",
	"disc",
	"double-wall",
	"dry-film",
	"dvd",
	"embossing-foil",
	"end-board",
	"envelope",
	"envelope-plain",
	"envelope-window",
	"film",
	"flexo-base",
	"flexo-photo-polymer",
	"flute",
	"foil",
	"full-cut-tabs",
	"gravure-cylinder",
	"image-setter-paper",
	"imaging-cylinder",
	"labels",
	"laminating-foil",
	"letterhead",
	"mounting-tape",
	"multi-layer",
	"multi-part-form",
	"other",
	"paper",
	"photographic",
	"photographic-film",
	"photographic-glossy",
	"photographic-high-gloss",
	"photographic-matte",
	"photographic-satin",
	"photographic-semi-gloss",
	"plate",
	"polyester",
	"pre-cut-tabs",
	"roll",
	"screen",
	"screen-paged",
	"self-adhesive",
	"shrink-foil",
	"single-face",
	"single-wall",
	"sleeve",
	"stationery",
	"stationery-coated",
	"stationery-fine",
	"stationery-heavyweight",
	"stationery-inkjet",
	"stationery-letterhead",
	"stationery-lightweight",
	"stationery-preprinted",
	"stationery-prepunched",
	"tab-stock",
	"tractor",
	"transparency",
	"triple-wall",
	"wet-film"
]);
keywords["media-type-supported"]=						setof_keyword_name(
	keywords["media-type"]
);
keywords["multiple-document-handling"]=					keyword([
	"separate-documents-collated-copies",
	"separate-documents-uncollated-copies",
	"single-document",
	"single-document-new-sheet"
]);
keywords["multiple-document-handling-default"]=			keyword(
	keywords["multiple-document-handling"]
);
keywords["multiple-document-handling-supported"]=		setof_keyword(
	keywords["multiple-document-handling"]
);
keywords["multiple-operation-timeout-action"]=			keyword([
	"abort-job",
	"hold-job",
	"process-job"
]);
keywords["notify-events"]=								setof_keyword([
	"job-completed",
	"job-config-changed",
	"job-created",
	"job-progress",
	"job-state-changed",
	"job-stopped",
	"none",
	"printer-config-changed",
	"printer-finishings-changed",
	"printer-media-changed",
	"printer-queue-order-changed",
	"printer-restarted",
	"printer-shutdown",
	"printer-state-changed",
	"printer-stopped"
]);
keywords["notify-events-default"]=						setof_keyword(
	keywords["notify-events"]
);
keywords["notify-events-supported"]=					setof_keyword(
	keywords["notify-events"]
);
keywords["notify-pull-method"]=							keyword([
	"ippget"
]);
keywords["notify-pull-method-supported"]=				setof_keyword(
	keywords["notify-pull-method"]
);
keywords["notify-subscribed-event"]=					keyword(
	keywords["notify-events"]
);
keywords["output-bin"]=									keyword_name([
	"bottom",
	"center",
	"face-down",
	"face-up",
	"large-capacity",
	"left",
	"mailbox-1",
	"mailbox-2",
	"mailbox-3",
	"mailbox-4",
	"mailbox-5",
	"mailbox-6",
	"mailbox-7",
	"mailbox-8",
	"mailbox-9",
	"mailbox-10",
	"middle",
	"my-mailbox",
	"rear",
	"right",
	"side",
	"stacker-1",
	"stacker-2",
	"stacker-3",
	"stacker-4",
	"stacker-5",
	"stacker-6",
	"stacker-7",
	"stacker-8",
	"stacker-9",
	"stacker-10",
	"top",
	"tray-1",
	"tray-2",
	"tray-3",
	"tray-4",
	"tray-5",
	"tray-6",
	"tray-7",
	"tray-8",
	"tray-9",
	"tray-10"
]);
keywords["job-accounting-output-bin"]=					keyword_name(
	keywords["output-bin"]
);
keywords["output-bin-default"]=							keyword_name(
	keywords["output-bin"]
);
keywords["output-bin-supported"]=						setof_keyword_name(
	keywords["output-bin"]
);
keywords["page-delivery"]=								keyword([
	"reverse-order-face-down",
	"reverse-order-face-up",
	"same-order-face-down",
	"same-order-face-up",
	"system-specified"
]);
keywords["page-delivery-default"]=						keyword(
	keywords["page-delivery"]
);
keywords["page-delivery-supported"]=					setof_keyword(
	keywords["page-delivery"]
);
keywords["page-order-received"]=						keyword([
	"1-to-n-order",
	"n-to-1-order"
]);
keywords["page-order-received-default"]=				keyword(
	keywords["page-order-received"]
);
keywords["page-order-received-supported"]=				setof_keyword(
	keywords["page-order-received"]
);
keywords["current-page-order"]=							keyword(
	keywords["page-order-received"]
);
keywords["pdl-init-file-supported"]=					setof_keyword([
	"pdl-init-file-entry",
	"pdl-init-file-location",
	"pdl-init-file-name"
]);
keywords["pdl-override-supported"]=						keyword([
	"attempted",
	"guaranteed",
	"not-attempted"
]);
keywords["presentation-direction-number-up"]=			keyword([
	"tobottom-toleft",
	"tobottom-toright",
	"toleft-tobottom",
	"toleft-totop",
	"toright-tobottom",
	"toright-totop",
	"totop-toleft",
	"totop-toright"
]);
keywords["presentation-direction-number-up-default"]=	keyword(
	keywords["presentation-direction-number-up"]
);
keywords["presentation-direction-number-up-supported"]=	setof_keyword(
	keywords["presentation-direction-number-up"]
);
keywords["print-color-mode"]=							keyword([
	"auto",
	"bi-level",
	"color",
	"highlight",
	"monochrome",
	"process-bi-level",
	"process-monochrome"
]);
keywords["print-color-mode-default"]=					keyword(
	keywords["print-color-mode"]
);
keywords["print-color-mode-supported"]=					setof_keyword(
	keywords["print-color-mode"]
);
keywords["print-content-optimize"]=						keyword([
	"auto",
	"graphic",
	"photo",
	"text",
	"text-and-graphic"
]);
keywords["print-content-optimize-default"]=				keyword(
	keywords["print-content-optimize"]
);
keywords["print-content-optimize-supported"]=			setof_keyword(
	keywords["print-content-optimize"]
);
keywords["print-rendering-intent"]=						keyword([
	"absolute",
	"auto",
	"perceptual",
	"relative",
	"relative-bpc",
	"saturation"
]);
keywords["print-rendering-intent-default"]=				keyword(
	keywords["print-rendering-intent"]
);
keywords["print-rendering-intent-supported"]=			setof_keyword(
	keywords["print-rendering-intent"]
);
keywords["printer-get-attributes-supported"]=			setof_keyword(
//  Any Job Template attribute
//  Any job creation Operation attribute keyword name
	Job_Template_and_Operation_attribute_names
);
keywords["printer-mandatory-job-attributes"]=			setof_keyword(
//	Any Job Template attribute
//	Any Operation attribute at the job level
	//this probably isn't quite right...
	Job_Template_and_Operation_attribute_names
);
keywords["printer-settable-attributes-supported"]=		setof_keyword(
//  Any read-write Printer attribute keyword name
	Printer_attribute_names
);
keywords["printer-state-reasons"]=						setof_keyword([
	"alert-removal-of-binary-change-entry",
	"bander-added",
	"bander-almost-empty",
	"bander-almost-full",
	"bander-at-limit",
	"bander-closed",
	"bander-configuration-change",
	"bander-cover-closed",
	"bander-cover-open",
	"bander-empty",
	"bander-full",
	"bander-interlock-closed",
	"bander-interlock-open",
	"bander-jam",
	"bander-life-almost-over",
	"bander-life-over",
	"bander-memory-exhausted",
	"bander-missing",
	"bander-motor-failure",
	"bander-near-limit",
	"bander-offline",
	"bander-opened",
	"bander-over-temperature",
	"bander-power-saver",
	"bander-recoverable-failure",
	"bander-recoverable-storage-error",
	"bander-removed",
	"bander-resource-added",
	"bander-resource-removed",
	"bander-thermistor-failure",
	"bander-timing-failure",
	"bander-turned-off",
	"bander-turned-on",
	"bander-under-temperature",
	"bander-unrecoverable-failure",
	"bander-unrecoverable-storage-error",
	"bander-warming-up",
	"binder-added",
	"binder-almost-empty",
	"binder-almost-full",
	"binder-at-limit",
	"binder-closed",
	"binder-configuration-change",
	"binder-cover-closed",
	"binder-cover-open",
	"binder-empty",
	"binder-full",
	"binder-interlock-closed",
	"binder-interlock-open",
	"binder-jam",
	"binder-life-almost-over",
	"binder-life-over",
	"binder-memory-exhausted",
	"binder-missing",
	"binder-motor-failure",
	"binder-near-limit",
	"binder-offline",
	"binder-opened",
	"binder-over-temperature",
	"binder-power-saver",
	"binder-recoverable-failure",
	"binder-recoverable-storage-error",
	"binder-removed",
	"binder-resource-added",
	"binder-resource-removed",
	"binder-thermistor-failure",
	"binder-timing-failure",
	"binder-turned-off",
	"binder-turned-on",
	"binder-under-temperature",
	"binder-unrecoverable-failure",
	"binder-unrecoverable-storage-error",
	"binder-warming-up",
	"cleaner-life-almost-over",
	"cleaner-life-over",
	"configuration-change",
	"connecting-to-device",
	"cover-open",
	"deactivated",
	"developer-empty",
	"developer-low",
	"die-cutter-added",
	"die-cutter-almost-empty",
	"die-cutter-almost-full",
	"die-cutter-at-limit",
	"die-cutter-closed",
	"die-cutter-configuration-change",
	"die-cutter-cover-closed",
	"die-cutter-cover-open",
	"die-cutter-empty",
	"die-cutter-full",
	"die-cutter-interlock-closed",
	"die-cutter-interlock-open",
	"die-cutter-jam",
	"die-cutter-life-almost-over",
	"die-cutter-life-over",
	"die-cutter-memory-exhausted",
	"die-cutter-missing",
	"die-cutter-motor-failure",
	"die-cutter-near-limit",
	"die-cutter-offline",
	"die-cutter-opened",
	"die-cutter-over-temperature",
	"die-cutter-power-saver",
	"die-cutter-recoverable-failure",
	"die-cutter-recoverable-storage-error",
	"die-cutter-removed",
	"die-cutter-resource-added",
	"die-cutter-resource-removed",
	"die-cutter-thermistor-failure",
	"die-cutter-timing-failure",
	"die-cutter-turned-off",
	"die-cutter-turned-on",
	"die-cutter-under-temperature",
	"die-cutter-unrecoverable-failure",
	"die-cutter-unrecoverable-storage-error",
	"die-cutter-warming-up",
	"door-open",
	"folder-added",
	"folder-almost-empty",
	"folder-almost-full",
	"folder-at-limit",
	"folder-closed",
	"folder-configuration-change",
	"folder-cover-closed",
	"folder-cover-open",
	"folder-empty",
	"folder-full",
	"folder-interlock-closed",
	"folder-interlock-open",
	"folder-jam",
	"folder-life-almost-over",
	"folder-life-over",
	"folder-memory-exhausted",
	"folder-missing",
	"folder-motor-failure",
	"folder-near-limit",
	"folder-offline",
	"folder-opened",
	"folder-over-temperature",
	"folder-power-saver",
	"folder-recoverable-failure",
	"folder-recoverable-storage-error",
	"folder-removed",
	"folder-resource-added",
	"folder-resource-removed",
	"folder-thermistor-failure",
	"folder-timing-failure",
	"folder-turned-off",
	"folder-turned-on",
	"folder-under-temperature",
	"folder-unrecoverable-failure",
	"folder-unrecoverable-storage-error",
	"folder-warming-up",
	"fuser-over-temp",
	"fuser-under-temp",
	"imprinter-added",
	"imprinter-almost-empty",
	"imprinter-almost-full",
	"imprinter-at-limit",
	"imprinter-closed",
	"imprinter-configuration-change",
	"imprinter-cover-closed",
	"imprinter-cover-open",
	"imprinter-empty",
	"imprinter-full",
	"imprinter-interlock-closed",
	"imprinter-interlock-open",
	"imprinter-jam",
	"imprinter-life-almost-over",
	"imprinter-life-over",
	"imprinter-memory-exhausted",
	"imprinter-missing",
	"imprinter-motor-failure",
	"imprinter-near-limit",
	"imprinter-offline",
	"imprinter-opened",
	"imprinter-over-temperature",
	"imprinter-power-saver",
	"imprinter-recoverable-failure",
	"imprinter-recoverable-storage-error",
	"imprinter-removed",
	"imprinter-resource-added",
	"imprinter-resource-removed",
	"imprinter-thermistor-failure",
	"imprinter-timing-failure",
	"imprinter-turned-off",
	"imprinter-turned-on",
	"imprinter-under-temperature",
	"imprinter-unrecoverable-failure",
	"imprinter-unrecoverable-storage-error",
	"imprinter-warming-up",
	"input-cannot-feed-size-selected",
	"input-manual-input-request",
	"input-media-color-change",
	"input-media-form-parts-change",
	"input-media-size-change",
	"input-media-type-change",
	"input-media-weight-change",
	"input-tray-elevation-failure",
	"input-tray-missing",
	"input-tray-position-failure",
	"inserter-added",
	"inserter-almost-empty",
	"inserter-almost-full",
	"inserter-at-limit",
	"inserter-closed",
	"inserter-configuration-change",
	"inserter-cover-closed",
	"inserter-cover-open",
	"inserter-empty",
	"inserter-full",
	"inserter-interlock-closed",
	"inserter-interlock-open",
	"inserter-jam",
	"inserter-life-almost-over",
	"inserter-life-over",
	"inserter-memory-exhausted",
	"inserter-missing",
	"inserter-motor-failure",
	"inserter-near-limit",
	"inserter-offline",
	"inserter-opened",
	"inserter-over-temperature",
	"inserter-power-saver",
	"inserter-recoverable-failure",
	"inserter-recoverable-storage-error",
	"inserter-removed",
	"inserter-resource-added",
	"inserter-resource-removed",
	"inserter-thermistor-failure",
	"inserter-timing-failure",
	"inserter-turned-off",
	"inserter-turned-on",
	"inserter-under-temperature",
	"inserter-unrecoverable-failure",
	"inserter-unrecoverable-storage-error",
	"inserter-warming-up",
	"interlock-closed",
	"interlock-open",
	"interpreter-cartridge-added",
	"interpreter-cartridge-deleted",
	"interpreter-complex-page-encountered",
	"interpreter-memory-decrease",
	"interpreter-memory-increase",
	"interpreter-resource-added",
	"interpreter-resource-deleted",
	"interpreter-resource-unavailable",
	"make-envelope-added",
	"make-envelope-almost-empty",
	"make-envelope-almost-full",
	"make-envelope-at-limit",
	"make-envelope-closed",
	"make-envelope-configuration-change",
	"make-envelope-cover-closed",
	"make-envelope-cover-open",
	"make-envelope-empty",
	"make-envelope-full",
	"make-envelope-interlock-closed",
	"make-envelope-interlock-open",
	"make-envelope-jam",
	"make-envelope-life-almost-over",
	"make-envelope-life-over",
	"make-envelope-memory-exhausted",
	"make-envelope-missing",
	"make-envelope-motor-failure",
	"make-envelope-near-limit",
	"make-envelope-offline",
	"make-envelope-opened",
	"make-envelope-over-temperature",
	"make-envelope-power-saver",
	"make-envelope-recoverable-failure",
	"make-envelope-recoverable-storage-error",
	"make-envelope-removed",
	"make-envelope-resource-added",
	"make-envelope-resource-removed",
	"make-envelope-thermistor-failure",
	"make-envelope-timing-failure",
	"make-envelope-turned-off",
	"make-envelope-turned-on",
	"make-envelope-under-temperature",
	"make-envelope-unrecoverable-failure",
	"make-envelope-unrecoverable-storage-error",
	"make-envelope-warming-up",
	"marker-adjusting-print-quality",
	"marker-developer-almost-empty",
	"marker-developer-empty",
	"marker-fuser-thermistor-failure",
	"marker-fuser-timing-failure",
	"marker-ink-almost-empty",
	"marker-ink-empty",
	"marker-print-ribbon-almost-empty",
	"marker-print-ribbon-empty",
	"marker-supply-empty",
	"marker-supply-low",
	"marker-toner-cartridge-missing",
	"marker-waste-almost-full",
	"marker-waste-full",
	"marker-waste-ink-receptacle-almost-full",
	"marker-waste-ink-receptacle-full",
	"marker-waste-toner-receptacle-almost-full",
	"marker-waste-toner-receptacle-full",
	"media-empty",
	"media-jam",
	"media-low",
	"media-needed",
	"media-path-cannot-duplex-media-selected",
	"media-path-media-tray-almost-full",
	"media-path-media-tray-full",
	"media-path-media-tray-missing",
	"moving-to-paused",
	"none",
	"opc-life-over",
	"opc-near-eol",
	"other",
	"output-area-almost-full",
	"output-area-full",
	"output-mailbox-select-failure",
	"output-tray-missing",
	"paused",
	"perforater-added",
	"perforater-almost-empty",
	"perforater-almost-full",
	"perforater-at-limit",
	"perforater-closed",
	"perforater-configuration-change",
	"perforater-cover-closed",
	"perforater-cover-open",
	"perforater-empty",
	"perforater-full",
	"perforater-interlock-closed",
	"perforater-interlock-open",
	"perforater-jam",
	"perforater-life-almost-over",
	"perforater-life-over",
	"perforater-memory-exhausted",
	"perforater-missing",
	"perforater-motor-failure",
	"perforater-near-limit",
	"perforater-offline",
	"perforater-opened",
	"perforater-over-temperature",
	"perforater-power-saver",
	"perforater-recoverable-failure",
	"perforater-recoverable-storage-error",
	"perforater-removed",
	"perforater-resource-added",
	"perforater-resource-removed",
	"perforater-thermistor-failure",
	"perforater-timing-failure",
	"perforater-turned-off",
	"perforater-turned-on",
	"perforater-under-temperature",
	"perforater-unrecoverable-failure",
	"perforater-unrecoverable-storage-error",
	"perforater-warming-up",
	"power-down",
	"power-up",
	"printer-manual-reset",
	"printer-nms-reset",
	"printer-ready-to-print",
	"puncher-added",
	"puncher-almost-empty",
	"puncher-almost-full",
	"puncher-at-limit",
	"puncher-closed",
	"puncher-configuration-change",
	"puncher-cover-closed",
	"puncher-cover-open",
	"puncher-empty",
	"puncher-full",
	"puncher-interlock-closed",
	"puncher-interlock-open",
	"puncher-jam",
	"puncher-life-almost-over",
	"puncher-life-over",
	"puncher-memory-exhausted",
	"puncher-missing",
	"puncher-motor-failure",
	"puncher-near-limit",
	"puncher-offline",
	"puncher-opened",
	"puncher-over-temperature",
	"puncher-power-saver",
	"puncher-recoverable-failure",
	"puncher-recoverable-storage-error",
	"puncher-removed",
	"puncher-resource-added",
	"puncher-resource-removed",
	"puncher-thermistor-failure",
	"puncher-timing-failure",
	"puncher-turned-off",
	"puncher-turned-on",
	"puncher-under-temperature",
	"puncher-unrecoverable-failure",
	"puncher-unrecoverable-storage-error",
	"puncher-warming-up",
	"separation-cutter-added",
	"separation-cutter-almost-empty",
	"separation-cutter-almost-full",
	"separation-cutter-at-limit",
	"separation-cutter-closed",
	"separation-cutter-configuration-change",
	"separation-cutter-cover-closed",
	"separation-cutter-cover-open",
	"separation-cutter-empty",
	"separation-cutter-full",
	"separation-cutter-interlock-closed",
	"separation-cutter-interlock-open",
	"separation-cutter-jam",
	"separation-cutter-life-almost-over",
	"separation-cutter-life-over",
	"separation-cutter-memory-exhausted",
	"separation-cutter-missing",
	"separation-cutter-motor-failure",
	"separation-cutter-near-limit",
	"separation-cutter-offline",
	"separation-cutter-opened",
	"separation-cutter-over-temperature",
	"separation-cutter-power-saver",
	"separation-cutter-recoverable-failure",
	"separation-cutter-recoverable-storage-error",
	"separation-cutter-removed",
	"separation-cutter-resource-added",
	"separation-cutter-resource-removed",
	"separation-cutter-thermistor-failure",
	"separation-cutter-timing-failure",
	"separation-cutter-turned-off",
	"separation-cutter-turned-on",
	"separation-cutter-under-temperature",
	"separation-cutter-unrecoverable-failure",
	"separation-cutter-unrecoverable-storage-error",
	"separation-cutter-warming-up",
	"sheet-rotator-added",
	"sheet-rotator-almost-empty",
	"sheet-rotator-almost-full",
	"sheet-rotator-at-limit",
	"sheet-rotator-closed",
	"sheet-rotator-configuration-change",
	"sheet-rotator-cover-closed",
	"sheet-rotator-cover-open",
	"sheet-rotator-empty",
	"sheet-rotator-full",
	"sheet-rotator-interlock-closed",
	"sheet-rotator-interlock-open",
	"sheet-rotator-jam",
	"sheet-rotator-life-almost-over",
	"sheet-rotator-life-over",
	"sheet-rotator-memory-exhausted",
	"sheet-rotator-missing",
	"sheet-rotator-motor-failure",
	"sheet-rotator-near-limit",
	"sheet-rotator-offline",
	"sheet-rotator-opened",
	"sheet-rotator-over-temperature",
	"sheet-rotator-power-saver",
	"sheet-rotator-recoverable-failure",
	"sheet-rotator-recoverable-storage-error",
	"sheet-rotator-removed",
	"sheet-rotator-resource-added",
	"sheet-rotator-resource-removed",
	"sheet-rotator-thermistor-failure",
	"sheet-rotator-timing-failure",
	"sheet-rotator-turned-off",
	"sheet-rotator-turned-on",
	"sheet-rotator-under-temperature",
	"sheet-rotator-unrecoverable-failure",
	"sheet-rotator-unrecoverable-storage-error",
	"sheet-rotator-warming-up",
	"shutdown",
	"slitter-added",
	"slitter-almost-empty",
	"slitter-almost-full",
	"slitter-at-limit",
	"slitter-closed",
	"slitter-configuration-change",
	"slitter-cover-closed",
	"slitter-cover-open",
	"slitter-empty",
	"slitter-full",
	"slitter-interlock-closed",
	"slitter-interlock-open",
	"slitter-jam",
	"slitter-life-almost-over",
	"slitter-life-over",
	"slitter-memory-exhausted",
	"slitter-missing",
	"slitter-motor-failure",
	"slitter-near-limit",
	"slitter-offline",
	"slitter-opened",
	"slitter-over-temperature",
	"slitter-power-saver",
	"slitter-recoverable-failure",
	"slitter-recoverable-storage-error",
	"slitter-removed",
	"slitter-resource-added",
	"slitter-resource-removed",
	"slitter-thermistor-failure",
	"slitter-timing-failure",
	"slitter-turned-off",
	"slitter-turned-on",
	"slitter-under-temperature",
	"slitter-unrecoverable-failure",
	"slitter-unrecoverable-storage-error",
	"slitter-warming-up",
	"spool-area-full",
	"stacker-added",
	"stacker-almost-empty",
	"stacker-almost-full",
	"stacker-at-limit",
	"stacker-closed",
	"stacker-configuration-change",
	"stacker-cover-closed",
	"stacker-cover-open",
	"stacker-empty",
	"stacker-full",
	"stacker-interlock-closed",
	"stacker-interlock-open",
	"stacker-jam",
	"stacker-life-almost-over",
	"stacker-life-over",
	"stacker-memory-exhausted",
	"stacker-missing",
	"stacker-motor-failure",
	"stacker-near-limit",
	"stacker-offline",
	"stacker-opened",
	"stacker-over-temperature",
	"stacker-power-saver",
	"stacker-recoverable-failure",
	"stacker-recoverable-storage-error",
	"stacker-removed",
	"stacker-resource-added",
	"stacker-resource-removed",
	"stacker-thermistor-failure",
	"stacker-timing-failure",
	"stacker-turned-off",
	"stacker-turned-on",
	"stacker-under-temperature",
	"stacker-unrecoverable-failure",
	"stacker-unrecoverable-storage-error",
	"stacker-warming-up",
	"stapler-added",
	"stapler-almost-empty",
	"stapler-almost-full",
	"stapler-at-limit",
	"stapler-closed",
	"stapler-configuration-change",
	"stapler-cover-closed",
	"stapler-cover-open",
	"stapler-empty",
	"stapler-full",
	"stapler-interlock-closed",
	"stapler-interlock-open",
	"stapler-jam",
	"stapler-life-almost-over",
	"stapler-life-over",
	"stapler-memory-exhausted",
	"stapler-missing",
	"stapler-motor-failure",
	"stapler-near-limit",
	"stapler-offline",
	"stapler-opened",
	"stapler-over-temperature",
	"stapler-power-saver",
	"stapler-recoverable-failure",
	"stapler-recoverable-storage-error",
	"stapler-removed",
	"stapler-resource-added",
	"stapler-resource-removed",
	"stapler-thermistor-failure",
	"stapler-timing-failure",
	"stapler-turned-off",
	"stapler-turned-on",
	"stapler-under-temperature",
	"stapler-unrecoverable-failure",
	"stapler-unrecoverable-storage-error",
	"stapler-warming-up",
	"stitcher-added",
	"stitcher-almost-empty",
	"stitcher-almost-full",
	"stitcher-at-limit",
	"stitcher-closed",
	"stitcher-configuration-change",
	"stitcher-cover-closed",
	"stitcher-cover-open",
	"stitcher-empty",
	"stitcher-full",
	"stitcher-interlock-closed",
	"stitcher-interlock-open",
	"stitcher-jam",
	"stitcher-life-almost-over",
	"stitcher-life-over",
	"stitcher-memory-exhausted",
	"stitcher-missing",
	"stitcher-motor-failure",
	"stitcher-near-limit",
	"stitcher-offline",
	"stitcher-opened",
	"stitcher-over-temperature",
	"stitcher-power-saver",
	"stitcher-recoverable-failure",
	"stitcher-recoverable-storage-error",
	"stitcher-removed",
	"stitcher-resource-added",
	"stitcher-resource-removed",
	"stitcher-thermistor-failure",
	"stitcher-timing-failure",
	"stitcher-turned-off",
	"stitcher-turned-on",
	"stitcher-under-temperature",
	"stitcher-unrecoverable-failure",
	"stitcher-unrecoverable-storage-error",
	"stitcher-warming-up",
	"stopped-partly",
	"stopping",
	"subunit-added",
	"subunit-almost-empty",
	"subunit-almost-full",
	"subunit-at-limit",
	"subunit-closed",
	"subunit-empty",
	"subunit-full",
	"subunit-life-almost-over",
	"subunit-life-over",
	"subunit-memory-exhausted",
	"subunit-missing",
	"subunit-motor-failure",
	"subunit-near-limit",
	"subunit-offline",
	"subunit-opened",
	"subunit-over-temperature",
	"subunit-power-saver",
	"subunit-recoverable-failure",
	"subunit-recoverable-storage-error",
	"subunit-removed",
	"subunit-resource-added",
	"subunit-resource-removed",
	"subunit-thermistor-failure",
	"subunit-timing-Failure",
	"subunit-turned-off",
	"subunit-turned-on",
	"subunit-under-temperature",
	"subunit-unrecoverable-failure",
	"subunit-unrecoverable-storage-error",
	"subunit-warming-up",
	"timed-out",
	"toner-empty",
	"toner-low",
	"trimmer-added",
	"trimmer-added",
	"trimmer-almost-empty",
	"trimmer-almost-empty",
	"trimmer-almost-full",
	"trimmer-almost-full",
	"trimmer-at-limit",
	"trimmer-at-limit",
	"trimmer-closed",
	"trimmer-closed",
	"trimmer-configuration-change",
	"trimmer-configuration-change",
	"trimmer-cover-closed",
	"trimmer-cover-closed",
	"trimmer-cover-open",
	"trimmer-cover-open",
	"trimmer-empty",
	"trimmer-empty",
	"trimmer-full",
	"trimmer-full",
	"trimmer-interlock-closed",
	"trimmer-interlock-closed",
	"trimmer-interlock-open",
	"trimmer-interlock-open",
	"trimmer-jam",
	"trimmer-jam",
	"trimmer-life-almost-over",
	"trimmer-life-almost-over",
	"trimmer-life-over",
	"trimmer-life-over",
	"trimmer-memory-exhausted",
	"trimmer-memory-exhausted",
	"trimmer-missing",
	"trimmer-missing",
	"trimmer-motor-failure",
	"trimmer-motor-failure",
	"trimmer-near-limit",
	"trimmer-near-limit",
	"trimmer-offline",
	"trimmer-offline",
	"trimmer-opened",
	"trimmer-opened",
	"trimmer-over-temperature",
	"trimmer-over-temperature",
	"trimmer-power-saver",
	"trimmer-power-saver",
	"trimmer-recoverable-failure",
	"trimmer-recoverable-failure",
	"trimmer-recoverable-storage-error",
	"trimmer-removed",
	"trimmer-resource-added",
	"trimmer-resource-removed",
	"trimmer-thermistor-failure",
	"trimmer-timing-failure",
	"trimmer-turned-off",
	"trimmer-turned-on",
	"trimmer-under-temperature",
	"trimmer-unrecoverable-failure",
	"trimmer-unrecoverable-storage-error",
	"trimmer-warming-up",
	"unknown",
	"wrapper-added",
	"wrapper-almost-empty",
	"wrapper-almost-full",
	"wrapper-at-limit",
	"wrapper-closed",
	"wrapper-configuration-change",
	"wrapper-cover-closed",
	"wrapper-cover-open",
	"wrapper-empty",
	"wrapper-full",
	"wrapper-interlock-closed",
	"wrapper-interlock-open",
	"wrapper-jam",
	"wrapper-life-almost-over",
	"wrapper-life-over",
	"wrapper-memory-exhausted",
	"wrapper-missing",
	"wrapper-motor-failure",
	"wrapper-near-limit",
	"wrapper-offline",
	"wrapper-opened",
	"wrapper-over-temperature",
	"wrapper-power-saver",
	"wrapper-recoverable-failure",
	"wrapper-recoverable-storage-error",
	"wrapper-removed",
	"wrapper-resource-added",
	"wrapper-resource-removed",
	"wrapper-thermistor-failure",
	"wrapper-timing-failure",
	"wrapper-turned-off",
	"wrapper-turned-on",
	"wrapper-under-temperature",
	"wrapper-unrecoverable-failure",
	"wrapper-unrecoverable-storage-error",
	"wrapper-warming-up"
]);
keywords["proof-print-supported"]=						setof_keyword([
	"media",
	"media-col",
	"proof-print-copies"
]);
keywords["pwg-raster-document-sheet-back"]=				keyword([
	"flipped",
	"manual-tumble",
	"normal",
	"rotated"
]);
keywords["pwg-raster-document-type-supported"]=			setof_keyword([
	"adobe-rgb_8",
	"adobe-rgb_16",
	"black_1",
	"black_8",
	"black_16",
	"cmyk_8",
	"cmyk_16",
	"device1_8",
	"device1_16",
	"device2_8",
	"device2_16",
	"device3_8",
	"device3_16",
	"device4_8",
	"device4_16",
	"device5_8",
	"device5_16",
	"device6_8",
	"device6_16",
	"device7_8",
	"device7_16",
	"device8_8",
	"device8_16",
	"device9_8",
	"device9_16",
	"device10_8",
	"device10_16",
	"device11_8",
	"device11_16",
	"device12_8",
	"device12_16",
	"device13_8",
	"device13_16",
	"device14_8",
	"device14_16",
	"device15_8",
	"device15_16",
	"rgb_8",
	"rgb_16",
	"sgray_1",
	"sgray_8",
	"sgray_16",
	"srgb_8",
	"srgb_16"
]);
keywords["requested-attributes"]=						keyword([
	"all",
	"document-description",
	"document-template",
	"job-description",
	"job-template",
	"printer-description",
	"subscription-description",
	"subscription-template"
]);
keywords["save-disposition"]=							keyword([
	"none",
	"print-save",
	"save-only"
]);
keywords["save-disposition-supported"]=					setof_keyword(
	keywords["save-disposition"]
);
keywords["save-info-supported"]=						setof_keyword([
	"save-document-format",
	"save-location",
	"save-name"
]);
keywords["separator-sheets-type"]=						keyword_name([
	"both-sheets",
	"end-sheet",
	"none",
	"slip-sheets",
	"start-sheet"
]);
keywords["separator-sheets-type-supported"]=			setof_keyword_name(
	keywords["separator-sheets-type"]
);
keywords["sheet-collate"]=								keyword([
	"collated",
	"uncollated"
]);
keywords["sheet-collate-default"]=						keyword(
	keywords["sheet-collate"]
);
keywords["sheet-collate-supported"]=					setof_keyword(
	keywords["sheet-collate"]
);
keywords["sides"]=										keyword([
	"one-sided",
	"two-sided-long-edge",
	"two-sided-short-edge"
]);
keywords["sides-default"]=								keyword(
	keywords["sides"]
);
keywords["sides-supported"]=							setof_keyword(
	keywords["sides"]
);
keywords["stitching-reference-edge"]=					keyword([
	"bottom",
	"left",
	"right",
	"top"
]);
keywords["stitching-reference-edge-supported"]=			setof_keyword(
	keywords["stitching-reference-edge"]
);
keywords["stitching-supported"]=						setof_keyword([
	"stitching-locations",
	"stitching-offset",
	"stitching-reference-edge"
]);
keywords["uri-authentication-supported"]=				setof_keyword([
	"basic",
	"certificate",
	"digest",
	"negotiate",
	"none",
	"requesting-user-name"
]);
keywords["uri-security-supported"]=						setof_keyword([
	"none",
	"ssl3",
	"tls"
]);
keywords["which-jobs"]=									keyword([
	"aborted",
	"all",
	"canceled",
	"completed",
	"not-completed",
	"pending",
	"pending-held",
	"processing",
	"processing-stopped",
	"proof-print",
	"saved"
]);
keywords["which-jobs-supported"]=						setof_keyword(
	keywords["which-jobs"]
);
keywords["x-image-position"]=							keyword([
	"center",
	"left",
	"none",
	"right"
]);
keywords["x-image-position-default"]=					keyword(
	keywords["x-image-position"]
);
keywords["x-image-position-supported"]=					setof_keyword(
	keywords["x-image-position"]
);
keywords["xri-authentication-supported"]=				setof_keyword([
	"basic",
	"certificate",
	"digest",
	"none",
	"requesting-user-name"
]);
keywords["xri-security-supported"]=						setof_keyword([
	"none",
	"ssl3",
	"tls"
]);
keywords["y-image-position"]=							keyword([
	"bottom",
	"center",
	"none",
	"top"
]);
keywords["y-image-position-default"]=					keyword(
	keywords["y-image-position"]
);
keywords["y-image-position-supported"]=					setof_keyword(
	keywords["y-image-position"]
);

module.exports = keywords;
},{"./attributes":5}],9:[function(require,module,exports){


var enums = require('./enums'),
	operations = enums['operations-supported'],
	statusCodes = require('./status-codes'),
	tags = require('./tags'),
	RS = '\u001e'
;

module.exports = function(buf) {
	var obj = {};
	var position = 0;
	var encoding = 'utf8';
	function read1(){
		return buf[position++];
	}
	function read2(){
		var val = buf.readInt16BE(position, true);
		position+=2;
		return val;
	}
	function read4(){
		var val = buf.readInt32BE(position, true);
		position+=4;
		return val;
	}
	function read(length, enc){
		if(length==0) return '';
		return buf.toString(enc||encoding, position, position+=length);
	}
	function readGroups(){
		var group;
		while(position < buf.length && (group = read1()) !== 0x03){//end-of-attributes-tag
			readGroup(group);
		}
	}
	function readGroup(group){
		var name = tags.lookup[group];
		group={};
		if(obj[name]){
			if(!Array.isArray(obj[name]))
				obj[name] = [obj[name]];
			obj[name].push(group);
		}
		else obj[name] = group;

		while(buf[position] >= 0x0F) {// delimiters are between 0x00 to 0x0F
			readAttr(group);
		}
	}
	function readAttr(group){
		var tag = read1();
		//TODO: find a test for this
		if (tag === 0x7F){//tags.extension
			tag = read4();
		}
		var name = read(read2());
		group[name] = readValues(tag, name)
	}
	function hasAdditionalValue(){
		var current = buf[position];
		return current !== 0x4A //tags.memberAttrName
			&& current !== 0x37 //tags.endCollection
			&& current !== 0x03 //tags.end-of-attributes-tag
			&& buf[position+1] === 0x00 && buf[position+2] === 0x00;
	}
	function readValues(type, name){
		var value = readValue(type, name);
		if(hasAdditionalValue()){
			value = [value];
			do{
				type = read1();
				read2();//empty name
				value.push(readValue(type, name));
			}
			while(hasAdditionalValue())
		}
		return value;
	}
	function readValue(tag, name){
		var length = read2();
		//http://tools.ietf.org/html/rfc2910#section-3.9
		switch (tag) {
			case tags.enum:
				var val = read4();
				return (enums[name] && enums[name].lookup[val]) || val;
			case tags.integer:
				return read4();

			case tags.boolean:
				return !!read1();

			case tags.rangeOfInteger:
				return [read4(), read4()];

			case tags.resolution:
				return [read4(), read4(), read1()===0x03? 'dpi':'dpcm'];

			case tags.dateTime:
				// http://tools.ietf.org/html/rfc1903 page 17
				var date = new Date(read2(), read1(), read1(), read1(), read1(), read1(), read1());
				//silly way to add on the timezone
				return new Date(date.toISOString().substr(0,23).replace('T',',') +','+ String.fromCharCode(read(1)) + read(1) + ':' + read(1));

			case tags.textWithLanguage:
			case tags.nameWithLanguage:
				var lang = read(read2());
				var subval = read(read2());
				return lang+RS+subval;

			case tags.nameWithoutLanguage:
			case tags.textWithoutLanguage:
			case tags.octetString:
			case tags.memberAttrName:
				return read(length);

			case tags.keyword:
			case tags.uri:
			case tags.uriScheme:
			case tags.charset:
			case tags.naturalLanguage:
			case tags.mimeMediaType:
				return read(length, 'ascii');

			case tags.begCollection:
				//the spec says a value could be present- but can be ignored
				read(length);
				return readCollection();

			case tags['no-value']:
			default:
				debugger;
				return module.exports.handleUnknownTag(tag, name, length, read)
		}
	}
	function readCollection(){
		var tag;
		var collection = {};

		while((tag = read1()) !== 0x37){//tags.endCollection
			if(tag !== 0x4A){
				console.log("unexpected:", tags.lookup[tag]);
				return;
			}
			//read nametag name and discard it
			read(read2());
			var name = readValue(0x4A);
			var values = readCollectionItemValue();
			collection[name] = values;
		}
		//Read endCollection name & value and discard it.
		//The spec says that they MAY have contents in the
		// future- so we can't assume they are empty.
		read(read2());
		read(read2());

		return collection;
	}
	function readCollectionItemValue(name){
		var tag = read1();
		//TODO: find a test for this
		if (tag === 0x7F){//tags.extension
			tag = read4();
		}
		//read valuetag name and discard it
		read(read2());

		return readValues(tag, name);
	}

	obj.version = read1() + '.' + read1();
	var bytes2and3 = read2();
	//byte[2] and byte[3] are used to define the 'operation' on
	//requests, but used to hold the statusCode on responses. We
	//can almost detect if it is a req or a res- but sadly, six
	//values overlap. In these cases, the parser will give both and
	//the consumer can ignore (or delete) whichever they don't want.
	if(bytes2and3 >= 0x02 || bytes2and3 <= 0x3D)
		obj.operation = operations.lookup[bytes2and3];

	if(bytes2and3 <= 0x0007 || bytes2and3 >= 0x0400)
		obj.statusCode = statusCodes.lookup[bytes2and3];
	obj.id = read4();
	readGroups();

	if(position<buf.length)
		obj.data = buf.toString(encoding, position);

	return obj;
};
module.exports.handleUnknownTag = 	function log(tag, name, length, read) {
	var value = length? read(length) : undefined;
	console.log("The spec is not clear on how to handle tag " +tag+ ": " +name+ "=" +String(value)+ ". " +
		"Please open a github issue to help find a solution!");
	return value;
};

},{"./enums":6,"./status-codes":13,"./tags":14}],10:[function(require,module,exports){

var request = require('./request'),
	serialize = require('./serializer'),
	extend = require('./ipputil').extend,
	parseurl = require('url').parse
	;

function Printer(url, opts){
	if(!(this instanceof Printer)) return new Printer(url, opts);
	opts = opts || {};
	this.url = typeof url==="string"? parseurl(url) : url;
	this.version = opts.version || '2.0';
	this.uri = opts.uri || 'ipp://' + this.url.host + this.url.path;
	this.charset = opts.charset || 'utf-8';
	this.language = opts.language || 'en-us';
}
Printer.prototype = {
	_message: function(operation, msg){
		if(typeof operation === "undefined") operation = 'Get-Printer-Attributes';

		var base = {
			version: this.version,
			operation: operation,
			id: null,//will get added by serializer if one isn't given
			'operation-attributes-tag': {
				//these are required to be in this order
				'attributes-charset': this.charset,
				'attributes-natural-language': this.language,
				'printer-uri': this.uri
			}
		};
		//these are required to be in this order
		if(msg && msg['operation-attributes-tag']['job-id'])
			base['operation-attributes-tag']['job-id'] = msg['operation-attributes-tag']['job-id'];
		//yes, this gets done in extend()- however, by doing this now, we define the position in the result object.
		else if(msg && msg['operation-attributes-tag']['job-uri'])
			base['operation-attributes-tag']['job-uri'] = msg['operation-attributes-tag']['job-uri'];

		msg = extend(base, msg);
		if(msg['operation-attributes-tag']['job-uri'])
			delete msg['operation-attributes-tag']['printer-uri'];
		return msg;
	},
	execute: function(operation, msg, cb){
		msg = this._message(operation, msg);
		var buf = serialize(msg);
//		console.log(buf.toString('hex'));
//		console.log(JSON.stringify(
//			require('./parser')(buf), null, 2
//		));
		request(this.url, buf, cb);
	}
}

module.exports = Printer;

},{"./ipputil":7,"./request":11,"./serializer":12,"url":59}],11:[function(require,module,exports){
(function (Buffer){

var http = require('http'),
	https = require('https'),
	url = require('url'),
	parse = require('./parser');

module.exports = function(opts, buffer, cb){
	var streamed = typeof buffer === "function";
	//All IPP requires are POSTs- so we must have some data.
	//  10 is just a number I picked- this probably should have something more meaningful
	if(!Buffer.isBuffer(buffer) || buffer.length<10){
		return cb(new Error("Data required"));
	}
	if(typeof opts === "string")
		opts = url.parse(opts);
	if(!opts.port) opts.port = 631;

	if(!opts.headers) opts.headers = {};
	opts.headers['Content-Type'] = 'application/ipp';
	opts.method = "POST";
	
	if(opts.protocol==="ipp:")
		opts.protocol="http:";

	if(opts.protocol==="ipps:")
		opts.protocol="https:";

	var req = (opts.protocol==="https:" ? https : http).request(opts, function(res){
//		console.log('STATUS: ' + res.statusCode);
//		console.log('HEADERS: ' + JSON.stringify(res.headers));
		switch(res.statusCode){
			case 100:
				if(opts.headers['Expect'] !== '100-Continue' || typeof opts.continue !== "function"){
					cb(new IppResponseError(res.statusCode));
				}
				return console.log("100 Continue");
			case 200:
				return readResponse(res, cb);
			default:
				cb(new IppResponseError(res.statusCode));
				return console.log(res.statusCode, "response");
		}
	});
	req.on('error', function(err) {
		cb(err);
	});
	if(opts.headers['Expect'] === '100-Continue' && typeof opts.continue=== "function"){
		req.on('continue', function() {
			opts.continue(req);
		});
	}
	req.write(buffer);
	req.end();
};
function readResponse(res, cb){
	var chunks = [],length=0;
	res.on('data', function(chunk){
		length+=chunk.length;
		chunks.push(chunk);
	});
	res.on('end', function(){
		var response = parse(Buffer.concat(chunks, length));
		delete response.operation;
		cb(null, response);
	});
}

function IppResponseError(statusCode, message) {
  this.name = 'IppResponseError';
  this.statusCode = statusCode;
  this.message = message || 'Received unexpected response status ' + statusCode + ' from the printer';
  this.stack = (new Error()).stack;
}
IppResponseError.prototype = Object.create(Error.prototype);
IppResponseError.prototype.constructor = IppResponseError;

}).call(this,require("buffer").Buffer)
},{"./parser":9,"buffer":23,"http":53,"https":27,"url":59}],12:[function(require,module,exports){
(function (Buffer){

var operations = require('./enums')['operations-supported'],
	tags = require('./tags'),
	versions = require('./versions'),
	attributes = require('./attributes'),
	enums = require('./enums'),
	keywords = require('./keywords'),
	statusCodes = require('./status-codes'),
	RS = '\u001e'
;
function random(){
	return +Math.random().toString().substr(-8);
}

module.exports = function serializer(msg){
	var buf = new Buffer(10240);
	var position = 0;
	function write1(val){
		checkBufferSize(1);
		buf.writeUInt8(val, position);
		position+=1;
	}
	function write2(val){
		checkBufferSize(2);
		buf.writeUInt16BE(val, position);
		position+=2;
	}
	function write4(val){
		checkBufferSize(4);
		buf.writeUInt32BE(val, position);
		position+=4;
	}
	function write(str, enc){
		var length = Buffer.byteLength(str);
		write2(length);
		checkBufferSize(length);
		buf.write(str, position, length, enc || "utf8");
		position+=length;
	}
	function checkBufferSize(length){
		if (position + length > buf.length){
			buf = Buffer.concat([buf], 2 * buf.length);
		}
	}
	var special = {'attributes-charset':1, 'attributes-natural-language':2};
	var groupmap = {
		"job-attributes-tag":	               ['Job Template', 'Job Description'],
		'operation-attributes-tag':          'Operation',
		'printer-attributes-tag':            'Printer Description',
		"unsupported-attributes-tag":        '',//??
		"subscription-attributes-tag":       'Subscription Description',
		"event-notification-attributes-tag": 'Event Notifications',
		"resource-attributes-tag":           '',//??
		"document-attributes-tag":           'Document Description'
	};
	function writeGroup(tag){
		var attrs = msg[tag];
		if(!attrs) return;
		var keys = Object.keys(attrs);
		//'attributes-charset' and 'attributes-natural-language' need to come first- so we sort them to the front
		if(tag==tags['operation-attributes-tag'])
			keys = keys.sort(function(a,b){ return (special[a]||3)-(special[b]||3); });
		var groupname = groupmap[tag];
		write1(tags[tag]);
		keys.forEach(function(name){
			attr(groupname, name, attrs);
		});
	}
	function attr(group, name, obj){
		var groupName = Array.isArray(group)
			? group.find( function (grp) { return attributes[grp][name] })
			: group;
		if(!groupName) throw "Unknown attribute: " + name;

		var syntax = attributes[groupName][name];
		if(!syntax) throw "Unknown attribute: " + name;

		var value = obj[name];
		if(!Array.isArray(value))
			value = [value];

		value.forEach(function(value, i){
			//we need to re-evaluate the alternates every time
			var syntax2 = Array.isArray(syntax)? resolveAlternates(syntax, name, value) : syntax;
			var tag = getTag(syntax2, name, value);
			if(tag===tags.enum)
				value = enums[name][value];

			write1(tag);
			if(i==0){
				write(name);
			}
			else {
				write2(0x0000);//empty name
			}

			writeValue(tag, value, syntax2.members);
		});
	}
	function getTag(syntax, name, value){
		var tag = syntax.tag;
		if(!tag){
			var hasRS = !!~value.indexOf(RS);
			tag = tags[syntax.type+(hasRS?'With':'Without')+'Language'];
		}
		return tag;
	}
	function resolveAlternates(array, name, value){
		switch(array.alts){
			case 'keyword,name':
			case 'keyword,name,novalue':
				if(value===null && array.lookup['novalue']) return array.lookup['novalue'];
				return ~keywords[name].indexOf(value)? array.lookup.keyword : array.lookup.name;
			case 'integer,rangeOfInteger':
				return Array.isArray(value)? array.lookup.rangeOfInteger : array.lookup.integer;
			case 'dateTime,novalue':
				return !IsNaN(date.parse(value))? array.lookup.dateTime : array.lookup['novalue'];
			case 'integer,novalue':
				return !IsNaN(value)? array.lookup.integer : array.lookup['novalue'];
			case 'name,novalue':
				return value!==null? array.lookup.name : array.lookup['novalue'];
			case 'novalue,uri':
				return value!==null? array.lookup.uri : array.lookup['novalue'];
			case 'enumeration,unknown':
				return enums[name][value]? array.lookup['enumeration'] : array.lookup.unknown;
			case 'enumeration,novalue':
				return value!==null? array.lookup['enumeration'] : array.lookup['novalue'];
			case 'collection,novalue':
				return value!==null? array.lookup['enumeration'] : array.lookup['novalue'];
			default:
				throw "Unknown atlernates";
		}
	}
	function writeValue(tag, value, submembers){
		switch(tag){
			case tags.enum:
				write2(0x0004);
				return write4(value);
			case tags.integer:
				write2(0x0004);
				return write4(value);

			case tags.boolean:
				write2(0x0001);
				return write1(Number(value));

			case tags.rangeOfInteger:
				write2(0x0008);
				write4(value[0]);
				write4(value[1]);
				return;

			case tags.resolution:
				write2(0x0009);
				write4(value[0]);
				write4(value[1]);
				write1(value[2]==='dpi'? 0x03 : 0x04);
				return;

			case tags.dateTime:
				write2(0x000B);
				write2(value.getFullYear());
				write1(value.getMonth());
				write1(value.getDate());
				write1(value.getHours());
				write1(value.getMinutes());
				write1(value.getSeconds());
				write1(value.getMilliseconds());
				var tz = timezone(value);
				write1(tz[0]);// + or -
				write1(tz[1]);//hours
				write1(tz[2]);//minutes
				return;

			case tags.textWithLanguage:
			case tags.nameWithLanguage:
				write2(parts[0].length);
				write2(parts[0]);
				write2(parts[1].length);
				write2(parts[1]);
				return;

			case tags.nameWithoutLanguage:
			case tags.textWithoutLanguage:
			case tags.octetString:
			case tags.memberAttrName:
				return write(value);

			case tags.keyword:
			case tags.uri:
			case tags.uriScheme:
			case tags.charset:
			case tags.naturalLanguage:
			case tags.mimeMediaType:
				return write(value, 'ascii');

			case tags.begCollection:
				write2(0);//empty value
				return writeCollection(value, submembers);

			case tags["no-value"]:
				//empty value? I can't find where this is defined in any spec.
				return write2(0);

			default:
				debugger;
				console.log(tag, "not handled");
		}
	}
	function writeCollection(value, members){
		Object.keys(value).forEach(function(key){
			var subvalue = value[key];
			var subsyntax = members[key];

			if(Array.isArray(subsyntax))
				subsyntax = resolveAlternates(subsyntax, key, subvalue);

			var tag = getTag(subsyntax, key, subvalue);
			if(tag===tags.enum)
				subvalue = enums[key][subvalue];

			write1(tags.memberAttrName)
			write2(0)//empty name
			writeValue(tags.memberAttrName, key);
			write1(tag)
			write2(0)//empty name
			writeValue(tag, subvalue, subsyntax.members);
		});
		write1(tags.endCollection)
		write2(0)//empty name
		write2(0)//empty value
	}

	write2(versions[msg.version||'2.0']);
	write2(msg.operation? operations[msg.operation] : statusCodes[msg.statusCode]);
	write4(msg.id||random());//request-id

	writeGroup('operation-attributes-tag');
	writeGroup('job-attributes-tag');
	writeGroup('printer-attributes-tag');
	writeGroup('document-attributes-tag');
	//TODO... add the others

	write1(0x03);//end


	if(!msg.data)
		return buf.slice(0, position);

	if(!Buffer.isBuffer(msg.data))
		throw "data must be a Buffer"

	var buf2 = new Buffer(position + msg.data.length);
	buf.copy(buf2, 0, 0, position);
	msg.data.copy(buf2, position, 0);
	return buf2;
};
function timezone(d) {
	var z = d.getTimezoneOffset();
	return [
		z > 0 ? "-" : "+",
		~~(Math.abs(z) / 60),
		Math.abs(z) % 60
	];
}

}).call(this,require("buffer").Buffer)
},{"./attributes":5,"./enums":6,"./keywords":8,"./status-codes":13,"./tags":14,"./versions":15,"buffer":23}],13:[function(require,module,exports){

var xref = require('./ipputil').xref;

var status = [];
/* Success 0x0000 - 0x00FF */
status[0x0000] = 'successful-ok';										//http://tools.ietf.org/html/rfc2911#section-13.1.2.1
status[0x0001] = 'successful-ok-ignored-or-substituted-attributes';		//http://tools.ietf.org/html/rfc2911#section-13.1.2.2 & http://tools.ietf.org/html/rfc3995#section-13.5
status[0x0002] = 'successful-ok-conflicting-attributes';				//http://tools.ietf.org/html/rfc2911#section-13.1.2.3
status[0x0003] = 'successful-ok-ignored-subscriptions';					//http://tools.ietf.org/html/rfc3995#section-12.1
status[0x0004] = 'successful-ok-ignored-notifications';					//http://tools.ietf.org/html/draft-ietf-ipp-indp-method-05#section-9.1.1    did not get standardized
status[0x0005] = 'successful-ok-too-many-events';						//http://tools.ietf.org/html/rfc3995#section-13.4
status[0x0006] = 'successful-ok-but-cancel-subscription';				//http://tools.ietf.org/html/draft-ietf-ipp-indp-method-05#section-9.2.2    did not get standardized
status[0x0007] = 'successful-ok-events-complete';						//http://tools.ietf.org/html/rfc3996#section-10.1

status[0x0400] = 'client-error-bad-request';							//http://tools.ietf.org/html/rfc2911#section-13.1.4.1
status[0x0401] = 'client-error-forbidden';								//http://tools.ietf.org/html/rfc2911#section-13.1.4.2
status[0x0402] = 'client-error-not-authenticated';						//http://tools.ietf.org/html/rfc2911#section-13.1.4.3
status[0x0403] = 'client-error-not-authorized';							//http://tools.ietf.org/html/rfc2911#section-13.1.4.4
status[0x0404] = 'client-error-not-possible';							//http://tools.ietf.org/html/rfc2911#section-13.1.4.5
status[0x0405] = 'client-error-timeout';								//http://tools.ietf.org/html/rfc2911#section-13.1.4.6
status[0x0406] = 'client-error-not-found';								//http://tools.ietf.org/html/rfc2911#section-13.1.4.7
status[0x0407] = 'client-error-gone';									//http://tools.ietf.org/html/rfc2911#section-13.1.4.8
status[0x0408] = 'client-error-request-entity-too-large';				//http://tools.ietf.org/html/rfc2911#section-13.1.4.9
status[0x0409] = 'client-error-request-value-too-long';					//http://tools.ietf.org/html/rfc2911#section-13.1.4.1
status[0x040A] = 'client-error-document-format-not-supported';			//http://tools.ietf.org/html/rfc2911#section-13.1.4.11
status[0x040B] = 'client-error-attributes-or-values-not-supported';		//http://tools.ietf.org/html/rfc2911#section-13.1.4.12 & http://tools.ietf.org/html/rfc3995#section-13.2
status[0x040C] = 'client-error-uri-scheme-not-supported';				//http://tools.ietf.org/html/rfc2911#section-13.1.4.13 & http://tools.ietf.org/html/rfc3995#section-13.1
status[0x040D] = 'client-error-charset-not-supported';					//http://tools.ietf.org/html/rfc2911#section-13.1.4.14
status[0x040E] = 'client-error-conflicting-attributes';					//http://tools.ietf.org/html/rfc2911#section-13.1.4.15
status[0x040F] = 'client-error-compression-not-supported';				//http://tools.ietf.org/html/rfc2911#section-13.1.4.16
status[0x0410] = 'client-error-compression-error';						//http://tools.ietf.org/html/rfc2911#section-13.1.4.17
status[0x0411] = 'client-error-document-format-error';					//http://tools.ietf.org/html/rfc2911#section-13.1.4.18
status[0x0412] = 'client-error-document-access-error';					//http://tools.ietf.org/html/rfc2911#section-13.1.4.19
status[0x0413] = 'client-error-attributes-not-settable';				//http://tools.ietf.org/html/rfc3380#section-7.1
status[0x0414] = 'client-error-ignored-all-subscriptions';				//http://tools.ietf.org/html/rfc3995#section-12.2
status[0x0415] = 'client-error-too-many-subscriptions';					//http://tools.ietf.org/html/rfc3995#section-13.2
status[0x0416] = 'client-error-ignored-all-notifications';				//http://tools.ietf.org/html/draft-ietf-ipp-indp-method-06#section-9.1.2    did not get standardized
status[0x0417] = 'client-error-client-print-support-file-not-found';	//http://tools.ietf.org/html/draft-ietf-ipp-install-04#section-10.1         did not get standardized
status[0x0418] = 'client-error-document-password-error';				//ftp://ftp.pwg.org/pub/pwg/ipp/wd/wd-ippjobprinterext3v10-20120420.pdf     did not get standardized
status[0x0419] = 'client-error-document-permission-error';				//ftp://ftp.pwg.org/pub/pwg/ipp/wd/wd-ippjobprinterext3v10-20120420.pdf     did not get standardized
status[0x041A] = 'client-error-document-security-error';				//ftp://ftp.pwg.org/pub/pwg/ipp/wd/wd-ippjobprinterext3v10-20120420.pdf     did not get standardized
status[0x041B] = 'client-error-document-unprintable-error';				//ftp://ftp.pwg.org/pub/pwg/ipp/wd/wd-ippjobprinterext3v10-20120420.pdf     did not get standardized
/* Server error 0x0500 - 0x05FF */
status[0x0500] = 'server-error-internal-error';							//http://tools.ietf.org/html/rfc2911#section-13.1.5.1
status[0x0501] = 'server-error-operation-not-supported';				//http://tools.ietf.org/html/rfc2911#section-13.1.5.2
status[0x0502] = 'server-error-service-unavailable';					//http://tools.ietf.org/html/rfc2911#section-13.1.5.3
status[0x0503] = 'server-error-version-not-supported';					//http://tools.ietf.org/html/rfc2911#section-13.1.5.4
status[0x0504] = 'server-error-device-error';							//http://tools.ietf.org/html/rfc2911#section-13.1.5.5
status[0x0505] = 'server-error-temporary-error';						//http://tools.ietf.org/html/rfc2911#section-13.1.5.6
status[0x0506] = 'server-error-not-accepting-jobs';						//http://tools.ietf.org/html/rfc2911#section-13.1.5.7
status[0x0507] = 'server-error-busy';									//http://tools.ietf.org/html/rfc2911#section-13.1.5.8
status[0x0508] = 'server-error-job-canceled';							//http://tools.ietf.org/html/rfc2911#section-13.1.5.9
status[0x0509] = 'server-error-multiple-document-jobs-not-supported';	//http://tools.ietf.org/html/rfc2911#section-13.1.5.10
status[0x050A] = 'server-error-printer-is-deactivated';					//http://tools.ietf.org/html/rfc3998#section-5.1
status[0x050B] = 'server-error-too-many-jobs';							//ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobext10-20031031-5100.7.pdf
status[0x050C] = 'server-error-too-many-documents';						//ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobext10-20031031-5100.7.pdf

module.exports = xref(status);

},{"./ipputil":7}],14:[function(require,module,exports){

var xref = require('./ipputil').xref;

//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-7
//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-8
//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-9
var tags = [
	,									// 0x00 http://tools.ietf.org/html/rfc2910#section-3.5.1
	"operation-attributes-tag",			// 0x01 http://tools.ietf.org/html/rfc2910#section-3.5.1
	"job-attributes-tag",				// 0x02 http://tools.ietf.org/html/rfc2910#section-3.5.1
	"end-of-attributes-tag",			// 0x03 http://tools.ietf.org/html/rfc2910#section-3.5.1
	"printer-attributes-tag",			// 0x04 http://tools.ietf.org/html/rfc2910#section-3.5.1
	"unsupported-attributes-tag",		// 0x05 http://tools.ietf.org/html/rfc2910#section-3.5.1
	"subscription-attributes-tag",		// 0x06 http://tools.ietf.org/html/rfc3995#section-14
	"event-notification-attributes-tag",// 0x07 http://tools.ietf.org/html/rfc3995#section-14
	"resource-attributes-tag",			// 0x08 http://tools.ietf.org/html/draft-ietf-ipp-get-resource-00#section-11    did not get standardized
	"document-attributes-tag",			// 0x09 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
	,,,,,,								// 0x0A - 0x0F
	"unsupported",						// 0x10 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"default",							// 0x11 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"unknown",							// 0x12 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"no-value",							// 0x13 http://tools.ietf.org/html/rfc2910#section-3.5.2
	,									// 0x14
	"not-settable",						// 0x15 http://tools.ietf.org/html/rfc3380#section-8.1
	"delete-attribute",					// 0x16 http://tools.ietf.org/html/rfc3380#section-8.2
	"admin-define",						// 0x17 http://tools.ietf.org/html/rfc3380#section-8.3
	,,,,,,,,,							// 0x18 - 0x20
	"integer",							// 0x21 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"boolean",							// 0x22 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"enum",								// 0x23 http://tools.ietf.org/html/rfc2910#section-3.5.2
	,,,,,,,,,,,,						// 0x24 - 0x2F
	"octetString",						// 0x30 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"dateTime",							// 0x31 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"resolution",						// 0x32 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"rangeOfInteger",					// 0x33 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"begCollection",					// 0x34 http://tools.ietf.org/html/rfc3382#section-7.1
	"textWithLanguage",					// 0x35 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"nameWithLanguage",					// 0x36 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"endCollection",					// 0x37 http://tools.ietf.org/html/rfc3382#section-7.1
	,,,,,,,,,							// 0x38 - 0x40
	"textWithoutLanguage",				// 0x41 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"nameWithoutLanguage",				// 0x42 http://tools.ietf.org/html/rfc2910#section-3.5.2
	,									// 0x43
	"keyword",							// 0x44 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"uri",								// 0x45 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"uriScheme",						// 0x46 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"charset",							// 0x47 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"naturalLanguage",					// 0x48 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"mimeMediaType",					// 0x49 http://tools.ietf.org/html/rfc2910#section-3.5.2
	"memberAttrName"					// 0x4A http://tools.ietf.org/html/rfc3382#section-7.1
];
tags[0x7F] = "extension";// http://tools.ietf.org/html/rfc2910#section-3.5.2
module.exports = xref(tags);

},{"./ipputil":7}],15:[function(require,module,exports){

var versions = [];
versions[0x0100] = '1.0';
versions[0x0101] = '1.1';
versions[0x0200] = '2.0';
versions[0x0201] = '2.1';

module.exports = require('./ipputil').xref(versions);

},{"./ipputil":7}],16:[function(require,module,exports){
'use strict';
var immediate = require('immediate');

/* istanbul ignore next */
function INTERNAL() {}

var handlers = {};

var REJECTED = ['REJECTED'];
var FULFILLED = ['FULFILLED'];
var PENDING = ['PENDING'];

module.exports = Promise;

function Promise(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise.prototype["catch"] = function (onRejected) {
  return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new this.constructor(INTERNAL);
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem.prototype.callFulfilled = function (value) {
  handlers.resolve(this.promise, value);
};
QueueItem.prototype.otherCallFulfilled = function (value) {
  unwrap(this.promise, this.onFulfilled, value);
};
QueueItem.prototype.callRejected = function (value) {
  handlers.reject(this.promise, value);
};
QueueItem.prototype.otherCallRejected = function (value) {
  unwrap(this.promise, this.onRejected, value);
};

function unwrap(promise, func, value) {
  immediate(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers.resolve(promise, returnValue);
    }
  });
}

handlers.resolve = function (self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return handlers.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers.reject = function (self, error) {
  self.state = REJECTED;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && (typeof obj === 'object' || typeof obj === 'function') && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise.resolve = resolve;
function resolve(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers.resolve(new this(INTERNAL), value);
}

Promise.reject = reject;
function reject(reason) {
  var promise = new this(INTERNAL);
  return handlers.reject(promise, reason);
}

Promise.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers.resolve(promise, values);
      }
    }
  }
}

Promise.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
  }
}

},{"immediate":3}],17:[function(require,module,exports){
module.exports = typeof Promise === 'function' ? Promise : require('lie');

},{"lie":16}],18:[function(require,module,exports){
module.exports = require('stream-to').buffer
},{"stream-to":19}],19:[function(require,module,exports){
(function (Buffer){
exports.array = toArray
exports.buffer = toBuffer

function toArray(stream, callback) {
  var arr = []

  stream.on('data', onData)
  stream.once('end', onEnd)
  stream.once('error', callback)
  stream.once('error', cleanup)
  stream.once('close', cleanup)

  function onData(doc) {
    arr.push(doc)
  }

  function onEnd() {
    callback(null, arr)
    cleanup()
  }

  function cleanup() {
    arr = null
    stream.removeListener('data', onData)
    stream.removeListener('end', onEnd)
    stream.removeListener('error', callback)
    stream.removeListener('error', cleanup)
    stream.removeListener('close', cleanup)
  }

  return stream
}

function toBuffer(stream, callback) {
  toArray(stream, function (err, arr) {
    if (err || !arr)
      callback(err)
    else
      callback(null, Buffer.concat(arr))
  })

  return stream
}
}).call(this,require("buffer").Buffer)
},{"buffer":23}],20:[function(require,module,exports){
(function (Buffer){
require('stream');
var blobUtil = require('blob-util');
var streamToBuffer = require('stream-to-buffer');
var ipp = require('ipp');

const url = new function() {
	this.resource = new function(){
		this.ipp = '/ipp/print';
	}

	this.printer = 'https://127.0.0.1:4444';
	this.ipp = this.printer + this.resource.ipp;
}

function printBufferIPP(name, buffer) {
	var printingUrl = url.ipp;
	var printer = ipp.Printer(printingUrl);
	var msg = {
		"operation-attributes-tag": {
		"requesting-user-name": "Nadim Zubidat",
		"job-name": name
		},
		data: buffer
	}
	console.log('Sending IPP job for printing to ' + printingUrl);
	printer.execute("Print-Job", msg, function(err, res) {
		console.log(err + res);
	});
}

function printBlobIPP(name, blob) {
	console.log('IPP print as a blob');
	blobUtil.blobToArrayBuffer(blob).then(function (arrayBuff) {
		var buffer = Buffer.from(arrayBuff);
		printBufferIPP(name, buffer);
	}).catch(function(err) {
		console.log(err);
	});
}

function printStreamIPP(name, stream) {
	console.log('IPP print as a stream');
	streamToBuffer(stream, function(err, buffer) {
		if (err) {
			console.log(err);
			return;
		}
		printBufferIPP(name, buffer);
	});
}

Lfp = function() {
	this.init();
}

Lfp.prototype = {
	init: function() {
		console.log('Printer initialized');
	},
	print: function(name, file) {
		if (file instanceof Blob) {
			printBlobIPP(name, file);
		} else {
			printStreamIPP(name, file);
		}
	}
};

exports.Lfp;

}).call(this,require("buffer").Buffer)
},{"blob-util":1,"buffer":23,"ipp":4,"stream":52,"stream-to-buffer":18}],21:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],22:[function(require,module,exports){

},{}],23:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value)) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (isArrayBufferView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
  return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":21,"ieee754":28}],24:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],25:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":30}],26:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],27:[function(require,module,exports){
var http = require('http')
var url = require('url')

var https = module.exports

for (var key in http) {
  if (http.hasOwnProperty(key)) https[key] = http[key]
}

https.request = function (params, cb) {
  params = validateParams(params)
  return http.request.call(this, params, cb)
}

https.get = function (params, cb) {
  params = validateParams(params)
  return http.get.call(this, params, cb)
}

function validateParams (params) {
  if (typeof params === 'string') {
    params = url.parse(params)
  }
  if (!params.protocol) {
    params.protocol = 'https:'
  }
  if (params.protocol !== 'https:') {
    throw new Error('Protocol "' + params.protocol + '" not supported. Expected "https:"')
  }
  return params
}

},{"http":53,"url":59}],28:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],29:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],30:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],31:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],32:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}

}).call(this,require('_process'))
},{"_process":33}],33:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],34:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],35:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],36:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],37:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":35,"./encode":36}],38:[function(require,module,exports){
module.exports = require('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":39}],39:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  processNextTick(cb, err);
};

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":41,"./_stream_writable":43,"core-util-is":25,"inherits":29,"process-nextick-args":32}],40:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":42,"core-util-is":25,"inherits":29}],41:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

// TODO(bmeurer): Change this back to const once hole checks are
// properly optimized away early in Ignition+TurboFan.
/*<replacement>*/
var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') {
    return emitter.prependListener(event, fn);
  } else {
    // This is a hack to make sure that our error handler is attached before any
    // userland ones.  NEVER DO THIS. This is here only because this code needs
    // to continue to work with older versions of Node.js that do not include
    // the prependListener() method. The goal is to eventually remove this hack.
    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
  }
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], self.emit.bind(self, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":39,"./internal/streams/BufferList":44,"./internal/streams/destroy":45,"./internal/streams/stream":46,"_process":33,"core-util-is":25,"events":26,"inherits":29,"isarray":31,"process-nextick-args":32,"safe-buffer":51,"string_decoder/":57,"util":22}],42:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return stream.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er, data) {
      done(stream, er, data);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data !== null && data !== undefined) stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":39,"core-util-is":25,"inherits":29}],43:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/
var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = _isUint8Array(chunk) && !state.objectMode;

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    processNextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    processNextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      processNextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":39,"./internal/streams/destroy":45,"./internal/streams/stream":46,"_process":33,"core-util-is":25,"inherits":29,"process-nextick-args":32,"safe-buffer":51,"util-deprecate":61}],44:[function(require,module,exports){
'use strict';

/*<replacement>*/

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();
},{"safe-buffer":51}],45:[function(require,module,exports){
'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      processNextTick(emitErrorNT, this, err);
    }
    return;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      processNextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":32}],46:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":26}],47:[function(require,module,exports){
module.exports = require('./readable').PassThrough

},{"./readable":48}],48:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":39,"./lib/_stream_passthrough.js":40,"./lib/_stream_readable.js":41,"./lib/_stream_transform.js":42,"./lib/_stream_writable.js":43}],49:[function(require,module,exports){
module.exports = require('./readable').Transform

},{"./readable":48}],50:[function(require,module,exports){
module.exports = require('./lib/_stream_writable.js');

},{"./lib/_stream_writable.js":43}],51:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":23}],52:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":26,"inherits":29,"readable-stream/duplex.js":38,"readable-stream/passthrough.js":47,"readable-stream/readable.js":48,"readable-stream/transform.js":49,"readable-stream/writable.js":50}],53:[function(require,module,exports){
(function (global){
var ClientRequest = require('./lib/request')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Normally, the page is loaded from http or https, so not specifying a protocol
	// will result in a (valid) protocol-relative url. However, this won't work if
	// the protocol is something else, like 'file:'
	var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

	var protocol = opts.protocol || defaultProtocol
	var host = opts.hostname || opts.host
	var port = opts.port
	var path = opts.path || '/'

	// Necessary for IPv6 addresses
	if (host && host.indexOf(':') !== -1)
		host = '[' + host + ']'

	// This may be a relative url. The browser should always be able to interpret it correctly.
	opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
	opts.method = (opts.method || 'GET').toUpperCase()
	opts.headers = opts.headers || {}

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.STATUS_CODES = statusCodes

http.METHODS = [
	'CHECKOUT',
	'CONNECT',
	'COPY',
	'DELETE',
	'GET',
	'HEAD',
	'LOCK',
	'M-SEARCH',
	'MERGE',
	'MKACTIVITY',
	'MKCOL',
	'MOVE',
	'NOTIFY',
	'OPTIONS',
	'PATCH',
	'POST',
	'PROPFIND',
	'PROPPATCH',
	'PURGE',
	'PUT',
	'REPORT',
	'SEARCH',
	'SUBSCRIBE',
	'TRACE',
	'UNLOCK',
	'UNSUBSCRIBE'
]
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/request":55,"builtin-status-codes":24,"url":59,"xtend":62}],54:[function(require,module,exports){
(function (global){
exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableStream)

exports.blobConstructor = false
try {
	new Blob([new ArrayBuffer(1)])
	exports.blobConstructor = true
} catch (e) {}

// The xhr request to example.com may violate some restrictive CSP configurations,
// so if we're running in a browser that supports `fetch`, avoid calling getXHR()
// and assume support for certain features below.
var xhr
function getXHR () {
	// Cache the xhr value
	if (xhr !== undefined) return xhr

	if (global.XMLHttpRequest) {
		xhr = new global.XMLHttpRequest()
		// If XDomainRequest is available (ie only, where xhr might not work
		// cross domain), use the page location. Otherwise use example.com
		// Note: this doesn't actually make an http request.
		try {
			xhr.open('GET', global.XDomainRequest ? '/' : 'https://example.com')
		} catch(e) {
			xhr = null
		}
	} else {
		// Service workers don't have XHR
		xhr = null
	}
	return xhr
}

function checkTypeSupport (type) {
	var xhr = getXHR()
	if (!xhr) return false
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

// For some strange reason, Safari 7.0 reports typeof global.ArrayBuffer === 'object'.
// Safari 7.1 appears to have fixed this bug.
var haveArrayBuffer = typeof global.ArrayBuffer !== 'undefined'
var haveSlice = haveArrayBuffer && isFunction(global.ArrayBuffer.prototype.slice)

// If fetch is supported, then arraybuffer will be supported too. Skip calling
// checkTypeSupport(), since that calls getXHR().
exports.arraybuffer = exports.fetch || (haveArrayBuffer && checkTypeSupport('arraybuffer'))

// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
exports.msstream = !exports.fetch && haveSlice && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = !exports.fetch && haveArrayBuffer &&
	checkTypeSupport('moz-chunked-arraybuffer')

// If fetch is supported, then overrideMimeType will be supported too. Skip calling
// getXHR().
exports.overrideMimeType = exports.fetch || (getXHR() ? isFunction(getXHR().overrideMimeType) : false)

exports.vbArray = isFunction(global.VBArray)

function isFunction (value) {
	return typeof value === 'function'
}

xhr = null // Help gc

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],55:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var response = require('./response')
var stream = require('readable-stream')
var toArrayBuffer = require('to-arraybuffer')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary, useFetch) {
	if (capability.fetch && useFetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else if (capability.vbArray && preferBinary) {
		return 'text:vbarray'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
	Object.keys(opts.headers).forEach(function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	var useFetch = true
	if (opts.mode === 'disable-fetch' || 'timeout' in opts) {
		// If the use of XHR should be preferred and includes preserving the 'content-type' header.
		// Force XHR to be used since the Fetch API does not yet support timeouts.
		useFetch = false
		preferBinary = true
	} else if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility and
		// the accuracy of the 'content-type' header aren't
		preferBinary = false
	} else if (opts.mode === 'allow-wrong-content-type') {
		// If streaming is more important than preserving the 'content-type' header
		preferBinary = !capability.overrideMimeType
	} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
		// Use binary if text streaming may corrupt data or the content-type header, or for speed
		preferBinary = true
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary, useFetch)

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (unsafeHeaders.indexOf(lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var header = this._headers[name.toLowerCase()]
	if (header)
		return header.value
	return null
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	var headersObj = self._headers
	var body = null
	if (opts.method !== 'GET' && opts.method !== 'HEAD') {
		if (capability.blobConstructor) {
			body = new global.Blob(self._body.map(function (buffer) {
				return toArrayBuffer(buffer)
			}), {
				type: (headersObj['content-type'] || {}).value || ''
			})
		} else {
			// get utf8 string
			body = Buffer.concat(self._body).toString()
		}
	}

	// create flattened list of headers
	var headersList = []
	Object.keys(headersObj).forEach(function (keyName) {
		var name = headersObj[keyName].name
		var value = headersObj[keyName].value
		if (Array.isArray(value)) {
			value.forEach(function (v) {
				headersList.push([name, v])
			})
		} else {
			headersList.push([name, value])
		}
	})

	if (self._mode === 'fetch') {
		global.fetch(self._opts.url, {
			method: self._opts.method,
			headers: headersList,
			body: body || undefined,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin'
		}).then(function (response) {
			self._fetchResponse = response
			self._connect()
		}, function (reason) {
			self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new global.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._opts.url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode.split(':')[0]

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		if ('timeout' in opts) {
			xhr.timeout = opts.timeout
			xhr.ontimeout = function () {
				self.emit('timeout')
			}
		}

		headersList.forEach(function (header) {
			xhr.setRequestHeader(header[0], header[1])
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable and non-zero, indicating no error.
 * Even though the spec says it should be available in readyState 3,
 * accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		var status = xhr.status
		return (status !== null && status !== 0)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
	self._response.on('error', function(err) {
		self.emit('error', err)
	})

	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
	var self = this
	self._destroyed = true
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	// Currently, there isn't a way to truly abort a fetch.
	// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	stream.Writable.prototype.end.call(self, data, encoding, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'user-agent',
	'via'
]

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":54,"./response":56,"_process":33,"buffer":23,"inherits":29,"readable-stream":48,"to-arraybuffer":58}],56:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var stream = require('readable-stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.url = response.url
		self.statusCode = response.status
		self.statusMessage = response.statusText
		
		response.headers.forEach(function(header, key){
			self.headers[key.toLowerCase()] = header
			self.rawHeaders.push(key, header)
		})


		// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				if (result.done) {
					self.push(null)
					return
				}
				self.push(new Buffer(result.value))
				read()
			}).catch(function(err) {
				self.emit('error', err)
			})
		}
		read()

	} else {
		self._xhr = xhr
		self._pos = 0

		self.url = xhr.responseURL
		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (key === 'set-cookie') {
					if (self.headers[key] === undefined) {
						self.headers[key] = []
					}
					self.headers[key].push(matches[2])
				} else if (self.headers[key] !== undefined) {
					self.headers[key] += ', ' + matches[2]
				} else {
					self.headers[key] = matches[2]
				}
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRProgress = function () {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text:vbarray': // For IE9
			if (xhr.readyState !== rStates.DONE)
				break
			try {
				// This fails in IE8
				response = new global.VBArray(xhr.responseBody).toArray()
			} catch (e) {}
			if (response !== null) {
				self.push(new Buffer(response))
				break
			}
			// Falls through in IE8	
		case 'text':
			try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
				response = xhr.responseText
			} catch (e) {
				self._mode = 'text:vbarray'
				break
			}
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = new Buffer(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE || !xhr.response)
				break
			response = xhr.response
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new global.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		self.push(null)
	}
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":54,"_process":33,"buffer":23,"inherits":29,"readable-stream":48}],57:[function(require,module,exports){
'use strict';

var Buffer = require('safe-buffer').Buffer;

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return -1;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// UTF-8 replacement characters ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd'.repeat(p);
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd'.repeat(p + 1);
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd'.repeat(p + 2);
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character for each buffered byte of a (partial)
// character needs to be added to the output.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd'.repeat(this.lastTotal - this.lastNeed);
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":51}],58:[function(require,module,exports){
var Buffer = require('buffer').Buffer

module.exports = function (buf) {
	// If the buffer is backed by a Uint8Array, a faster version will work
	if (buf instanceof Uint8Array) {
		// If the buffer isn't a subarray, return the underlying ArrayBuffer
		if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
			return buf.buffer
		} else if (typeof buf.buffer.slice === 'function') {
			// Otherwise we need to get a proper copy
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
		}
	}

	if (Buffer.isBuffer(buf)) {
		// This is the slow version that will work with any Buffer
		// implementation (even in old browsers)
		var arrayCopy = new Uint8Array(buf.length)
		var len = buf.length
		for (var i = 0; i < len; i++) {
			arrayCopy[i] = buf[i]
		}
		return arrayCopy.buffer
	} else {
		throw new Error('Argument must be a Buffer')
	}
}

},{"buffer":23}],59:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":60,"punycode":34,"querystring":37}],60:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],61:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],62:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[20]);
