import app from 'settings/app';
import template from 'settings/service/directives/viewSelection/viewSelection.html';

export default app.directive('viewSelection', function() {
	return {
		scope: {
			views: '=',
			selected: '='
		},
		templateUrl: template
	};
});
