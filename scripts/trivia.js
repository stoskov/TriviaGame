(function ($) {
    $(document).ready(function () {
        var constComunicatorTimeOut = 500000;
        var constDataLoadTimeOut = 500000;

        //Define new namaspace for all game objects
        triviaGame = window.triviaGame || {};

        //#region Rest communicator
        triviaGame.restComunicator =
        new trivia.RestComunicator("http://trivia-game.apphb.com/api/trivia");
        triviaGame.restComunicator.addServiceUrl("login-user", "/login-user");
        triviaGame.restComunicator.addServiceUrl("register-user", "/register-user");
        triviaGame.restComunicator.addServiceUrl("user-info", "/user-score");
        triviaGame.restComunicator.addServiceUrl("all-users", "/users-all");
        triviaGame.restComunicator.addServiceUrl("all-categories", "/categories");
        triviaGame.restComunicator.addServiceUrl("add-category", "/add-category");
        triviaGame.restComunicator.addServiceUrl("start-game", "/start-game/5");
        triviaGame.restComunicator.addServiceUrl("post-answers", "/post-answers/123");
        triviaGame.restComunicator.addServiceUrl("add-question/5", "/add-question/5");
        triviaGame.restComunicator.setTimeout(constComunicatorTimeOut);
        //#endregion

        triviaGame.userAccountManager = triviaGame.userAccountManager || {};

        //#region User account managers        
        triviaGame.userAccountManager.userAccount = new trivia.ObservableObject({
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
                if (typeof (Storage) !== "undefined" &&
                           sessionStorage.getItem("triviaGame.userAccount.username") !== null) {
                    this.username = sessionStorage.getItem("triviaGame.userAccount.username");
                    this.nickname = sessionStorage.getItem("triviaGame.userAccount.nickame");
                    this.authCode = sessionStorage.getItem("triviaGame.userAccount.authCode");

                    if (sessionStorage.getItem("triviaGame.userAccount.isLoggedIn") == "true") {
                        this.isLoggedIn = true;
                    }
                    else {
                        this.isLoggedIn = false;
                    }
                }
            },

            storeUserDataToStorage: function (username, nickname, authCode, isLoggenIn) {
                if (typeof (Storage) !== "undefined") {
                    sessionStorage.setItem("triviaGame.userAccount.username", username);
                    sessionStorage.setItem("triviaGame.userAccount.nickame", nickname);
                    sessionStorage.setItem("triviaGame.userAccount.authCode", authCode);
                    sessionStorage.setItem("triviaGame.userAccount.isLoggedIn", isLoggenIn);
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

        triviaGame.data = triviaGame.data || {};

        //#region All categories model
        triviaGame.data.categories = new trivia.ObservableObject({
            loadTimeMs: 0,
            cacheTimeMs: constDataLoadTimeOut,
            data: [],

            init: function () {
                var data, loadTime;

                if (typeof (Storage) !== "undefined" &&
                           sessionStorage.getItem("triviaGame.data.categories.data") !== null) {
                    data = sessionStorage.getItem("triviaGame.data.categories.data");
                    this.data = JSON.parse(data);

                    loadTime = sessionStorage.getItem("triviaGame.data.categories.loadTimeMs");
                    this.loadTimeMs = parseInt(loadTime);
                }
            },

            loadData: function (onSuccess, onError) {
                var self = this,
                nowTimeMs = new Date().getTime(),
                elapsedTime = nowTimeMs - this.loadTimeMs;

                if (this.data == [] || elapsedTime > this.cacheTimeMs) {
                    triviaGame.restComunicator.sendGetRequest("all-categories", {},
                                                              function (data) {
                                                                  self.onLoadSuccess(data, onSuccess)
                                                              },
                                                              onError);
                }
                else {
                    onSuccess.call(this, this.data);
                }
            },

            onLoadSuccess: function (data, redirectTo) {
                this.loadTimeMs = new Date().getTime();
                this.data = data;
                sessionStorage.setItem("triviaGame.data.categories.data", JSON.stringify(this.data));
                sessionStorage.setItem("triviaGame.data.categories.loadTimeMs", this.loadTimeMs.toString());
                redirectTo.call(this, data);
            },
        });
        //#endregion

        //#region All categories users
        triviaGame.data.users = new trivia.ObservableObject({
            loadTimeMs: 0,
            cacheTimeMs: constDataLoadTimeOut,
            data: [],
            details: {},

            init: function () {
                var data, details, loadTime;

                if (typeof (Storage) !== "undefined") {
                    if (sessionStorage.getItem("triviaGame.data.users.data") !== null) {
                        data = sessionStorage.getItem("triviaGame.data.users.data");
                        this.data = JSON.parse(data);

                        loadTime = sessionStorage.getItem("triviaGame.data.users.loadTimeMs");
                        this.loadTimeMs = parseInt(loadTime);
                    };

                    if (sessionStorage.getItem("triviaGame.data.users.details") !== null) {
                        details = sessionStorage.getItem("triviaGame.data.users.details");
                        this.details = JSON.parse(details);
                    }
                }
            },

            loadData: function (onSuccess, onError) {
                var self = this,
                nowTimeMs = new Date().getTime(),
                elapsedTime = nowTimeMs - this.loadTimeMs;

                if (this.data == [] || elapsedTime > this.cacheTimeMs) {
                    triviaGame.restComunicator.sendGetRequest("all-users", {},
                                                              function (data) {
                                                                  self.onLoadSuccess(data, onSuccess)
                                                              },
                                                              onError);
                }
                else {
                    onSuccess.call(self, self.data);
                }
            },

            onLoadSuccess: function (data, redirectTo) {
                this.loadTimeMs = new Date().getTime();
                this.data = data;
                sessionStorage.setItem("triviaGame.data.users.data", JSON.stringify(this.data));
                sessionStorage.setItem("triviaGame.data.users.loadTimeMs", this.loadTimeMs.toString());
                if (redirectTo && redirectTo instanceof Function) {
                    redirectTo.call(this, data);
                }
            },

            loadDetails: function (nicknameSearch, onSuccess, onError) {
                var self = this,
                nowTimeMs = new Date().getTime(),
                elapsedTime = nowTimeMs - this.loadTimeMs;

                var requestData = {
                    nickname: nicknameSearch,
                };

                if (!this.details[nicknameSearch] || this.details[nicknameSearch] == [] || elapsedTime > this.cacheTimeMs) {
                    triviaGame.restComunicator.sendGetRequest("user-info", requestData,
                                                              function (data) {
                                                                  self.onLoadDetailsSuccess(nicknameSearch, data, onSuccess)
                                                              },
                                                              onError);
                }
                else {
                    onSuccess.call(self, self.details[nicknameSearch]);
                }
            },

            onLoadDetailsSuccess: function (nicknameSearch, data, redirectTo) {
                this.details[nicknameSearch] = data;
                sessionStorage.setItem("triviaGame.data.users.details", JSON.stringify(this.details));
                if (redirectTo && redirectTo instanceof Function) {
                    redirectTo.call(this, data);
                }
            },
        });
        //#endregion

        //namespace for all the controllers
        triviaGame.controllers = triviaGame.controllers || {};
        triviaGame.viewModelBinders = triviaGame.viewModelBinders || {};

        //#region User account controller
        //Busuness layer controler staying between user accout model and the user account view
        triviaGame.controllers.userAccountController = new trivia.ObservableObject({
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
                var self = this;

                if (this.verifyRegistrationRequest()) {
                    this.authCode = triviaGame.userAccountManager.userAccount.getHashCode(this.username, this.password);

                    var registrationRequest = {
                        "username": this.username,
                        "nickname": this.nickname,
                        "authCode": this.authCode
                    };

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

        triviaGame.viewModelBinders.userAccountViewBinder = new trivia.ViewModelBinder(triviaGame.controllers.userAccountController);
        triviaGame.viewModelBinders.userAccountViewBinder.bind($("#site-header-user-account-wrap"));
        triviaGame.viewModelBinders.userAccountViewBinder.bind($("#login-form"));
        triviaGame.viewModelBinders.userAccountViewBinder.bind($("#registration-form"));
        //#endregion

        //namespace for all the pages
        triviaGame.controllers.pages = triviaGame.controllers.pages || {};
        triviaGame.viewModelBinders.pages = triviaGame.viewModelBinders.pages || {};

        //#region Pages 
        //#region Page: Main page model
        triviaGame.controllers.pages.mainPageModel = new trivia.ObservableObject({
            //defines if the page needs authorisation or not
            needLogin: false,
            //Defines if the page is currently active
            isActivePage: false,
            //Service to call
            serviceName: "",
            //Page name
            pageName: "",
            //The DOM object containing the page view
            pageContainer: null,
            //The DOM object containing the page content
            pageContent: null,
            //The DOM element displaying the page status and errors
            pageMessageBoxContainer: null,
            //Defined the whole page visibility
            pageDisplay: "none",
            //Defined the page content visibility
            contentDisplay: "none",
            //Defined the page message box visibility
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

            onLoadSuccess: function (responseData) {
                this.renderContent(responseData);
            },

            onLoadError: function (data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.renderMessage(message);
            },

            renderMessage: function (message) {
                this.displayMessageBox();
                this.pageMessageBoxContainer.html(message);
            },

            displayMessageBox: function () {
                this.contentDisplay = "none";
                this.messageBoxDisplay = "block";
            },

            displayContentBox: function () {
                this.contentDisplay = "block";
                this.messageBoxDisplay = "none";
            },
        });
        //#endregion

        //#region Page: All categories
        triviaGame.controllers.pages.pageAllCategoriesController = triviaGame.controllers.pages.mainPageModel.getExtendedModel({
            serviceName: "all-categories",
            pageName: "page-all-categories",
            pageContainer: $("#page-all-categories"),
            pageContent: $("#page-all-categories").find(".page-content"),
            pageMessageBoxContainer: $("#page-all-categories").find(".page-message-box"),

            load: function () {
                var self = this;
                this.pageDisplay = "block";

                if (!this.needLogin || triviaGame.userAccountManager.userAccount.isLoggedIn) {
                    this.renderMessage("Loading ...");

                    triviaGame.data.categories.loadData(
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

            renderContent: function (responseData) {
                this.displayContentBox();

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
                            width: 40,
                            title: "Category name",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                        }, {
                            command: [
                                {
                                    text: "Add New Question",
                                    click: function (data) {
                                        var dataItem = this.dataItem($(data.currentTarget).closest("tr"));
                                    }
                                },{
                                    text: "Start New Game",
                                    click: function (data) {
                                        var dataItem = this.dataItem($(data.currentTarget).closest("tr"));
                                    }
                                }
                            ],
                            title: " ",
                            width: 40
                        },
                    ]
                })
            },
        });
      
        triviaGame.viewModelBinders.pages.pageAllCategoriesViewBinder = new trivia.ViewModelBinder(triviaGame.controllers.pages.pageAllCategoriesController);
        triviaGame.viewModelBinders.pages.pageAllCategoriesViewBinder.bind(triviaGame.controllers.pages.pageAllCategoriesController.pageContainer);
        //#endregion

        //#region Page: All users
        triviaGame.controllers.pages.pageAllUsersController = triviaGame.controllers.pages.mainPageModel.getExtendedModel({

            serviceName: "all-users",
            pageName: "page-all-users",
            pageContainer: $("#page-all-users"),
            pageContent: $("#page-all-users").find(".page-content"),
            pageMessageBoxContainer: $("#page-all-users").find(".page-message-box"),

            load: function () {
                var self = this;
                this.pageDisplay = "block";

                if (!this.needLogin || triviaGame.userAccountManager.userAccount.isLoggedIn) {
                    this.renderMessage("Loading ...");

                    triviaGame.data.users.loadData(
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

            renderContent: function (responseData) {
                var self = this;

                this.displayContentBox();
                               
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
                    detailInit: function (gridData) {
                        self.loadDetails(gridData);
                    },
                    columns: [                       
                        {
                            field: "nickname",
                            // width: 70,
                            title: "Nickname",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                        }, {
                            field: "score",
                            // width: 30,
                            title: "Average score",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                            attributes: {
                                style: "text-align: center"
                            }
                        }, {
                            field: "games",
                            //width: 30,
                            title: "Played games",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                            attributes: {
                                style: "text-align: center"
                            }
                        },                        
                    ],
                })
            },

            loadDetails: function (gridData) {
                var self = this;
                triviaGame.data.users.loadDetails(gridData.data.nickname,
                                                  function (data) {
                                                      self.renderDetailsGrid(gridData, data.categoryScores);
                                                  },
                                                  function (data) {
                                                      var message = triviaGame.restComunicator.parseResponseMessage(data);
                                                      self.renderDetailsMessage(gridData, message)
                                                  });
            },

            renderDetailsGrid: function (gridData, dataSource) {
                $("<div/>").appendTo(gridData.detailCell).kendoGrid({
                    dataSource: dataSource,
                    groupable: false,
                    sortable: {
                        allowUnsort: true
                    },
                    filterable: true,
                    pageable: {
                        refresh: false,
                        pageSize: 5,
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
                        },
                    ],

                })
            },

            renderDetailsMessage: function (gridData, message) {
                $("<div class='message-box'/>").appendTo(gridData.detailCell).html(message);
            }
        });

        triviaGame.viewModelBinders.pages.pageAllUserViewBilder = new trivia.ViewModelBinder(triviaGame.controllers.pages.pageAllUsersController);
        triviaGame.viewModelBinders.pages.pageAllUserViewBilder.bind(triviaGame.controllers.pages.pageAllUsersController.pageContainer);
        //#endregion

        //#region Page: User info
        triviaGame.controllers.pages.pageUserInfoController = triviaGame.controllers.pages.mainPageModel.getExtendedModel({

            serviceName: "user-info",
            pageName: "page-user-info",
            pageContainer: $("#page-user-info"),
            pageContent: $("#page-user-info").find(".page-content"),
            pageMessageBoxContainer: $("#page-user-info").find(".page-message-box"),

            nickname: "",
            playedGames: "",
            averageScore: "",
            allUsers: [],

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

            loadUsersList: function () {
                var self = this;

                this.pageContainer.find("#page-user-info-nickname").kendoComboBox({
                    placeholder: "select nickname",
                    dataTextField: "nickname",
                    dataValueField: "nickname",
                    filter: "contains",
                    dataSource: {
                        type: "json",
                        data: function() {
                            //    //// make AJAX request to the remote service
                            //    //triviaGame.data.users.loadData(
                            //    //    function (result) {
                            //    //        alert("finish");
                            //    //        options.success(result);
                            //    //    },
                            //    //    function (data) {
                            //    //        alert("error");
                            //    //    });
                            alert("start");
                            $.ajax({
                                url: triviaGame.restComunicator.getHostUrl() + triviaGame.restComunicator.getServiceUrl("all-users"),
                                data: options.data, // the "data" field contains paging, sorting, filtering and grouping data
                                success: function (result) {
                                    alert("finish");
                                    // notify the DataSource that the operation is complete
                                    options.success(result);
                                }
                            });
                        }
                        //transport: {
                        //    //read: triviaGame.restComunicator.getHostUrl() + triviaGame.restComunicator.getServiceUrl("all-users"),
                        //    create: {
                                
                        //    }
                        //}
                    }
                });
            },

            onLoadUsersListSuccess: function (data) {
                //var self = this;
                //this.allUsers = data;
                //var autocomplete = this.pageContainer.find("#page-user-info-nickname").data("kendoAutoComplete");
                //autocomplete.refresh();
            },

            renderContent: function (responseData) {
                this.displayContentBox();

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
        });

        triviaGame.viewModelBinders.pages.pageUserInfoViewBilder = new trivia.ViewModelBinder(triviaGame.controllers.pages.pageUserInfoController);
        triviaGame.viewModelBinders.pages.pageUserInfoViewBilder.bind(triviaGame.controllers.pages.pageUserInfoController.pageContainer);
        //#endregion
        //#endregion

        //#region Navigator controller
        triviaGame.controllers.navigationController = new trivia.ObservableObject({

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

        triviaGame.viewModelBinders.navigationViewBinder = new trivia.ViewModelBinder(triviaGame.controllers.navigationController);
        triviaGame.viewModelBinders.navigationViewBinder.bind($("#site-main-nav"));
        //#endregion      
    })
})(jQuery)