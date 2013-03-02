(function ($) {

    var ns = '__jquery_xdomain__',
        sc = 'SESSION_COOKIE_NAME';

    if ($.browser.msie && 'XDomainRequest' in window && !(ns in $)) {

        $[ns] = $.support.cors = true;

        function parseUrl(url) {
            if ($.type(url) === "object") {
                return url;
            }
            var matches = /^(((([^:\/#\?]+:)?(?:\/\/((?:(([^:@\/#\?]+)(?:\:([^:@\/#\?]+))?)@)?(([^:\/#\?]+)(?:\:([0-9]+))?))?)?)?((\/?(?:[^\/\?#]+\/+)*)([^\?#]*)))?(\?[^#]+)?)(#.*)?/.exec(url);
            return matches ? {
                href: matches[0] || "",
                hrefNoHash: matches[1] || "",
                hrefNoSearch: matches[2] || "",
                domain: matches[3] || "",
                protocol: matches[4] || "",
                authority: matches[5] || "",
                username: matches[7] || "",
                password: matches[8] || "",
                host: matches[9] || "",
                hostname: matches[10] || "",
                port: matches[11] || "",
                pathname: matches[12] || "",
                directory: matches[13] || "",
                filename: matches[14] || "",
                search: matches[15] || "",
                hash: matches[16] || ""
            } : {};
        }

        var oldxhr = $.ajaxSettings.xhr,
            sessionCookie = sc in window ? window[sc] : "jsessionid",
            domain = parseUrl(document.location.href).domain;

        $.ajaxSettings.xhr = function () {
            var target = parseUrl(this.url).domain;
            if (target === "" || target === domain) {
                return oldxhr.call($.ajaxSettings)
            } else {
                try {
                    var xdr = new XDomainRequest();
                    if (!xdr.setRequestHeader) {
                        xdr.setRequestHeader = $.noop;
                    }
                    if (!xdr.getAllResponseHeaders) {
                        xdr.getAllResponseHeaders = $.noop;
                    }
                    if (sessionCookie) {
                        var open = xdr.open;
                        xdr.open = function () {
                            var cookie = new RegExp('(?:^|; )' + sessionCookie + '=([^;]*)', 'i').exec(document.cookie);
                            cookie = cookie && cookie[1];
                            if (cookie) {
                                var q = arguments[1].indexOf('?');
                                if (q == -1) {
                                    arguments[1] += ';' + sessionCookie + '=' + cookie;
                                } else {
                                    arguments[1] = arguments[1].substring(0, q) + ';' + sessionCookie + '=' + cookie + arguments[1].substring(q);
                                }
                            }
                            return open.apply(this, arguments);
                        };
                    }
                    xdr.onload = function () {
                        if (typeof xdr.onreadystatechange === 'function') {
                            xdr.readyState = 4;
                            xdr.status = 200;
                            xdr.onreadystatechange.call(xdr, null, false);
                        }
                    };
                    xdr.onerror = xdr.ontimeout = function () {
                        if (typeof xdr.onreadystatechange === 'function') {
                            xdr.readyState = 4;
                            xdr.status = 500;
                            xdr.onreadystatechange.call(xdr, null, false);
                        }
                    };
                    return xdr;
                } catch (e) {
                }
            }
        };

    }
})(jQuery);

var trivia = trivia || {};

trivia.createClass = function (baseClass, currentClassConstructor) {
    var SubClass = function () {
    };

    // Inherit the properties of the base class
    if (baseClass !== null) {
        SubClass.prototype = baseClass.prototype;
    }

    var CurrentClass = currentClassConstructor;

    CurrentClass.prototype = new SubClass();
    CurrentClass.prototype.constructor = currentClassConstructor;

    return CurrentClass;
}

//Defines class for communication betwewn the application and the rest server
trivia.RestComunicator = function (hostUrl) {
    var self = this,
    host = hostUrl,
    serviceMap = {},
    timeOut = 5000;

    //Public members
    self.setHostUrl = function (hostUrl) {
        host = hostUrl;
    }

    self.getHostUrl = function () {
        return host;
    }

    self.addServiceUrl = function (serviceName, serviceUrl) {
        serviceMap[serviceName] = serviceUrl;
    }

    self.getServiceUrl = function (serviceName, serviceUrl) {
        verifyServiceUrl(serviceName);
        return serviceMap[serviceName];
    }

    self.setTimeout = function (timeoutInMs) {
        timeOut = timeoutInMs;
    };

    self.sendGetRequest = function (serviceName, urlParameter, data, onSuccess, onError) {
        var requestHandler = null,
        serviceUrl = this.getServiceUrl(serviceName),
        requestUrl = host + serviceUrl + urlParameter;
        $.support.cors = true;
        requestHandler = $.ajax({
            url: requestUrl,
            type: "GET",
            timeout: timeOut,
            dataType: "json",
            data: data,
            success: onSuccess,
            error: onError
           
        });

        return requestHandler;
    }

    self.sendPostRequest = function (serviceName, urlParameter, data, onSuccess, onError) {
        var requestHandler = null,
        serviceUrl = this.getServiceUrl(serviceName),
        requestUrl = host + serviceUrl + urlParameter;
        $.support.cors = true;
        requestHandler = $.ajax({
            url: requestUrl,
            type: "POST",
            timeout: timeOut,
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(data),
            success: onSuccess,
            error: onError
        });

        return requestHandler;
    }

    self.parseResponseMessage = function (data) {
        var message = "";

        if (data && data.statusText) {
            message = data.statusText;
        }

        if (data && data.responseText) {
            var errorResponse = JSON.parse(data.responseText);
            message = message + "\n" + errorResponse["Message"];
        }

        message = message.replace("\n", "<br/>");
        return message;
    }

    //Private members
    var verifyServiceUrl = function (serviceName) {
        if (!serviceMap || !serviceMap[serviceName]) {
            throw new Error("Url for service " + serviceName + " is not defined");
        }
    }
}

//Definition of observalbe class using event handler to watch for a property changes
trivia.ObservableObject = function (model) {
    var self = this;

    //Makes extension of and existing model and returnes a new object
    self.getExtendedModel = function (extension) {
        var newModel = new trivia.ObservableObject(self);
        if (extension && typeof extension == "object" && extension != null) {
            copyMembers(extension, newModel);
        }
        initializeModel(newModel);
        return newModel;
    }

    //Transfers the members from the protopype model to the current object
    var copyMembers = function (copyFrom, copyTo) {
        if (copyFrom == null || (typeof copyFrom) != "object") {
            throw new Error("The element to copy from must be and object!")
        }

        if (copyTo == null || (typeof copyTo) != "object") {
            throw new Error("The element to copy from must be and object!")
        }

        for (modelProperty in copyFrom) {
            copyTo[modelProperty] = copyFrom[modelProperty];
        }
    }

    //Call init member if defined
    var initializeModel = function (model) {
        if (model && model["init"] && model["init"] instanceof Function) {
            model["init"].call(model);
        }
    }

    //Defines bining metod used to watch properties changes
    self.watchProperty = function (property, handlerHost, handler) {
        if (!property) {
            throw new Error("Define the watchable property");
        }

        if (!handlerHost) {
            throw new Error("Define the handler host");
        }

        if (!handler) {
            throw new Error("Define the handler");
        }

        if ((this[property]) == undefined || this[property] == null) {
            throw new Error("The object does not contain property " + property);
        }

        var propertyValue = this[property];

        var getter = function () {
            return propertyValue;
        };

        var setter = function (newPropertyValue) {
            propertyValue = newPropertyValue;
            var currentPropertyHandlersList = this.observablePropertiesHandlers[property];
            for (var handlerIndex = 0; handlerIndex < currentPropertyHandlersList.length; handlerIndex++) {
                var currentHandler = currentPropertyHandlersList[handlerIndex];
                var currentHandlerHost = currentHandler["handlerHost"];
                var currentHandlerFunction = currentHandler["handler"];

                callHandler(currentHandlerHost, currentHandlerFunction, newPropertyValue);
            }
            return newPropertyValue;
        };

        var callHandler = function (handlerHost, handlerFunction, newPropertyValue) {
            handlerFunction.call(handlerHost, newPropertyValue, self);
        };

        //Wrap the property only once
        if (!this["observablePropertiesHandlers"] || !this["observablePropertiesHandlers"][property]) {
            Object.defineProperty(this, property, {
                get: getter,
                set: setter
            });
        }

        handlerHost = handlerHost || this;

        //Add the new handler and the handler host for later executioin
        var handlerObject = {
            "handler": handler,
            "handlerHost": handlerHost
        }

        //Check if the property already has observers
        this["observablePropertiesHandlers"] = this["observablePropertiesHandlers"] || [];
        this["observablePropertiesHandlers"][property] = this["observablePropertiesHandlers"][property] || [];

        //Add the listener
        this.observablePropertiesHandlers[property].push(handlerObject);

        //Call the handler to init the value
        callHandler(handlerHost, handler, propertyValue);
    }
    
    copyMembers(model, self);
    initializeModel(self);

    return self;
}

//Definition of ViewModel class managing binding
trivia.ViewModelBinder = function (modelToObserve) {
    // private members
    var self = this,
    bindedElementsList = [],
    model = {};

    //public methods
    self.bind = function (domElement) {
        //Collect all the binded elements
        var elementsToBind = $(domElement).find("[data-trivia-bind]");

        //Check if the containder is bided as well
        if ($(domElement).data("trivia-bind")) {
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
        var bindingStringFull = $(domElement).data("trivia-bind") || "";
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

        var isModelPropertyFunction = model[propertyName] instanceof Function;
        var bindedParameters = parseBindedParameters(domElement);

        //A model function is bind to an event
        if (jqMethodType === "action") {
            if (!isModelPropertyFunction) {
                throw new Error(domAttribute + " can only be bind to action (" + model[propertyName] + ")");
            }

            if (!jqDelegateArguments[0]) {
                throw new Error(domAttribute + " does not contain action");
            }

            var event = jqDelegateArguments[0];

            $(domElement).on(event, function (e) {
                if (event != "keypress" && event != "keyup" && event != "keydown") {
                    e.preventDefault();
                }
                model[propertyName].call(model, bindedParameters, domElement, e);
            });
        }
        //A model value is bind to a DOM property
        else if (!isModelPropertyFunction) {
            //Bind from DOM to Model
            $(domElement).on("change input propertyChange", function (e) {
                e.preventDefault();
                model[propertyName] = jqDelegate.apply($(domElement), jqDelegateArguments);
            });
            //Bind from Model to DOM
            model.watchProperty(propertyName, model, function (newPropertyValue) {
                //Append the binded property value to the list with parameters
                jqDelegateArguments.push(newPropertyValue);
                jqDelegate.apply($(domElement), jqDelegateArguments);
                jqDelegateArguments.pop();
            })
        }
        //A model function is bind to a DOM property
        else {
            //Bind from DOM to Model
            $(domElement).on("refresh", function (e) {
                var modelValue = model[propertyName].call(model, bindedParameters, domElement);
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
        atributeMethodsMap["data"] = $().data;

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

    var parseBindedParameters = function (domElement) {
        var parametersStringFull = $(domElement).data("trivia-parameters") || "";
        var parametersStringList = parametersStringFull.split(";");
        var result = [];

        if (parametersStringFull != "") {
            for (i in parametersStringList) {
                var parametersStrings = parametersStringList[i].split(":");
                var parameterProperty = parametersStrings[0].trim();
                var parameterValue = parametersStrings[1].trim();
                result[parameterProperty] = parameterValue;
            }
        }

        return result;
    }

    //Class initialisation
    if (modelToObserve instanceof trivia.ObservableObject) {
        model = modelToObserve;
    }
    else {
        model = new trivia.ObservableObject(modelToObserve);
    }

    return self;
}

trivia.sessionManager = new trivia.ObservableObject({

    store: function (alias, jsonObject) {
        var stringObject;

        if (typeof (Storage) !== "undefined") {
            stringObject = JSON.stringify(jsonObject);
            sessionStorage.setItem(alias, stringObject);
        }
    },

    retreive: function (alias) {
        var stringObject,
        result = {};

        if (typeof (Storage) !== "undefined" && sessionStorage.getItem(alias) !== null) {
            stringObject = sessionStorage.getItem(alias);
            result = JSON.parse(stringObject);
        }

        return result;
    },

    initObject: function (alias, objectToInit) {
        var storedOjbect = this.retreive(alias);
        for (property in storedOjbect) {
            //Hack! The property stores the list with watched properties and their handles. 
            //When pass through stringify it looses its value
            if (property != "observablePropertiesHandlers") {
                objectToInit[property] = storedOjbect[property];
            }
        }
    },
});

trivia.Timer = function (time, interval, onTick, onTimeOver) {
    var self = this
    totalTime = time,
    remainingTime = time,
    tickInterval = interval,
    timerHandler = null,
    onTickHandler = onTick,
    onTimeOverHandler = onTimeOver;

    if (!time) {
        throw new Error("The \"time\" parameter is required");
    }

    if (!interval) {
        throw new Error("The \"interval\" parameter is required");
    }

    self.getRemainingTime = function () {
        return remainingTime;
    };

    self.getRemainingTimeString = function () {
        return remainingTime;
    };

    self.toHHMMSS = function () {
        var hours = Math.floor(remainingTime / 3600);
        var minutes = Math.floor((remainingTime - (hours * 3600)) / 60);
        var seconds = remainingTime - (hours * 3600) - (minutes * 60);

        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        var time = hours + ':' + minutes + ':' + seconds;
        return time;
    }

    self.setOnTickHandler = function (onTick) {
        onTickHandler = onTimeOver;
    };

    self.getOnTickHandler = function () {
        return onTickHandler;
    };

    self.setOnTimeOverHandler = function (onTimeOver) {
        onTimeOverHandler = onTimeOver;
    };

    self.getOnTimeOverHandler = function () {
        return onTimeOverHandler;
    };

    self.getRemainngTime = function() {
        return remainingTime;
    }

    self.clear = function () {
        clearInterval(timerHandler);
        totalTime = 0;
        remainingTime = 0;
    };

    self.pause = function () {
        clearInterval(timerHandler);
        totalTime = 0;
        remainingTime = 0;
    };

    self.pause = function () {
        clearInterval(timerHandler);
        totalTime = 0;
        remainingTime = 0;
    };

    self.start = function () {
        timerHandler = setInterval(timerTick, tickInterval * 1000);
    };

    var timerTick = function () {
        remainingTime -= tickInterval;
        if (onTickHandler instanceof Function && remainingTime > 0) {
            onTickHandler.apply(self);
        }

        if (onTimeOverHandler instanceof Function && remainingTime <= 0) {
            self.clear();
            onTimeOverHandler.apply(self);
        }
    };

    return self;
};