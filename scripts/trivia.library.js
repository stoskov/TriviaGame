//#region trivia namespace
var trivia = trivia || {};

//#region trivia.classManager namespace
trivia.classManager = trivia.classManager || {};

trivia.classManager.createClass = function (baseClass, currentClassConstructor) {
    var SubClass = function () {
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

//#region trivia.models namespace
trivia.models = trivia.models || {};

//Definition of observalbe class using event handler to watch for a property changes
trivia.models.ObservableModel = trivia.classManager.createClass(null, function (model) {
    var self = this;

    //If model passed as parameter trasnfer properties
    if (model != null) {
        for (modelProperty in model) {
            self[modelProperty] = model[modelProperty];
        }
    }

    //Store list with properties to observe. 
    //Needed to support a property being wathed by multiple watchers
    var observablePropertiesHandlers = {};

    Object.defineProperty(trivia.models.ObservableModel.prototype, "watchProperty", {

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
                for (handlerIndex = 0; handlerIndex < observablePropertiesHandlers[property].length; handlerIndex++) {                    
                    observablePropertiesHandlers[property][handlerIndex].call(this, newPropertyValue);
                }
                return newPropertyValue;
            };

            //Wrap the property only once
            if (!observablePropertiesHandlers[property]) {
                Object.defineProperty(this, property, {
                    get: getter,
                    set: setter
                });

                observablePropertiesHandlers[property] = [];
            }

            //Add bind the new handler
            observablePropertiesHandlers[property].push(handler);

            setter(propertyValue);
        }
    });

    return self;
})
//#endregion

//#region trivia.viewModels namespace
trivia.viewModels = trivia.viewModels || {};

//Definition of ViewModel class managing binding
trivia.viewModels.ViewModel = function (modelToObserve) {

    // private members
    var self = this,
    bindedElementsList = [],
    model = {};

    //public methods
    self.bind = function (domElement) {
        //Collect all the binded elements
        var elementsToBind = $(domElement).find("[data-bind-trivia]");

        //Check if the containder is bided as well
        if ($(domElement).data("bind-trivia")) {
            elementsToBind = elementsToBind.add(domElement);
        }
        
        for (elementToBindIndex = 0; elementToBindIndex < elementsToBind.length; elementToBindIndex++) {
            var elementToBind = elementsToBind[elementToBindIndex];
            var bindingList = parseElementBindings(elementToBind);
            bindSingleElement(elementToBind, bindingList);
        }

        //Push the DOM element in the list with bindings
        bindedElementsList.push(domElement)
    }

    //private methods
    var bindProperty = function (domElement, domAttribute, propertyName) {

        $(domElement).on("change input propertyChange", function (e) {
            e.preventDefault();
            model[propertyName] = $(domElement).attr(domAttribute);
        });

        model.watchProperty(propertyName, function (newPropertyValue) {            
            $(domElement).attr(domAttribute, newPropertyValue);
            
        })
    }

    var bindAction = function (domElement, domAttribute, actionName) {
        $(domElement).on(domAttribute, function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (model[actionName] instanceof Function) {
                model[actionName].call(model, domElement);
            }
        });
    }

    var parseElementBindings = function (domElement) {

        var bindingStringFull = $(domElement).data("bind-trivia") || "";
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

    var bindSingleElement = function (domElement, BindingList) {

        for (bindingProperty in BindingList) {
            var modelPropertyName = BindingList[bindingProperty];

            //If the model member is a function bind one way action, elase two ways property update
            if (model[modelPropertyName] instanceof Function) {
                bindAction(domElement, bindingProperty, modelPropertyName);
            }
            else {
                bindProperty(domElement, bindingProperty, modelPropertyName)
            }
        }
    }

    //Class initialisation
    if (modelToObserve instanceof trivia.models.ObservableModel) {
        model = modelToObserve;
    }
    else {
        model = new trivia.models.ObservableModel();
        for (modelProperty in modelToObserve) {
            model[modelProperty] = modelToObserve[modelProperty];
        }
    }

    return self;
}
//#endregion
//#endregion