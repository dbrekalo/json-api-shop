module.exports = function(timeMS) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, timeMS || 0);
    });
};
