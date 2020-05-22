module.exports = function(arrayObj) {
    return [].concat.apply([], arrayObj);
};
