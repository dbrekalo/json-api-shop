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

## Default fields
Default fields (attributes and relationships) to be merged with client payload fields when resource is created.

### getDefaultFields
```Function``` returning ```Object``` or ```Promise``` resolved with default attributes and relationships.
Method is called with parameters:
- ```database```: current database instance
- ```context```: current running context (request in server implementations)
- ```query```: request query

```js
const schema = {
    article: {
        getDefaultFields({database, context}) {
            return {
                attributes: {
                    title: '',
                    published: false
                },
                relationships: {
                    author: {data: null},
                    tags: {data: []}
                }
            }
        }
    }
};
```

## Validation
Attributes and relationships from client request can be validated when resource is created or updated.

### validate
```Function``` returning ```Promise``` successfully resolved or rejected with validation errors.
Method is called with parameters:
- ```data```: attributes and relationships payload from client request
- ```method```: ```"edit"``` or ```"create"``` string
- ```resource```: current database resource on edit, client payload merged with default fields on create
- ```database```: current database instance
- ```context```: current running context (request in server implementations)
- ```validator```: helper object to generate json api formatted errors.
    - Use ```addAttributeError``` and ```addRelationshipError``` methods to add errors. ```report``` method will
return rejected promise if errors were added or resolved promise if there were none.
```js
const schema = {
    article: {
        validate({data, validator}) {
            if (data.attributes?.title === '') {
                validator.addAttributeError('title', 'Article title is mandatory');
            }
            return validator.report();
        }
    }
};
```

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
List (```Object```) of supported ```Function``` filter functions. Functions are called with parameters:
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
List (```Object```) of supported ```Function``` sort functions or ```Object``` shortcuts like in example bellow:

```js
const schema = {
    article: {
        sorts: {
            '-title': {
                attribute: 'title',
                sort: 'descending'
            }
        }
    }
};
```
