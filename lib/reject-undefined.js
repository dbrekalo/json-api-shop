var reject = require('mout/object/reject');

module.exports = function(obj) {
    return reject(obj, function(value) {
        return typeof value === 'undefined';
    });
};
