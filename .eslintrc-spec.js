// https://eslint.org/docs/user-guide/configuring
const base = require('./.eslintrc.js');

module.exports = {
    ...base,
    env: {
        mocha: true,
        es6: true,
        commonjs: true
    }
};
