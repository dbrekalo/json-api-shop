var messageField = 'detail';

var factory = function(params) {

    params = params || {};

    var errorType = params.errorType || 'internalError';
    var message = params.message || 'Error encountered';

    var error = new Error(message);
    var errors = error.errors = [];

    error.jsonApiErrorType = errorType;

    error.addError = function(errorObject) {
        if (typeof errorObject === 'string') {
            var message = errorObject;
            errorObject = {};
            errorObject.code = errorType;
            errorObject[messageField] = message;
        }
        errors.push(errorObject);
        return error;
    };

    error.addAttributeError = function(attribute, message, params) {
        var errorObject = Object.assign({
            source: {pointer: '/data/attributes/' + attribute},
            code: errorType
        }, params);
        errorObject[messageField] = message;
        errors.push(errorObject);
        return error;
    };

    error.addRelationshipError = function(relationship, message, params) {
        var errorObject = Object.assign({
            source: {pointer: '/data/relationships/' + relationship},
            code: errorType
        }, params);
        errorObject[messageField] = message;
        errors.push(errorObject);
        return error;
    };

    error.report = function() {
        return errors.length
            ? Promise.reject(error)
            : Promise.resolve();
    };

    return error;

};

factory.badRequest = function(params) {
    return factory(Object.assign(
        {message: 'Bad request'},
        params,
        {errorType: 'badRequest'}
    ));
};

factory.resourceNotFound = function(params) {
    return factory(Object.assign(
        {message: 'Resource not found'},
        params,
        {errorType: 'resourceNotFound'}
    ));
};

factory.validationError = function(params) {
    return factory(Object.assign(
        {message: 'Validation error'},
        params,
        {errorType: 'validationError'}
    ));
};

factory.internalError = function(params) {
    return factory(Object.assign(
        {message: 'Internal error'},
        params,
        {errorType: 'internalError'}
    ));
};

factory.setMessageField = function(field) {
    messageField = field;
    return factory;
};

module.exports = factory;
