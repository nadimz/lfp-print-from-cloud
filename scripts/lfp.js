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
