define([
	'core/services/serviceController',
	'rx',
	'mout/object/mixIn',
	'test/rxHelpers',
	'rx.binding'
],
function(controller, Rx, mixIn) {

	'use strict';

	describe('core/services/serviceController', function() {

		let service;
		var onNext = Rx.ReactiveTest.onNext;

		function CustomBuildService(settings) {
			service = this;
			this.events = new Rx.Subject();
			this.initialActiveProjects = {
				name: settings.name,
				items: []
			};
			this.activeProjects = new Rx.BehaviorSubject(this.initialActiveProjects);
		}
		CustomBuildService.prototype.start = function() {};
		CustomBuildService.prototype.stop = function() {};
		CustomBuildService.settings = () => settings;

		var settings;
		var serviceStartResponse;
		var scheduler;

		beforeEach(function() {
			settings = {
				baseUrl: 'test',
				url: 'http://www.example.com/',
				name: 'service name',
				projects: [],
				disabled: false
			};
			serviceStartResponse = Rx.Observable.returnValue([]);
			spyOn(CustomBuildService.prototype, 'start').and.callFake(function() {
				this.events.onNext({ eventName: 'serviceStarted' });
				return serviceStartResponse;
			});
			spyOn(CustomBuildService.prototype, 'stop');
			controller.registerType(CustomBuildService);
			scheduler = new Rx.TestScheduler();

		});

		describe('start/stop', function() {

			it('should start services', function() {
				controller.start(Rx.Observable.returnValue([settings]));

				expect(CustomBuildService.prototype.start).toHaveBeenCalled();
			});

			it('should not start disabled services', function() {
				settings.disabled = true;

				controller.start(Rx.Observable.returnValue([settings]));

				expect(CustomBuildService.prototype.start).not.toHaveBeenCalled();
			});

			it('should subscribe to service events', function() {
				scheduler.scheduleAbsolute(300, function() {
					controller.start(Rx.Observable.returnValue([settings]));
				});
				scheduler.scheduleAbsolute(400, function() {
					service.events.onNext({ eventName: 'someEvent' });
				});

				var result = scheduler.startWithCreate(function() {
					return controller.events;
				});

				expect(result.messages).toHaveEvent('someEvent');
			});

			it('should push servicesInitializing when configuration is reset', function() {
				scheduler.scheduleAbsolute(300, function() {
					controller.start(Rx.Observable.returnValue([settings]));
				});
				var result = scheduler.startWithCreate(function() {
					return controller.events;
				});

				expect(result.messages).toHaveEvent('servicesInitializing');
			});

			it('should push servicesInitialized when all services started', function() {
				serviceStartResponse = new Rx.Subject();
				CustomBuildService.prototype.start.and.callFake(function() {
					return serviceStartResponse;
				});

				scheduler.scheduleAbsolute(300, function() {
					controller.start(Rx.Observable.returnValue([settings, settings]));
				});
				scheduler.scheduleAbsolute(400, function() {
					service.events.onNext({ eventName: 'serviceStarted' });
					serviceStartResponse.onCompleted();
				});
				var result = scheduler.startWithCreate(function() {
					return controller.events;
				});

				expect(result.messages).toHaveElements(onNext(400, { eventName: 'servicesInitialized' }));
			});

			it('should push servicesInitialized when no services configured', function() {
				scheduler.scheduleAbsolute(300, function() {
					controller.start(Rx.Observable.returnValue([settings]));
				});
				var result = scheduler.startWithCreate(function() {
					return controller.events;
				});

				expect(result.messages).toHaveEvent('servicesInitialized');
			});

			it('should unsubscribe from events and stop old services', function() {
				var configs = Rx.Observable.fromArray([[settings], [settings]]);
				scheduler.scheduleAbsolute(300, function() {
					controller.start(Rx.Observable.returnValue([settings]));
				});
				scheduler.scheduleAbsolute(500, function() {
					service.events.onNext({ eventName: 'someEvent' });
				});
				var result = scheduler.startWithCreate(function() {
					return controller.events;
				});

				expect(CustomBuildService.prototype.stop).toHaveBeenCalled();
				expect(result.messages).toHaveEvent('someEvent', 1);
			});

			it('should unsubscribe from events and stop old services if empty settings passed', function() {
				var configs = Rx.Observable.fromArray([[settings], []]);
				scheduler.scheduleAbsolute(300, function() {
					controller.start(configs);
				});
				scheduler.scheduleAbsolute(500, function() {
					service.events.onNext({ eventName: 'someEvent' });
				});
				var result = scheduler.startWithCreate(function() {
					return controller.events;
				});

				expect(CustomBuildService.prototype.stop).toHaveBeenCalled();
				expect(result.messages).not.toHaveEvent('someEvent');
			});

		});

		describe('activeProjects', function() {

			it('should push state on subscribe', function() {
				controller.start(Rx.Observable.returnValue([settings]));

				var result = scheduler.startWithCreate(function() {
					return controller.activeProjects;
				});

				expect(result.messages).toHaveEqualElements(onNext(200, [service.initialActiveProjects]));
			});

			xit('should get project state from all services', function() {
				var settings1 = mixIn({}, settings, { name: 'service 1' });
				var settings2 = mixIn({}, settings, { name: 'service 2' });
				// serviceLoader.load.and.callFake(function(settings) {
				// 	return settings.name === 'service 1' ?
				// 		Rx.Observable.returnValue(service1) :
				// 		Rx.Observable.returnValue(service2);
				// });

				scheduler.scheduleAbsolute(200, function() {
					controller.start(Rx.Observable.returnValue([settings1, settings2]));
				});
				scheduler.scheduleAbsolute(300, function() {
					service.activeProjects.onNext({ name: 'service 1', items: [{ id: 'id1' }] });
				});
				scheduler.scheduleAbsolute(400, function() {
					service.activeProjects.onNext({ name: 'service 2', items: [{ id: 'id2' }] });
				});
				var result = scheduler.startWithCreate(function() {
					return controller.activeProjects;
				});

				expect(result.messages).toHaveElements([
					onNext(200, [{ name: 'service 1', items: [] }, { name: 'service 2', items: [] }]),
					onNext(300, [{ name: 'service 1', items: [{ id: 'id1' }] }, { name: 'service 2', items: [] }]),
					onNext(400, [{ name: 'service 1', items: [{ id: 'id1' }] }, { name: 'service 2', items: [{ id: 'id2' }] }])
				]);
			});

			it('should push empty list of projects when services disabled', function() {
				scheduler.scheduleAbsolute(300, function() {
					settings.disabled = true;
					controller.start(Rx.Observable.returnValue([settings]));
				});
				var result = scheduler.startWithCreate(function() {
					return controller.activeProjects;
				});

				expect(result.messages).toHaveElements(onNext(300, []));
			});

		});

		describe('registrations', function() {

			beforeEach(function() {
				controller.clear();
			});

			afterEach(function() {
				controller.clear();
			});

			it('should return empty array if no services registered', function() {
				var types = controller.getAllTypes();

				expect(types).toEqual({});
			});

			it('should register service', function() {
				spyOn(CustomBuildService, 'settings').and.returnValue(settings);

				controller.registerType(CustomBuildService);

				expect(CustomBuildService.settings).toHaveBeenCalled();
			});

			it('should return registered services', function() {
				controller.registerType(CustomBuildService);

				var types = controller.getAllTypes();

				expect(types).toEqual({ test: CustomBuildService });
			});

			it('should clear registrations', function() {
				controller.registerType(CustomBuildService);

				controller.clear();

				expect(controller.getAllTypes()).toEqual({});
			});
		});
	});

});
