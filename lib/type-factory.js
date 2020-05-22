var hasOwn = require('mout/object/hasOwn');

function factory(ParentType, prototypeProperties, staticProperties) {

    var GeneratedType = hasOwn(prototypeProperties, 'constructor')
        ? prototypeProperties.constructor
        : function() { ParentType && ParentType.apply(this, arguments); }
    ;

    if (ParentType) {
        var Surrogate = function() { this.constructor = GeneratedType; };

        Surrogate.prototype = ParentType.prototype;
        GeneratedType.prototype = new Surrogate();

        Object.assign(GeneratedType, ParentType);

        GeneratedType.prototype.callParent = function() {
            var methodName = arguments[0];
            var methodArgs = Array.prototype.slice.call(arguments, 1);
            return ParentType.prototype[methodName].apply(this, methodArgs);
        };
    }

    staticProperties && Object.assign(GeneratedType, staticProperties);
    prototypeProperties && Object.assign(GeneratedType.prototype, prototypeProperties);

    return GeneratedType;

}

module.exports = function(prototypeProperties, staticProperties) {

    var CreatedType = factory(null, prototypeProperties, staticProperties);

    CreatedType.extend = function(prototypeProperties, staticProperties) {
        return factory(this, prototypeProperties, staticProperties);
    };

    return CreatedType;

};
