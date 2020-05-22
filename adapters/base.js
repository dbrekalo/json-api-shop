var forOwn = require('mout/object/forOwn');
var keys = require('mout/object/keys');
var isEmpty = require('mout/lang/isEmpty');
var contains = require('mout/array/contains');
var merge = require('mout/object/merge');
var pascalCase = require('to-pascal-case');
var flatten = require('../lib/flatten');
var pickObject = require('../lib/pick-object');
var rejectUndefined = require('../lib/reject-undefined');
var typeFactory = require('../lib/type-factory');

var BaseAdapter = typeFactory({

    constructor: function(config) {

        var configDefaults = this.getConfigDefaults();

        this.config = Object.assign(
            configDefaults,
            pickObject(config, keys(configDefaults))
        );

        if (this.initialize) {
            this.initialize();
        }

    },

    getConfigDefaults: function() {

        return {
            validationErrorField: 'detail',
            resources: {}
        };

    },

    getOne: function(params) {

        return this.callGetResource(
            params.type, params.id, params.query, params.context
        ).then(function(resource) {
            return this.presentResource(
                resource, params.query, params.context
            );
        }.bind(this));

    },

    get: function(params) {

        return this.callQueryResourceCollection(
            params.type, params.query, params.context
        ).then(function(data) {
            return this.presentResourceCollection(
                data.resources, data.meta, params.query, params.context
            );
        }.bind(this));

    },

    create: function(data) {

        var type = data.type;
        var schema = this.config.resources[type];
        var self = this;

        return Promise.resolve(schema.getDefaultFields
            ? schema.getDefaultFields({
                database: self,
                query: data.query,
                context: data.context
            })
            : {attributes: {}, relationships: {}}
        ).then(function(defaults) {

            var resourceBlueprint = {
                type: type,
                attributes: rejectUndefined(merge(
                    {}, defaults.attributes, data.attributes
                )),
                relationships: rejectUndefined(merge(
                    {}, defaults.relationships, data.relationships
                ))
            };

            return Promise.resolve(schema.validate && schema.validate({
                resource: resourceBlueprint,
                data: data,
                method: 'create',
                database: self,
                validator: self.createValidator(),
                context: data.context
            })).then(function() {
                return self.callCreateResource(
                    type, resourceBlueprint, data.query, data.context
                );
            }).then(function(resource) {
                return self.presentResource(
                    resource, data.query, data.context
                );
            });

        });

    },

    update: function(data) {

        var type = data.type;
        var id = data.id;
        var schema = this.config.resources[type];
        var self = this;

        return this.callGetResource(type, id, data.query, data.context).then(function(resource) {

            return Promise.resolve(schema.validate && schema.validate({
                validator: self.createValidator(),
                resource: resource,
                data: data,
                method: 'update',
                database: self,
                context: data.context
            }));

        }).then(function() {
            return self.callUpdateResource(
                type, id, data, data.query, data.context
            );
        }).then(function(resource) {
            return self.presentResource(
                resource, data.query, data.context
            );
        });

    },

    delete: function(data) {

        return this.callDeleteResource(
            data.type, data.id, data.query, data.context
        );

    },

    callGetResource: function(type, id, query, context) {

        var method = 'get' + pascalCase(type) + 'Resource';
        return this[method]
            ? this[method](id, query, context)
            : this.getResource(type, id, query, context);

    },

    getResource: function(type, id, query, context) {

        throw new Error('getResource method not implemented');

    },

    callGetResourceCollection: function(type, references, query, context) {

        var method = 'get' + pascalCase(type) + 'ResourceCollection';
        return this[method]
            ? this[method](references, query, context)
            : this.getResourceCollection(type, references, query, context);

    },

    getResourceCollection: function(type, references, query, context) {

        throw new Error('getResourceCollection method not implemented');

    },

    callQueryResourceCollection: function(type, query, context) {

        var method = 'query' + pascalCase(type) + 'ResourceCollection';
        return this[method]
            ? this[method](query, context)
            : this.queryResourceCollection(type, query, context);

    },

    queryResourceCollection: function(type, query, context) {

        throw new Error('queryResourceCollection method not implemented');

    },

    callUpdateResource: function(type, id, data, query, context) {

        var method = 'update' + pascalCase(type) + 'Resource';
        return this[method]
            ? this[method](id, data, query, context)
            : this.updateResource(type, id, data, query, context);

    },

    updateResource: function(type, id, data, query, context) {

        throw new Error('updateResource method not implemented');

    },

    callCreateResource: function(type, data, query, context) {

        var method = 'create' + pascalCase(type) + 'Resource';
        return this[method]
            ? this[method](data, query, context)
            : this.createResource(type, data, query, context);

    },

    createResource: function(type, data, query, context) {

        throw new Error('createResource method not implemented');

    },

    callDeleteResource: function(type, id, query, context) {

        var method = 'delete' + pascalCase(type) + 'Resource';
        return this[method]
            ? this[method](id, query, context)
            : this.deleteResource(type, id, query, context);

    },

    deleteResource: function(type, id, query, context) {

        throw new Error('deleteResource method not implemented');

    },

    presentResource: function(resource, query, context) {

        query = query || {};

        var resourceView = this.applySparseFields(
            resource, query.fields, query, context
        );

        return this.buildIncluded({
            resources: [resourceView],
            include: query.include,
            fields: query.fields,
            query: query,
            context: context
        }).then(function(included) {
            return {
                data: resourceView,
                included: included
            };
        });

    },

    presentResourceCollection: function(resources, meta, query, context) {

        query = query || {};

        var resourceViews = resources.map(function(resource) {
            return this.applySparseFields(
                resource, query.fields, query, context
            );
        }.bind(this));

        return this.buildIncluded({
            resources: resourceViews,
            include: query.include,
            fields: query.fields,
            query: query,
            context: context
        }).then(function(included) {
            return {
                data: resourceViews,
                included: included,
                meta: meta
            };
        });

    },

    applySparseFields: function(resource, fields, query, context) {

        if (fields && fields[resource.type]) {
            var fieldList = fields[resource.type];
            return {
                type: resource.type,
                id: resource.id,
                attributes: pickObject(resource.attributes || {}, fieldList),
                relationships: pickObject(resource.relationships || {}, fieldList)
            };
        } else {
            return resource;
        }

    },

    buildIncluded: function(params) {

        var self = this;
        var getKey = function(item) { return item.id + '@' + item.type; };

        var resources = params.resources;
        var foundKeys = params.foundKeys || resources.map(getKey);
        var included = params.included || [];
        var fields = params.fields;
        var include = params.include;
        var query = params.query;
        var context = params.context;

        var useIncludePaths = Boolean(include);
        var currentIncludePaths = useIncludePaths ? include.map(function(path) {
            return path.split('.')[0];
        }) : [];

        var wantedResources = resources.reduce(function(wantedResources, resource) {
            forOwn(resource.relationships || {}, function(relationData, relationName) {

                // skip if not requested via include
                if (useIncludePaths && !contains(currentIncludePaths, relationName)) {
                    return;
                }

                (Array.isArray(relationData.data)
                    ? relationData.data
                    : [relationData.data]
                ).forEach(function(pointer) {

                    // skip empty relationship
                    // and resources already in included
                    if (!pointer || contains(foundKeys, getKey(pointer))) {
                        return;
                    }

                    var id = pointer.id;
                    var type = pointer.type;

                    if (!wantedResources[type]) {
                        wantedResources[type] = [];
                    }

                    if (!contains(wantedResources[type], id)) {
                        wantedResources[type].push(id);
                    }

                });
            });

            return wantedResources;

        }, {});

        if (isEmpty(wantedResources)) {
            return Promise.resolve(included);
        }

        return Promise.all(
            keys(wantedResources).map(function(type) {
                return self.callGetResourceCollection(
                    type, wantedResources[type], query, context
                );
            })
        ).then(function(items) {

            var resources = flatten(items).map(function(resource) {
                return self.applySparseFields(resource, fields);
            });

            var filteredInclude = useIncludePaths ? include.map(function(relationName) {
                return relationName.split('.')[1];
            }).filter(function(relationName) {
                return Boolean(relationName);
            }) : null;

            return self.buildIncluded({
                resources: resources,
                included: included.concat(resources),
                foundKeys: foundKeys.concat(resources.map(getKey)),
                fields: fields,
                include: filteredInclude,
                query: query,
                context: context
            });

        });

    },

    createError: function(errorType, message) {

        var error = new Error(message);
        error.jsonApiErrorType = errorType;
        return error;

    },

    createValidator: function() {

        var messageField = this.config.validationErrorField || 'detail';
        var error = this.createError('validationError', 'Validation error');
        var errors = error.errors = [];

        var addFieldMessage = function(domain, field, message) {
            var pointer = '/data/' + domain + '/' + field;
            var errorMessage = {source: {pointer: pointer}};
            errorMessage[messageField] = message;
            errors.push(errorMessage);
            return error;
        };

        error.addAttributeError = function(attribute, message) {
            return addFieldMessage('attributes', attribute, message);
        };

        error.addRelationshipError = function(relationship, message) {
            return addFieldMessage('relationships', relationship, message);
        };
        error.report = function() {
            return errors.length ? Promise.reject(error) : Promise.resolve();
        };

        return error;

    }

});

module.exports = BaseAdapter;
