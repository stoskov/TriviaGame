(function ($) {
    $(document).ready(function () {
        //Define new namaspace for all game objects
        var triviaGame = triviaGame || {};

        //#region User account managers
        triviaGame.userAccountManager = triviaGame.userAccountManager || {};
        triviaGame.userAccountManager.userAccount = new trivia.models.ObservableModel({
            username: "",
            nickname: "",
            authCode: "",
            isLoggedIn: false,

            init: function () {
                this.loadUserDataFromStorage();
            },

            getHashCode: function (username, password) {
                var hash = CryptoJS.SHA1(username + password);
                return hash.toString();
            },

            login: function (username, nickname, authCode) {
                this.username = username;
                this.nickname = nickname;
                this.authCode = authCode;
                this.isLoggedIn = true;

                this.storeUserDataToStorage(username, nickname, authCode, true);
            },

            logout: function (username, nickname, authCode) {
                this.username = "";
                this.nickname = "";
                this.authCode = "";
                this.isLoggedIn = false;

                this.storeUserDataToStorage("", "", "", false);
            },

            loadUserDataFromStorage: function () {
                if (typeof (Storage) !== "undefined" && sessionStorage.getItem("triviaGameAuthCode") !== null) {
                    this.username = sessionStorage.getItem("triviaGameUsername");
                    this.nickname = sessionStorage.getItem("triviaGameNickame");
                    this.authCode = sessionStorage.getItem("triviaGameAuthCode");

                    if (sessionStorage.getItem("triviaGameIsLoggedIn") == "true") {
                        this.isLoggedIn = true;
                    }
                    else {
                        this.isLoggedIn = false;
                    }
                }
            },

            storeUserDataToStorage: function (username, nickname, authCode, isLoggenIn) {
                if (typeof (Storage) !== "undefined") {
                    sessionStorage.setItem("triviaGameUsername", username);
                    sessionStorage.setItem("triviaGameNickame", nickname);
                    sessionStorage.setItem("triviaGameAuthCode", authCode);
                    sessionStorage.setItem("triviaGameIsLoggedIn", isLoggenIn);
                }
            },

            getAuthorisationInfo: function () {
                var authorisationInfo = {
                    "username": this.username,
                    "authCode": this.authCode
                };

                return authorisationInfo;
            }
        });
        //#endregion

        //#region Rest communicator
        triviaGame.restComunicator = new trivia.restComunicator.Comunicator("http://trivia-game.apphb.com/api/trivia");
        triviaGame.restComunicator.addServiceUrl("login-user", "/login-user");
        triviaGame.restComunicator.addServiceUrl("register-user", "/register-user");
        triviaGame.restComunicator.addServiceUrl("user-info", "/user-score");
        triviaGame.restComunicator.addServiceUrl("all-users", "/users-all");
        triviaGame.restComunicator.addServiceUrl("all-categories", "/categories");
        triviaGame.restComunicator.addServiceUrl("add-category", "/add-category");
        triviaGame.restComunicator.addServiceUrl("start-game", "/start-game/5");
        triviaGame.restComunicator.addServiceUrl("post-answers", "/post-answers/123");
        triviaGame.restComunicator.addServiceUrl("add-question/5", "/add-question/5");
        triviaGame.restComunicator.setTimeout(500000);
        //#endregion

        //namespace for all the controllers
        triviaGame.controllers = triviaGame.controllers || {};
        triviaGame.viewModelBinders = triviaGame.viewModelBinders || {};

        //#region User account controller
        //Busuness layer controler staying between user accout model and the user account view
        triviaGame.controllers.userAccountController = new trivia.models.ObservableModel({
            loginVisibility: "block",
            logoutVisibility: "none",

            loginFromStatusBarVisibility: "none",
            loginFromStatusBarMessage: "",

            registrationFromStatusBarVisibility: "none",
            registrationFromStatusBarMessage: "",

            username: "",
            nickname: "",
            password: "",
            passwordVerification: "",
            authCode: "",
            userDisplayName: "",

            loginFormAnchor: $("#login-form"),
            registrationFormAnchor: $("#registration-form"),

            init: function () {
                triviaGame.userAccountManager.userAccount.watchProperty("isLoggedIn", this, this.updateControlerState);
                triviaGame.userAccountManager.userAccount.watchProperty("nickname", this, this.updateControlerState);

                //Initialise login form
                if (!this.loginFormAnchor.data("kendoWindow")) {
                    this.loginFormAnchor.kendoWindow({
                        title: "Login",
                        modal: true,
                        resizable: false,
                    });
                    this.loginFormAnchor.data("kendoWindow").close();
                }

                //Initialise registration form
                if (!this.registrationFormAnchor.data("kendoWindow")) {
                    this.registrationFormAnchor.kendoWindow({
                        title: "Registration",
                        modal: true,
                        resizable: false,
                    });
                    this.registrationFormAnchor.data("kendoWindow").close();
                }
            },

            updateControlerState: function () {
                if (triviaGame.userAccountManager.userAccount.isLoggedIn == true) {
                    this.loginVisibility = "none";
                    this.logoutVisibility = "block";
                }
                else {
                    this.loginVisibility = "block";
                    this.logoutVisibility = "none";
                }

                this.userDisplayName = triviaGame.userAccountManager.userAccount.username;
            },

            clearInfo: function () {
                this.password = "";
                this.passwordVerification = "";
                this.username = "";
                this.nickname = "";

                this.loginFromStatusBarVisibility = "none";
                this.registrationFromStatusBarMessage = "";

                this.registrationFromStatusBarVisibility = "none";
                this.loginFromStatusBarMessage = "";
            },

            login: function () {
                if (!triviaGame.userAccountManager.userAccount.isLoggedIn) {
                    this.openLoginForm();
                }
            },

            openLoginForm: function () {
                this.clearInfo();
                this.loginFormAnchor.data("kendoWindow").center();
                this.loginFormAnchor.data("kendoWindow").open();
            },

            sendLoginRequest: function () {
                if (this.verifyLoginRequest()) {
                    this.authCode = triviaGame.userAccountManager.userAccount.getHashCode(this.username, this.password);

                    var registrationRequest = {
                        "username": this.username,
                        "authCode": this.authCode
                    };

                    var self = this;
                    this.postLoginStatusMessage("Waiting response ... ");

                    triviaGame.restComunicator.sendPostRequest("login-user", registrationRequest,
                                                               function (data) {
                                                                   self.onSuccessfullLogin(data)
                                                               },
                                                               function (data) {
                                                                   self.onErrorLogin(data)
                                                               });
                }
            },

            verifyLoginRequest: function () {
                if (this.username == "" || this.password == "") {
                    this.loginFromStatusBarVisibility = "block";
                    this.loginFromStatusBarMessage = "Username and password are required";
                    return false;
                }
                return true;
            },

            onSuccessfullLogin: function () {
                triviaGame.userAccountManager.userAccount.login(this.username, this.nickname, this.authCode);
                this.clearInfo();
                this.closeLoginForm();
            },

            onErrorLogin: function (data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.postLoginStatusMessage(message);
            },

            closeLoginForm: function () {
                this.clearInfo();
                this.loginFormAnchor.data("kendoWindow").close();
            },

            logout: function () {
                this.clearInfo();
                triviaGame.userAccountManager.userAccount.logout();
            },

            postLoginStatusMessage: function (message) {
                this.loginFromStatusBarVisibility = "block";
                this.loginFromStatusBarMessage = message;
            },

            register: function () {
                if (!triviaGame.userAccountManager.userAccount.isLoggedIn) {
                    this.openRegistrationForm();
                }
            },

            sendRegistrationRequest: function () {
                if (this.verifyRegistrationRequest()) {
                    this.authCode = triviaGame.userAccountManager.userAccount.getHashCode(this.username, this.password);

                    var registrationRequest = {
                        "username": this.username,
                        "nickname": this.nickname,
                        "authCode": this.authCode
                    };

                    var self = this;
                    this.postRegistrationStatusMessage("Waiting response ... ");

                    triviaGame.restComunicator.sendPostRequest("register-user", registrationRequest,
                                                               function (data) {
                                                                   self.onSuccessfullRegistration(data)
                                                               },
                                                               function (data) {
                                                                   self.onErrorRegistration(data)
                                                               });
                }
            },

            verifyRegistrationRequest: function () {
                if (this.username == "" || this.nickname == "" ||
                    this.password == "" || this.passwordVerification == "") {
                    this.registrationFromStatusBarVisibility = "block";
                    this.registrationFromStatusBarMessage = "All fields are required";
                    return false;
                }
                else if (this.password !== this.passwordVerification) {
                    this.registrationFromStatusBarVisibility = "block";
                    this.registrationFromStatusBarMessage = "Passwords don't match";
                    return false;
                }

                return true;
            },

            onSuccessfullRegistration: function (data) {
                triviaGame.userAccountManager.userAccount.login(this.username, this.nickname, this.authCode);
                this.clearInfo();
                this.closeRegistrationForm();
            },

            onErrorRegistration: function (data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.postRegistrationStatusMessage(message);
            },

            openRegistrationForm: function () {
                this.clearInfo();
                this.registrationFormAnchor.data("kendoWindow").center();
                this.registrationFormAnchor.data("kendoWindow").open();
            },

            closeRegistrationForm: function () {
                this.clearInfo();
                this.registrationFormAnchor.data("kendoWindow").close();
            },

            postRegistrationStatusMessage: function (message) {
                this.registrationFromStatusBarVisibility = "block";
                this.registrationFromStatusBarMessage = message;
            },

        })

        triviaGame.viewModelBinders.userAccountViewBinder = new trivia.viewModels.ViewModel(triviaGame.controllers.userAccountController);
        triviaGame.viewModelBinders.userAccountViewBinder.bind($("#site-header-user-account-wrap"));
        triviaGame.viewModelBinders.userAccountViewBinder.bind($("#login-form"));
        triviaGame.viewModelBinders.userAccountViewBinder.bind($("#registration-form"));
        //#endregion

        //#region Pages 
        triviaGame.controllers.pages = triviaGame.controllers.pages || {};
        triviaGame.viewModelBinders.pages = triviaGame.viewModelBinders.pages || {};

        //#region Page: All categories
        triviaGame.controllers.pages.pageAllCategoriesController = new trivia.models.ObservableModel({

            needLogin: false,
            isActivePage: false,
            serviceName: "all-categories",
            pageName: "page-all-categories",
            pageContainer: $("#page-all-categories"),
            pageContent: $("#page-all-categories").find(".page-content"),
            pageMessageBoxContainer: $("#page-all-categories").find(".page-message-box"),
            pageDisplay: "none",
            contentDisplay: "none",
            messageBoxDisplay: "none",

            init: function () {
                this.viewDisplay = "none";

                if (this.needLogin) {
                    triviaGame.userAccountManager.userAccount.watchProperty("isLoggedIn", this, this.onUserLoginLogout);
                }
            },

            onUserLoginLogout: function () {
                if (this.isActivePage) {
                    this.load()
                }
            },

            load: function () {
                var self = this;
                this.pageDisplay = "block";

                if (!this.needLogin || triviaGame.userAccountManager.userAccount.isLoggedIn) {
                    this.renderMessage("Loading ...");

                    triviaGame.restComunicator.sendGetRequest(self.serviceName, {},
                                                              function (data) {
                                                                  self.onLoadSuccess(data)
                                                              },
                                                              function (data) {
                                                                  self.onLoadError(data)
                                                              });
                }
                else {
                    this.renderMessage("Please, login to see this page!")
                    triviaGame.controllers.userAccountController.login();
                }
            },

            unload: function () {
                this.pageContent.find("#page-all-categories-grid").html("");
                this.pageDisplay = "none";
            },

            onLoadSuccess: function (responseData) {
                this.renderContent(responseData);
            },

            onLoadError: function (data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.renderMessage(message);
            },

            renderContent: function (responseData) {
                this.contentDisplay = "block";
                this.messageBoxDisplay = "none";

                this.pageContent.find("#page-all-categories-grid").kendoGrid({
                    dataSource: {
                        data: responseData,
                        schema: {
                            model: {
                                fields: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                }
                            }
                        },
                    },
                    groupable: false,
                    sortable: {
                        allowUnsort: true
                    },
                    filterable: true,
                    pageable: {
                        refresh: false,
                        pageSize: 15,
                        pageSizes: [5, 10, 15, 30, 50, 100]
                    },
                    columns: [
                        {
                            field: "id",
                            width: 20,
                            title: "No",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                            attributes: {
                                style: "text-align: center"
                            }
                        }, {
                            field: "name",
                            width: 80,
                            title: "Category name",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                        }
                    ]
                })
            },

            renderMessage: function (message) {
                this.contentDisplay = "none";
                this.messageBoxDisplay = "block";
                this.pageMessageBoxContainer.text(message);
            },
        });

        triviaGame.viewModelBinders.pages.pageAllCategoriesViewBinder = new trivia.viewModels.ViewModel(triviaGame.controllers.pages.pageAllCategoriesController);
        triviaGame.viewModelBinders.pages.pageAllCategoriesViewBinder.bind(triviaGame.controllers.pages.pageAllCategoriesController.pageContainer);
        //#endregion

        //#region Page: All users
        triviaGame.controllers.pages.pageAllUsersController = new trivia.models.ObservableModel({

            needLogin: false,
            isActivePage: false,
            serviceName: "all-users",
            pageName: "page-all-users",
            pageContainer: $("#page-all-users"),
            pageContent: $("#page-all-users").find(".page-content"),
            pageMessageBoxContainer: $("#page-all-users").find(".page-message-box"),
            pageDisplay: "none",
            contentDisplay: "none",
            messageBoxDisplay: "none",

            init: function () {
                this.viewDisplay = "none";

                if (this.needLogin) {
                    triviaGame.userAccountManager.userAccount.watchProperty("isLoggedIn", this, this.onUserLoginLogout);
                }
            },

            onUserLoginLogout: function () {
                if (this.isActivePage) {
                    this.load()
                }
            },

            load: function () {
                var self = this;
                this.pageDisplay = "block";

                if (!this.needLogin || triviaGame.userAccountManager.userAccount.isLoggedIn) {
                    this.renderMessage("Loading ...");

                    triviaGame.restComunicator.sendGetRequest(self.serviceName, {},
                                                              function (data) {
                                                                  self.onLoadSuccess(data)
                                                              },
                                                              function (data) {
                                                                  self.onLoadError(data)
                                                              });
                }
                else {
                    this.renderMessage("Please, login to see this page!")
                    triviaGame.controllers.userAccountController.login();
                }
            },

            unload: function () {
                this.pageContent.find("#page-all-users-grid").html("");
                this.pageDisplay = "none";
            },

            onLoadSuccess: function (responseData) {
                this.renderContent(responseData);
            },

            onLoadError: function (data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.renderMessage(message);
            },

            renderContent: function (responseData) {
                var self = navigationController
                this.contentDisplay = "block";
                this.messageBoxDisplay = "none";

                this.pageContent.find("#page-all-users-grid").kendoGrid({
                    dataSource: {
                        data: responseData,
                        schema: {
                            model: {
                                fields: {
                                    nickname: { type: "string" },
                                    score: { type: "string" },
                                    games: { type: "string" },
                                }
                            }
                        },
                    },
                    groupable: false,
                    sortable: {
                        allowUnsort: true
                    },
                    filterable: true,
                    pageable: {
                        refresh: false,
                        pageSize: 15,
                        pageSizes: [5, 10, 15, 30, 50, 100]
                    },
                    columns: [
                        {
                            field: "nickname",
                            width: 50,
                            title: "Nickname",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                        }, {
                            field: "score",
                            width: 20,
                            title: "Average score",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                            attributes: {
                                style: "text-align: center"
                            }
                        }, {
                            field: "games",
                            width: 20,
                            title: "Played games",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                            attributes: {
                                style: "text-align: center"
                            }
                        }, {
                            command: {
                                text: "Details",
                                click: function (data) {
                                    var dataItem = this.dataItem($(data.currentTarget).closest("tr"));
                                    navigationController.changeActivePage("page-user-info", dataItem)
                                }
                            },

                            title: " ",
                            width: 15
                        }
                    ]
                })
            },

            renderMessage: function (message) {
                this.contentDisplay = "none";
                this.messageBoxDisplay = "block";
                this.pageMessageBoxContainer.html(message);
            },
        });

        triviaGame.viewModelBinders.pages.pageAllUserViewBilder = new trivia.viewModels.ViewModel(triviaGame.controllers.pages.pageAllUsersController);
        triviaGame.viewModelBinders.pages.pageAllUserViewBilder.bind(triviaGame.controllers.pages.pageAllUsersController.pageContainer);
        //#endregion

        //#region Page: User info
        triviaGame.controllers.pages.pageUserInfoController = new trivia.models.ObservableModel({

            needLogin: false,
            isActivePage: false,
            serviceName: "user-info",
            pageName: "page-user-info",
            pageContainer: $("#page-user-info"),
            pageContent: $("#page-user-info").find(".page-content"),
            pageMessageBoxContainer: $("#page-user-info").find(".page-message-box"),
            pageDisplay: "none",
            contentDisplay: "none",
            messageBoxDisplay: "none",

            nickname: "",
            playedGames: "",
            averageScore: "",
            allUsers: [],

            init: function () {
                this.viewDisplay = "none";

                if (this.needLogin) {
                    triviaGame.userAccountManager.userAccount.watchProperty("isLoggedIn", this, this.onUserLoginLogout);
                }
            },

            onUserLoginLogout: function () {
                if (this.isActivePage) {
                    this.load()
                }
            },

            load: function (requestParameters) {
                var self = this;
                this.pageDisplay = "block";

                if (requestParameters != undefined && requestParameters["nickname"]) {
                    this.nickname = requestParameters["nickname"];
                }

                if (!this.needLogin || triviaGame.userAccountManager.userAccount.isLoggedIn) {
                    if (this.allUsers.length == 0) {
                        this.loadUsersList();
                    }

                    this.contentDisplay = "block";

                    if (this.nickname !== "") {
                        this.renderMessage("Loading ...");

                        var requestParameters = {
                            nickname: this.nickname,
                        };

                        triviaGame.restComunicator.sendGetRequest(self.serviceName, requestParameters,
                                                                  function (data) {
                                                                      self.onLoadSuccess(data)
                                                                  },
                                                                  function (data) {
                                                                      self.onLoadError(data)
                                                                  });
                    }
                }
                else {
                    this.renderMessage("Please, login to see this page!")
                    triviaGame.controllers.userAccountController.login();
                }
            },

            unload: function () {
                this.pageContent.find("#page-user-info-grid").html("");
                this.pageDisplay = "none";
                this.allUsers = [];
                this.nickname = "";
                this.playedGames = "";
                this.averageScore = "";
            },

            onLoadSuccess: function (responseData) {
                this.renderContent(responseData);
            },

            onLoadError: function (data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.renderMessage(message);
            },

            loadUsersList: function () {
                var self = this;

                this.pageContainer.find("#page-user-info-nickname").kendoComboBox({
                    placeholder: "select nickname",
                    dataTextField: "nickname",
                    dataValueField: "nickname",
                    filter: "contains",
                    dataSource: {
                        type: "odata",
                        transport: {
                            read: triviaGame.restComunicator.getHostUrl() + triviaGame.restComunicator.getServiceUrl("all-users"),
                            //create: function (options) {
                            //    // make AJAX request to the remote service
                            //    $.ajax({
                            //        url: "http://odata.netflix.com/Catalog/Titles",
                            //        data: options.data, // the "data" field contains paging, sorting, filtering and grouping data
                            //        success: function (result) {
                            //            alert("finish")
                            //            // notify the DataSource that the operation is complete
                            //            options.success(result);
                            //        }
                            //    });
                            //    //    triviaGame.restComunicator.sendGetRequest("all-users",
                            //    //                                   options.data,
                            //    //                                   function (data) {
                            //    //                                       self.allUsers = data;
                            //    //                                       options.success(data);
                            //    //                                   },
                            //    //                                   function (data) {
                            //    //                                   });
                            //    //}
                            //}
                        }
                    }
                });
                //var dataSource = new kendo.data.DataSource({
                //    transport: {
                //        create: function (options) {
                //            // make AJAX request to the remote service
                //            triviaGame.restComunicator.sendGetRequest("all-users",
                //                                           options.data,
                //                                           function (data) {
                //                                               self.allUsers = data;
                //                                               options.success(data);
                //                                           },
                //                                           function (data) {
                //                                           });
                //        }
                //    }
                //});
                //this.pageContainer.find("#page-user-info-nickname").kendoAutoComplete({
                //    //dataSource: {
                //    //    type: "odata",
                //    //    transport: triviaGame.restComunicator.getHostUrl() + triviaGame.restComunicator.getServiceUrl("all-users"),
                //    //    //{
                //    //    //    create: function (options) {
                //    //    //        triviaGame.restComunicator.sendGetRequest("all-users",
                //    //    //                                       options.data,
                //    //    //                                       function (data) {
                //    //    //                                           self.allUsers = data;
                //    //    //                                           options.success(data);
                //    //    //                                       },
                //    //    //                                       function (data) {
                //    //    //                                       });
                //    //    //        //$.ajax({
                //    //    //        //    url: "/orders/create",
                //    //    //        //    data: options.data, // the "data" field contains paging, sorting, filtering and grouping data
                //    //    //        //    success: function(result) {
                //    //    //        //        // notify the DataSource that the operation is complete
                //    //    //        //        options.success(result);
                //    //    //        //    }
                //    //    //        //});
                //    //    //    }
                //    //    //}
                //    //},
                //    dataSource: {
                //        type: "odata",
                //        transport: {
                //            read: triviaGame.restComunicator.getHostUrl() + triviaGame.restComunicator.getServiceUrl("all-users"),
                //        }
                //    },
                //    dataTextField: "nickname",
                //    filter: "startswith",
                //    placeholder: "enter nickname ...",
                //    change: function () {
                //        self.load()
                //    },
                //});                
            },

            onLoadUsersListSuccess: function (data) {
                //var self = this;
                //this.allUsers = data;
                //var autocomplete = this.pageContainer.find("#page-user-info-nickname").data("kendoAutoComplete");
                //autocomplete.refresh();
            },

            renderContent: function (responseData) {
                this.contentDisplay = "block";
                this.messageBoxDisplay = "none";

                this.nickname = responseData["nickname"];
                this.playedGames = responseData["totalGamesPlayed"];
                this.averageScore = responseData["totalScore"];

                this.pageContent.find("#page-user-info-grid").kendoGrid({
                    dataSource: {
                        data: responseData["categoryScores"],
                        schema: {
                            model: {
                                fields: {
                                    category: { type: "string" },
                                    gamesPlayed: { type: "string" },
                                    score: { type: "string" },
                                }
                            }
                        },
                    },
                    groupable: false,
                    sortable: {
                        allowUnsort: true
                    },
                    filterable: true,
                    pageable: {
                        refresh: false,
                        pageSize: 10,
                        pageSizes: [5, 10, 15, 30, 50, 100]
                    },
                    columns: [
                        {
                            field: "category",
                            width: 50,
                            title: "Category",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                        }, {
                            field: "score",
                            width: 25,
                            title: "Average score",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                            attributes: {
                                style: "text-align: center"
                            }
                        }, {
                            field: "gamesPlayed",
                            width: 25,
                            title: "Played games",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                            attributes: {
                                style: "text-align: center"
                            }
                        }
                    ]
                })
            },

            renderMessage: function (message) {
                this.contentDisplay = "none";
                this.messageBoxDisplay = "block";
                this.pageMessageBoxContainer.html(message);
            },
        });

        triviaGame.viewModelBinders.pages.pageUserInfoViewBilder = new trivia.viewModels.ViewModel(triviaGame.controllers.pages.pageUserInfoController);
        triviaGame.viewModelBinders.pages.pageUserInfoViewBilder.bind(triviaGame.controllers.pages.pageUserInfoController.pageContainer);
        //#endregion

        //#region Page controller
        triviaGame.controllers.navigationController = new trivia.models.ObservableModel({

            pageControllersMap: [],
            activePage: null,

            init: function () {
                $("#site-main-nav").kendoMenu();
            },

            addPage: function (pageName, pageController) {
                this.pageControllersMap[pageName] = pageController;
            },

            requestPageChange: function (parameters) {
                var pageName = parameters["pageName"];
                this.changeActivePage(pageName, {});
            },

            changeActivePage: function (pageName, data) {
                if (this.activePage != null && this.activePage != undefined) {
                    this.activePage.isActivePage = false;
                    this.activePage.unload(data);
                }

                if (pageName != undefined && pageName != null) {
                    this.activePage = this.pageControllersMap[pageName];
                    this.activePage.isActivePage = true;
                    this.activePage.load(data);
                }
            }
        });

        triviaGame.controllers.navigationController.addPage(
            triviaGame.controllers.pages.pageAllCategoriesController.pageName,
            triviaGame.controllers.pages.pageAllCategoriesController);

        triviaGame.controllers.navigationController.addPage(
            triviaGame.controllers.pages.pageAllUsersController.pageName,
            triviaGame.controllers.pages.pageAllUsersController);

        triviaGame.controllers.navigationController.addPage(
            triviaGame.controllers.pages.pageUserInfoController.pageName,
            triviaGame.controllers.pages.pageUserInfoController);

        triviaGame.viewModelBinders.navigationViewBinder = new trivia.viewModels.ViewModel(navigationController);
        triviaGame.viewModelBinders.navigationViewBinder.bind($("#site-main-nav"));
        //#endregion      
    })
})(jQuery)