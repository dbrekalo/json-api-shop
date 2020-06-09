const MemoryAdapter = require('../adapters/memory');
const resourceSchemaFactory = require('./resource-schema-factory');
const BrowserServer = require('../servers/browser');
const assert = require('chai').assert;
const axiosLib = require('axios');
const {Model, Collection} = require('json-api-resource');
// const log = obj => console.log(JSON.stringify(obj, null, 4));

const url = path => window.location.href + '/api' + path;
const axios = axiosLib.create({baseURL: url('')});

let server;

beforeEach(function() {
    server = new BrowserServer({
        baseUrl: url('/'),
        databaseAdapter: MemoryAdapter,
        resources: resourceSchemaFactory()
    }).start();
});

afterEach(function() {
    server && server.stop();
});

describe('Browser server', () => {

    it('returns resource list', () => {

        return axios
            .get('/article')
            .then(response => {

                const collection = Collection.create(response.data);

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

        return axios
            .get('/article/1')
            .then(response => {

                const article = Model.create(response.data);
                assert.equal(article.get('id'), '1');
                assert.equal(article.get('type'), 'article');
                assert.equal(article.get('title'), 'Article title 1');
                assert.equal(article.get('author.id'), '1');
                assert.equal(article.get('author.boss.id'), '2');

            });

    });

    it('returns error when resource is not found', done => {

        axios
            .get('/article/foobar')
            .catch(error => {
                assert.equal(error.response.status, 404);
                done();
            });

    });

    it('applies pagination limit', () => {

        return axios
            .get('/article?page[limit]=3')
            .then(response => {

                const collection = Collection.create(response.data);
                assert.equal(collection.length, 3);

            });

    });

    it('applies pagination limit and offset', () => {

        return axios
            .get('/article?page[limit]=3&page[offset]=3')
            .then(response => {

                const collection = Collection.create(response.data);
                assert.equal(collection.length, 3);
                assert.equal(collection.models[0].get('id'), '4');

            });

    });

    it('can apply different pagination strategy', () => {

        server.stop();

        const serverPageBased = new BrowserServer({
            pagination: {
                strategy: 'pageBased',
                numberKey: 'number',
                limitKey: 'size'
            },
            baseUrl: url('/'),
            databaseAdapter: MemoryAdapter,
            resources: resourceSchemaFactory()
        }).start();

        return axios
            .get('/article?page[size]=4&page[number]=2')
            .then(response => {

                const collection = Collection.create(response.data);
                assert.equal(collection.length, 4);
                assert.equal(collection.models[0].get('id'), '5');
                serverPageBased.stop();

            });

    });

    it('throws on invalid page query', done => {

        axios
            .get('/article?page=1')
            .catch(error => {
                assert.equal(error.response.status, 400);
                done();
            });

    });

    it('filters resource list', () => {

        return axios
            .get('/article?filter[title]=Article title 3')
            .then(response => {

                const collection = Collection.create(response.data);
                assert.equal(collection.length, 1);
                assert.equal(collection.models[0].get('title'), 'Article title 3');

            });

    });

    it('throws on invalid filter query', done => {

        axios
            .get('/article?filter=Article title 3')
            .catch(error => {
                assert.equal(error.response.status, 400);
                done();
            });

    });

    it('sorts resource list', () => {

        return axios
            .get('/article?sort=-title')
            .then(response => {

                const collection = Collection.create(response.data);
                assert.equal(collection.models[0].get('title'), 'Article title 9');

            });

    });

    it('updates resource correctly', () => {

        return axios
            .put('/article/1', {
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
            .then(response => {

                const model = Model.create(response.data);
                assert.equal(model.get('title'), 'Updated article title');
                assert.equal(model.get('published'), true);
                assert.equal(model.get('author.nickname'), 'testUser2');
                assert.deepEqual(model.get('tags.id'), ['1']);

            });
    });

    it('throws on invalid update attribute payload ', done => {

        axios
            .put('/article/1', {
                data: {
                    type: 'article',
                    id: '1',
                    attributes: false
                }
            }).catch(error => {
                assert.equal(error.response.status, 400);
                done();
            });

    });

    it('returns validation error on invalid update ', done => {

        axios
            .put('/article/1', {
                data: {
                    type: 'article',
                    id: '1',
                    attributes: {
                        title: ''
                    }
                }
            })
            .catch(error => {
                assert.equal(error.response.status, 409);
                assert.equal(error.response.data.errors[0].detail, 'Field minimum length is 2');
                done();
            });

    });

    it('returns validation error on invalid create', done => {

        axios
            .post('/article', {
                data: {
                    type: 'article',
                    attributes: {
                        title: ''
                    }
                }
            })
            .catch(error => {

                assert.equal(error.response.status, 409);
                assert.equal(error.response.data.errors[0].detail, 'Field minimum length is 2');
                done();

            });

    });

    it('creates resource correctly', () => {

        return axios
            .post('/article', {
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
            .then(response => {

                const model = Model.create(response.data);
                assert.equal(model.get('title'), 'New article title');
                assert.equal(model.get('published'), false);
                assert.equal(model.get('author.nickname'), 'testUser1');

            });

    });

    it('deletes resource correctly', done => {

        axios
            .delete('/article/1')
            .then(() => {
                return axios
                    .get('/article/1')
                    .catch(error => {
                        assert.equal(error.response.status, 404);
                        done();
                    });
            });

    });

    it('applies sparse fieldsets', () => {

        return axios
            .get('/article/1?fields[article]=title,author&fields[user]=nickname')
            .then(response => {

                const model = Model.create(response.data);
                assert.equal(model.get('title'), 'Article title 1');
                assert.isUndefined(model.get('published'));
                assert.isUndefined(model.get('body'));
                assert.equal(model.get('author.id'), '1');
                assert.equal(model.get('author.nickname'), 'testUser1');
                assert.isUndefined(model.get('author.email'));

            });

    });

    it('applies resource includes', () => {

        return axios
            .get('/article/1?include=author')
            .then(response => {

                assert.equal(response.data.included.length, 1);

            });

    });

    it('applies resource sparse fieldsets and includes', () => {

        return axios
            .get('/article/1?fields[article]=title,author&fields[user]=nickname,boss&include=author.boss')
            .then(response => {

                const model = Model.create(response.data);
                assert.equal(model.get('title'), 'Article title 1');
                assert.isUndefined(model.get('body'));
                assert.equal(model.get('author.id'), '1');
                assert.equal(model.get('author.nickname'), 'testUser1');
                assert.equal(model.get('author.boss.nickname'), 'testUser2');
                assert.isUndefined(model.get('author.email'));
                assert.equal(response.data.included.length, 2);

            });

    });

});
