var Class = function () {
};

Class.extend = function (extention) {
    var self = this;

    var SubClass = function () {
    };

    SubClass.prototype = self.prototype;


    var CurrentClass = function () {
    };

    if (extention && extention.init && extention.init instanceof Function) {
        CurrentClass = extention.init;
    }    

    CurrentClass.prototype = new SubClass();
    CurrentClass.fn = CurrentClass.prototype;

    for (property in extention) {
        SubClass.prototype[property] = extention[property];
    }
    
    CurrentClass.constructor = CurrentClass;
    CurrentClass.extend = self.extend;

    return CurrentClass;
}
