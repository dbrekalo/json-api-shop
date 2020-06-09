# Resource schema
Resource schema is a simple configuration object where your application resources are defined.
Defaults values for attributes and relationships, validation rules and other settings can be defined here
depending on database adapter used.

## Resource list
Schema in simplest form has only resources listed.
```js
const schema = {
    article: {},
    tag: {},
    user: {}
};
```
## Fields schema
List of resource fields (attributes and relationships) with expected value types and rules.
This schema is used for data validation when resource is created or updated.
```js
const schema = {
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
        })
    }
};
```
All rules available in [validateTypes](https://dbrekalo.github.io/validate-types/) library can be used in schema.

## Validation
Attributes and relationships from client request can be validated when resource is created or updated.
By default input data is validated using rules from field schema if one is defined.

Validation can be extended by defining validate function on schema:
```js
const schema = {
    user: {
        fieldsSchema: ({action}) => ({
            attributes: {
                nickname: {type: String, default: ''},
                email: {type: String, email: true, required: action === 'create'}
            }
        }),
        validate({validator, data}) {
            return validator.validateFields(data, {
                messages: {email: {pattern: 'Invalid email format'}}
            }).report();
        }
    }
}
````

### validate
```Function``` returning ```Promise``` successfully resolved or rejected with validation errors.
Method is called with parameters:
- ```data```: attributes and relationships payload from client request
- ```method```: ```"update"``` or ```"create"``` string
- ```resource```: current database resource on update action
- ```database```: current database instance
- ```context```: current running context (request in server implementations)
- ```validator```: helper object to generate json api formatted errors.
    - Use ```addAttributeError``` and ```addRelationshipError``` methods to add errors. ```validateFields``` will validate data using fields schma. ```report``` method will
return rejected promise if errors were added or resolved promise if there were none.

### errors message field
By default error messages are written to error detail field. If needed this can be configured:
```js
const errorFactory = require('json-api-shop/lib/error-factory');
errorFactory.setMessageField('title');
````

## Dataset
List of resources to seed database with.
::: warning
Used with in-memory database adapters and its derivatives
:::

### dataset
```Array``` or  ```Function``` returning ```Array``` of resources.

```js
const schema = {
    article: {
        dataset: [{
            id: '1',
            type: 'article',
            attributes: {
                title: 'Test title 1',
                published: false
            },
            relationships: {
                author: {
                    data: {id: '1', type: 'user'}
                },
                tags: {
                    data: [
                        {id: '1', type: 'tag'},
                        {id: '2', type: 'tag'},
                        {id: '3', type: 'tag'}
                    ]
                }
            }
        }]
    }
};
```

## Filters
List of available resource filters.

::: warning
Used with in-memory database adapters and its derivatives
:::

### filters
List of supported ```Function``` filter functions. Functions are called with parameters:
- ```resource```: database resource ```Object```
- ```filterValue```: filter query ```String```
```js
const schema = {
    article: {
        filters: {
            title(resource, filterValue) {
                const title = resource.attributes.title;
                return title.includes(filterValue);
            }
        }
    }
};
```

## Sort options
List of available sort options.

::: warning
Used with in-memory database adapters and its derivatives
:::

### sorts
List of supported ```Function``` sort functions or ```Object``` shortcuts like in example bellow:

```js
const schema = {
    article: {
        sorts: {
            '-title': {
                field: 'title',
                order: 'descending'
            }
        }
    }
};
```
