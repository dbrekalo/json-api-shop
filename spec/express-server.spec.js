const assert = require('chai').assert;
const request = require('supertest');
const {Model, Collection} = require('json-api-resource');
const MemoryAdapter = require('../adapters/memory');
const ExpressServer = require('../servers/express');
const resourceSchemaFactory = require('./resource-schema-factory');
// const log = obj => console.log(JSON.stringify(obj, null, 4));

let app;

beforeEach(function() {
    app = new ExpressServer({
        databaseAdapter: MemoryAdapter,
        resources: resourceSchemaFactory()
    }).setupServer().getApp();
});

describe('Express server', () => {

    it('returns resource list', () => {

        return request(app)
            .get('/article')
            .expect(200)
            .expect('Content-Type', /json/)
            .then(response => {

                const collection = Collection.create(response.body);

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

        return request(app)
            .get('/article/1')
            .expect(200)
            .expect('Content-Type', /json/)
            .then(response => {

                const article = Model.create(response.body);
                assert.equal(article.get('id'), '1');
                assert.equal(article.get('type'), 'article');
                assert.equal(article.get('title'), 'Article title 1');
                assert.equal(article.get('author.id'), '1');
                assert.equal(article.get('author.boss.id'), '2');

            });
    });

    it('returns error when resource is not found', () => {

        return request(app)
            .get('/article/foobar')
            .expect(404);

    });

    it('applies pagination limit', () => {

        return request(app)
            .get('/article?page[limit]=3')
            .expect(200)
            .then(response => {

                const collection = Collection.create(response.body);
                assert.equal(collection.length, 3);

            });

    });

    it('applies pagination limit and offset', () => {

        return request(app)
            .get('/article?page[limit]=3&page[offset]=3')
            .expect(200)
            .then(response => {

                const collection = Collection.create(response.body);
                assert.equal(collection.length, 3);
                assert.equal(collection.models[0].get('id'), '4');

            });

    });

    it('can apply different pagination strategy', () => {

        const app = new ExpressServer({
            pagination: {
                strategy: 'pageBased',
                numberKey: 'number',
                limitKey: 'size'
            },
            databaseAdapter: MemoryAdapter,
            resources: resourceSchemaFactory()
        }).setupServer().getApp();

        return request(app)
            .get('/article?page[size]=4&page[number]=2')
            .expect(200)
            .then(response => {

                const collection = Collection.create(response.body);
                assert.equal(collection.length, 4);
                assert.equal(collection.models[0].get('id'), '5');

            });

    });

    it('throws on invalid page query', () => {

        return request(app)
            .get('/article?page=1')
            .expect(400);

    });

    it('filters resource list', () => {

        return request(app)
            .get('/article?filter[title]=Article title 3')
            .expect(200)
            .then(response => {

                const collection = Collection.create(response.body);
                assert.equal(collection.length, 1);
                assert.equal(collection.models[0].get('title'), 'Article title 3');

            });

    });

    it('throws on invalid filter query', () => {

        return request(app)
            .get('/article?filter=Article title 3')
            .expect(400);

    });

    it('sorts resource list', () => {

        return request(app)
            .get('/article?sort=-title')
            .expect(200)
            .then(response => {

                const collection = Collection.create(response.body);
                assert.equal(collection.models[0].get('title'), 'Article title 9');

            });

    });

    it('updates resource correctly', () => {

        return request(app)
            .put('/article/1')
            .send({
                data: {
                    type: 'article',
                    id: '1',
                    attributes: {
                        title: 'Updated article title',
                        published: true
                    },
                    relationships: {
                        author: {data: {type: 'user', id: '2'}},
                        tags: {data: [{type: 'tag', id: '1'}]}
                    }
                }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .expect(200)
            .expect('Content-Type', /json/)
            .then(response => {

                const model = Model.create(response.body);
                assert.equal(model.get('title'), 'Updated article title');
                assert.equal(model.get('published'), true);
                assert.equal(model.get('author.nickname'), 'testUser2');
                assert.deepEqual(model.get('tags.id'), ['1']);

            });
    });

    it('throws on invalid update attribute payload ', () => {

        return request(app)
            .put('/article/1')
            .send({
                data: {
                    type: 'article',
                    id: '1',
                    attributes: false
                }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);

    });

    it('returns validation error on invalid update ', () => {

        return request(app)
            .put('/article/1')
            .send({
                data: {
                    type: 'article',
                    id: '1',
                    attributes: {
                        title: ''
                    }
                }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .expect(409)
            .then(response => {

                const error = response.body;
                assert.equal(error.errors[0].detail, 'Field minimum length is 2');

            });

    });

    it('returns validation error on invalid create', () => {

        return request(app)
            .post('/article')
            .send({
                data: {
                    type: 'article',
                    attributes: {
                        title: ''
                    }
                }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .expect(409)
            .then(response => {

                const error = response.body;
                assert.equal(error.errors[0].detail, 'Field minimum length is 2');

            });

    });

    it('creates resource correctly', () => {

        return request(app)
            .post('/article')
            .send({
                data: {
                    type: 'article',
                    attributes: {
                        title: 'New article title'
                    },
                    relationships: {
                        author: {data: {id: '1', type: 'user'}}
                    }
                }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .expect(200)
            .then(response => {

                const model = Model.create(response.body);
                assert.equal(model.get('title'), 'New article title');
                assert.equal(model.get('published'), false);
                assert.equal(model.get('author.nickname'), 'testUser1');

            });

    });

    it('deletes resource correctly', () => {

        const server = request(app);

        return server
            .delete('/article/1')
            .expect(200)
            .then(() => {
                return server
                    .get('/article/1')
                    .expect(404);
            });

    });

    it('applies sparse fieldsets', () => {

        return request(app)
            .get('/article/1?fields[article]=title,author&fields[user]=nickname')
            .expect(200)
            .then(response => {

                const model = Model.create(response.body);
                assert.equal(model.get('title'), 'Article title 1');
                assert.isUndefined(model.get('published'));
                assert.isUndefined(model.get('body'));
                assert.equal(model.get('author.id'), '1');
                assert.equal(model.get('author.nickname'), 'testUser1');
                assert.isUndefined(model.get('author.email'));

            });

    });

    it('applies resource includes', () => {

        return request(app)
            .get('/article/1?include=author')
            .expect(200)
            .then(response => {

                assert.equal(response.body.included.length, 1);

            });

    });

    it('applies resource sparse fieldsets and includes', () => {

        return request(app)
            .get('/article/1?fields[article]=title,author&fields[user]=nickname,boss&include=author.boss')
            .expect(200)
            .then(response => {

                const model = Model.create(response.body);
                assert.equal(model.get('title'), 'Article title 1');
                assert.isUndefined(model.get('body'));
                assert.equal(model.get('author.id'), '1');
                assert.equal(model.get('author.nickname'), 'testUser1');
                assert.equal(model.get('author.boss.nickname'), 'testUser2');
                assert.isUndefined(model.get('author.email'));
                assert.equal(response.body.included.length, 2);

            });

    });

});
