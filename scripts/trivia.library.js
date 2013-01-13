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

//#region trivia.restComunicator namespace
trivia.restComunicator = trivia.restComunicator || {};

trivia.restComunicator.Comunicator = trivia.classManager.createClass(null, function (hostUrl) {
    var self = this,
    host = hostUrl;

    //Public members
    self.setHostUrl = function(hostUrl) {
        host = hostUrl;
    }

    self.getHostUrl = function () {
        return host;
    }

    self.sendGetRequest = function (serviceUrl, data, onSuccess, onError) {
        var requestUrl = host + serviceUrl;
        $.ajax({
            url: requestUrl,
            type: "GET",
            timeout: 5000,
            dataType: "json",
            data: data,
            success: onSuccess,
            error: onError
        });
    }

    self.sendPostRequest = function (serviceUrl, data, onSuccess, onError) {
        var requestUrl = host + serviceUrl;
        $.ajax({
            url: requestUrl,
            type: "POST",
            timeout: 5000,
            dataType: "json",
            data: data,
            success: onSuccess,
            error: onError
        });
    }
});
//#endregion

//#region trivia.models namespace
trivia.models = trivia.models || {};

//Definition of observalbe class using event handler to watch for a property changes
trivia.models.ObservableModel = trivia.classManager.createClass(null, function (model) {
    var self = this,
    //Store list with properties to observe. 
    //Needed to support a property being wathed by multiple watchers
    observablePropertiesHandlers = {};

    //If model passed as parameter trasnfer properties
    if (model != null) {
        for (modelProperty in model) {
            self[modelProperty] = model[modelProperty];
        }
    }

    Object.defineProperty(trivia.models.ObservableModel.prototype, "watchProperty", {

        enumerable: false,
        configurable: true,
        writable: false,

        value: function (property, handlerHost, handler) {

            //if (!property) {
            //    throw new Error("Define the watchable property");
            //}

            //if (!handlerHost) {
            //    throw new Error("Define the handler host");
            //}

            //if (!handler) {
            //    throw new Error("Define the handler");
            //}

            //if (!(this[property])) {
            //    throw new Error("The object does not contain property " + property);
            //}

            var propertyValue = this[property];

            var getter = function () {
                return propertyValue;
            };

            var setter = function (newPropertyValue) {
                propertyValue = newPropertyValue;
                var currentPropertyHandlersList = observablePropertiesHandlers[property];

                for (handlerIndex = 0; handlerIndex < currentPropertyHandlersList.length; handlerIndex++) {

                    var currentHandler = currentPropertyHandlersList[handlerIndex];
                    var currentHandlerHost = currentHandler["handlerHost"];
                    var currentHandlerFunction = currentHandler["handler"];

                    currentHandlerFunction.call(currentHandlerHost, newPropertyValue);
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

            handlerHost = handlerHost || this;

            //Add the new handler and the handler host for later executioin
            var handlerObject = {
                "handler": handler,
                "handlerHost": handlerHost
            }
            observablePropertiesHandlers[property].push(handlerObject);
            //Call the setter for first init
            setter.call(handlerHost, propertyValue)
        }
    });

    if (self["init"] && self["init"] instanceof Function) {
        self["init"].call(self);
    }

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

    var bindSingleElement = function (domElement, bindingList) {

        for (bindingProperty in bindingList) {
            var modelPropertyName = bindingList[bindingProperty];
            bindProperty(domElement, bindingProperty, modelPropertyName)
        }
    }
    
    var bindProperty = function (domElement, domAttribute, propertyName) {
        //Get the jQuery method and arguments
        var jqDelegateInfo = getMethodWithArguments(domAttribute);

        var jqDelegate = jqDelegateInfo["delegate"],
        jqDelegateArguments = jqDelegateInfo["arguments"],
        jqMethodType = jqDelegateInfo["methodType"];

        if (!jqDelegate) {
            throw new Error("The bind type is not supported:" + domAttribute);
        }

        var isModelPropertFunction = model[propertyName] instanceof Function;

        //A model function is bind to an event
        if (jqMethodType === "action") {
           
            if (!isModelPropertFunction) {
                throw new Error(domAttribute + " can only be bind to action (" + model[propertyName] + ")");
            }

            if (!jqDelegateArguments[0]) {
                throw new Error(domAttribute + " does not contain action");
            }

            var event = jqDelegateArguments[0];

            $(domElement).on(event, function (e) {
                e.preventDefault();
                //  e.stopPropagation();
                model[propertyName].call(model, domElement);
            });
        }
        //A model value is bind to a DOM property
        else if (!isModelPropertFunction) {
            //Bind from DOM to Model
            $(domElement).on("change input propertyChange", function (e) {
                e.preventDefault();
                // e.stopPropagation();
                model[propertyName] = jqDelegate.apply($(domElement), jqDelegateArguments);
            });
            //Bind from Model to DOM
            model.watchProperty(propertyName, model, function (newPropertyValue) {
                jqDelegateArguments.push(newPropertyValue);
                jqDelegate.apply($(domElement), jqDelegateArguments);
                jqDelegateArguments.pop();
            })
        }
        //A model function is bind to a DOM property
        else {
            //Bind from DOM to Model
            $(domElement).on("refresh", function (e) {
                //e.stopPropagation();
                var modelValue = model[propertyName].call(model, domElement);
                jqDelegateArguments.push(modelValue);
                jqDelegate.apply($(domElement), jqDelegateArguments);
                jqDelegateArguments.pop();
            });
        }
    }

    var getMethodWithArguments = function (domAttribute) {
        var atributeMethodsMap = {};
        //In casae the dom element has no value attribute
        atributeMethodsMap["text"] = $().text;
        atributeMethodsMap["html"] = $().html;
        atributeMethodsMap["css"] = $().css;
        atributeMethodsMap["attr"] = $().attr;
        atributeMethodsMap["event"] = $().on;

        var jqDelegate = null,
        jqDelegateArguments = [],
        methodType = "";

        var domAttributeSplitList = domAttribute.split("-");

        if (domAttributeSplitList[0] && atributeMethodsMap[domAttributeSplitList[0]]) {
            jqDelegate = atributeMethodsMap[domAttributeSplitList[0]];
        }

        if (domAttributeSplitList[0] === "event") {
            methodType = "action";
        }
        else {
            methodType = "value";
        }

        if (domAttributeSplitList[1]) {
            jqDelegateArguments = [domAttributeSplitList[1]];
        }

        return {
            "delegate": jqDelegate,
            "arguments": jqDelegateArguments,
            "methodType": methodType
        }
    }

    //Class initialisation
    if (modelToObserve instanceof trivia.models.ObservableModel) {
        model = modelToObserve;
    }
    else {
        model = new trivia.models.ObservableModel(modelToObserve);
    }

    return self;
}
//#endregion
//#endregion