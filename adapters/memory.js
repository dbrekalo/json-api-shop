var forOwn = require('mout/object/forOwn');
var values = require('mout/object/values');
var merge = require('mout/object/merge');
var pluck = require('mout/array/pluck');
var deepClone = require('mout/lang/deepClone');
var rejectUndefined = require('../lib/reject-undefined');
var errorFactory = require('../lib/error-factory');
var BaseAdapter = require('./base');

var MemoryAdapter = BaseAdapter.extend({

    initialize: function() {

        this.dataset = {};
        return this.seed();

    },

    seed: function() {

        var dataset = this.dataset;

        forOwn(this.config.resources, function(obj, type) {
            dataset[type] = {};
            var resources = typeof obj.dataset === 'function'
                ? obj.dataset()
                : (Array.isArray(obj.dataset) ? obj.dataset : [])
            ;
            resources.forEach(function(resource) {
                dataset[type][resource.id.toString()] = resource;
            });
        });

        return Promise.resolve();

    },

    copyResource: function(resource) {

        return deepClone(resource);

    },

    getResourceDataset: function(type, query, context) {

        return Promise.resolve(this.dataset[type]);

    },

    getResource: function(type, id, query, context) {

        var copyResource = this.copyResource;

        return this.getRawResource(
            type, id, query, context
        ).then(copyResource);

    },

    getRawResource: function(type, id, query, context) {

        return this.getResourceDataset(
            type, query, context
        ).then(function(resources) {

            var resource = resources[id.toString()];

            return resource ? resource : errorFactory.resourceNotFound().addError(
                'Cannot find resource "' + type + '" with id "' + id + '"'
            ).report();

        });

    },

    getResourceCollection: function(type, idReferences, query, context) {

        var copyResource = this.copyResource;

        return this.getRawResourceCollection(
            type, idReferences, query, context
        ).then(function(resources) {
            return resources.map(copyResource);
        });

    },

    getRawResourceCollection: function(type, idReferences, query, context) {

        return this.getResourceDataset(
            type, query, context
        ).then(function(resources) {

            var missingResources = [];
            var foundResources = idReferences.map(function(id) {
                var resource = resources[id.toString()];
                if (resource) {
                    return resource;
                } else {
                    missingResources.push(id);
                    return null;
                }
            });

            return missingResources.length ? errorFactory.resourceNotFound().addError(
                'Cannot find resources of type "' + type + '" with references "' + missingResources.join(', ') + '"'
            ).report() : foundResources;

        });

    },

    queryResourceCollection: function(type, query, context) {

        var copyResource = this.copyResource;

        return this.queryRawResourceCollection(
            type, query, context
        ).then(function(data) {
            data.resources = data.resources.map(copyResource);
            return data;
        });

    },

    queryRawResourceCollection: function(type, query, context) {

        var schema = this.config.resources[type];

        return this.getResourceDataset(
            type, query, context
        ).then(function(resourcesIndex) {

            query = query || {};
            var resources = values(resourcesIndex);
            var total = resources.length;

            // filters
            if (query.filter) {
                forOwn(query.filter, function(value, key) {
                    var userFilter = schema.filters && schema.filters[key];
                    if (userFilter) {
                        resources = resources.filter(function(resource) {
                            return userFilter(resource, value);
                        });
                    }
                });
                total = resources.length;
            }

            // sort
            if (query.sort) {
                var schemaSort = schema.sorts && schema.sorts[query.sort];
                if (schemaSort) {
                    if (typeof schemaSort === 'function') {
                        resources.sort(schemaSort);
                    } else {
                        resources.sort(function(resourceA, resourceB) {
                            var fieldName = schemaSort.field;
                            var fieldIsId = fieldName === 'id';
                            var isAscending = schemaSort.order === 'ascending';
                            var fieldA = fieldIsId
                                ? resourceA.id
                                : resourceA.attributes[fieldName];
                            var fieldB = fieldIsId
                                ? resourceB.id
                                : resourceB.attributes[fieldName];
                            return fieldA > fieldB
                                ? (isAscending ? 1 : -1)
                                : (isAscending ? -1 : 1);
                        });
                    }
                }
            }

            // pagination
            if (query.page) {
                var offset = query.page.offset;
                var limit = query.page.limit;
                resources = resources.slice(
                    offset, limit ? (offset + limit) : undefined
                );
            }

            return {
                resources: resources,
                meta: {total: total}
            };

        });

    },

    createResource: function(type, data, query, context) {

        var dataset = this.dataset;
        var copyResource = this.copyResource;

        return this.getNewResourceId(type).then(function(id) {

            return {
                id: id,
                type: type,
                attributes: merge({}, data.attributes),
                relationships: merge({}, data.relationships)
            };

        }).then(function(resource) {

            return this.validateRelationshipReferences(resource);

        }.bind(this)).then(function(resource) {

            dataset[type][resource.id] = resource;
            return this.persistToStorage({
                action: 'create',
                resource: resource,
                dataset: this.dataset
            }).then(function() {
                return copyResource(resource);
            });

        }.bind(this));

    },

    updateResource: function(type, id, data, query, context) {

        var copyResource = this.copyResource;

        return this.getRawResource(
            type, id, query, context
        ).then(function(resource) {

            if (data.attributes) {
                resource.attributes = merge(
                    resource.attributes || {},
                    rejectUndefined(data.attributes)
                );
            }
            if (data.relationships) {
                resource.relationships = merge(
                    resource.relationships || {},
                    rejectUndefined(data.relationships)
                );
            }

            return resource;

        }).then(function(resource) {

            return this.validateRelationshipReferences(resource);

        }.bind(this)).then(function(resource) {

            return this.persistToStorage({
                action: 'update',
                resource: resource,
                dataset: this.dataset
            }).then(function() {
                return copyResource(resource);
            });

        }.bind(this));

    },

    deleteResource: function(type, id, query, context) {

        var dataset = this.dataset;

        return this.getRawResource(
            type, id, query, context
        ).then(function(resource) {

            // remove from dataset
            delete dataset[type][id.toString()];

            // remove relationship pointers in other resources
            var allResources = values(dataset).reduce(function(acc, resourcesIndex) {
                return acc.concat(values(resourcesIndex));
            }, []);

            allResources.forEach(function(resource) {
                if (!resource.relationships) {
                    return;
                }
                values(resource.relationships).forEach(function(relation) {

                    if (Array.isArray(relation.data)) {
                        relation.data = relation.data.filter(function(pointer) {
                            return pointer.id !== id && pointer.type !== type;
                        });
                    } else if (relation.data) {
                        if (relation.data.id === id && relation.data.type === type) {
                            relation.data = null;
                        }
                    }

                });
            });

            return this.persistToStorage({
                action: 'delete',
                resource: resource,
                dataset: this.dataset
            }).then(function() {
                return '';
            });

        }.bind(this));

    },

    getNewResourceId: function(type) {

        var currentIds = values(this.dataset[type]).map(function(resource) {
            return parseInt(resource.id, 10);
        });

        return Promise.resolve(String(currentIds.length
            ? Math.max.apply(null, currentIds) + 1
            : 1
        ));

    },

    validateRelationshipReferences: function(resource) {

        var self = this;
        var errors = errorFactory.validationError();

        var refs = Object.keys(
            resource.relationships
        ).reduce(function(acc, relationName) {
            var relation = resource.relationships[relationName];
            if (Array.isArray(relation.data)) {
                relation.data.length && acc.push({
                    relationName: relationName,
                    type: relation.data[0].type,
                    idReferences: pluck(relation.data, 'id')
                });
            } else if (relation.data) {
                acc.push({
                    relationName: relationName,
                    type: relation.data.type,
                    idReferences: [relation.data.id]
                });
            }
            return acc;
        }, []);

        return Promise.all(refs.map(function(item) {

            return self.getRawResourceCollection(
                item.type, item.idReferences
            ).catch(function() {
                errors.addRelationshipError(
                    item.relationName, 'Invalid related resource'
                );
            });

        })).then(function() {
            return errors.report();
        }).then(function() {
            return resource;
        });

    },

    persistToStorage: function() {

        return Promise.resolve();

    }

});

module.exports = MemoryAdapter;
