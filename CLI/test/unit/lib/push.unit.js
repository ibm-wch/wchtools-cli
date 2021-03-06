/*
Copyright 2016 IBM Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/**
 * Unit tests for the push command.
 */
"use strict";

// Require the super classes for this class.
const UnitTest = require("./base.cli.unit.js");

// Require the node modules used in this test file.
const fs = require("fs");
const rimraf = require("rimraf");
const prompt = require("prompt");
const uuid = require("uuid");
const Q = require("q");
const sinon = require("sinon");
const ToolsApi = require("wchtools-api");
const hashes = ToolsApi.getHashes();
const toolsCli = require("../../../wchToolsCli");
const mkdirp = require("mkdirp");
const manifests = ToolsApi.getManifests();

// Require the local modules that will be stubbed, mocked, and spied.
const options = require("wchtools-api").getOptions();

const sitesHelper = ToolsApi.getSitesHelper();
const schedulesHelper = ToolsApi.getPublishingSchedulesHelper();

let stubLocalSites;
let stubNextSchedules;

class PushUnitTest extends UnitTest {
    constructor () {
        super();
    }

    static addLocalSitesStub () {
        stubLocalSites = sinon.stub(sitesHelper._fsApi, "getItems");
        stubLocalSites.resolves([{id: "foo", status: "ready", contextRoot: "foo"}, {
            id: "bar",
            status: "draft",
            contextRoot: "bar"
        }]);
    }

    static restoreLocalSitesStub () {
        stubLocalSites.restore();
    }

    run (helper, switches, itemName1, itemName2, badItem) {
        const self = this;
        describe("Unit tests for push  " + switches, function () {
            let stubLogin;
            before(function (done) {
                mkdirp.sync(UnitTest.DOWNLOAD_DIR);

                stubLogin = sinon.stub(self.getLoginHelper(), "login");
                stubLogin.resolves("Adam.iem@mailinator.com");

                stubNextSchedules = sinon.stub(schedulesHelper, "getNextSchedules");
                // TBD individual test w/resolves [{"_id":"c6efbfff-db50-4cb4-80a2-816bde7930e2","_rev":"2-0296077a4b72f8fcd011d4510e2c354e","classification":"tenant","deliveryDomainId":"default","repeatSchedule":"none","docId":"102a4692-60c8-476d-b615-d227f6103a33","releaseDate":"2018-10-05T02:50:00.000Z","name":"onet"}]
                stubNextSchedules.resolves(null);

                PushUnitTest.addLocalSitesStub();

                done();
            });

            after(function (done) {
                rimraf.sync(UnitTest.DOWNLOAD_DIR);

                stubLogin.restore();
                stubNextSchedules.restore();
                PushUnitTest.restoreLocalSitesStub();

                done();
            });

            // Run each of the tests defined in this class.
            self.testPush(helper, switches, itemName1, itemName2, badItem);
            self.testPushByManifest(helper, switches, itemName1, itemName2, badItem);
            self.testPushUrlOption(helper, switches, itemName1, itemName2, badItem);
            self.testPushParamFail(helper, switches);
            if (switches.includes("-a") || switches.includes("--content")) {
                self.testPushWithSchedule(helper, switches, itemName1, itemName2, badItem);
            }
        });
    }

