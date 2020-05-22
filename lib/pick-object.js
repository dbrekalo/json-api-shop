module.exports = function(source, keys) {
    var target = {};
    keys.forEach(function(key) {
        if (typeof source[key] !== 'undefined') {
            target[key] = source[key];
        }
    });
    return target;
};
