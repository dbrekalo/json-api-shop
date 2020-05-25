var forOwn = require('mout/object/forOwn');
var keys = require('mout/object/keys');
var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var cors = require('cors');
var typeFactory = require('../lib/type-factory');
var ServiceApi = require('../service');
var pickObject = require('../lib/pick-object');

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
            baseUrl: '/',
            port: 3000,
            resources: {},
            useCors: true,
            updateMethod: ['put', 'patch', 'post'],
            validationErrorStatusCode: 409,
            logServerStart: true
        };

    },

    start: function() {

        this.setupServer();

        var app = this.app;
        var config = this.config;

        app.listen(config.port, function() {
            if (config.logServerStart) {
                console.log('Express json:api server started at port:' + config.port);
            }
        });

        return this;

    },

    setupServer: function() {

        var app = this.app = express();

        this.setupMiddleware(app);
        this.setupRoutes(app);
        this.setupErrorHandling(app);

        return this;

    },

    getApp: function() {

        return this.app;

    },

    setupMiddleware: function(app) {

        app.use(bodyParser.json({type: 'application/*+json'}));
        app.use(bodyParser.urlencoded({extended: true}));
        app.use(multer({storage: multer.memoryStorage()}).any());

        if (this.config.useCors) {
            app.use(cors());
        }

        return this;

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

    setupErrorHandling: function(app) {

        app.use(this.getErrorHandler());
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
                    response.status(validationErrorStatus).json(error);
                } else {
                    next(error);
                }

            } else {
                next(error);
            }

        };

    }

});
