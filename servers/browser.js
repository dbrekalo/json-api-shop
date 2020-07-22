var forOwn = require('mout/object/forOwn');
var keys = require('mout/object/keys');
var Pretender = require('pretender').default;
var typeFactory = require('type-factory');
var ServiceApi = require('../service');
var pickObject = require('../lib/pick-object');
var qs = require('qs');

module.exports = typeFactory({

    constructor: function(config) {

        var configDefaults = this.getConfigDefaults();

        this.config = Object.assign(
            configDefaults,
            pickObject(config, keys(configDefaults))
        );

        this.service = this.config.service || new ServiceApi(config);

    },

    getConfigDefaults: function() {

        return {
            service: null,
            pretenderInstance: null,
            baseUrl: '/',
            resources: {},
            updateMethod: ['put', 'patch', 'post'],
            validationErrorStatusCode: 409,
            logRequest: false,
            logResponse: false
        };

    },

    start: function() {

        return this.setupServer();

    },

    stop: function() {

        this.app.pretender.shutdown();
        return this;

    },

    buildWrapperServer: function() {

        var config = this.config;
        var pretender = config.pretenderInstance || new Pretender();
        var errorHandler = this.getErrorHandler();

        var app = this.app = {
            pretender: pretender
        };

        var buildResponse = function(request, resolve) {
            return {
                request: request,
                _status: 200,
                _headers: {
                    'Content-Type': 'text/html'
                },
                set: function(name, value) {
                    this._headers[name] = value;
                    return this;
                },
                status: function(status) {
                    this._status = status;
                    return this;
                },
                json: function(data) {
                    this.set('Content-Type', 'application/javascript');
                    this.send(data);
                },
                send: function(data) {
                    var output = [
                        this._status,
                        this._headers,
                        JSON.stringify(data)
                    ];
                    if (config.logResponse) {
                        console.log('response:' + this.request.method + ':' + this.request.url, data, this.request);
                    }
                    resolve(output);
                }
            };
        };

        var buildRequest = function(request) {
            request.query = qs.parse(
                qs.stringify(request.queryParams)
            );
            request.body = JSON.parse(request.requestBody);
            if (config.logRequest) {
                console.log('request:' + request.method + ':' + request.url, request);
            }
            return request;
        };

        ['get', 'post', 'put', 'patch', 'delete'].forEach(function(method) {

            app[method] = function(routePattern, routeHandler) {
                app.pretender[method](routePattern, function(dirtyRequest) {

                    return new Promise(function(resolve, reject) {

                        var request = buildRequest(dirtyRequest);
                        var response = buildResponse(request, resolve);

                        routeHandler(request, response, function(error) {
                            errorHandler(error, request, response, function(error) {
                                response.status(500).send(error.message || '');
                            });
                        });

                    });

                });
            };

        });

        return app;

    },

    setupServer: function() {

        var app = this.app = this.buildWrapperServer();
        this.setupRoutes(app);

        return this;

    },

    getApp: function() {

        return this.app;

    },

    getRoutes: function() {

        var routes = [];
        var service = this.service;
        var updateMethods = Array.isArray(this.config.updateMethod)
            ? this.config.updateMethod
            : [this.config.updateMethod];

        forOwn(this.config.resources, function(schema, resourceType) {

            var urlSlug = schema.urlSlug || resourceType;

            // resource list
            if (schema.hasListRoute !== false) {

                routes.push({
                    name: 'resource.' + resourceType + '.list',
                    method: 'get',
                    pattern: urlSlug,
                    handler: function(request, response, next) {
                        service.get({
                            type: resourceType,
                            query: request.query,
                            context: request
                        }).then(function(data) {
                            response.json(data);
                        }).catch(next);
                    }
                });

            }

            // resource detail
            if (schema.hasDetailRoute !== false) {

                routes.push({
                    name: 'resource.' + resourceType + '.detail',
                    method: 'get',
                    pattern: urlSlug + '/:id',
                    handler: function(request, response, next) {
                        service.get({
                            type: resourceType,
                            id: request.params.id,
                            query: request.query,
                            context: request
                        }).then(function(data) {
                            response.json(data);
                        }).catch(next);
                    }
                });

            }

            // resource create
            if (schema.hasCreateRoute !== false) {

                routes.push({
                    name: 'resource.' + resourceType + '.create',
                    method: 'post',
                    pattern: urlSlug,
                    handler: function(request, response, next) {
                        var data = Object.assign({}, request.body.data, {
                            type: resourceType,
                            query: request.query,
                            context: request
                        });
                        service.create(data).then(function(data) {
                            response.json(data);
                        }).catch(next);
                    }
                });

            }

            // resource update
            if (schema.hasUpdateRoute !== false) {

                updateMethods.forEach(function(method) {
                    routes.push({
                        name: 'resource.' + resourceType + '.update',
                        method: method,
                        pattern: urlSlug + '/:id',
                        handler: function(request, response, next) {
                            var data = Object.assign({}, request.body.data, {
                                type: resourceType,
                                id: request.params.id,
                                query: request.query,
                                context: request
                            });
                            service.update(data).then(function(data) {
                                response.json(data);
                            }).catch(next);
                        }
                    });
                });

            }

            // resource delete
            if (schema.hasDeleteRoute !== false) {

                routes.push({
                    name: 'resource.' + resourceType + '.delete',
                    method: 'delete',
                    pattern: urlSlug + '/:id',
                    handler: function(request, response, next) {
                        service.delete({
                            type: resourceType,
                            id: request.params.id,
                            context: request
                        }).then(function() {
                            response.status(200).send('');
                        }).catch(next);
                    }
                });

            }

        });

        return routes;

    },

    setupRoutes: function(app) {

        var config = this.config;

        this.getRoutes().forEach(function(route) {
            app[route.method](config.baseUrl + route.pattern, route.handler);
        });

        return this;

    },

    getErrorHandler: function() {

        var config = this.config;
        var validationErrorStatus = config.validationErrorStatusCode;

        return function(error, request, response, next) {

            var errorType = error && error.jsonApiErrorType;

            if (errorType) {

                if (errorType === 'resourceNotFound') {
                    response.status(404).send(error.message);
                } else if (errorType === 'badRequest') {
                    response.status(400).send(error.message);
                } else if (errorType === 'validationError') {
                    response.status(validationErrorStatus).json({
                        errors: error.errors
                    });
                } else {
                    next(error);
                }

            } else {
                next(error);
            }

        };

    }

});
