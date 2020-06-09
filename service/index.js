var isPlainObject = require('mout/lang/isPlainObject');
var forOwn = require('mout/object/forOwn');
var get = require('mout/object/get');
var keys = require('mout/object/keys');
var typeFactory = require('type-factory');
var isDefined = require('../lib/is-defined');
var wait = require('../lib/wait');
var pickObject = require('../lib/pick-object');
var errorFactory = require('../lib/error-factory');

var ServiceApi = typeFactory({

    constructor: function(userConfig) {

        var configDefaults = this.getConfigDefaults();

        var config = this.config = Object.assign(
            configDefaults,
            pickObject(userConfig, keys(configDefaults))
        );

        if (!config.databaseAdapter) {
            throw new Error('Database adapter not provided');
        }

        if (typeof config.databaseAdapter === 'function') {
            var DatabaseAdapter = config.databaseAdapter;
            this.database = new DatabaseAdapter(userConfig);
        } else {
            this.database = config.databaseAdapter;
        }

    },

    getConfigDefaults: function() {

        return {
            databaseAdapter: null,
            databaseAdapterInstance: null,
            pagination: {
                strategy: 'offsetBased',
                offsetKey: 'offset',
                limitKey: 'limit'
            },
            resources: {},
            waitTime: 0
        };

    },

    resolveResourceDatabase: function(query) {

        return wait(this.config.waitTime).then(function() {
            var schema = this.config.resources[query.type];
            return schema.databaseAdapter || this.database;
        }.bind(this));

    },

    get: function(userData) {

        return this.sanitizeInput(userData).then(function(data) {

            return this.resolveResourceDatabase(data).then(function(database) {
                return database[typeof data.id !== 'undefined'
                    ? 'getOne'
                    : 'get'
                ](data);
            });

        }.bind(this));

    },

    create: function(userData) {

        return this.sanitizeInput(userData).then(function(data) {

            return this.resolveResourceDatabase(data).then(function(database) {
                return database.create(data);
            });

        }.bind(this));

    },

    update: function(userData) {

        return this.sanitizeInput(userData, {checkId: true}).then(function(data) {

            return this.resolveResourceDatabase(data).then(function(database) {
                return database.update(data);
            });

        }.bind(this));

    },

    delete: function(userData) {

        return this.sanitizeInput(userData, {checkId: true}).then(function(data) {

            return this.resolveResourceDatabase(data).then(function(database) {
                return database.delete(data);
            });

        }.bind(this));

    },

    createInputValidator: function() {

        return errorFactory.badRequest();

    },

    sanitizeInput: function(userQuery, params) {

        params = params || {};

        if (!isPlainObject(userQuery)) {
            return this.createInputValidator().addError(
                'Invalid input parameters'
            ).report();
        }

        return Promise.all([
            params.checkId && this.sanitizeIdInput(userQuery),
            this.sanitizeTypeInput(userQuery),
            this.sanitizeAttributesInput(userQuery),
            this.sanitizeRelationshipsInput(userQuery),
            this.sanitizeFieldsInput(userQuery),
            this.sanitizeIncludeInput(userQuery),
            this.sanitizePageInput(userQuery),
            this.sanitizeFilterInput(userQuery),
            this.sanitizeSortInput(userQuery)
        ]).then(function() {
            return userQuery;
        });

    },

    sanitizeTypeInput: function(input) {

        var type = input.type;
        var validator = this.createInputValidator();

        if (!type || typeof type !== 'string') {
            validator.addError('Resource type not provided');
        } else if (!this.config.resources[type]) {
            validator.addError('Uknown resource type "' + type + '" provided');
        }

        return validator.report();

    },

    sanitizeIdInput: function(input) {

        var typeofId = typeof input.id;
        var validator = this.createInputValidator();

        if (typeofId !== 'string' && typeofId !== 'number') {
            validator.addError('Resource id not provided');
        }

        return validator.report();

    },

    sanitizeAttributesInput: function(input) {

        var validator = this.createInputValidator();

        if (isDefined(input.attributes) && !isPlainObject(input.attributes)) {
            validator.addError('Invalid attributes payload');
        }

        return validator.report();

    },

    sanitizeRelationshipsInput: function(input) {

        var message = 'Invalid relationships payload';
        var fieldMessage = function(field) { return message + ': ' + field; };
        var validator = this.createInputValidator();

        if (!isDefined(input.relationships)) {
            return validator.report();
        }

        if (!isPlainObject(input.relationships)) {
            return validator.addError(message).report();
        }

        forOwn(input.relationships, function(relation, relationName) {

            if (!isPlainObject(relation)) {
                validator.addError(fieldMessage(relationName));
                return;
            }
            var data = relation.data;

            if (Array.isArray(data)) {

                data.forEach(function(pointer) {
                    if (!pointer || !pointer.id || !pointer.type) {
                        validator.addError(fieldMessage(relationName));
                    }
                });

            } else if (isPlainObject(data)) {

                if (!data.id || !data.type) {
                    validator.addError(fieldMessage(relationName));
                }

            } else if (data !== null) {

                validator.addError(fieldMessage(relationName));

            }
        });

        return validator.report();

    },

    sanitizeFieldsInput: function(input) {

        var message = 'Invalid fields payload';
        var fields = get(input, 'query.fields');
        var validator = this.createInputValidator();

        if (isDefined(fields)) {

            if (!isPlainObject(fields)) {
                validator.addError(message);
            } else {
                forOwn(fields, function(fieldList, resourceName) {
                    if (typeof fieldList === 'string') {
                        fields[resourceName] = fieldList.split(',');
                    } else if (!Array.isArray(fieldList)) {
                        validator.addError(message);
                    }
                });
            }
        }

        return validator.report();

    },

    sanitizeIncludeInput: function(input) {

        var include = get(input, 'query.include');
        var validator = this.createInputValidator();

        if (isDefined(include)) {
            var query = input.query;
            if (typeof include === 'string') {
                query.include = include.split(',');
            } else if (!Array.isArray(include)) {
                validator.addError('Invalid include payload');
            }
        }

        return validator.report();

    },

    sanitizePageInput: function(input) {

        var page = get(input, 'query.page');
        var validator = this.createInputValidator();

        if (isDefined(page)) {

            if (!isPlainObject(page)) {
                return validator.addError('Invalid pagination request').report();
            }

            var query = input.query;
            var pagination = this.config.pagination;

            if (pagination.strategy === 'offsetBased') {
                query.page = {
                    offset: parseInt(page[pagination.offsetKey], 10) || 0,
                    limit: parseInt(page[pagination.limitKey], 10) || null
                };
            } else if (pagination.strategy === 'pageBased') {
                var limit = parseInt(page[pagination.limitKey], 10) || null;
                if (limit) {
                    var pageNumber = parseInt(page[pagination.numberKey], 10) || 1;
                    query.page = {
                        offset: (pageNumber - 1) * limit,
                        limit: limit
                    };
                } else {
                    query.page = null;
                }
            }
        }

        return validator.report();

    },

    sanitizeFilterInput: function(input) {

        var filter = get(input, 'query.filter');
        var validator = this.createInputValidator();

        if (isDefined(filter) && !isPlainObject(filter)) {
            validator.addError('Invalid filter request');
        }

        return validator.report();

    },

    sanitizeSortInput: function(input) {

        var sort = get(input, 'query.sort');
        var validator = this.createInputValidator();

        if (isDefined(sort) && typeof sort !== 'string') {
            validator.addError('Invalid sort request');
        }

        return validator.report();

    }

});

module.exports = ServiceApi;
