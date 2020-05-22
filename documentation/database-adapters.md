# Database adapters
Database adapters are objects responsible for communication between service and database layer.
They transform resource queries and instructions to api used by your application database engine.

## Memory adapter
Database adapter with "in memory" storage comes bundled with library. Resources are manipulated
with in process memory (server process in Express server implementation or browser memory in
browser implementations).

Memory adapter is preconfigured with generic methods for creating, updating and deleting resources.
It can be used with no configuration effort outside of standard resource schema definition.

::: warning
Memory adapter is not suited for production usage and / or environments with multiple running processes.
:::

Custom user instances of memory adapter can be passed to server or service constructors.
```js
const MemoryAdapter = require('json-api-shop/adapters/memory');
const ExpressServer = require('json-api-shop/servers/express');

const memoryAdapter = new MemoryAdapter({
    resources: schema
});
const server = new ExpressServer({
    port: 3000,
    databaseAdapter: memoryAdapter,
    resources: schema
});
```

## Creating your adapters
Database adapter api can be extended to work with different database engines.
Custom adapters need to implement CRUD-like methods explained and examined
in simplified example bellow:

### Extending base adapter
```js
// our adapter will extend bundled base adapter
const BaseAdapter = require('json-api-shop/adapters/base');

// we will use simple storage model
const database = {
    article: [{
        id: '1'
        type: 'article',
        attributes: {title: 'Title 1'}
    }]
};

// our adapter class implementation
const MyAdapter = BaseAdapter.extend({

    getResource(type, id, query, context) {
        // get single resource of requested type using id
        return Promise.resolve(storage[type].find(
            resource => resource.id === id
        ));
    },

    getResourceCollection(type, idReferences, query, context) {
        // pick resources of requested type using idReferences (array)
        // and return then as collection (array)
        return Promise.resolve(storage[type].filter(
            resource => idReferences.includes(resource.id)
        ));
    },

    queryResourceCollection(type, query, context) {
        // applying query filters, sorts, pagination
        // and return resource collection (array)
        return Promise.resolve(storage[type].filter(...));
    },

    updateResource(type, id, data, query, context) {
        // update resource of requested type and id
        // with submitted data (attributes and relationships)
        // and return updated resource
        const resource = storage[type].find(item => item.id === id);
        resource.attributes = {...resource.attributes, ...data.attributes};
        resource.relationships = {...resource.relationships, ...data.relationships};
        return Promise.resolve(resource);
    },

    createResource(type, data, query, context) {
        // create resource of requested type
        // with submitted data (attributes and relationships)
        // and return created resource
        const newResource = {id: randomId(), type, ...data};
        storage[type].push(newResource);
        return Promise.resolve(resource);
    },

    deleteResource(type, id, query, context) {
        // delete resource of requested type and id
        storage[type].filter(item => item.id !== id);
        return Promise.resolve();
    }

});
````
```Promise``` is expected return type of all methods.

As last arguments methods receive:
- ```query```: ```Object``` containing resource query filters, sorts, fields and other query parameters
- ```context```: ```Object``` containing current running context (server request in server implementations)

::: tip
If working with in memory dataset like one in example above - usage of bundled memory adapter is advised.
:::

### Extending with custom resource methods
```js
const BaseAdapter = require('json-api-shop/adapters/base');

const MyAdapter = BaseAdapter.extend({

    getArticleResource(id, query, context) {
        // get single article resource using id
    },

    getArticleResourceCollection(idReferences, query, context) {
        // pick articles using requested idReferences (array)
        // and return then as collection (array)
    },

    queryArticleResourceCollection(query, context) {
        // applying query filters, sorts, pagination
        // and return articles collection (array)
    },

    updateArticleResource(id, data, query, context) {
        // update article with requested id
        // with submitted data (attributes and relationships)
        // and return updated article
    },

    createArticleResource(data, query, context) {
        // create article resource
        // with submitted data (attributes and relationships)
        // and return created article
    },

    deleteArticleResource(id, query, context) {
        // delete article resource with requested id
    }

});
````

## localStorage adapter example
Simple database adapter with persisted dataset in browser localStorage is examined bellow.

```js
const MemoryAdapter = require('json-api-shop/adapters/memory');

const LocalStorageAdapter = MemoryAdapter.extend({
    seed() {
        const storedDataset = localStorage.getItem('dataset');

        if (storedDataset) {
            this.dataset = JSON.parse(storedDataset);
        } else {
            this.callParent('seed');
            this.persistToStorage();
        }
    },
    persistToStorage(dataset) {
        localStorage.setItem('dataset', JSON.stringify(dataset));
        return Promise.resolve();
    }
})
````