    testPush (helper, switches, itemName1, itemName2, badItem) {
        const DOWNLOAD_TARGET = UnitTest.DOWNLOAD_DIR; // Relative to the CLI directory.
        describe("CLI-unit-pushing", function () {
            it("test emitters working", function (done) {
                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            emitter.emit("pushed", {name: itemName1, id: undefined, status: "ready"});
                            emitter.emit("pushed", {name: itemName2, id: undefined, status: "draft"});
                        } else {
                            emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        }
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                const unique = uuid.v4();
                const downloadTarget = DOWNLOAD_TARGET + unique;
                mkdirp.sync(downloadTarget);
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-v'])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts successfully');
                        expect(msg).to.contain('2 errors');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test resource emitters working", function (done) {
                if (switches !== "-a" ) {
                    return done();
                }

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("resource-pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("resource-pushed", {name: itemName2, id: undefined, path: itemName2});
                        emitter.emit("resource-pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("resource-pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                const unique = uuid.v4();
                const downloadTarget = DOWNLOAD_TARGET + unique;
                mkdirp.sync(downloadTarget);
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-v'])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts successfully');
                        expect(msg).to.contain('2 errors');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test generic push working with NOW", function (done) {
                let savedOpts;
                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context, opts) {
                    savedOpts = opts;
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            emitter.emit("pushed", {
                                name: itemName1,
                                id: undefined,
                                contextRoot: itemName1,
                                status: "ready"
                            });
                            emitter.emit("pushed", {
                                name: itemName2,
                                id: undefined,
                                contextRoot: itemName2,
                                status: "draft"
                            });
                        } else {
                            emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        }
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api", "--publish-now", "--set-tag","test-tag"])
                    .then(function (msg) {
                        expect(savedOpts).to.exist;
                        expect(savedOpts["publish-now"]).to.exist;
                        expect(savedOpts["setTag"]).to.exist;

                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts');
                        expect(msg).to.contain('2 errors');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test generic push working with NEXT", function (done) {
                let savedOpts;
                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context, opts) {
                    savedOpts = opts;
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            emitter.emit("pushed", {
                                name: itemName1,
                                id: undefined,
                                contextRoot: itemName1,
                                status: "ready"
                            });
                            emitter.emit("pushed", {
                                name: itemName2,
                                id: undefined,
                                contextRoot: itemName2,
                                status: "draft"
                            });
                        } else {
                            emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        }
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api", "--publish-next", "--set-tag","test-tag"])
                    .then(function (msg) {
                        expect(savedOpts).to.exist;
                        expect(savedOpts["publish-next"]).to.exist;
                        expect(savedOpts["setTag"]).to.exist;

                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts');
                        expect(msg).to.contain('2 errors');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push no directories", function (done) {
                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function () {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Stub the helper.doesDirectoryExist method to return false.
                const stubExist = sinon.stub(helper, "doesDirectoryExist");
                stubExist.returns(false);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected error was specified.
                        expect(err.message).to.contain("does not contain any directories");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's methods.
                        stub.restore();
                        stubExist.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push ready -- no sites", function (done) {
                if (switches !== "--sites") {
                    return done();
                }

                // Restore the global stub and create our own.
                PushUnitTest.restoreLocalSitesStub();
                const stubGet = sinon.stub(sitesHelper._fsApi, "getItems");
                stubGet.resolves(undefined);

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushAllItems", function () {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Stub the helper.doesDirectoryExist method to return false.
                const stubExist = sinon.stub(helper, "doesDirectoryExist");
                stubExist.returns(false);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "-I", "--ready", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected error was specified.
                        expect(err.message).to.contain("does not contain any directories or items to be pushed");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the local stub then add the original stub again.
                        stubGet.restore();
                        PushUnitTest.addLocalSitesStub();

                        // Restore the helper's methods.
                        stub.restore();
                        stubExist.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push draft -- no sites", function (done) {
                if (switches !== "--sites") {
                    return done();
                }

                // Restore the global stub and create our own.
                PushUnitTest.restoreLocalSitesStub();
                const stubGet = sinon.stub(sitesHelper._fsApi, "getItems");
                stubGet.resolves(undefined);

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushAllItems", function () {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Stub the helper.doesDirectoryExist method to return false.
                const stubExist = sinon.stub(helper, "doesDirectoryExist");
                stubExist.returns(false);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "-I", "--draft", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected error was specified.
                        expect(err.message).to.contain("does not contain any directories or items to be pushed");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the local stub then add the original stub again.
                        stubGet.restore();
                        PushUnitTest.addLocalSitesStub();

                        // Restore the helper's methods.
                        stub.restore();
                        stubExist.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push get sites error", function (done) {
                if (switches !== "--sites") {
                    return done();
                }

                // Restore the global stub and create our own.
                const SITES_ERROR = "Error getting sites, expected by unit test.";
                PushUnitTest.restoreLocalSitesStub();
                const stubGet = sinon.stub(sitesHelper._fsApi, "getItems");
                stubGet.rejects(SITES_ERROR);

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushAllItems", function () {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Stub the helper.doesDirectoryExist method to return false.
                const stubExist = sinon.stub(helper, "doesDirectoryExist");
                stubExist.returns(false);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "-I", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected error was specified.
                        expect(err.message).to.contain(SITES_ERROR);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the local stub then add the original stub again.
                        stubGet.restore();
                        PushUnitTest.addLocalSitesStub();

                        // Restore the helper's methods.
                        stub.restore();
                        stubExist.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push no items ignore timestamps", function (done) {
                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushAllItems", function () {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Stub the helper.doesDirectoryExist method to return true.
                const stubExist = sinon.stub(helper, "doesDirectoryExist");
                stubExist.returns(true);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "-I", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the expected error was specified.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain("No items to be pushed");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's methods.
                        stub.restore();
                        stubExist.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push no items", function (done) {
                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function () {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Stub the helper.doesDirectoryExist method to return true.
                const stubExist = sinon.stub(helper, "doesDirectoryExist");
                stubExist.returns(true);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the expected error was specified.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain("nothing has been modified locally");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's methods.
                        stub.restore();
                        stubExist.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test successful push of named item", function (done) {
                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushItem", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        stubDeferred.resolve({id: "foo", name: itemName1});
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                let promise;
                if (switches === "--pages") {
                    promise = toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--named", itemName1, "--site-context", "foo", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"]);
                } else {
                    promise = toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--named", itemName1, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"]);
                }

                promise
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        // Note that for pages, this push defaults to only the ready site.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('1 artifact');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test failed push of named item", function (done) {
                // Stub the helper.pushModifiedItems method to return a promise that is rejected after emitting an error event.
                const PUSH_ERROR = "Error pushing named item, expected by unit test.";
                const stub = sinon.stub(helper, "pushItem", function (context) {
                    // When the stubbed method is called, return a promise that will be rejected asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const pushError = new Error(PUSH_ERROR);
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed-error", pushError, {name: itemName1, id: undefined, path: itemName1});
                        stubDeferred.reject(pushError);
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                let promise;
                if (switches === "--pages") {
                    promise = toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--named", itemName1, "--site-context", "foo", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"]);
                } else {
                    promise = toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--named", itemName1, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"]);
                }

                promise
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected error was specified.
                        expect(err.message).to.contain("Encountered 1 error while pushing artifacts.");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test successful push of named ready page", function (done) {
                if (switches !== "--pages") {
                    return done();
                }

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushItem", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        stubDeferred.resolve({id: "foo", name: itemName1});
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--named", itemName1, "--site-context", "foo", "--ready", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('1 artifact');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test successful push of named draft page", function (done) {
                if (switches !== "--pages") {
                    return done();
                }

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushItem", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        stubDeferred.resolve({id: "foo", name: itemName1});
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--named", itemName1, "--site-context", "bar", "--draft", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('1 artifact');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test successful push of named ready and draft page", function (done) {
                if (switches !== "--pages") {
                    return done();
                }

                // Restore the global stub and create our own.
                PushUnitTest.restoreLocalSitesStub();
                const stubGet = sinon.stub(sitesHelper._fsApi, "getItems");
                stubGet.resolves([{id: "foo", status: "ready", contextRoot: "foo"}, {
                    id: "bar",
                    status: "draft",
                    contextRoot: "foo"
                }]);

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushItem", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        stubDeferred.resolve({id: "foo", name: itemName1});
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--named", itemName1, "--site-context", "foo", "--ready", "--draft", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called twice (once for each site), and that the expected message was returned.
                        expect(stub).to.have.been.calledTwice;
                        expect(msg).to.contain('2 artifacts');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Restore the local stub then add the original stub again.
                        stubGet.restore();
                        PushUnitTest.addLocalSitesStub();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test successful push of both types of assets", function (done) {
                if (switches !== "-a" ) {
                    return done();
                }

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", "-aw", "--path", ".", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('1 artifact');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test successful push of web asset with path", function (done) {
                if (switches !== "-w" ) {
                    return done();
                }

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--path", ".", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('1 artifact');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test failure pushing web asset with path", function (done) {
                if (switches !== "-w" ) {
                    return done();
                }

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--path", ".", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(err.message).to.contain('2 errors');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push ignore-timestamps working", function (done) {
                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushAllItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--ignore-timestamps", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api','-v'])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "getRemoteItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push ignore-timestamps working (ready items only, by default)", function (done) {
                const stubList = sinon.stub(helper._fsApi, "listNames");
                if (switches.includes("--sites")) {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2,
                        status: "draft"
                    }]);
                } else {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2,
                        status: "draft"
                    }, {name: badItem, id: undefined, path: badItem, status: "ready"}]);
                }

                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            // The context site list only contains the foo site, because it has a ready status.
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                        } else {
                            // Both ready items are pushed (even the one with no id).
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                            emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                        }
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--ignore-timestamps", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api','-v'])
                    .then(function (msg) {
                        if (switches === "--sites") {
                            // Verify that the stubs were called once, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledOnce;
                            expect(stubPush).to.have.been.calledOnce;
                            expect(stubPush.args[0][1]).to.have.lengthOf(1);
                            expect(stubPush.args[0][1][0].id).to.equal("foo");
                            expect(msg).to.contain('1 artifact');
                        } else {
                            // Verify that the stubs were called once, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledOnce;
                            expect(stubPush).to.have.been.calledOnce;
                            expect(stubPush.args[0][1]).to.have.lengthOf(2);
                            if ((switches === "-a") || (switches === "-w")) {
                                expect(stubPush.args[0][1][0]).to.equal("type-1");
                                expect(stubPush.args[0][1][1]).to.equal("type-bad-name");
                            } else {
                                expect(stubPush.args[0][1][0].id).to.equal("foo");
                                expect(stubPush.args[0][1][1].id).to.not.exist;
                                if (switches === "--pages") {
                                    expect(stubPush.args[0][2].siteItem.id).to.equal("foo");
                                }
                            }
                            expect(msg).to.contain('2 artifacts');
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push modified working (ready items only, by default)", function (done) {
                const stubList = sinon.stub(helper._fsApi, "listNames");
                if (switches.includes("--sites")) {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2,
                        status: "draft"
                    }]);
                } else {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2,
                        status: "draft"
                    }, {name: badItem, id: undefined, path: badItem, status: "ready"}]);
                }

                const stubHashes = sinon.stub(hashes, "isLocalModified");
                stubHashes.returns(true);

                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            // The context site list only contains the foo site, because it has a ready status.
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                        } else {
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});

                            // The item without an id is filtered in JSONItemHelper.listModifiedLocalItemNames().
                            if ((switches === "-a") || (switches === "-w")) {
                                emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                            }
                        }
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-v'])
                    .then(function (msg) {
                        if (switches === "--sites") {
                            // Verify that the stubs were called once, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledOnce;
                            expect(stubPush).to.have.been.calledOnce;
                            expect(stubPush.args[0][1]).to.have.lengthOf(1);
                            expect(stubPush.args[0][1][0].id).to.equal("foo");
                        } else {
                            // Verify that the stubs were called once, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledOnce;
                            expect(stubPush).to.have.been.calledOnce;
                            if ((switches === "-a") || (switches === "-w")) {
                                expect(stubPush.args[0][1]).to.have.lengthOf(2);
                                expect(stubPush.args[0][1][0]).to.equal("type-1");
                                expect(stubPush.args[0][1][1]).to.equal("type-bad-name");
                                expect(msg).to.contain('2 artifacts');
                            } else {
                                expect(stubPush.args[0][1]).to.have.lengthOf(1);
                                expect(stubPush.args[0][1][0].id).to.equal("foo");
                                expect(msg).to.contain('1 artifact');
                            }
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubHashes.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push ignore-timestamps working (all items)", function (done) {
                const stubList = sinon.stub(helper._fsApi, "listNames");
                if (switches.includes("--sites")) {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2,
                        status: "draft"
                    }]);
                } else {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2
                    }, {name: badItem, id: undefined, path: badItem}]);
                }

                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            // Only the foo and bar sites are in the context site list.
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});
                        } else {
                            // All three items are pushed (even the one with no id).
                            emitter.emit("pushed", {name: itemName1, id: "bar", path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: "foo", path: itemName2});
                            emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                        }
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--ignore-timestamps", "--ready", "--draft", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-v'])
                    .then(function (msg) {
                        if (switches === "--sites") {
                            // Verify that the stubs were called once, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledOnce;
                            expect(stubPush).to.have.been.calledOnce;
                            expect(stubPush.args[0][1]).to.have.lengthOf(2);
                            expect(stubPush.args[0][1][0].id).to.equal("foo");
                            expect(stubPush.args[0][1][1].id).to.equal("bar");
                            expect(msg).to.contain('2 artifacts');
                        } else if (switches === "--pages") {
                            // Verify that the stubs were called twice, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledTwice;
                            expect(stubPush).to.have.been.calledTwice;
                            expect(stubPush.args[0][1]).to.have.lengthOf(3);
                            expect(stubPush.args[1][1]).to.have.lengthOf(3);
                            expect(stubPush.args[0][1][0].id).to.equal("foo");
                            expect(stubPush.args[0][1][1].id).to.equal("bar");
                            expect(stubPush.args[0][1][2].id).to.not.exist;
                            expect(stubPush.args[0][2].siteItem.id).to.equal("foo");
                            expect(stubPush.args[1][1][0].id).to.equal("foo");
                            expect(stubPush.args[1][1][1].id).to.equal("bar");
                            expect(stubPush.args[1][1][2].id).to.not.exist;
                            expect(stubPush.args[1][2].siteItem.id).to.equal("bar");
                            expect(msg).to.contain('6 artifacts');
                        } else {
                            // Verify that the stubs were called once, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledOnce;
                            expect(stubPush).to.have.been.calledOnce;
                            expect(stubPush.args[0][1]).to.have.lengthOf(3);
                            if ((switches === "-a") || (switches === "-w")) {
                                expect(stubPush.args[0][1][0]).to.equal("type-1");
                                expect(stubPush.args[0][1][1]).to.equal("type-2");
                                expect(stubPush.args[0][1][2]).to.equal("type-bad-name");
                            } else {
                                expect(stubPush.args[0][1][0].id).to.equal("foo");
                                expect(stubPush.args[0][1][1].id).to.equal("bar");
                                expect(stubPush.args[0][1][2].id).to.not.exist;
                            }
                            expect(msg).to.contain('3 artifacts');
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push modified working (all items)", function (done) {
                const stubList = sinon.stub(helper._fsApi, "listNames");
                if (switches.includes("--sites")) {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2,
                        status: "draft"
                    }]);
                } else {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2
                    }, {name: badItem, id: undefined, path: badItem}]);
                }

                const stubHashes = sinon.stub(hashes, "isLocalModified");
                stubHashes.returns(true);

                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);

                        // For sites, only the foo and bar sites are in the context site list.
                        emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});

                        // The item without an id is filtered in JSONItemHelper.listModifiedLocalItemNames().
                        if ((switches === "-a") || (switches === "-w")) {
                            emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                        }
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--ready", "--draft", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-v'])
                    .then(function (msg) {
                        if (switches === "--pages") {
                            // Verify that the stubs were called twice, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledTwice;
                            expect(stubPush).to.have.been.calledTwice;
                            expect(stubPush.args[0][1]).to.have.lengthOf(2);
                            expect(stubPush.args[1][1]).to.have.lengthOf(2);
                            expect(stubPush.args[0][1][0].id).to.equal("foo");
                            expect(stubPush.args[0][1][1].id).to.equal("bar");
                            expect(stubPush.args[1][1][0].id).to.equal("foo");
                            expect(stubPush.args[1][1][1].id).to.equal("bar");
                            expect(msg).to.contain('4 artifacts');
                        } else {
                            // Verify that the stubs were called once, and that the expected number of items were pushed.
                            expect(stubList).to.have.been.calledOnce;
                            expect(stubPush).to.have.been.calledOnce;
                            if ((switches === "-a") || (switches === "-w")) {
                                expect(stubPush.args[0][1]).to.have.lengthOf(3);
                                expect(stubPush.args[0][1][0]).to.equal("type-1");
                                expect(stubPush.args[0][1][1]).to.equal("type-2");
                                expect(stubPush.args[0][1][2]).to.equal("type-bad-name");
                                expect(msg).to.contain('3 artifacts');
                            } else {
                                expect(stubPush.args[0][1]).to.have.lengthOf(2);
                                expect(stubPush.args[0][1][0].id).to.equal("foo");
                                expect(stubPush.args[0][1][1].id).to.equal("bar");
                                expect(msg).to.contain('2 artifacts');
                            }
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubHashes.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push ignore-timestamps working (ready items)", function (done) {
                const stubList = sinon.stub(helper._fsApi, "listNames");
                if (switches.includes("--sites")) {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2,
                        status: "draft"
                    }]);
                } else {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2
                    }, {name: badItem, id: undefined, path: badItem}]);
                }

                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            // Only one site (foo) is a ready site.
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                        } else {
                            // Two pages will be pushed for the ready site (foo).
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});
                            emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                        }
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--ready", "--ignore-timestamps", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api','-v'])
                    .then(function (msg) {
                        // Verify that the stubs were called once, and that the expected number of items were pushed.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPush).to.have.been.calledOnce;
                        if (switches === "--sites") {
                            expect(stubPush.args[0][1]).to.have.lengthOf(1);
                            expect(stubPush.args[0][1][0].id).to.equal("foo");
                            expect(msg).to.contain('1 artifact');
                        } else {
                            expect(stubPush.args[0][1]).to.have.lengthOf(3);
                            if ((switches === "-a") || (switches === "-w")) {
                                expect(stubPush.args[0][1][0]).to.equal("type-1");
                                expect(stubPush.args[0][1][1]).to.equal("type-2");
                                expect(stubPush.args[0][1][2]).to.equal("type-bad-name");
                            } else {
                                expect(stubPush.args[0][1][0].id).to.equal("foo");
                                expect(stubPush.args[0][1][1].id).to.equal("bar");
                                expect(stubPush.args[0][1][2].id).to.not.exist;
                                if (switches === "--pages") {
                                    expect(stubPush.args[0][2].siteItem.id).to.equal("foo");
                                }
                            }
                            expect(msg).to.contain('3 artifacts');
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push modified working (ready items)", function (done) {
                const stubList = sinon.stub(helper._fsApi, "listNames");
                if (switches.includes("--sites")) {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2,
                        status: "draft"
                    }]);
                } else {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1}, {
                        name: itemName2,
                        id: "bar",
                        path: itemName2
                    }, {name: badItem, id: undefined, path: badItem}]);
                }

                const stubHashes = sinon.stub(hashes, "isLocalModified");
                stubHashes.returns(true);

                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            // Only one site (foo) is a ready site.
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                        } else {
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});

                            // The item without an id is filtered in JSONItemHelper.listModifiedLocalItemNames().
                            if ((switches === "-a") || (switches === "-w")) {
                                emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                            }
                        }
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items from the working directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--ready", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api','-v'])
                    .then(function (msg) {
                        // Verify that the stubs were called once, and that the expected number of items were pushed.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPush).to.have.been.calledOnce;
                        if (switches === "--sites") {
                            expect(stubPush.args[0][1]).to.have.lengthOf(1);
                            expect(stubPush.args[0][1][0].id).to.equal("foo");
                            expect(msg).to.contain('1 artifact');
                        } else {
                            if ((switches === "-a") || (switches === "-w")) {
                                expect(stubPush.args[0][1]).to.have.lengthOf(3);
                                expect(stubPush.args[0][1][0]).to.equal("type-1");
                                expect(stubPush.args[0][1][1]).to.equal("type-2");
                                expect(stubPush.args[0][1][2]).to.equal("type-bad-name");
                                expect(msg).to.contain('3 artifacts');
                            } else {
                                expect(stubPush.args[0][1]).to.have.lengthOf(2);
                                expect(stubPush.args[0][1][0].id).to.equal("foo");
                                expect(stubPush.args[0][1][1].id).to.equal("bar");
                                expect(msg).to.contain('2 artifacts');
                            }
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubHashes.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push ignore-timestamps working (draft items)", function (done) {
                const stubList = sinon.stub(helper._fsApi, "listNames");
                if (switches.includes("--sites")) {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"},
                        {name: itemName2, id: "bar", path: itemName2, status: "draft"}]);
                } else {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "draft"},
                        {name: itemName2, id: "bar", path: itemName2, status: "draft"},
                        {name: badItem, id: undefined, path: badItem, status: "draft"}]);
                }

                // Stub the helper._pushNameList method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            // Only one site (bar) is a draft site.
                            emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});
                        } else {
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});
                            emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                        }
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--draft", "--ignore-timestamps", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api','-v'])
                    .then(function (msg) {
                        // Verify that the stubs were called once, and that the expected number of items were pushed.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPush).to.have.been.calledOnce;
                        if (switches === "--sites") {
                            expect(stubPush.args[0][1]).to.have.lengthOf(1);
                            expect(stubPush.args[0][1][0].id).to.equal("bar");
                            expect(msg).to.contain('1 artifact');
                        } else {
                            expect(stubPush.args[0][1]).to.have.lengthOf(3);
                            if ((switches === "-a") || (switches === "-w")) {
                                expect(stubPush.args[0][1][0]).to.equal("type-1");
                                expect(stubPush.args[0][1][1]).to.equal("type-2");
                                expect(stubPush.args[0][1][2]).to.equal("type-bad-name");
                            } else {
                                expect(stubPush.args[0][1][0].id).to.equal("foo");
                                expect(stubPush.args[0][1][1].id).to.equal("bar");
                                expect(stubPush.args[0][1][2].id).to.not.exist;
                                if (switches === "--pages") {
                                    expect(stubPush.args[0][2].siteItem.id).to.equal("bar");
                                }
                            }
                            expect(msg).to.contain('3 artifacts');
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push modified working (draft items)", function (done) {
                const stubList = sinon.stub(helper._fsApi, "listNames");
                if (switches.includes("--sites")) {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "ready"},
                        {name: itemName2, id: "bar", path: itemName2, status: "draft"}]);
                } else {
                    stubList.resolves([{name: itemName1, id: "foo", path: itemName1, status: "draft"},
                        {name: itemName2, id: "bar", path: itemName2, status: "draft"},
                        {name: badItem, id: undefined, path: badItem, status: "draft"}]);
                }

                const stubHashes = sinon.stub(hashes, "isLocalModified");
                stubHashes.returns(true);

                // Stub the helper._pushNameList method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        if (switches === "--sites") {
                            // Only one site (bar) is a draft site.
                            emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});
                        } else {
                            emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});

                            // The item without an id is filtered in JSONItemHelper.listModifiedLocalItemNames().
                            if ((switches === "-a") || (switches === "-w")) {
                                emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                            }
                        }
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--draft", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api','-v'])
                    .then(function (msg) {
                        // Verify that the stubs were called once, and that the expected number of items were pushed.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPush).to.have.been.calledOnce;
                        if (switches === "--sites") {
                            expect(stubPush.args[0][1]).to.have.lengthOf(1);
                            expect(stubPush.args[0][1][0].id).to.equal("bar");
                            expect(msg).to.contain('1 artifact');
                        } else {
                            if ((switches === "-a") || (switches === "-w")) {
                                expect(stubPush.args[0][1]).to.have.lengthOf(3);
                                expect(stubPush.args[0][1][0]).to.equal("type-1");
                                expect(stubPush.args[0][1][1]).to.equal("type-2");
                                expect(stubPush.args[0][1][2]).to.equal("type-bad-name");
                                expect(msg).to.contain('3 artifacts');
                            } else {
                                expect(stubPush.args[0][1]).to.have.lengthOf(2);
                                expect(stubPush.args[0][1][0].id).to.equal("foo");
                                expect(stubPush.args[0][1][1].id).to.equal("bar");
                                expect(msg).to.contain('2 artifacts');
                            }
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubHashes.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push ignore-timestamps working (path)", function (done) {
                if (switches !== "--types" && switches !== "--layouts" && switches !== "--layout-mappings") {
                    return done();
                }

                const stubList = sinon.stub(helper._fsApi, "listNames");
                stubList.resolves([{name: itemName1, id: "foo", path: "/test/" + itemName1}, {name: itemName2, id: "bar", path: "/test/" + itemName2}, {name: badItem, id: undefined, path: "/test/" + badItem}]);

                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "_pushNameList", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: "foo", path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: "bar", path: itemName2});
                        emitter.emit("pushed", {name: badItem, id: undefined, path: badItem});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--ready", "--ignore-timestamps", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api','-v'])
                    .then(function (msg) {
                        // Verify that the stubs were called once, and that the expected number of items were pushed.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPush).to.have.been.calledOnce;
                        expect(stubPush.args[0][1]).to.have.lengthOf(3);
                        expect(stubPush.args[0][1][0].id).to.equal("foo");
                        expect(stubPush.args[0][1][1].id).to.equal("bar");
                        expect(stubPush.args[0][1][2].id).to.not.exist;
                        expect(msg).to.contain('3 artifacts');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the Stubbed methods.
                        stubList.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push create-only working", function (done) {
                // Stub the helper.pushAllItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to pull the items to the download directory.
                let error;
                const downloadTarget = DOWNLOAD_TARGET;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--create-only", "--dir", downloadTarget, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api','-v'])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts');

                        // Verify that the createOnly option was passed through.
                        expect(stub.firstCall.args[1].createOnly).to.equal(true);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "getRemoteItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push failure", function (done) {
                if (switches !== "-a" ) {
                    return done();
                }

                const PUSH_ERROR = "Error pushing assets, expected by unit test.";
                const stub = sinon.stub(ToolsApi, "getAssetsHelper");
                stub.throws(new Error(PUSH_ERROR));

                // Execute the command to push assets.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--force-override", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected message was returned.
                        expect(err.message).to.contain(PUSH_ERROR);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testPushByManifest (helper, switches, itemName1, itemName2, badItem) {
        describe("CLI-unit-push-manifest-fail", function () {
            it("fails if initializeManifests fails", function (done) {
                const stub = sinon.stub(manifests, "initializeManifests");
                stub.rejects(new Error("Expected failure"));

                // Execute the command to push using a manifest.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, '-v', "--manifest", "foo", '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected message was returned.
                        expect(err.message).to.contain("Expected failure");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("fails if no items in manifest", function (done) {
                const stubInit = sinon.stub(manifests, "initializeManifests");
                stubInit.resolves(true);

                // No types (so no incompatible types).
                const stubSection = sinon.stub(manifests, "getManifestSection");
                stubSection.returns(undefined);

                // Create a stub to return a value for the "tier" key.
                const originalGetProperty = options.getProperty.bind(options);
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "tier") {
                        return "Base";
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Execute the command to push using a manifest.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, '-v', "--manifest", "foo", '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected message was returned.
                        expect(err.message).to.contain("did not contain any artifacts");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubInit.restore();
                        stubSection.restore();
                        stubGet.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("fails if incompatible types in manifest", function (done) {
                const stubInit = sinon.stub(manifests, "initializeManifests");
                stubInit.resolves(true);

                // Sites is an incompatible type.
                const stubSection = sinon.stub(manifests, "getManifestSection");
                stubSection.returns(undefined);
                stubSection.withArgs(sinon.match.any, "sites").returns({id1: {name: "foo", path: "bar"}, id2: {name: "ack", path: "nak"}});

                // Create a stub to return a value for the "tier" key.
                const originalGetProperty = options.getProperty.bind(options);
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "tier") {
                        return "Base";
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Execute the command to push using a manifest.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, '-v', "--manifest", "foo", '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected message was returned.
                        expect(err.message).to.contain("contains artifact types that are not valid for this tenant");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubInit.restore();
                        stubSection.restore();
                        stubGet.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });

        describe("CLI-unit-push-manifest-succeed", function () {
            it("test emitters working", function (done) {
                const stubInit = sinon.stub(manifests, "initializeManifests");
                stubInit.resolves(true);

                const stubSection = sinon.stub(manifests, "getManifestSection");
                stubSection.returns(undefined);
                stubSection.withArgs(sinon.match.any, helper.getArtifactName()).returns({id1: {name: "foo", path: "bar"}, id2: {name: "ack", path: "nak"}});

                const stubManifestSites = sinon.stub(manifests, "getManifestSites");
                stubManifestSites.returns({
                    id1: {id: "id1", name: "foo", status: "ready", contextRoot: "foo"},
                    id2: {id: "id2", name: "bar", status: "ready", contextRoot: "bar"}
                });

                // Stub the helper.pushManifestItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "pushManifestItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, '-v', "--manifest", "foo", '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function (msg) {
                        if (switches === "--pages") {
                            // Verify that the pages stub was called twice (once for
                            // each site), and that the expected message was returned.
                            expect(stubPush).to.have.been.calledTwice;
                            expect(msg).to.contain('4 artifacts successfully');
                            expect(msg).to.contain('4 errors');
                        } else {
                            // Verify that the stub was called once, and that the expected message was returned.
                            expect(stubPush).to.have.been.calledOnce;
                            expect(msg).to.contain('2 artifacts successfully');
                            expect(msg).to.contain('2 errors');
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed method.
                        stubInit.restore();
                        stubSection.restore();
                        stubManifestSites.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("succeeds when no artifact type specified", function (done) {
                const stubInit = sinon.stub(manifests, "initializeManifests");
                stubInit.resolves(true);

                const stubSection = sinon.stub(manifests, "getManifestSection");
                stubSection.returns(undefined);
                stubSection.withArgs(sinon.match.any, helper.getArtifactName()).returns({id1: {name: "foo", path: "bar"}, id2: {name: "ack", path: "nak"}});

                const stubManifestSites = sinon.stub(manifests, "getManifestSites");
                stubManifestSites.returns({
                    id1: {id: "id1", name: "foo", status: "ready", contextRoot: "foo"},
                    id2: {id: "id2", name: "bar", status: "ready", contextRoot: "bar"}
                });

                // Stub the helper.pushManifestItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "pushManifestItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Stub the SitesHelper.pushManifestItems method to return a promise that is resolved after emitting events.
                let stubSitesPush;
                if (switches === "--pages") {
                    stubSitesPush = sinon.stub(ToolsApi.getSitesHelper(), "pushManifestItems", function (context) {
                        // When the stubbed method is called, return a promise that will be resolved asynchronously.
                        const stubDeferred = Q.defer();
                        setTimeout(function () {
                            const emitter = helper.getEventEmitter(context);
                            emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                            emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                            emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                            emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {
                                name: "fail-name",
                                id: "fail-id",
                                path: "fail-path"
                            });
                            stubDeferred.resolve();
                        }, 0);
                        return stubDeferred.promise;
                    });
                }

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", '-v', "--manifest", "foo", '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function (msg) {
                        if (switches === "--pages") {
                            // Verify that the pages stub was called twice (once for
                            // each site), and that the expected message was returned.
                            expect(stubSitesPush).to.have.been.calledOnce;
                            expect(stubPush).to.have.been.calledTwice;
                            expect(msg).to.contain('6 artifacts successfully');
                            expect(msg).to.contain('6 errors');
                        } else {
                            // Verify that the stub was called once, and that the expected message was returned.
                            expect(stubPush).to.have.been.calledOnce;
                            expect(msg).to.contain('2 artifacts successfully');
                            expect(msg).to.contain('2 errors');
                        }
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed method.
                        stubInit.restore();
                        stubSection.restore();
                        stubManifestSites.restore();
                        stubPush.restore();
                        if (stubSitesPush) {
                            stubSitesPush.restore();
                        }

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("succeed even if save mainfest fails", function (done) {
                const stubInit = sinon.stub(manifests, "initializeManifests");
                stubInit.resolves(true);

                const stubSection = sinon.stub(manifests, "getManifestSection");
                stubSection.returns(undefined);
                stubSection.withArgs(sinon.match.any, helper.getArtifactName()).returns({id1: {name: "foo", path: "bar"}, id2: {name: "ack", path: "nak"}});

                const stubManifestSites = sinon.stub(manifests, "getManifestSites");
                stubManifestSites.returns({
                    id1: {id: "id1", name: "foo", status: "ready", contextRoot: "foo"},
                    id2: {id: "id2", name: "bar", status: "ready", contextRoot: "bar"}
                });

                const stubSave = sinon.stub(manifests, "saveManifest");
                stubSave.throws(new Error("Save manifest error expected by unit test."));

                // Stub the helper.pushManifestItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "pushManifestItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, '-v', "--manifest", "foo", '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function (msg) {
                        if (switches === "--pages") {
                            // Verify that the pages stub was called twice (once for
                            // each site), and that the expected message was returned.
                            expect(stubPush).to.have.been.calledTwice;
                            expect(msg).to.contain('4 artifacts successfully');
                            expect(msg).to.contain('4 errors');
                        } else {
                            // Verify that the stub was called once, and that the expected message was returned.
                            expect(stubPush).to.have.been.calledOnce;
                            expect(msg).to.contain('2 artifacts successfully');
                            expect(msg).to.contain('2 errors');
                        }
                        expect(stubSave).to.have.been.calledOnce;
                        expect(stubSave).to.have.been.calledAfter(stubPush);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed method.
                        stubInit.restore();
                        stubSection.restore();
                        stubManifestSites.restore();
                        stubSave.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testPushUrlOption (helper, switches, itemName1, itemName2, badItem) {
        describe("CLI-unit-push-url-option", function () {
            it("test push modified failure, continue on error", function (done) {
                // Stub the helper.pushModifiedItems method to return a rejected promise.
                const PUSH_ERROR = "Error pushing items, expected by unit test.";
                const stubPush = sinon.stub(helper, "pushModifiedItems");
                stubPush.rejects(PUSH_ERROR);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stubPush).to.have.been.calledOnce;
                        expect(err.message).to.contain('1 error');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test push modified failure, don't continue on error", function (done) {
                // Create a stub to return a value for the "continueOnError" key.
                const originalGetProperty = options.getProperty.bind(options);
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "continueOnError") {
                        return false;
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Stub the helper.pushModifiedItems method to return a rejected promise.
                const PUSH_ERROR = "Error pushing items, expected by unit test.";
                const stubPush = sinon.stub(helper, "pushModifiedItems");
                stubPush.rejects(PUSH_ERROR);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stubPush).to.have.been.calledOnce;
                        expect(err.message).to.contain('1 error');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubGet.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test generic push with configured URL", function (done) {
                // Stub the options.getProperty method to return a base URL value.
                const originalGetProperty = options.getProperty.bind(options);
                const BASE_URL = "http://www.ibm.com/foo/api";
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    // When the stubbed method is called with the key for the base URL, return a known value.
                    if (key === "x-ibm-dx-tenant-base-url") {
                        return BASE_URL;
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Stub the prompt.get method to make sure it doesn't get called.
                const stubPrompt = sinon.stub(prompt, "get");

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password"])
                    .then(function (msg) {
                        // Verify that the get stub was called with the expected value.
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-base-url");

                        // Verify that the prompt stub was not called.
                        expect(stubPrompt).to.not.have.been.called;

                        // Verify that the push stub was called once, and that the expected message was returned.
                        expect(stubPush).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts successfully');
                        expect(msg).to.contain('2 errors');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubGet.restore();
                        stubPrompt.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test generic push with configured tenant ID", function (done) {
                // Stub the options.getProperty method to return a tenant ID value.
                const originalGetProperty = options.getProperty.bind(options);
                const TENANT_ID = "1234567890";
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    // When the stubbed method is called with the key for the base URL, return null.
                    // When the stubbed method is called with the key for the tenant ID, return a known value.
                    if (key === "x-ibm-dx-tenant-base-url") {
                        return null;
                    } else if (key === "x-ibm-dx-tenant-id") {
                        return TENANT_ID;
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Stub the prompt.get method to make sure it doesn't get called.
                const stubPrompt = sinon.stub(prompt, "get");

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password"])
                    .then(function (msg) {
                        // Verify that the get stub was called with the expected values.
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-base-url");
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-id");

                        // Verify that the prompt stub was not called.
                        expect(stubPrompt).to.not.have.been.called;

                        // Verify that the push stub was called once, and that the expected message was returned.
                        expect(stubPush).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts successfully');
                        expect(msg).to.contain('2 errors');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubGet.restore();
                        stubPrompt.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test generic push with URL prompt failure", function (done) {
                // Stub the options.getProperty method to return a base URL value.
                const originalGetProperty = options.getProperty.bind(options);
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    // When the stubbed method is called with the key for the base URL or the tenant ID, return null.
                    if (key === "x-ibm-dx-tenant-base-url" || key === "x-ibm-dx-tenant-id") {
                        return null;
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Stub the prompt.get method to pass an error to the callback function.
                const stubPrompt = sinon.stub(prompt, "get");
                const PROMPT_ERROR = "An expected prompt error while executing a unit test.";
                stubPrompt.yields(new Error(PROMPT_ERROR));

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the get stub was called with the expected values.
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-base-url");
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-id");

                        // Verify that the prompt stub was called once.
                        expect(stubPrompt).to.have.been.calledOnce;

                        // Verify that the expected error was specified.
                        expect(err.message).to.equal(PROMPT_ERROR);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubGet.restore();
                        stubPrompt.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test generic push with invalid prompted URL", function (done) {
                // Stub the options.getProperty method to return a base URL value.
                const originalGetProperty = options.getProperty.bind(options);
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    // When the stubbed method is called with the key for the base URL or the tenant ID, return null.
                    if (key === "x-ibm-dx-tenant-base-url" || key === "x-ibm-dx-tenant-id") {
                        return null;
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Stub the prompt.get method to pass an error to the callback function.
                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"url": "Invalid URL"});

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the get stub was called with the expected values.
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-base-url");
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-id");

                        // Verify that the prompt stub was called once.
                        expect(stubPrompt).to.have.been.calledOnce;

                        // Verify that the expected error was specified.
                        expect(err.message).to.contain("not valid");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubGet.restore();
                        stubPrompt.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test generic push with prompted URL", function (done) {
                // Stub the options.getProperty method to return a base URL value.
                const originalGetProperty = options.getProperty.bind(options);
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    // When the stubbed method is called with the key for the base URL or the tenant ID, return null.
                    if (key === "x-ibm-dx-tenant-base-url" || key === "x-ibm-dx-tenant-id") {
                        return null;
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Stub the prompt.get method to pass an error to the callback function.
                const stubPrompt = sinon.stub(prompt, "get");
                const BASE_URL = "http://www.ibm.com/foo/api";
                stubPrompt.yields(null, {"url": BASE_URL});

                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stubPush = sinon.stub(helper, "pushModifiedItems", function (context) {
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password"])
                    .then(function (msg) {
                        // Verify that the get stub was called with the expected values.
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-base-url");
                        expect(stubGet).to.have.been.calledWith(sinon.match.any, "x-ibm-dx-tenant-id");

                        // Verify that the prompt stub was called once.
                        expect(stubPrompt).to.have.been.calledOnce;

                        // Verify that the push stub was called once, and that the expected message was returned.
                        expect(stubPush).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts successfully');
                        expect(msg).to.contain('2 errors');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubGet.restore();
                        stubPrompt.restore();
                        stubPush.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test generic push with invalid specified URL", function (done) {
                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password", "--url", "Invalid URL"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected error was specified.
                        expect(err.message).to.contain("not valid");
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testPushParamFail (helper, switches) {
        describe("CLI-unit-pushing", function () {
            const command = 'push';
            it("test fail extra param", function (done) {
                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, 'foo'])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        try {
                            // Verify that the expected error message was returned.
                            expect(err.message).to.contain('Invalid option');
                        } catch (err) {
                            error = err;
                        }
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test fail bad dir param", function (done) {
                const stub = sinon.stub(fs, "statSync");
                stub.throws("BAD DIRECTORY");

                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, '--dir', '....'])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        try {
                            // Verify that the stub was called once, and that the expected error message was returned.
                            expect(stub).to.have.been.calledOnce;
                            expect(err.message).to.contain("....");
                            expect(err.message).to.contain("does not exist");
                        } catch (err) {
                            error = err;
                        }
                    })
                    .finally(function () {
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test fail all and named", function (done) {
                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, '--url', 'http://foo.bar/api', '--user', 'foo', '--password', 'password', '--all-authoring','--named','red'])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        try {
                            // Verify that the expected error message was returned.
                            expect(err.message).to.equal('The --named option can only be used for a single artifact type.');
                        } catch (err) {
                            error = err;
                        }
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test fail named and path param", function (done) {
                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, '--url', 'http://foo.bar/api', '--user', 'foo', '--password', 'password', '--named', 'foo', '--path', 'foo'])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        try {
                            // Verify that the expected error message was returned.
                            expect(err.message).to.equal('The --named and --path options cannot both be specified.');
                        } catch (err) {
                            error = err;
                        }
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test fail named and ready param", function (done) {
                if (switches === "--pages") {
                    // The named and ready options can be specified together for pages.
                    return done();
                }

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, '--url', 'http://foo.bar/api', '--user', 'foo', '--password', 'password', '--named', 'foo', '--ready'])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected error message was returned.
                        expect(err.message).to.equal('The --named and --ready options cannot both be specified.');
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test fail named and draft param", function (done) {
                if (switches === "--pages") {
                    // The named and draft options can be specified together for pages.
                    return done();
                }

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, '--url', 'http://foo.bar/api', '--user', 'foo', '--password', 'password', '--named', 'foo', '--draft'])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected error message was returned.
                        expect(err.message).to.equal('The --named and --draft options cannot both be specified.');
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test fail named and ignore param", function (done) {
                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, '--url', 'http://foo.bar/api', '--user', 'foo', '--password', 'password', '--named', 'foo', '-I', '--path', 'foo'])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        try {
                            // Verify that the expected error message was returned.
                            expect(err.message).to.equal('The --named and --Ignore-timestamps options cannot both be specified.');
                        } catch (err) {
                            error = err;
                        }
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if both ready and manifest specified", function (done) {
                const stubInit = sinon.stub(manifests, "initializeManifests");
                stubInit.resolves(true);

                const stubSection = sinon.stub(manifests, "getManifestSection");
                stubSection.returns(undefined);
                stubSection.withArgs(sinon.match.any, helper.getArtifactName()).returns({id1: {name: "foo", path: "bar"}, id2: {name: "ack", path: "nak"}});

                const stubManifestSites = sinon.stub(manifests, "getManifestSites");
                stubManifestSites.returns({
                    id1: {id: "id1", name: "foo", status: "ready", contextRoot: "foo"},
                    id2: {id: "id2", name: "bar", status: "ready", contextRoot: "bar"}
                });

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, "--ready", "--manifest", "foo", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain("The --ready and --manifest options cannot both be specified.");
                    })
                    .catch (function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        stubInit.restore();
                        stubSection.restore();
                        stubManifestSites.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if both draft and manifest specified", function (done) {
                const stubInit = sinon.stub(manifests, "initializeManifests");
                stubInit.resolves(true);

                const stubSection = sinon.stub(manifests, "getManifestSection");
                stubSection.returns(undefined);
                stubSection.withArgs(sinon.match.any, helper.getArtifactName()).returns({id1: {name: "foo", path: "bar"}, id2: {name: "ack", path: "nak"}});

                const stubManifestSites = sinon.stub(manifests, "getManifestSites");
                stubManifestSites.returns({
                    id1: {id: "id1", name: "foo", status: "ready", contextRoot: "foo"},
                    id2: {id: "id2", name: "bar", status: "ready", contextRoot: "bar"}
                });

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, "--draft", "--manifest", "foo", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain("The --draft and --manifest options cannot both be specified.");
                    })
                    .catch (function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        stubInit.restore();
                        stubSection.restore();
                        stubManifestSites.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test fails when initialization fails", function (done) {
                const INIT_ERROR = "API initialization failed, as expected by unit test.";
                const stub = sinon.stub(ToolsApi, "getInitializationErrors");
                stub.returns([new Error(INIT_ERROR)]);

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, command, switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stub should have been called and the expected error should have been returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(err.message).to.contain(INIT_ERROR);
                    })
                    .catch (function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testPushWithSchedule (helper, switches, itemName1, itemName2, badItem) {
        const DOWNLOAD_TARGET = UnitTest.DOWNLOAD_DIR; // Relative to the CLI directory.
        describe("CLI-unit-pushing", function () {

            before(function (done) {

                stubNextSchedules.resolves([{"_id":"c6efbfff-db50-4cb4-80a2-816bde7930e2","_rev":"2-0296077a4b72f8fcd011d4510e2c354e","classification":"tenant","deliveryDomainId":"default","repeatSchedule":"none","docId":"102a4692-60c8-476d-b615-d227f6103a33","releaseDate":"2018-10-05T02:50:00.000Z","name":"onet"}]);

                done();
            });

            after(function (done) {

                stubNextSchedules.resolves(null);

                done();
            });

            it("test generic push with publishing schedule set, is working", function (done) {
                let savedOpts;
                // Stub the helper.pushModifiedItems method to return a promise that is resolved after emitting events.
                const stub = sinon.stub(helper, "pushModifiedItems", function (context, opts) {
                    savedOpts = opts;
                    // When the stubbed method is called, return a promise that will be resolved asynchronously.
                    const stubDeferred = Q.defer();
                    setTimeout(function () {
                        const emitter = helper.getEventEmitter(context);
                        emitter.emit("pushed", {name: itemName1, id: undefined, path: itemName1});
                        emitter.emit("pushed", {name: itemName2, id: undefined, path: itemName2});
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, badItem);
                        emitter.emit("pushed-error", {message: "This failure was expected by the unit test"}, {name: "fail-name", id: "fail-id", path: "fail-path"});
                        stubDeferred.resolve();
                    }, 0);
                    return stubDeferred.promise;
                });
                stubNextSchedules.resolves([{"_id":"c6efbfff-db50-4cb4-80a2-816bde7930e2","_rev":"2-0296077a4b72f8fcd011d4510e2c354e","classification":"tenant","deliveryDomainId":"default","repeatSchedule":"none","docId":"102a4692-60c8-476d-b615-d227f6103a33","releaseDate":"2018-10-05T02:50:00.000Z","name":"onet"}]);

                // Execute the command to push the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "push", switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        expect(savedOpts).to.exist;

                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('2 artifacts');
                        expect(msg).to.contain('2 errors');
                        // TODO - add a way to verify a warning was logged that the pushed items may be waiting on a schedule
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "pushModifiedItems" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }
}

module.exports = PushUnitTest;
