var validateTypes = require('validate-types');
var allTests = require('validate-types/tests/all');

var validator = validateTypes.createValidator(allTests, {
    reportUndeclaredAsError: true,
    messages: {
        required: 'Field is required',
        readOnly: 'Field is read only',
        type: 'Invalid field type',
        equals: 'Field does not have expected value',
        equalsField: 'Field values not identical',
        email: 'Field is not valid email',
        oneOf: 'Field does not equal any of predefined values',
        objectSchema: 'Object fields are invalid',
        arraySchema: 'Array items are invalid',
        pattern: 'Field does not match required pattern',
        maxLength: function(params) {
            return 'Field maximum length is ' + params.testConfig;
        },
        minLength: function(params) {
            return 'Field minimum length is ' + params.testConfig;
        },
        integer: 'Field is not integer',
        min: function(params) {
            return 'Field minimum value is ' + params.testConfig;
        },
        max: function(params) {
            return 'Field maximum value is ' + params.testConfig;
        },
        validator: 'Field is not valid'
    }
});

var isValidId = function(id) {
    return ['string', 'number'].indexOf(typeof id) >= 0;
};

validator.addTest({
    name: 'hasMany',
    validate: function(params) {
        var items = params.fieldValue;
        return Array.isArray(items) && items.every(function(item) {
            return isValidId(item.id) &&
                item.type === params.testConfig;
        });
    },
    message: 'Relationship not valid',
    skipFurtherTests: function(params) {
        return !params.validateResult;
    }
}, {insertAfter: 'type'});

validator.addTest({
    name: 'hasOne',
    validate: function(params) {
        var pointer = params.fieldValue;
        return !Array.isArray(pointer) &&
            isValidId(pointer.id) &&
            pointer.type === params.testConfig;
    },
    message: 'Relationship not valid',
    skipFurtherTests: function(params) {
        return !params.validateResult;
    }
}, {insertAfter: 'type'});

module.exports = validator;
