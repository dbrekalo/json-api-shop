# Service api
Service api is core api through which resources are queried and manipulated.
Common set of CRUD methods are used to create, read, update and delete resources.
It ensures that client request is properly formatted to json:api standards before being forwarded to database adapter.

Server implementations (Express and browser) are thin layers built on top of service api.
Servers parse parameters and intent from http requests and forwards them to service api calls.

Service api can be used standalone, outside of server implementation.

## Creating service
```js
const ServiceApi = require('json-api-shop/service');
const MemoryAdapter = require('json-api-shop/adapters/memory');

const service = new ServiceApi({
    databaseAdapter: MemoryAdapter,
    resources: schema
});
```
Constructor can be called with:
- ```databaseAdapter```: database adapter instance or constructor function
- ```resources```: resources schema
- ```pagination```: pagination configuration
    - offset based (default) ```{strategy: 'offsetBased', offsetKey: 'offset', limitKey: 'limit'}```
    - page based ```{strategy: 'pageBased', numberKey: 'number', limitKey: 'size'}```

## Available methods
All service methods return ```Promise``` that can be resolved with json:api formatted resource
representation or rejected with json:api errors.
- ```get```: query resources
- ```create```: create resource
- ```update```: update resource
- ```delete```: delete resource

## Getting resource detail
```js
service.get({
    type: 'article',
    id: '1'
}).then(
    article => console.log(article)
);
```

## Getting resource list
```js
service.get({
    type: 'article'
}).then(
    articles => console.log(articles)
);
```

## Filtering resource list
```js
service.get({
    type: 'article',
    query: {
        filter: {
            title: 'Article'
        }
    }
});
```

## Sorting resource list
```js
service.get({
    type: 'article',
    query: {
        sort: '-title'
    }
});
```

## Paginating resource list
```js
service.get({
    type: 'article',
    query: {
        page: {
            offset: 10,
            limit: 10
        }
    }
});
```

## Adding sparse fieldsets
```js
service.get({
    type: 'article',
    query: {
        fields: {
            article: ['title']
        }
    }
});
```

## Including related resources
```js
service.get({
    type: 'article',
    query: {
        include: ['author']
    }
});
```

## Combined resource query
```js
service.get({
    type: 'article',
    query: {
        filter: {
            title: 'Article'
        },
        sort: '-title',
        fields: {
            article: ['title'],
            user: ['email']
        },
        include: ['author'],
        page: {
            offset: 10,
            limit: 10
        }
    }
});
```

## Creating resource
```js
service.create({
    type: 'article',
    attributes: {
        title: 'New title'
    }
}).then(article => {
    console.log(article);
});
```

## Updating resource
```js
service.update({
    type: 'article',
    id: '1',
    attributes: {
        title: 'Updated title'
    }
}).then(article => {
    console.log(article);
});
```

## Deleting resource
```js
service.delete({
    type: 'article',
    id: '1'
});
```
