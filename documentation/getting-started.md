# Getting started

## Installation
Install via node package manager:
```bash
npm install json-api-shop
```

## Code at glance
Examples bellow will use simple resource schema with dataset stored in memory.
```js
const schema = {
    article: {
        dataset: [{
            id: '1',
            type: 'article',
            attributes: {
                title: 'Test title 1'
            }
        }]
    }
}
````
### Simple Express server example
```js
const ExpressServer = require('json-api-shop/servers/express');
const MemoryAdapter = require('json-api-shop/adapters/memory');

const server = new ExpressServer({
    port: 3000,
    databaseAdapter: MemoryAdapter,
    resources: schema
});

server.start();
/* Server ready to process article requests
GET /article      (resource listing)
GET /article/1    (resource detail)
PUT /article/1    (resource update)
POST /article     (resource create)
DELETE /article/1 (resource delete)
*/
```

### Service usage example
```js
const ServiceApi = require('json-api-shop/service');
const MemoryAdapter = require('json-api-shop/adapters/memory');

const service = new ServiceApi({
    databaseAdapter: MemoryAdapter,
    resources: schema
});

// get article detail
service.get({
    type: 'article',
    id: '1'
}).then(
    article => console.log(article)
);

// create article
service.create({
    type: 'article',
    attributes: {
        title: 'Updated title'
    }
});
```

### Browser server example
```js
import BrowserServer from 'json-api-shop/servers/browser';
import MemoryAdapter from 'json-api-shop/adapters/memory';
import axios from 'axios';

const server = new BrowserServer({
    baseUrl: '/api/',
    databaseAdapter: MemoryAdapter,
    resources: schema
});

server.start();

// article resource detail
axios.get('/api/article/1').then(response => {
    console.log(response.data);
});

// article resource create
axios.post('/api/article/1', {
    data: {
        type: 'article',
        attributes: {
            title: 'Updated title'
        }
    }
});
```

## First step
Regardless of your target setup (express server, browser server or simple service api) first thing to do is
to setup a simple schema for your resources.
