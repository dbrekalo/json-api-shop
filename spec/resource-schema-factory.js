var contains = require('mout/string/contains');
var randomInt = require('mout/random/randInt');
var range = require('mout/array/range');
var randomBool = require('mout/random/randBool');

module.exports = function() {
    return {
        article: {
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
                    attribute: 'title',
                    sort: 'descending'
                }
            },
            getDefaultFields: function() {
                return {
                    attributes: {
                        title: '',
                        body: '',
                        published: false
                    },
                    relationships: {
                        author: {data: null},
                        tags: {data: []}
                    }
                };
            },
            validate: function(params) {
                var validator = params.validator;
                var attributes = params.data.attributes;
                if (attributes && attributes.title === '') {
                    validator.addAttributeError('title', 'Article title is mandatory');
                }
                return validator.report();
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
