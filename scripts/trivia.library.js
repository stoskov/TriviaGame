//#region trivia namespace
var trivia = trivia || {};

//#region trivia.classManager namespace
trivia.classManager = trivia.classManager || {};

trivia.classManager.createClass = function (baseClass, currentClassConstructor) {
    var SubClass = function() {
    };

    var baseClassObject = null;

    // Inherit the properties of the base class
    if (baseClass !== null) {
        SubClass.prototype = baseClass.prototype;
        baseClassObject = new baseClass();
    }
    
    var CurrentClass = currentClassConstructor;

    CurrentClass.prototype = new SubClass();
    CurrentClass.prototype.constructor = currentClassConstructor;

    //Linck the base class object to allow base methods access
    CurrentClass.prototype.baseClassObject = baseClassObject;

    return CurrentClass;    
}
//#endregion

//#region trivia.viewModels namespace
trivia.viewModels = trivia.viewModels || {};

//Definition of observalbe class using event handler to watch for a property changes
trivia.viewModels.ObservableClass = trivia.classManager.createClass(null, function () {
    var self = this;

    Object.defineProperty(trivia.viewModels.ObservableClass.prototype, "watchProperty", {

        enumerable: false,
        configurable: true,
        writable: false,

        value: function (property, handler) {

            var propertyValue = this[property];

            var getter = function () {
                return propertyValue;
            };

            var setter = function (newPropertyValue) {
                propertyValue = newPropertyValue;
                handler.call(this, newPropertyValue);
                return newPropertyValue;
            };

            Object.defineProperty(this, property, {
                get: getter,
                set: setter
            });            
        }
    });

    return self;
})

//Definition of ViewModel class managing binding
trivia.viewModels.ViewModel = trivia.classManager.createClass(trivia.viewModels.ObservableClass, function () {
    
    // private members
    var self = this,
    bindedElementsList = [];
    
    //public methods
    self.bind = function(DOMElement) {
        var elementsToBind = $(DOMElement).find("[data-bind-trivia]");

        for (elementToBindIndex = 0; elementToBindIndex < elementsToBind.length; elementToBindIndex++) {
            var elementToBind = elementsToBind[elementToBindIndex];
            var BindingList = parseElementBinding(elementToBind);
            bindSingleElement(elementToBind, BindingList);
        }

        bindedElementsList.push(DOMElement)
    }

    //private methods
    var bindProperty = function (DOMElement, propertyName) {

        $(DOMElement).on("change input propertyChange", function (e) {
            e.preventDefault();
            self[propertyName] = $(DOMElement).val();
        });

        self.watchProperty(propertyName, function (newPropertyValue) {
            $(DOMElement).val(newPropertyValue);
        })
    }

    var bindAction = function (DOMElement, actionName) {
        $(DOMElement).on("change input propertyChange click", function (e) {
            e.preventDefault();
            if (self[actionName] instanceof Function) {
                self[actionName].call(self, DOMElement);
            }
        });
    }

    var parseElementBinding = function (DOMElement) {
        
        var bindingStringFull = $(DOMElement).data("bind-trivia") || "";
        var bindingStringsList = bindingStringFull.split(";");
        var result = [];

        for (i in bindingStringsList) {
            var bindingStrings = bindingStringsList[i].split(":");
            var bindingProperty = bindingStrings[0].trim();
            var bindingOption = bindingStrings[1].trim();
            result[bindingProperty] = bindingOption;
        }

        return result;
    }

    var bindSingleElement = function(DOMElement, BindingList) {
    	
        for (bindingProperty in BindingList) {
            if (bindingProperty == "click") {
                bindAction(DOMElement, BindingList[bindingProperty]);
            }
            else {
                bindProperty(DOMElement, BindingList[bindingProperty])
            }
        }
    }

    return self;
})
//#endregion



//#endregion