(function ($) {
    $(document).ready(function () {
        var constComunicatorTimeOut = 500000;
        var constDataLoadTimeOut = 500000000;

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
        triviaGame.restComunicator.addServiceUrl("start-game", "/start-game");
        triviaGame.restComunicator.addServiceUrl("post-answers", "/post-answers");
        triviaGame.restComunicator.addServiceUrl("add-question", "/add-question");
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
                trivia.sessionManager.initObject("triviaGame.userAccount", this);
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

                trivia.sessionManager.store("triviaGame.userAccount", this);
            },

            logout: function (username, nickname, authCode) {
                this.username = "";
                this.nickname = "";
                this.authCode = "";
                this.isLoggedIn = false;

                trivia.sessionManager.store("triviaGame.userAccount", this);
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

        //#region All categories collection
        triviaGame.data.categories = new trivia.ObservableObject({
            loadTimeMs: 0,
            cacheTimeMs: constDataLoadTimeOut,
            data: [],

            init: function () {
                trivia.sessionManager.initObject("triviaGame.data.categories", this);
            },

            loadData: function (onSuccess, onError, force) {
                var self = this,
                nowTimeMs = new Date().getTime(),
                elapsedTime = nowTimeMs - this.loadTimeMs;

                if (this.data == [] || elapsedTime > this.cacheTimeMs || force) {
                    triviaGame.restComunicator.sendGetRequest("all-categories", "", {},
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
                trivia.sessionManager.store("triviaGame.data.categories", this);
                if (redirectTo && redirectTo instanceof Function) {
                    redirectTo.call(this, data);
                }
            },
        });
        //#endregion

        //#region All users collection
        triviaGame.data.users = new trivia.ObservableObject({
            loadTimeMs: 0,
            cacheTimeMs: constDataLoadTimeOut,
            data: [],
            details: {},

            init: function () {
                trivia.sessionManager.initObject("triviaGame.data.users", this);              
            },

            loadData: function (onSuccess, onError, force) {
                var self = this,
                nowTimeMs = new Date().getTime(),
                elapsedTime = nowTimeMs - this.loadTimeMs;

                if (this.data == [] || elapsedTime > this.cacheTimeMs || force) {
                    triviaGame.restComunicator.sendGetRequest("all-users", "", {},
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
                trivia.sessionManager.store("triviaGame.data.users", this);
                if (redirectTo && redirectTo instanceof Function) {
                    redirectTo.call(this, data);
                }
            },

            loadDetails: function (nicknameSearch, onSuccess, onError, force) {
                var self = this,
                nowTimeMs = new Date().getTime(),
                elapsedTime = nowTimeMs - this.loadTimeMs;

                var requestData = {
                    nickname: nicknameSearch,
                };

                if (!this.details[nicknameSearch] || this.details[nicknameSearch] == [] || elapsedTime > this.cacheTimeMs || force) {
                    triviaGame.restComunicator.sendGetRequest("user-info", "", requestData,
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
                trivia.sessionManager.store("triviaGame.data.users", this);
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
                        "authCode": this.authCode,
                    };

                    var self = this;
                    this.postLoginStatusMessage("Waiting response ... ");

                    triviaGame.restComunicator.sendPostRequest("login-user", "", registrationRequest,
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

                    triviaGame.restComunicator.sendPostRequest("register-user", "", registrationRequest,
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
            //Defines whather the page is being reloaded or it is first init
            isReload: true,
            //Service to call
            serviceName: "",
            //Page name
            pageName: "",
            //The DOM object containing the page view
            pageContainer: "",
            //The DOM object containing the page content
            pageContent: ".page-content",
            //The DOM element displaying the page status and errors
            pageMessageBoxContainer: ".page-message-box",
            //The DOM element displaying the page status and errors
            pageStatusBoxContainer: ".page-status-box",
            //Defines the whole page visibility
            pageDisplay: "none",
            //Defines the page content visibility
            contentDisplay: "none",
            //Defines the page message box visibility
            messageBoxDisplay: "none",
            //Defines the page status box visibility
            statusBoxDisplay: "none",
            //Defines the page status box text
            statusBoxMessage: "",
            //Page response. In case the page should pass the control to another page
            pageResponse: "",
            //Page response date - information to be passed to the receiver
            pageResponseData: {},

            getPageContainerDOM: function () {
                return $(this.pageContainer);
            },

            getPageContentDOM: function () {
                return this.getPageContainerDOM().find(this.pageContent);
            },

            getPageMessageBoxContainerDOM: function () {
                return this.getPageContainerDOM().find(this.pageMessageBoxContainer);
            },

            getPageStatusBoxContainerDOM: function () {
                return this.getPageContainerDOM().find(this.pageStatusBoxContainer);
            },
            
            init: function () {
                this.viewDisplay = "none";

                if (this.needLogin) {
                    triviaGame.userAccountManager.userAccount.watchProperty("isLoggedIn", this, this.onUserLoginLogout);
                }

                triviaGame.viewModelBinders.pages.pageAddCategoryViewBinder = new trivia.ViewModelBinder(this);
                triviaGame.viewModelBinders.pages.pageAddCategoryViewBinder.bind(this.getPageContainerDOM());

                if (this.pageName) {
                    this.restorePage();
                }
                this.isReload = true;
                this.statusBoxDisplay = "none";

                this.initSpecific();
            },

            initSpecific: function() {
            },

            loadPageData: function (parameters) {
                this.renderContent();
            },

            unload: function () {
                this.pageDisplay = "none";
            },

            load: function (parameters) {
                this.pageDisplay = "block";

                if (!this.needLogin || triviaGame.userAccountManager.userAccount.isLoggedIn) {
                    this.renderMessage("Loading ...");
                    this.loadPageData(parameters);
                }
                else {
                    this.renderMessage("Please, login to see this page!")
                    triviaGame.controllers.userAccountController.login();
                }
            },

            renderContent: function (responseData) {
            },

            onUserLoginLogout: function () {
                if (this.isActivePage) {
                    this.load()
                }
            },

            onLoadSuccess: function (responseData) {
                this.renderContent(responseData);
                this.isReload = false;
            },

            onLoadError: function (data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.renderMessage(message);
            },

            renderMessage: function (message) {
                this.displayMessageBox();
                this.getPageMessageBoxContainerDOM().html(message);
            },

            renderPageStatus: function(message) {
                this.statusBoxDisplay = "block";
                this.statusBoxMessage = message;
            },

            clearPageStatus: function(message) {
                this.statusBoxDisplay = "none";
            },

            displayMessageBox: function () {
                this.contentDisplay = "none";
                this.messageBoxDisplay = "block";
            },

            displayContentBox: function () {
                this.contentDisplay = "block";
                this.messageBoxDisplay = "none";
            },

            storePage: function() {
                trivia.sessionManager.store("trivia.pages." + this.pageName, this);
            },

            restorePage: function() {
                trivia.sessionManager.initObject("trivia.pages." + this.pageName, this);
            },
        });
        //#endregion

        //#region Page: All categories
        triviaGame.controllers.pages.pageAllCategoriesController = triviaGame.controllers.pages.mainPageModel.getExtendedModel({
            serviceName: "all-categories",
            pageName: "page-all-categories",
            pageContainer: "#page-all-categories",

            loadPageData: function () {
                var self = this;
                triviaGame.data.categories.loadData(
                    function (data) {
                        self.onLoadSuccess(data)
                    },
                    function (data) {
                        self.onLoadError(data)
                    });
            },

            unload: function () {
                this.getPageContentDOM().find("#page-all-categories-grid").html("");
                this.pageDisplay = "none";
            },

            renderContent: function (responseData) {
                this.displayContentBox();
                var self = this;

                this.getPageContentDOM().find("#page-all-categories-grid").kendoGrid({
                    dataSource: {
                        data: responseData,
                        schema: {
                            model: {
                                fields: {
                                    id: { type: "number" },
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
                            width: 55,
                            title: "Category name",
                            headerAttributes: {
                                style: "text-align: center"
                            },
                        }, {
                            command: [
                                {
                                    text: "Start Game",
                                    click: function (data) {
                                        var dataItem = this.dataItem($(data.currentTarget).closest("tr"));
                                    }
                                }, {
                                    text: "Add Question",
                                    click: function (data) {
                                        var dataItem = this.dataItem($(data.currentTarget).closest("tr"));
                                        self.pageResponseData = { "categoryId": dataItem.id };
                                        self.pageResponse = "redirect: page-add-question";
                                    }
                                }
                            ],
                            title: " ",
                            width: 25
                        },
                    ]
                })
            },
        });
        //#endregion

        //#region Page: Add category
        triviaGame.controllers.pages.pageAddCategoryController = triviaGame.controllers.pages.mainPageModel.getExtendedModel({
     
            needLogin: false,
            serviceName: "add-category",
            pageName: "page-add-category",
            pageContainer: "#page-add-category",
            categoryName: "",

            questionText: "",
            correctAnswersCollection: [],
            wrongAnswersCollection: [],
            answerNextId: 1,
            correctAnswersCount: 0,
            wrongAnswersCount: 0,
            minCorrectAnswersRqiuired: 1,
            minWrongAnswersRqiuired: 3,

            initSpecific: function () {
                var self = this;

                this.watchProperty("categoryName", self, function () {
                    self.storePage()
                });
            },

            renderContent: function (responseData) {
                this.displayContentBox();
                //this.getPageContentDOM().find("#page-add-question-category-id").kendoDropDownList({
                //    dataTextField: "name",
                //    dataValueField: "id",
                //    dataSource: responseData,
                //    height: 400,
                //});

                //this.getPageContentDOM().find("#page-add-question-answers-wrap").kendoPanelBar({});

                //if (this.isReload) {
                //    this.restoreAnswers();
                //}
            },

            requestAddAnswerElement: function (parameters) {
                var section,
                answerModel;

                if (parameters && parameters["section"]) {
                    section = parameters["section"];
                    answerModel = this.addAnswer(section);
                    this.addAnswerElement(section, answerModel);
                }
            },

            addAnswer: function (section) {
                var answerModel,
                self = this;

                answerModel = new trivia.ObservableObject({
                    text: "",
                    id: this.answerNextId,
                    requestDeleteAnswerElement: function (parameters, DOM) {
                        self.requestDeleteAnswerElement(parameters, DOM);
                    },
                });

                answerModel.watchProperty("text", self, function () {
                    self.storePage()
                });

                this.answerNextId++;

                if (section == "correntAnswers") {
                    this.correctAnswersCollection.push(answerModel);
                }
                else if (section == "wrongAnswers") {
                    this.wrongAnswersCollection.push(answerModel);
                }

                this.updateCounters();
                this.storePage();
                return answerModel;
            },

            addAnswerElement: function (section, answerModel) {
                var element = $($("#page-add-question-answer-template").html()),
                appendToElement;

                if (section == "correntAnswers") {
                    appendToElement = this.getPageContentDOM().find("#page-add-question-correct-answers-list");
                }
                else if (section == "wrongAnswers") {
                    appendToElement = this.getPageContentDOM().find("#page-add-question-wrong-answers-list");
                }

                answerViewModelBilder = new trivia.ViewModelBinder(answerModel);
                answerViewModelBilder.bind(element);
                element.appendTo(appendToElement);
            },

            requestDeleteAnswerElement: function (parameters, DOM) {
                var id = $(DOM).data("id");
                this.deleteAnswer(id);
                $(DOM).parent().remove();
            },

            deleteAnswer: function (id) {
                var index = 0;

                while (index < this.correctAnswersCollection.length) {
                    if (this.correctAnswersCollection[index].id == id) {
                        this.correctAnswersCollection.splice(index, 1)
                    }
                    else {
                        index++
                    }
                }

                index = 0;

                while (index < this.wrongAnswersCollection.length) {
                    if (this.wrongAnswersCollection[index].id == id) {
                        this.wrongAnswersCollection.splice(index, 1)
                    }
                    else {
                        index++
                    }
                }

                this.storePage();
                this.updateCounters();
            },

            updateCounters: function () {
                this.correctAnswersCount = this.correctAnswersCollection.length;
                this.wrongAnswersCount = this.wrongAnswersCollection.length;
            },

            restoreAnswers: function () {
                var oldCorrectAnswersCollection = this.correctAnswersCollection,
                oldWrongAnswersCollection = this.wrongAnswersCollection,
                answerModel,
                i;

                this.correctAnswersCollection = [];
                this.wrongAnswersCollection = [];

                for (i = 0; i < oldCorrectAnswersCollection.length; i++) {
                    answerModel = this.addAnswer("correntAnswers");
                    answerModel.id = oldCorrectAnswersCollection[i].id;
                    answerModel.text = oldCorrectAnswersCollection[i].text;
                    this.addAnswerElement("correntAnswers", answerModel);
                }

                for (i = 0; i < oldWrongAnswersCollection.length; i++) {
                    answerModel = this.addAnswer("wrongAnswers");
                    answerModel.id = oldWrongAnswersCollection[i].id;
                    answerModel.text = oldWrongAnswersCollection[i].text;
                    this.addAnswerElement("wrongAnswers", answerModel);
                }
            },

            requestSubmit: function () {
                if (this.verifySubmit()) {
                    this.submit()
                }
            },

            submit: function () {
                var wrongAnswersList,
                correntAnswersList,
                authorisationInfo,
                requestParamters,
                categoryParameter,
                self = this;

                wrongAnswersList = this.extractNonEmptyAnswers(this.wrongAnswersCollection);
                correntAnswersList = this.extractNonEmptyAnswers(this.correctAnswersCollection);

                authorisationInfo = triviaGame.userAccountManager.userAccount.getAuthorisationInfo();

                requestParamters = {
                    "user": authorisationInfo,
                    "question": {
                        "text": this.questionText,
                        "correctAnswers": correntAnswersList,
                        "wrongAnswers": wrongAnswersList
                    }
                };

                categoryParameter = "/" + this.categoryId;
                this.renderPageStatus("waiting response ...");
                triviaGame.restComunicator.sendPostRequest(this.serviceName, categoryParameter, requestParamters,
                                                           function (data) {
                                                               self.onSubmitSuccess(data)
                                                           },
                                                           function (data) {
                                                               self.onSubmitError(data)
                                                           });
            },

            verifySubmit: function () {
                var wrongAnswersList,
                correntAnswersList,
                message = "";

                this.clearPageStatus();

                wrongAnswersList = this.extractNonEmptyAnswers(this.wrongAnswersCollection);
                correntAnswersList = this.extractNonEmptyAnswers(this.correctAnswersCollection);

                if (wrongAnswersList.length < this.minWrongAnswersRqiuired || correntAnswersList.length < this.minCorrectAnswersRqiuired) {
                    message = "To submit the request minimum " + this.minCorrectAnswersRqiuired + " (" + correntAnswersList.length + ") correnct answers ";
                    message += "and minimum " + this.minWrongAnswersRqiuired + " (" + wrongAnswersList.length + ") wrong answers are required";
                    message += "<br/>"
                }

                if (this.questionText == "") {
                    message += "the questsion text cannot be empty"
                }

                if (message != "") {
                    this.renderPageStatus(message);
                    return false;
                }
                else {
                    return true;
                }
            },

            extractNonEmptyAnswers: function (collection) {
                var result = [];

                for (answer in collection) {
                    if (collection[answer]["text"] != "") {
                        result.push(collection[answer])
                    }
                }

                return result;
            },

            onSubmitSuccess: function () {
                this.clearPage();
                this.renderPageStatus("submited successfully!");
            },

            onSubmitError: function (data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.renderPageStatus(message);
            },

            clearPage: function () {
                this.correctAnswersCollection = [];
                this.wrongAnswersCollection = [];
                this.questionText = "";
                this.wrongAnswersCount = 0;
                this.correctAnswersCount = 0;
                this.answerNextId = 1;
                this.storePage();
                this.getPageContentDOM().find("#page-add-question-correct-answers-list").html("");
                this.getPageContentDOM().find("#page-add-question-wrong-answers-list").html("");
            }
         
        });
        //#endregion

        //#region Page: Add question
        triviaGame.controllers.pages.pageAddQuestionController = triviaGame.controllers.pages.mainPageModel.getExtendedModel({
            needLogin: true,
            serviceName: "add-question",
            pageName: "page-add-question",
            pageContainer: "#page-add-question",
            categoryId: "",
            questionText: "",
            correctAnswersCollection: [],
            wrongAnswersCollection: [],
            answerNextId: 1,
            correctAnswersCount: 0,
            wrongAnswersCount: 0,
            minCorrectAnswersRqiuired: 1,
            minWrongAnswersRqiuired: 3,

            initSpecific: function () {
                var self = this;

                this.watchProperty("questionText", self, function () {
                    self.storePage()
                });

                this.watchProperty("categoryId", self, function () {
                    self.storePage()
                });
            },
            
            loadPageData: function (parameters) {
                var self = this;

                if (parameters && parameters.categoryId) {
                    this.categoryId = parameters.categoryId;
                }

                triviaGame.data.categories.loadData(
                    function (data) {
                        self.onLoadSuccess(data)
                    },
                    function (data) {
                        self.onLoadError(data)
                    });
            },

            unload: function () {                
                this.pageDisplay = "none";
            },

            renderContent: function (responseData) {
                this.displayContentBox();
                this.getPageContentDOM().find("#page-add-question-category-id").kendoDropDownList({
                    dataTextField: "name",
                    dataValueField: "id",
                    dataSource: responseData,
                    height: 400,
                });

                this.getPageContentDOM().find("#page-add-question-answers-wrap").kendoPanelBar({});
                
                if (this.isReload) {
                    this.restoreAnswers();
                }
            },

            requestAddAnswerElement: function (parameters) {
                var section, 
                answerModel;

                if (parameters && parameters["section"]) {
                    section = parameters["section"];
                    answerModel = this.addAnswer(section);
                    this.addAnswerElement(section, answerModel);
                }
            },

            addAnswer: function (section) {
                var answerModel,
                self = this;

                answerModel = new trivia.ObservableObject({
                    text: "",
                    id: this.answerNextId,
                    requestDeleteAnswerElement: function (parameters, DOM) {
                        self.requestDeleteAnswerElement(parameters, DOM);
                    },
                });

                answerModel.watchProperty("text", self, function () {
                    self.storePage()
                });

                this.answerNextId ++;

                if (section == "correntAnswers") {
                    this.correctAnswersCollection.push(answerModel);
                }
                else if (section == "wrongAnswers") {
                    this.wrongAnswersCollection.push(answerModel);
                }

                this.updateCounters();
                this.storePage();
                return answerModel;
            },

            addAnswerElement: function (section, answerModel) {
                var element = $($("#page-add-question-answer-template").html()),
                appendToElement;

                if (section == "correntAnswers") {
                    appendToElement = this.getPageContentDOM().find("#page-add-question-correct-answers-list");
                }
                else if (section == "wrongAnswers") {
                    appendToElement = this.getPageContentDOM().find("#page-add-question-wrong-answers-list");
                }

                answerViewModelBilder = new trivia.ViewModelBinder(answerModel);
                answerViewModelBilder.bind(element);
                element.appendTo(appendToElement);
            },

            requestDeleteAnswerElement: function (parameters, DOM) {
                var id = $(DOM).data("id");
                this.deleteAnswer(id);
                $(DOM).parent().remove();
            },

            deleteAnswer: function (id) {
                var index = 0;

                while (index < this.correctAnswersCollection.length) {
                    if (this.correctAnswersCollection[index].id == id) {
                        this.correctAnswersCollection.splice(index, 1)
                    }
                    else {
                        index++
                    }
                }

                index = 0;

                while (index < this.wrongAnswersCollection.length) {
                    if (this.wrongAnswersCollection[index].id == id) {
                        this.wrongAnswersCollection.splice(index, 1)
                    }
                    else {
                        index++
                    }
                }

                this.storePage();
                this.updateCounters();
            },

            updateCounters: function() {
                this.correctAnswersCount = this.correctAnswersCollection.length;
                this.wrongAnswersCount = this.wrongAnswersCollection.length;
            },

            restoreAnswers: function () {
                var oldCorrectAnswersCollection = this.correctAnswersCollection,
                oldWrongAnswersCollection = this.wrongAnswersCollection,
                answerModel,
                i;

                this.correctAnswersCollection = [];
                this.wrongAnswersCollection = [];

                for (i = 0; i < oldCorrectAnswersCollection.length; i++) {
                    answerModel = this.addAnswer("correntAnswers");
                    answerModel.id = oldCorrectAnswersCollection[i].id;
                    answerModel.text = oldCorrectAnswersCollection[i].text;
                    this.addAnswerElement("correntAnswers", answerModel);
                }

                for (i = 0; i < oldWrongAnswersCollection.length; i++) {
                    answerModel = this.addAnswer("wrongAnswers");
                    answerModel.id = oldWrongAnswersCollection[i].id;
                    answerModel.text = oldWrongAnswersCollection[i].text;
                    this.addAnswerElement("wrongAnswers", answerModel);
                }
            },
            
            requestSubmit: function () {
                if (this.verifySubmit()) {
                    this.submit()
                }
            },

            submit: function () {
                var wrongAnswersList,
                correntAnswersList,
                authorisationInfo,
                requestParamters,
                categoryParameter,
                self = this;
                
                wrongAnswersList = this.extractNonEmptyAnswers(this.wrongAnswersCollection);
                correntAnswersList = this.extractNonEmptyAnswers(this.correctAnswersCollection);

                authorisationInfo = triviaGame.userAccountManager.userAccount.getAuthorisationInfo();

                requestParamters = {
                    "user": authorisationInfo,
                    "question": {
                        "text": this.questionText,
                        "correctAnswers": correntAnswersList,
                        "wrongAnswers": wrongAnswersList
                    }
                };

                categoryParameter = "/" + this.categoryId;
                this.renderPageStatus("waiting response ...");
                triviaGame.restComunicator.sendPostRequest(this.serviceName, categoryParameter, requestParamters,
                                                           function (data) {
                                                               self.onSubmitSuccess(data)
                                                           },
                                                           function (data) {
                                                               self.onSubmitError(data)
                                                           });
            },

            verifySubmit: function () {
                var wrongAnswersList,
                correntAnswersList,
                message = "";

                this.clearPageStatus();

                wrongAnswersList = this.extractNonEmptyAnswers(this.wrongAnswersCollection);
                correntAnswersList = this.extractNonEmptyAnswers(this.correctAnswersCollection);

                if (wrongAnswersList.length < this.minWrongAnswersRqiuired || correntAnswersList.length < this.minCorrectAnswersRqiuired) {
                    message = "To submit the request minimum " + this.minCorrectAnswersRqiuired + " (" + correntAnswersList.length + ") correnct answers ";
                    message += "and minimum " + this.minWrongAnswersRqiuired + " (" + wrongAnswersList.length + ") wrong answers are required";
                    message += "<br/>"
                }

                if (this.questionText == "") {
                    message += "the questsion text cannot be empty"
                }

                if (message != "") {
                    this.renderPageStatus(message);
                    return false;
                }
                else {
                    return true;
                }
            },

            extractNonEmptyAnswers: function(collection) {
                var result = [];

                for (answer in collection) {
                    if (collection[answer]["text"] != "") {
                        result.push(collection[answer])
                    }
                }

                return result;
            },

            onSubmitSuccess: function() {
                this.clearPage();
                this.renderPageStatus("submited successfully!");
            },

            onSubmitError: function(data) {
                var message = triviaGame.restComunicator.parseResponseMessage(data);
                this.renderPageStatus(message);
            },

            clearPage: function() {
                this.correctAnswersCollection = [];
                this.wrongAnswersCollection = [];
                this.questionText = "";
                this.wrongAnswersCount = 0;
                this.correctAnswersCount = 0;
                this.answerNextId = 1;
                this.storePage();
                this.getPageContentDOM().find("#page-add-question-correct-answers-list").html("");
                this.getPageContentDOM().find("#page-add-question-wrong-answers-list").html("");
            }

        });
        //#endregion

        //#region Page: All users
        triviaGame.controllers.pages.pageAllUsersController = triviaGame.controllers.pages.mainPageModel.getExtendedModel({

            serviceName: "all-users",
            pageName: "page-all-users",
            pageContainer: "#page-all-users",

            loadPageData: function () {
                var self = this;
                triviaGame.data.users.loadData(
                    function (data) {
                        self.onLoadSuccess(data)
                    },
                    function (data) {
                        self.onLoadError(data)
                    });
            },

            unload: function () {
                this.getPageContentDOM().find("#page-all-users-grid").html("");
                this.pageDisplay = "none";
            },

            renderContent: function (responseData) {
                var self = this;

                this.displayContentBox();

                this.getPageContentDOM().find("#page-all-users-grid").kendoGrid({
                    dataSource: {
                        data: responseData,
                        schema: {
                            model: {
                                fields: {
                                    nickname: { type: "string" },
                                    score: { type: "number" },
                                    games: { type: "number" },
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
                pageController.watchProperty("pageResponse", this, this.onPageResponse);
            },

            requestPageChange: function (parameters) {
                if (parameters && parameters["pageName"]) {
                    var pageName = parameters["pageName"];
                    this.changeActivePage(pageName, {});
                }
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
            },

            onPageResponse: function (data) {
                if (data) {
                    var parametersStrings = data.split(":");
                    var parameterProperty = parametersStrings[0].trim();
                    var parameterValue = parametersStrings[1].trim();

                    var data = this.activePage.pageResponseData;

                    switch (parameterProperty) {
                        case "redirect":
                            this.changeActivePage(parameterValue, data);
                            break;
                    }
                }
            },

        });

        triviaGame.controllers.navigationController.addPage(
            triviaGame.controllers.pages.pageAllCategoriesController.pageName,
            triviaGame.controllers.pages.pageAllCategoriesController);

        triviaGame.controllers.navigationController.addPage(
            triviaGame.controllers.pages.pageAllUsersController.pageName,
            triviaGame.controllers.pages.pageAllUsersController);

        triviaGame.controllers.navigationController.addPage(
            triviaGame.controllers.pages.pageAddCategoryController.pageName,
            triviaGame.controllers.pages.pageAddCategoryController);

        triviaGame.controllers.navigationController.addPage(
            triviaGame.controllers.pages.pageAddQuestionController.pageName,
            triviaGame.controllers.pages.pageAddQuestionController);

        triviaGame.viewModelBinders.navigationViewBinder = new trivia.ViewModelBinder(triviaGame.controllers.navigationController);
        triviaGame.viewModelBinders.navigationViewBinder.bind($("#site-main-nav"));
        triviaGame.controllers.navigationController.changeActivePage("page-add-category", {});
        //#endregion      
    })
})(jQuery)