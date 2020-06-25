var contains = require('mout/string/contains');
var randomInt = require('mout/random/randInt');
var range = require('mout/array/range');
var randomBool = require('mout/random/randBool');

module.exports = function() {
    return {
        article: {
            fieldsSchema: ({action, context}) => ({
                attributes: {
                    title: {type: String, minLength: 2, required: action === 'create'},
                    body: {type: String, default: ''},
                    published: {type: Boolean, default: false}
                },
                relationships: {
                    tags: {hasMany: 'tag', default: []},
                    author: {hasOne: 'user', nullable: true, default: null}
                }
            }),
            filters: {
                title: function(resource, filterValue) {
                    return contains(
                        resource.attributes.title.toLowerCase(),
                        filterValue.toLowerCase()
                    );
                }
            },
            sorts: {
                '-title': {
                    field: 'title',
                    order: 'descending'
                }
            },
            dataset: function() {
                return range(1, 9).map(function(index) {
                    return {
                        type: 'article',
                        id: String(index),
                        attributes: {
                            title: 'Article title ' + index,
                            body: 'Article body ' + index,
                            published: randomBool()
                        },
                        relationships: {
                            author: {
                                data: {id: '1', type: 'user'}
                            },
                            tags: {
                                data: [
                                    {id: '1', type: 'tag'},
                                    {id: String(randomInt(1, 5)), type: 'tag'},
                                    {id: String(randomInt(6, 10)), type: 'tag'}
                                ]
                            }
                        }
                    };
                });
            }
        },
        tag: {
            dataset: range(1, 10).map(function(index) {
                return {
                    type: 'tag',
                    id: String(index),
                    attributes: {
                        title: 'Tag ' + index
                    }
                };
            })
        },
        user: {
            fieldsSchema: ({action}) => ({
                attributes: {
                    nickname: {type: String, default: ''},
                    email: {type: String, email: true, required: action === 'create'}
                },
                relationships: {
                    boss: {hasOne: 'user', nullable: false, required: action === 'create'}
                }
            }),
            validate({validator, data}) {
                return validator.validateFields(data, {
                    messages: {email: {pattern: 'Invalid email format'}}
                }).report();
            },
            dataset: range(1, 5).map(function(index) {
                return {
                    type: 'user',
                    id: String(index),
                    attributes: {
                        nickname: 'testUser' + index,
                        email: 'testUser' + index + '@gmail.com'
                    },
                    relationships: {
                        boss: {data: {id: '2', type: 'user'}}
                    }
                };
            })
        }
    };
};
