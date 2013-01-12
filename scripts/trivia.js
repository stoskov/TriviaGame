(function($) {
    $(document).ready(function() {

        //User account model
        userAccount = new trivia.models.ObservableModel({
            userName: "stoskov",
            nickName: "Svetozar Toskov",
            authCode: "",
            isLogedIn: false,
        });

        //Busuness layer controler staying between user accout model and the user account view
        headerUserAccountController = new trivia.viewModels.ViewModel({        	
            loginVisibility: "block",
            logoutVisibility: "none",
            userDisplayName: "",

            login: function() {
                userAccount.isLogedIn = true;
            },

            logout: function () {
                userAccount.isLogedIn = false;
            },

            updateControlerState: function() {
            	
                if (userAccount.isLogedIn == true) {
                    this.loginVisibility = "none";
                    this.logoutVisibility = "block";
                }
                else {
                    this.loginVisibility = "block";
                    this.logoutVisibility = "none";
                }

                this.userDisplayName = userAccount.nickName;
            },

            init: function () {
                userAccount.watchProperty("isLogedIn", this, this.updateControlerState);
                userAccount.watchProperty("nickName", this, this.updateControlerState);
            }
        })

        headerUserAccountController.bind($("#site-header-user-account-wrap"));
        
        $("#site-main-nav").kendoMenu({
            //select: onSelect
        });


        //function onSelect(e) {
        //    console.log("Selected: " + $(e.item).children(".k-link").text());
        //    viewModel.firstName = $(e.item).children(".k-link").text();
        //}

     

        //var viewModel = kendo.observable({
        //    firstName: "John",
        //    lastName: "Doe",
        //    displayGreeting: function () {
        //        // Get the current values of "firstName" and "lastName"
        //        var firstName = this.get("firstName");
        //        var lastName = this.get("lastName");
        //        alert("Hello, " + firstName + " " + lastName + "!!!");
        //    }
        //});

        //// Bind the View to the View-Model
        //kendo.bind($("#view"), viewModel);

        //var users = [
        //    {
        //        nickname: "Nickname 1",
        //        totalScores: 10,
        //        totalPlayedGames: 15
        //    },{
        //        nickname: "Nickname 2",
        //        totalScores: 130,
        //        totalPlayedGames: 145
        //    },{
        //        nickname: "Nickname 3",
        //        totalScores: 102,
        //        totalPlayedGames: 155
        //    },{
        //        nickname: "Nickname 4",
        //        totalScores: 12,
        //        totalPlayedGames: 5
        //    },{
        //        nickname: "Nickname 1",
        //        totalScores: 10,
        //        totalPlayedGames: 15
        //    },{
        //        nickname: "Nickname 2",
        //        totalScores: 130,
        //        totalPlayedGames: 145
        //    },{
        //        nickname: "Nickname 3",
        //        totalScores: 102,
        //        totalPlayedGames: 155
        //    },{
        //        nickname: "Nickname 4",
        //        totalScores: 12,
        //        totalPlayedGames: 5
        //    },    {
        //        nickname: "Nickname 1",
        //        totalScores: 10,
        //        totalPlayedGames: 15
        //    },{
        //        nickname: "Nickname 2",
        //        totalScores: 130,
        //        totalPlayedGames: 145
        //    },{
        //        nickname: "Nickname 3",
        //        totalScores: 102,
        //        totalPlayedGames: 155
        //    },{
        //        nickname: "Nickname 4",
        //        totalScores: 12,
        //        totalPlayedGames: 5
        //    },{
        //        nickname: "Nickname 1",
        //        totalScores: 10,
        //        totalPlayedGames: 15
        //    },{
        //        nickname: "Nickname 2",
        //        totalScores: 130,
        //        totalPlayedGames: 145
        //    },{
        //        nickname: "Nickname 3",
        //        totalScores: 102,
        //        totalPlayedGames: 155
        //    },{
        //        nickname: "Nickname 4",
        //        totalScores: 12,
        //        totalPlayedGames: 5
        //    },

        //];
        
        //$("#grid").kendoGrid({
        //    dataSource: {
        //        data: users,
        //        pageSize: 15
        //    },
        //    groupable: false,
        //    sortable: {
        //        mode: "multiple", 
        //        allowUnsort: true
        //    },
        //    pageable: {
        //        refresh:
        //        false,
        //        pageSizes
        //        : false
        //    },
        //    columns:[
        //        {
        //            field: "nickname",
        //            width: 50,
        //            title: "Nickname"
        //        },{
        //            field: "totalScores",
        //            width: 25,
        //            title: "Average Score"
        //        },{
        //            width: 25,
        //            field: "totalPlayedGames",
        //            title: "Total Played Games"
        //        }
        //    ]
        //})

        //Object.defineProperty(Object.prototype, "__watch", {
        //    enumerable: false,
        //    configurable: true,
        //    writable: false,
        //    value: function (prop, handler) {
        //        var val = this[prop],
        //        getter = function () {
        //            return val;
        //        },
        //        setter = function (newval) {
        //            val = newval;
        //            handler.call(this, prop, newval);
        //            return newval;
        //        };

        //        if (delete this[prop]) { // can't watch constants
        //            Object.defineProperty(this, prop, {
        //                get: getter,
        //                set: setter,
        //                enumerable: true,
        //                configurable: true
        //            });
        //        }
        //    }
        //});

        //var Controller = function () {
        //    //The property is changed whenever the dom element changes value
        //    //TODO add a callback ?
        //    this._bind = function (DOMelement, propertyName) {
        //        //The next line is commented because priority is given to the model
        //        //this[propertyName] = $(DOMelement).val();
        //        var _ctrl = this;
        //        $(DOMelement).on("change input propertyChange", function (e) {
        //            e.preventDefault();
        //            _ctrl[propertyName] = DOMelement.val();
        //        });

        //    };

        //    //The dom element changes values when the propertyName is setted
        //    this._watch = function (DOMelement, propertyName) {
        //        //__watch triggers when the property changes
        //        this.__watch(propertyName, function (property, value) {
        //            $(DOMelement).val(value);
        //        });
        //    };
        //};

        //ctrl = new Controller();
        //ctrl.secret = 'null';
        //ctrl._bind($('#text1'), 'secret'); // I want the model to reflect changes in #text1
        //ctrl._watch($('#text1'), 'secret'); // I want the dom element #text2 to reflect changes in the model
   
        //var ObservableClass = function () {
        //    var self = this;

        //    Object.defineProperty(ObservableClass.prototype, "bind", {
        //        enumerable: false,
        //        configurable: true,
        //        writable: false,

        //        value: function (element, property) {
                    
        //            $(element).on("change input propertyChange click", function (e) {
        //                e.preventDefault();
        //                if (self[property] instanceof Function) {
        //                    self[property].call(self, property)
        //                }
        //                else {
        //                    self[property] = $(element).val();
        //                }
                        
        //            });
                    
        //            var _value = self[property];

        //            Object.defineProperty(self, property, {
        //                get: function () {
        //                    return _value
        //                },
        //                set: function (newValue) {
        //                    _value = newValue;
        //                    $(element).val(newValue);
        //                    return newValue;
        //                }
        //            })
        //        }            
        //    });

        //    return self;
        //}

        ////obs = new ObservableClass();
        //////ObservableClass.prototype.testValue = "test";
        ////obs.bind($('#text2'), "testValue")
        ////obs.testValue = "testValue";
        ////obs.testFunc = function() {
        ////    alert("Test Function");
        ////}
        ////obs.bind($('#button1'), "testFunc")
        
        ////$('#button1').on("click", function () {
        ////    alert("Hidden");
        ////});

        //mod = new trivia.models.ObservableModel(); 
        //mod.testProp = 1;
        //mod.testMethot = function () {
        //    alert("Works!!!!!!!!!");
        //}        

        //vm = new trivia.viewModels.ViewModel(mod);

        //vm.bind($('#trivia-div'));
        
    })
})(jQuery)