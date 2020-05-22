# About
Javascript based tools for building applications based on [JSON:API](https://jsonapi.org/) specification and conventions.

## Who is it for
- backend javascript developer invested in JSON:API standard looking to streamline api development and enforce conventions
and practices defined in specification
- frontend developer who works with JSON:API powered api backend and needs a quick way to bootstrap mocked api backend for
prototyping and running test suites

## What is included
- adapter for "in memory" database storage
- service api to query and represent resources from storage
- express server to expose resource operations via http api
- browser server for prototypes and test runners

## What it does
- **Request validation**.
JSON:API specification defines how resources are queried and manipulated.
If a client request is malformed (invalid relationship payload, missing resource type or id, invalid query parameters...)
bundled tools will ensure that it never reaches your application logic and will report bad requests back to client.

- **JSON:API resource representation with included resources**.
Building included resources payload can be daunting task involving recursion, sub queries, memoization and other techniques.
Here this work is done automatically with no configuration or development effort needed.

- **Sparse fieldsets and relationship includes**.
No config needed here too. Clients can request smaller resource payloads using sparse fieldsets and relationship includes
leaving your server and application logic with less sub-queries and work in general. This type of response / logic
trimming is also done automatically.

- **HTTP server to present and manipulate your resources via api**.
Express node.js server comes bundled and preconfigured with all route and error handlers.

- **Browser server to prototype apps or mock api endpoints in test suits**.
Included browser based server intercepts XMLHttpRequest and Fetch requests and pulls a trick on your frontend api handlers.
Your mocked dataset lives in browser memory and can even be persisted in browser storage (local storage, session storage...).
Serverlesss. Kind of.

## What it does not do
- Authentication and authorization.
- Database and resource modeling
- Query caching

## What you need to do
- Create simple resource schema for your resource models.
- Choose database engine (process memory, file, SQLite, MySQL, PostgreSQL, Firebase, Firestore, Mongo, Redis...) for your resources and implement database adapter.
- Choose how you want to expose your resources - via simple programmatic service api, express or browser server.
