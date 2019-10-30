// This was functionality of script.js, moved it to here to start the downloading of track history earlier
"use strict";
var Dump1090Version = "unknown version";
var RefreshInterval = 1000;
var enable_uat = false;
var enable_pf_data = false;
var HistoryChunks = false;
var nHistoryItems = 0;
var nChunks = 0;
var HistoryItemsReturned = 0;
var chunkNames;
var PositionHistoryBuffer = [];
var	receiverJson;
var deferHistory = [];
var configureReceiver = $.Deferred();
var historyTimeout = 60;

// get configuration json files, will be used in initialize function
var test_chunk_defer = $.ajax({
	url:'chunks/chunks.json',
	timeout: 10000,
	cache: false,
	dataType: 'json'
});
var get_receiver_defer = $.ajax({ url: 'data/receiver.json',
	timeout: 15000,
	cache: false,
	dataType: 'json'
});


$.when(test_chunk_defer).done(function(data) {
	test_chunk_defer = null;
	HistoryChunks = true;
	chunkNames = data.chunks;
	nChunks = chunkNames.length;
	enable_uat = (data.enable_uat == "true");
	enable_pf_data = (data.pf_data == "true");
	if (enable_uat)
		console.log("UAT/978 enabled!");
	console.log("Chunks enabled");
	get_history();
}).fail(function() {
	HistoryChunks = false;
	get_history();
});

$.ajax({ url: 'data/aircraft.json',
	timeout: historyTimeout-2,
	cache: false,
	dataType: 'json' }).done(function(data) {
		if (HistoryItemsReturned < nHistoryItems) {
			PositionHistoryBuffer.push(data);
		}
	});

function get_history() {

	if (enable_uat) {
		$.ajax({ url: 'chunks/978.json',
			timeout: historyTimeout-2,
			cache: false,
			dataType: 'json' }).done(function(data) {
			if (HistoryItemsReturned < nHistoryItems) {
				PositionHistoryBuffer.push(data);
			}
			});
	}

	if (HistoryChunks) {
		if (nChunks > 0) {
			console.log("Starting to load history (" + nChunks + " chunks)");
			console.time("Downloaded History");
			for (var i = nChunks-1; i >= 0; i--) {
				get_history_item(i);
			}
		}
		$.when(get_receiver_defer).done(function(data){
			get_receiver_defer = null;
			receiverJson = data;
			Dump1090Version = data.version;
			RefreshInterval = data.refresh;
			nHistoryItems = nChunks;
			configureReceiver.resolve();
		});
	} else {
		$.when(get_receiver_defer).done(function(data){
			get_receiver_defer = null;
			receiverJson = data;
			Dump1090Version = data.version;
			RefreshInterval = data.refresh;
			nHistoryItems = data.history;
			if (nHistoryItems > 0) {
				console.log("Starting to load history (" + nHistoryItems + " items)");
				console.time("Downloaded History");
				// Queue up the history file downloads
				for (var i = nHistoryItems-1; i >= 0; i--) {
					get_history_item(i);
				}
			}
			configureReceiver.resolve();
		});
	}
}

function get_history_item(i) {

	var request;

	if (HistoryChunks) {
		request = $.ajax({ url: 'chunks/' + chunkNames[i],
			timeout: historyTimeout * 1000,
			dataType: 'json'
		});
	} else {

		request = $.ajax({ url: 'data/history_' + i + '.json',
			timeout: nHistoryItems * 80, // Allow 40 ms load time per history entry
			cache: false,
			dataType: 'json' });
	}
	deferHistory.push(request);
}
