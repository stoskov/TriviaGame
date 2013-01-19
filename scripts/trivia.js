(function ($) {
    $(document).ready(function () {

        //#region User account model
        var userAccount = new trivia.models.ObservableModel({
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
        var restComunicator = new trivia.restComunicator.Comunicator("http://trivia-game.apphb.com/api/trivia");
        restComunicator.addServiceUrl("login-user", "/login-user");
        restComunicator.addServiceUrl("register-user", "/register-user");
        restComunicator.addServiceUrl("user-info", "/user-score");
        restComunicator.addServiceUrl("all-users", "/users-all");
        restComunicator.addServiceUrl("all-categories", "/categories");
        restComunicator.addServiceUrl("add-category", "/add-category");
        restComunicator.addServiceUrl("start-game", "/start-game/5");
        restComunicator.addServiceUrl("post-answers", "/post-answers/123");
        restComunicator.addServiceUrl("add-question/5", "/add-question/5");
        restComunicator.setTimeout(500000);
        //#endregion

        //#region User account controller
        //Busuness layer controler staying between user accout model and the user account view
        var userAccountController = new trivia.models.ObservableModel({
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
                userAccount.watchProperty("isLoggedIn", this, this.updateControlerState);
                userAccount.watchProperty("nickname", this, this.updateControlerState);

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

                if (userAccount.isLoggedIn == true) {
                    this.loginVisibility = "none";
                    this.logoutVisibility = "block";
                }
                else {
                    this.loginVisibility = "block";
                    this.logoutVisibility = "none";
                }

                this.userDisplayName = userAccount.username;
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
                if (!userAccount.isLoggedIn) {
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

                    this.authCode = userAccount.getHashCode(this.username, this.password);

                    var registrationRequest = {
                        "username": this.username,
                        "authCode": this.authCode
                    };

                    var self = this;
                    this.postLoginStatusMessage("Waiting response ... ");

                    restComunicator.sendPostRequest("login-user", registrationRequest,
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
                userAccount.login(this.username, this.nickname, this.authCode);
                this.clearInfo();
                this.closeLoginForm();
            },

            onErrorLogin: function (data) {
                var message = restComunicator.parseResponseMessage(data);
                this.postLoginStatusMessage(message);
            },

            closeLoginForm: function () {
                this.clearInfo();
                this.loginFormAnchor.data("kendoWindow").close();
            },

            logout: function () {
                this.clearInfo();
                userAccount.logout();
            },

            postLoginStatusMessage: function (message) {
                this.loginFromStatusBarVisibility = "block";
                this.loginFromStatusBarMessage = message;
            },

            register: function () {
                if (!userAccount.isLoggedIn) {
                    this.openRegistrationForm();
                }
            },

            sendRegistrationRequest: function () {
                if (this.verifyRegistrationRequest()) {

                    this.authCode = userAccount.getHashCode(this.username, this.password);

                    var registrationRequest = {
                        "username": this.username,
                        "nickname": this.nickname,
                        "authCode": this.authCode
                    };

                    var self = this;
                    this.postRegistrationStatusMessage("Waiting response ... ");

                    restComunicator.sendPostRequest("register-user", registrationRequest,
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
                userAccount.login(this.username, this.nickname, this.authCode);
                this.clearInfo();
                this.closeRegistrationForm();
            },

            onErrorRegistration: function (data) {
                var message = restComunicator.parseResponseMessage(data);
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

        var userAccountViewBinder = new trivia.viewModels.ViewModel(userAccountController);
        userAccountViewBinder.bind($("#site-header-user-account-wrap"));
        userAccountViewBinder.bind($("#login-form"));
        userAccountViewBinder.bind($("#registration-form"));
        //#endregion

        $("#site-main-nav").kendoMenu();

        //#region Pages models

        //#region Page: All categories
        var pageAllCategoriesController = new trivia.models.ObservableModel({

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
                    userAccount.watchProperty("isLoggedIn", this, this.onUserLoginLogout);
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

                if (!this.needLogin || userAccount.isLoggedIn) {

                    this.renderMessage("Loading ...");

                    restComunicator.sendGetRequest(self.serviceName, {},
                                                   function (data) {
                                                       self.onLoadSuccess(data)
                                                   },
                                                   function (data) {
                                                       self.onLoadError(data)
                                                   });
                }
                else {
                    this.renderMessage("Please, login to see this page!")
                    userAccountController.login();
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
                var message = restComunicator.parseResponseMessage(data);
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
                    selectable: "row",
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

        var pageAllCategoriesViewBinder = new trivia.viewModels.ViewModel(pageAllCategoriesController);
        pageAllCategoriesViewBinder.bind(pageAllCategoriesController.pageContainer);
        //#endregion

        //#region Page: All users
        var pageAllUsersController = new trivia.models.ObservableModel({

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
                    userAccount.watchProperty("isLoggedIn", this, this.onUserLoginLogout);
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

                if (!this.needLogin || userAccount.isLoggedIn) {

                    this.renderMessage("Loading ...");

                    restComunicator.sendGetRequest(self.serviceName, {},
                                                   function (data) {
                                                       self.onLoadSuccess(data)
                                                   },
                                                   function (data) {
                                                       self.onLoadError(data)
                                                   });
                }
                else {
                    this.renderMessage("Please, login to see this page!")
                    userAccountController.login();
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
                var message = restComunicator.parseResponseMessage(data);
                this.renderMessage(message);
            },

            renderContent: function (responseData) {
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
                    selectable: "row",
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
                            width: 25,
                            title: "Average score",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                            attributes: {
                                style: "text-align: center"
                            }
                        }, {
                            field: "games",
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
                this.pageMessageBoxContainer.text(message);
            },
        });

        var pageAllUserViewBilder = new trivia.viewModels.ViewModel(pageAllUsersController);
        pageAllUserViewBilder.bind(pageAllUsersController.pageContainer);
        //#endregion

        //#region Page: User info
        var pageUserInfoController = new trivia.models.ObservableModel({

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
                    userAccount.watchProperty("isLoggedIn", this, this.onUserLoginLogout);
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

                if (!this.needLogin || userAccount.isLoggedIn) {

                    if (this.allUsers.length == 0) {
                        this.loadUsersList();
                    }

                    this.contentDisplay = "block";

                    if (this.nickname !== "") {
                        this.renderMessage("Loading ...");

                        var requestParameters = {
                            nickname: this.nickname,
                        };

                        restComunicator.sendGetRequest(self.serviceName, requestParameters,
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
                    userAccountController.login();
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
                var message = restComunicator.parseResponseMessage(data);
                this.renderMessage(message);
            },

            loadUsersList: function () {
                this.pageContainer.find("#page-user-info-users-list-combo").kendoComboBox({});
                var self = this;

                restComunicator.sendGetRequest("all-users", {},
                                               function (data) {
                                                   self.onLoadUsersListSuccess(data)
                                               },
                                               function (data) {
                                               });
            },

            onLoadUsersListSuccess: function (data) {
                var self = this;
                this.allUsers = data;
                this.pageContainer.find("#page-user-info-users-list-combo").kendoComboBox({
                    dataTextField: "nickname",
                    dataValueField: "nickname",
                    dataSource: this.allUsers,
                    filter: "contains",
                    height: 500,
                    suggest: true,
                    select: function (data) {
                        var nickname = this.dataItem(data.item.index()).nickname;
                        self.nickname = nickname;
                        self.load();
                    }
                });
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
                    selectable: "row",
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
                this.pageMessageBoxContainer.text(message);
            },
        });

        var pageUserInfoViewBilder = new trivia.viewModels.ViewModel(pageUserInfoController);
        pageUserInfoViewBilder.bind(pageUserInfoController.pageContainer);
        //#endregion

        //#region Page controller
        var navigationController = new trivia.models.ObservableModel({

            pageControllersMap: [],
            activePage: null,

            addPage: function (pageName, pageController) {
                this.pageControllersMap[pageName] = pageController;
            },

            requestPageChange: function (parameters) {
                var pageName = parameters["pageName"];
                this.changeActivePage(pageName);
            },

            changeActivePage: function (pageName) {
                if (this.activePage != null && this.activePage != undefined) {
                    this.activePage.isActivePage = false;
                    this.activePage.unload();
                }

                if (pageName != undefined && pageName != null) {
                    this.activePage = this.pageControllersMap[pageName];
                    this.activePage.isActivePage = true;
                    this.activePage.load();
                }
            }
        });

        navigationController.addPage(pageAllCategoriesController.pageName, pageAllCategoriesController);
        navigationController.addPage(pageAllUsersController.pageName, pageAllUsersController);
        navigationController.addPage(pageUserInfoController.pageName, pageUserInfoController);

        var navigationViewBinder = new trivia.viewModels.ViewModel(navigationController);
        navigationViewBinder.bind($("#site-main-nav"));
        //#endregion      

    })
})(jQuery)