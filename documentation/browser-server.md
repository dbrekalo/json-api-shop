# Browser server
Included browser based server intercepts XMLHttpRequest and Fetch requests leaving your frontend api handlers unaware
that they are not connecting to real backend servers.

Database lives in browser memory and can be persisted in browser storage (localStorage, sessionStorage).
Serverless in its true to name form.

Browser server is usefull for frontend developer working with JSON:API powered backend who needs a quick way to bootstrap mocked api backend for
prototyping and running test suites.

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

## Server options
Server constructor options include:
- ```databaseAdapter```: database adapter instance or constructor function
- ```baseUrl```: base server url (default "/"")
- ```resources```: resources schema
- ```updateMethod```: http method (```String```or ```Array```) used for resource update
- ```service```: user api service instance
- ```pretenderInstance```: existing pretender instance
- ```validationErrorStatusCode```: http status code for validation errors
- ```logRequest```: log request to console
- ```logResponse```: log response to console

### Custom resource url
Custom resource url slug can be set in schema for given resource.

```js
const schema = {
    article: {
        urlSlug: 'articles'
    }
};
```

### Disabling resource routes
Resource routes can be disabled via following schema properties.

```js
const schema = {
    article: {
        hasListRoute: false,   // disables GET /article
        hasDetailRoute: false, // disables GET /article/:id
        hasUpdateRoute: false, // disables PUT /article/:id
        hasCreateRoute: false  // disables POST /article
        hasDeleteRoute: false  // disables DELETE /article/:id
    }
};
```

### Extending server
All server methods can be overridden.

```js
import BrowserServer from 'json-api-shop/servers/browser';
const MyServer = BrowserServer.extend({
    ...
});
```
