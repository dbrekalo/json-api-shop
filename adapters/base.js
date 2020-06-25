var forOwn = require('mout/object/forOwn');
var keys = require('mout/object/keys');
var isEmpty = require('mout/lang/isEmpty');
var contains = require('mout/array/contains');
var merge = require('mout/object/merge');
var pascalCase = require('to-pascal-case');
var typeFactory = require('type-factory');
var flatten = require('../lib/flatten');
var pickObject = require('../lib/pick-object');
var rejectUndefined = require('../lib/reject-undefined');
var errorFactory = require('../lib/error-factory');
var validateData = require('../lib/resource-validator');

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
            resources: {}
        };

    },

    getOne: function(params) {

        return this.callGetResource(
            params.type, params.id, params.query, params.context
        ).then(function(resource) {
            return this.renderResource(
                resource, params.query, params.context
            );
        }.bind(this));

    },

    get: function(params) {

        return this.callQueryResourceCollection(
            params.type, params.query, params.context
        ).then(function(data) {
            return this.renderResourceCollection(
                params.type, data.resources, data.meta, params.query, params.context
            );
        }.bind(this));

    },

    resolveFieldsSchema: function(type, action, context) {

        var schema = this.config.resources[type];
        var fieldsSchema = schema.fieldsSchema;

        if (typeof fieldsSchema === 'function') {
            return Promise.resolve(fieldsSchema({
                action: action,
                database: this,
                context: context
            }));
        } else {
            return Promise.resolve();
        }

    },

    create: function(data) {

        var type = data.type;
        var schema = this.config.resources[type];
        var self = this;

        return this.resolveFieldsSchema(
            type, 'create', data.context
        ).then(function(fieldsSchema) {

            var validator = self.createValidator({
                fieldsSchema: fieldsSchema
            });

            var defaults = fieldsSchema
                ? validator.extractFieldDefaults()
                : {attributes: {}, relationships: {}};

            var resourceBlueprint = {
                type: type,
                attributes: rejectUndefined(merge(
                    defaults.attributes, data.attributes
                )),
                relationships: rejectUndefined(merge(
                    defaults.relationships, data.relationships
                ))
            };

            var validate = schema.validate || function(params) {
                if (fieldsSchema) {
                    return validator.validateFields(params.data).report();
                }
            };

            return Promise.resolve(validate({
                data: resourceBlueprint,
                rawData: data,
                action: 'create',
                database: self,
                validator: validator,
                context: data.context
            })).then(function() {
                return self.callCreateResource(
                    type, resourceBlueprint, data.query, data.context
                );
            }).then(function(resource) {
                return self.renderResource(
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

        return Promise.all([
            this.callGetResource(
                type, id, data.query, data.context
            ),
            this.resolveFieldsSchema(
                type, 'update', data.context
            )
        ]).then(function(result) {

            var resource = result[0];
            var fieldsSchema = result[1];

            var validator = self.createValidator({
                fieldsSchema: fieldsSchema
            });

            var validate = schema.validate || function() {
                if (fieldsSchema) {
                    return validator.validateFields(data).report();
                }
            };

            return Promise.resolve(validate({
                data: data,
                resource: resource,
                action: 'update',
                database: self,
                validator: validator,
                context: data.context
            }));

        }).then(function() {
            return self.callUpdateResource(
                type, id, data, data.query, data.context
            );
        }).then(function(resource) {
            return self.renderResource(
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

    renderResource: function(resource, query, context) {

        query = query || {};

        return this.callPresentResources(
            resource.type, [resource], query, context
        ).then(function(resources) {

            var resourceView = resources[0];

            return this.buildIncluded({
                resources: [resourceView],
                include: query.include,
                fields: query.fields,
                query: query,
                context: context
            }).then(function(included) {
                var response = {data: resourceView};
                if (included.length) {
                    response.included = included;
                }
                return response;
            });

        }.bind(this));

    },

    renderResourceCollection: function(type, resources, meta, query, context) {

        query = query || {};

        return this.callPresentResources(
            type, resources, query, context
        ).then(function(resourceViews) {

            return this.buildIncluded({
                resources: resourceViews,
                include: query.include,
                fields: query.fields,
                query: query,
                context: context
            }).then(function(included) {
                var response = {data: resourceViews};
                if (included.length) {
                    response.included = included;
                }
                if (meta) {
                    response.meta = meta;
                }
                return response;
            });

        }.bind(this));

    },

    presentResources: function(type, resources, query, context) {

        query = query || {};

        var trimObject = function(obj, key) {
            if (obj[key] && Object.keys(obj[key]).length === 0) {
                delete obj[key];
            }
        };

        var resourceViews = resources.map(function(resource) {
            trimObject(resource, 'attributes');
            trimObject(resource, 'relationships');
            return this.applySparseFields(
                resource, query.fields, query, context
            );
        }.bind(this));

        return Promise.resolve(resourceViews);

    },

    callPresentResources: function(type, resources, query, context) {

        var method = 'present' + pascalCase(type) + 'Resources';
        return this[method]
            ? this[method](resources, query, context)
            : this.presentResources(type, resources, query, context);

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
                ).then(function(resources) {
                    return self.callPresentResources(type, resources, query, context);
                });
            })
        ).then(function(items) {

            var resources = flatten(items);

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

    createValidator: function(params) {

        params = params || {};

        var fieldsSchema = params.fieldsSchema;
        var error = errorFactory.validationError();

        error.validateFields = function(data, overrides) {

            overrides = overrides || {};

            function validateAttributes() {

                var result = validateData(fieldsSchema.attributes || {}, data.attributes || {}, {
                    messages: overrides.messages && overrides.messages.attributes,
                    assignDefaults: false
                });

                result.errors.forEach(function(item) {
                    error.addAttributeError(item.field, item.message);
                });

            }

            function validateRelationships() {

                var relationshipsUnpacked = Object.keys(
                    data.relationships || {}
                ).reduce(function(acc, relationName) {
                    acc[relationName] = data.relationships[relationName].data;
                    return acc;
                }, {});

                var result = validateData(fieldsSchema.relationships || {}, relationshipsUnpacked, {
                    messages: overrides.messages && overrides.messages.relationships,
                    assignDefaults: false
                });

                result.errors.forEach(function(item) {
                    error.addRelationshipError(item.field, item.message);
                });

            }

            if (fieldsSchema) {
                validateAttributes();
                validateRelationships();
            } else {
                error.addError('Fields schema not defined');
            }

            return error;

        };

        error.extractFieldDefaults = function() {

            var defaultAttributes = validateData.extractDefaults(
                fieldsSchema.attributes || {}
            );

            var defaultRelationshipsPacked = validateData.extractDefaults(
                fieldsSchema.relationships || {}
            );

            var defaultRelationships = Object.keys(
                defaultRelationshipsPacked
            ).reduce(function(acc, relationName) {
                acc[relationName] = {
                    data: defaultRelationshipsPacked[relationName]
                };
                return acc;
            }, {});

            return {
                attributes: defaultAttributes,
                relationships: defaultRelationships
            };

        };

        error.validateData = validateData;

        return error;

    }

});

module.exports = BaseAdapter;
