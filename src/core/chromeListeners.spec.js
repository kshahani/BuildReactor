import Rx from 'rx';
import chromeApi from 'common/chromeApi';
import chromeListeners from 'core/chromeListeners';
import serviceConfiguration from 'core/config/serviceConfiguration';
import serviceController from 'core/services/serviceController';
import viewConfiguration from 'core/config/viewConfiguration';

describe('chromeListeners', function() {

	var messageHandler, connectHandler;
	var port;

	beforeEach(function() {
		spyOn(chromeApi, 'addMessageListener').and.callFake(function(messageListener) {
			messageHandler = messageListener;
		});
		spyOn(chromeApi, 'addConnectListener').and.callFake(function(connectListener) {
			connectHandler = connectListener;
		});
		spyOn(serviceConfiguration, 'setOrder');
		spyOn(serviceConfiguration, 'setBuildOrder');
		spyOn(serviceConfiguration, 'enableService');
		spyOn(serviceConfiguration, 'disableService');
		spyOn(serviceConfiguration, 'removeService');
		spyOn(serviceConfiguration, 'renameService');
		spyOn(serviceConfiguration, 'saveService');
		spyOn(serviceConfiguration, 'save');
		spyOn(viewConfiguration, 'save');
		spyOn(serviceController, 'getAllTypes');
		chromeListeners.init();
	});

	afterEach(function() {
		if (port && port.disconnectHandler) {
			port.disconnectHandler(port);
		}
	});

	function openPort(portName) {
		var port = {
			name: portName,
			postMessage: function() {},
			onDisconnect: {
				addListener: function() {}
			}
		};
		spyOn(port.onDisconnect, 'addListener').and.callFake(function(onDisconnect) {
			port.disconnectHandler = onDisconnect;
		});
		spyOn(port, 'postMessage');
		return port;
	}

	describe('messages', function() {

		it('should handle availableServices', function() {
			var serviceTypes = [{
				settings: function() {
					return { typeName: 'snap' };
				}
			}];
			serviceController.getAllTypes.and.returnValue(serviceTypes);

			var result;
			messageHandler({ name: 'availableServices' }, null, function(response) {
				result = response;
			});

			expect(result).toEqual([{ typeName: 'snap' }]);
		});

		it('should handle setOrder', function() {
			var serviceNames = ['service2', 'service1'];
			messageHandler({ name: 'setOrder', order: serviceNames }, null, null);

			expect(serviceConfiguration.setOrder).toHaveBeenCalledWith(serviceNames);
		});

		it('should handle setBuildOrder', function() {
			var builds = ['build1', 'build2'];
			messageHandler({ name: 'setBuildOrder', serviceName: 'service', order: builds }, null, null);

			expect(serviceConfiguration.setBuildOrder).toHaveBeenCalledWith('service', builds);
		});

		it('should handle enableService', function() {
			messageHandler({ name: 'enableService', serviceName: 'service' }, null, null);

			expect(serviceConfiguration.enableService).toHaveBeenCalledWith('service');
		});

		it('should handle disableService', function() {
			messageHandler({ name: 'disableService', serviceName: 'service' }, null, null);

			expect(serviceConfiguration.disableService).toHaveBeenCalledWith('service');
		});

		it('should handle removeService', function() {
			messageHandler({ name: 'removeService', serviceName: 'service' }, null, null);

			expect(serviceConfiguration.removeService).toHaveBeenCalledWith('service');
		});

		it('should handle renameService', function() {
			messageHandler({
				name: 'renameService',
				oldName: 'service',
				newName: 'new service'
			}, null, null);

			expect(serviceConfiguration.renameService).toHaveBeenCalledWith('service', 'new service');
		});

		it('should handle saveService', function() {
			var settings = { name: 'service', url: 'http://example.com/' };

			messageHandler({ name: 'saveService', settings: settings }, null, null);

			expect(serviceConfiguration.saveService).toHaveBeenCalledWith(settings);
		});

		it('should handle saveConfig', function() {
			var config = [{ name: 'service' }];

			messageHandler({ name: 'saveConfig', config: config }, null, null);

			expect(serviceConfiguration.save).toHaveBeenCalledWith(config);
		});

		it('should handle setViews', function() {
			var viewConfig = { columns: 2 };
			messageHandler({ name: 'setViews', views: viewConfig }, null, null);

			expect(viewConfiguration.save).toHaveBeenCalledWith(viewConfig);
		});

	});

	describe('availableProjects', function() {

		var CustomBuildService = function() {};
		CustomBuildService.prototype.availableBuilds = function() {};

		var service;
		var sendResponse;
		var request;
		var mockAvailableBuilds;

		beforeEach(function() {
			service = new CustomBuildService();
			serviceController.getAllTypes.and.returnValue({ custom: CustomBuildService });
			sendResponse = jasmine.createSpy();
			request = {
				name: 'availableProjects',
				serviceSettings: { baseUrl: 'custom' }
			};
			mockAvailableBuilds = spyOn(CustomBuildService.prototype, 'availableBuilds').and.callFake(function() {
				return Rx.Observable.never();
			});

		});

		it('should call service', function() {
			messageHandler(request, null, sendResponse);

			expect(service.availableBuilds).toHaveBeenCalled();
		});

		it('should send response back', function() {
			var serviceResponse = {};
			var actualResponse;
			var sendResponse = function(response) {
				actualResponse = response;
			};
			mockAvailableBuilds.and.returnValue(Rx.Observable.returnValue(serviceResponse));

			const returnValue = messageHandler(request, null, sendResponse);

			expect(actualResponse.projects).toBe(serviceResponse);
			expect(returnValue).toBe(true);
		});

		it('should send error back', function() {
			var serviceError = {};
			var actualResponse;
			var sendResponse = function(response) {
				actualResponse = response;
			};
			mockAvailableBuilds.and.returnValue(Rx.Observable.throwException(serviceError));

			const returnValue = messageHandler(request, null, sendResponse);

			expect(actualResponse.error).toBe(serviceError);
			expect(returnValue).toBe(true);
		});

	});

	describe('activeProjects', function() {

		it('should subscribe to state sequence on connect', function() {
			port = openPort('state');
			connectHandler(port);

			var projects = [{ name: 'service 1', items: [] }];
			serviceController.activeProjects.onNext(projects);

			expect(port.postMessage).toHaveBeenCalledWith(projects);
		});

		it('should unsubscribe from state changes on disconnect', function() {
			port = openPort('state');
			connectHandler(port);
			port.disconnectHandler(port);

			serviceController.activeProjects.onNext('test');
			serviceController.activeProjects.onNext('test');
			serviceController.activeProjects.onNext('test');

			expect(port.postMessage.calls.count()).toBe(1);
		});

	});

	describe('serviceConfiguration', function() {

		it('should subscribe to configuration sequence on connect', function() {
			port = openPort('configuration');
			connectHandler(port);

			var config = [{ name: 'service 1' }];
			serviceConfiguration.changes.onNext(config);

			expect(port.postMessage).toHaveBeenCalledWith(config);
		});

		it('should unsubscribe from configuration changes on disconnect', function() {
			port = openPort('configuration');
			connectHandler(port);
			port.disconnectHandler(port);

			serviceConfiguration.changes.onNext('test');
			serviceConfiguration.changes.onNext('test');
			serviceConfiguration.changes.onNext('test');

				expect(port.postMessage.calls.count()).toBe(1);
			});

		});

		describe('viewConfiguration', function() {

			it('should subscribe to view changes on connect', function() {
				port = openPort('views');
				connectHandler(port);

				var config = [{ columns: 8 }];
				viewConfiguration.changes.onNext(config);

				expect(port.postMessage).toHaveBeenCalledWith(config);
			});

			it('should unsubscribe from view changes on disconnect', function() {
				port = openPort('views');
				connectHandler(port);
				port.disconnectHandler(port);

				viewConfiguration.changes.onNext({ columns: 5 });
				viewConfiguration.changes.onNext({ columns: 6 });
				viewConfiguration.changes.onNext({ columns: 7 });

				expect(port.postMessage.calls.count()).toBe(1);
			});

		});

	});
