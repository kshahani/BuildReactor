import 'jquery';
import 'html5sortable/src/html.sortable.src';
import 'angular';
import 'angular-mocks';

window.chrome = {
	browserAction: {
		setBadgeText: function() {},
		setBadgeBackgroundColor: function() {}
	},
	tabs : {
		create: function() {},
		query: function(queryInfo, callback) {}
	},
	runtime: {
		sendMessage: function() {},
		onMessage: {
			addListener: function() {}
		},
		connect: function() {
			'use strict';
			return {
				onMessage: {
					addListener: function() {}
				}
			};
		},
		onConnect: {
			addListener: function() {}
		}
	},
	extension: {
		sendMessage: function() {},
		onMessage: {
			addListener: function() {}
		},
		onConnect: {
			addListener: function() {}
		},
		connect: function() {},
		getURL: function(path) {}
	},
	cookies: {
		remove: function() {}
	}
};

window.Notification = function() {
	'use strict';

	return {
		show: function() {},
		close: function() {}
	};
};

const testsContext = require.context("..", true, /.spec.js$/);
testsContext.keys().forEach(testsContext);
