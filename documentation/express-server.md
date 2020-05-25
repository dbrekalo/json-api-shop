# Express server
Express node.js server comes bundled and preconfigured with all route and error handlers.

### Simple server example
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

## Server options
Server constructor options include:
- ```databaseAdapter```: database adapter instance or constructor function
- ```baseUrl```: base server url (default "/"")
- ```port```: server port (default 3000)
- ```resources```: resources schema
- ```useCors```: to setup cors express middleware (default ```false```)
- ```updateMethod```: http method (```String```or ```Array```) used for resource update
- ```service```: user api service instance
- ```validationErrorStatusCode```: http status code for validation errors

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
const ExpressServer = require('json-api-shop/servers/express');
const MyServer = ExpressServer.extend({
    ...
});
```

## Integrating with existing Express application
Server object exposes following methods for easy integration into existing application:
- ```setupMiddleware```
- ```setupRoutes```
- ```setupErrorHandling```

```js
const express = require('express');
const app = express();

const ExpressServer = require('json-api-shop/servers/express');
const MemoryAdapter = require('json-api-shop/adapters/memory');

// create server
const apiServer = new ExpressServer({
    databaseAdapter: MemoryAdapter,
    resources: schema
});

// your application middleware
app.use(...);
// add json api server middleware (optional)
apiServer.setupMiddleware(app);

// your application routes
app.get(...);
app.post(...);
// add json api server routes
apiServer.setupRoutes(app);

// add json api error handler
apiServer.setupErrorHandling(app);
// your error handler
app.use(...);

app.listen(3000);
```
