const ServiceApi = require('../service');
const MemoryAdapter = require('../adapters/memory');
const resourceSchemaFactory = require('./resource-schema-factory');
const assert = require('chai').assert;
const {Model, Collection} = require('json-api-resource');
// const log = obj => console.log(JSON.stringify(obj, null, 4));

let service;

beforeEach(function() {
    service = new ServiceApi({
        databaseAdapter: MemoryAdapter,
        resources: resourceSchemaFactory()
    });
});

describe('JSON API Service ', () => {

    it('returns resource list', () => {

        return service.get({
            type: 'article'
        }).then(data => {
            var collection = Collection.create(data);
            collection.forEach((model, index) => {
                const wantedArticleId = String(index + 1);
                assert.equal(model.get('type'), 'article');
                assert.equal(model.get('id'), wantedArticleId);
                assert.equal(model.get('title'), 'Article title ' + wantedArticleId);
                assert.equal(model.get('author.id'), '1');
                assert.equal(model.get('tags').length, 3);
            });
            assert.equal(collection.length, 9);
            assert.equal(collection.meta.total, 9);
        });

    });

    it('returns resource detail', () => {

        return service.get({
            type: 'article',
            id: '1'
        }).then(data => {
            const article = Model.create(data);
            assert.equal(article.get('id'), '1');
            assert.equal(article.get('type'), 'article');
            assert.equal(article.get('title'), 'Article title 1');
            assert.equal(article.get('author.id'), '1');
            assert.equal(article.get('author.boss.id'), '2');
        });

    });

    it('returns error when resource is not found', done => {

        service.get({
            type: 'article',
            id: 'foobar'
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'resourceNotFound');
            done();
        });

    });

    it('throws if query is not object', done => {

        service.get('article').catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('throws if type not specified', done => {

        service.get({
            id: '1'
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('throws if unknown type specified', done => {

        service.get({
            type: 'apples'
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('applies pagination limit', () => {

        return service.get({
            type: 'article',
            query: {page: {limit: 3}}
        }).then(data => {
            var collection = Collection.create(data);
            assert.equal(collection.length, 3);
        });

    });

    it('applies pagination limit and offset', () => {

        return service.get({
            type: 'article',
            query: {
                page: {offset: '3', limit: '3'}
            }
        }).then(data => {
            var collection = Collection.create(data);
            assert.equal(collection.length, 3);
            assert.equal(collection.models[0].get('id'), '4');
        });

    });

    it('can apply different pagination strategy', () => {

        var service = new ServiceApi({
            pagination: {
                strategy: 'pageBased',
                numberKey: 'number',
                limitKey: 'size'
            },
            databaseAdapter: MemoryAdapter,
            resources: resourceSchemaFactory()
        });

        return service.get({
            type: 'article',
            query: {
                page: {number: 2, size: 4}
            }
        }).then(data => {
            var collection = Collection.create(data);
            assert.equal(collection.length, 4);
            assert.equal(collection.models[0].get('id'), '5');
        });

    });

    it('throws on invalid page query', done => {

        service.get({
            type: 'article',
            query: {
                page: '1'
            }
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('calls adatper hooks when defined', () => {

        var service = new ServiceApi({
            databaseAdapter: MemoryAdapter.extend({
                getArticleResource(id) {
                    return this.getResource('article', id).then(data => {
                        data.attributes.foo = 'bar';
                        return data;
                    });
                }
            }),
            resources: resourceSchemaFactory()
        });

        return service.get({
            type: 'article',
            id: '1'
        }).then(data => {
            const article = Model.create(data);
            assert.equal(article.get('id'), '1');
            assert.equal(article.get('type'), 'article');
            assert.equal(article.get('foo'), 'bar');
        });

    });

    it('filters resource list', () => {

        return service.get({
            type: 'article',
            query: {
                filter: {title: 'Article title 3'}
            }
        }).then(data => {
            var collection = Collection.create(data);
            assert.equal(collection.length, 1);
            assert.equal(collection.models[0].get('title'), 'Article title 3');
        });

    });

    it('throws on invalid filter query', done => {

        service.get({
            type: 'article',
            query: {
                filter: 'Article title 3'
            }
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('sorts resource list', () => {

        return service.get({
            type: 'article',
            query: {
                sort: '-title'
            }
        }).then(data => {
            var collection = Collection.create(data);
            assert.equal(collection.models[0].get('title'), 'Article title 9');
        });

    });

    it('throws on invalid sort query', done => {

        service.get({
            type: 'article',
            query: {
                sort: false
            }
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('updates resource correctly', () => {

        return service.update({
            type: 'article',
            id: '1',
            attributes: {
                title: 'Update article title',
                published: true
            },
            relationships: {
                author: {data: {type: 'user', id: '2'}},
                tags: {data: [{type: 'tag', id: '1'}]}
            }
        }).then(data => {
            const model = Model.create(data);
            assert.equal(model.get('title'), 'Update article title');
            assert.equal(model.get('published'), true);
            assert.equal(model.get('author.nickname'), 'testUser2');
            assert.deepEqual(model.get('tags.id'), ['1']);
        }).then(() => {

            return service.update({
                type: 'article',
                id: '1',
                relationships: {author: {data: null}}
            }).then(data => {
                const model = Model.create(data);
                assert.equal(model.get('title'), 'Update article title');
                assert.isUndefined(model.get('author'));
            });

        });

    });

    it('throws on invalid update when id is missing', done => {

        service.update({
            type: 'article',
            attributes: {
                title: 'Update article title'
            }
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('throws on invalid update attribute payload ', done => {

        service.update({
            type: 'article',
            id: '1',
            attributes: false
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('throws on invalid update relationship payload (1)', done => {

        service.update({
            type: 'article',
            id: '1',
            relationships: {
                author: {type: 'user', id: '2'}
            }
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('throws on invalid update relationship payload (2)', done => {

        service.update({
            type: 'article',
            id: '1',
            relationships: {
                tags: false
            }
        }).catch(error => {
            assert.instanceOf(error, Error);
            assert.equal(error.jsonApiErrorType, 'badRequest');
            done();
        });

    });

    it('returns validation error on invalid update (1)', done => {

        service.update({
            type: 'article',
            id: '1',
            attributes: {
                title: ''
            }
        }).catch(error => {
            assert.equal(error.errors[0].detail, 'Field minimum length is 2');
            done();
        });

    });

    it('returns validation error on invalid update (2)', done => {

        service.update({
            type: 'article',
            id: '1',
            relationships: {
                author: {data: []},
                tags: {data: null}
            }
        }).catch(error => {
            assert.equal(error.errors[0].detail, 'Relationship not valid');
            assert.equal(error.errors[1].detail, 'Relationship not valid');
            done();
        });

    });

    it('returns validation error on invalid update (3)', done => {

        service.update({
            type: 'article',
            id: '1',
            relationships: {
                foo: {data: null}
            }
        }).catch(error => {
            assert.equal(error.errors[0].detail, 'Field "foo" is not declared');
            done();
        });

    });

    it('returns validation error on invalid create', done => {

        service.create({
            type: 'article',
            attributes: {
                title: '',
                published: null
            }
        }).catch(error => {
            assert.equal(error.errors[0].detail, 'Field minimum length is 2');
            assert.equal(error.errors[1].detail, 'Invalid field type');
            done();
        });

    });

    it('creates resource correctly', () => {

        return service.create({
            type: 'article',
            attributes: {
                title: 'New article title'
            },
            relationships: {
                author: {data: {id: '1', type: 'user'}}
            }
        }).then(data => {
            const model = Model.create(data);
            assert.equal(model.get('title'), 'New article title');
            assert.equal(model.get('published'), false);
            assert.equal(model.get('author.nickname'), 'testUser1');
        });

    });

    it('deletes resource correctly', () => {

        return service.delete({
            type: 'user',
            id: '1'
        }).then(() => {

            return service.get({
                type: 'user',
                id: '1'
            }).catch(error => {
                assert.instanceOf(error, Error);
            }).then(() => service.get({
                type: 'article',
                id: '1'
            })).then(data => {
                // relationship references are cleaned up
                const model = Model.create(data);
                assert.isUndefined(model.get('author'));
            });

        });

    });

    it('applies sparse fieldsets', () => {

        return service.get({
            type: 'article',
            id: '1',
            query: {
                fields: {
                    article: ['title', 'author'],
                    user: 'nickname'
                }
            }
        }).then(data => {

            const model = Model.create(data);
            assert.equal(model.get('title'), 'Article title 1');
            assert.isUndefined(model.get('published'));
            assert.isUndefined(model.get('body'));
            assert.equal(model.get('author.id'), '1');
            assert.equal(model.get('author.nickname'), 'testUser1');
            assert.isUndefined(model.get('author.email'));

        });

    });

    it('applies resource includes', () => {

        return service.get({
            type: 'article',
            id: '1',
            query: {
                include: ['author']
            }
        }).then(data => {
            assert.equal(data.included.length, 1);
        });

    });

    it('applies resource sparse fieldsets and includes', () => {

        return service.get({
            type: 'article',
            id: '1',
            query: {
                fields: {
                    article: ['title', 'author'],
                    user: ['nickname', 'boss']
                },
                include: ['author.boss']
            }
        }).then(data => {

            const model = Model.create(data);
            assert.equal(model.get('title'), 'Article title 1');
            assert.isUndefined(model.get('body'));
            assert.equal(model.get('author.id'), '1');
            assert.equal(model.get('author.nickname'), 'testUser1');
            assert.equal(model.get('author.boss.nickname'), 'testUser2');
            assert.isUndefined(model.get('author.email'));
            assert.equal(data.included.length, 2);

        });

    });

});
