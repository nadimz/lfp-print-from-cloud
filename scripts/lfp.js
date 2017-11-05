var blobUtil = require('blob-util');
var ipp = require('ipp');

const url = new function() {
	this.resource = new function(){
		this.ipp = '/ipp/print';
	}
	
	this.printer = 'https://127.0.0.1:4444';
	this.ipp = this.printer + this.resource.ipp;
}


Lfp = function() {
	this.init();
}

Lfp.prototype = {
	init: function() {
		console.log('Printer initialized');
	},	
	printFileIPP: function(name, blob) {
		blobUtil.blobToArrayBuffer(blob).then(function (arrayBuff) {
			var printingUrl = url.ipp;
			var printer = ipp.Printer(printingUrl);
			var msg = {
				"operation-attributes-tag": {
				"requesting-user-name": "Nadim Zubidat",
				"job-name": name
				},
				data: Buffer.from(arrayBuff)
			}
			console.log('Sending IPP job for printing to ' + printingUrl);
			printer.execute("Print-Job", msg, function(err, res) {
				console.log(err + res);
			});
		}).catch(function(err) {
			console.log(err);
		});
	}
};

exports.Lfp;
