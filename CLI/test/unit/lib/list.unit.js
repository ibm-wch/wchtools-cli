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
 * Unit tests for the list command.
 */
"use strict";

// Require the super classes for this class.
const UnitTest = require("./base.cli.unit.js");

// Require the node modules used in this test file.
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const diff = require("diff");
const prompt = require("prompt");
const Q = require("q");
const sinon = require("sinon");
const ToolsApi = require("wchtools-api");
const toolsCli = require("../../../wchToolsCli");
const BaseCommand = require("../../../lib/baseCommand");
const mkdirp = require("mkdirp");
const manifests = ToolsApi.getManifests();

// Require the local modules that will be stubbed, mocked, and spied.
const options = require("wchtools-api").getOptions();

class ListUnitTest extends UnitTest {
    constructor () {
        super();
    }

    run (helper, switches, itemName1, itemName2, badItem) {
        const self = this;
        describe("Unit tests for list  " + switches, function () {
            let stubLogin;
            before(function (done) {
                stubLogin = sinon.stub(self.getLoginHelper(), "login");
                stubLogin.resolves("Adam.iem@mailinator.com");

                done();
            });

            after(function (done) {
                stubLogin.restore();
                done();
            });

            // Run each of the tests defined in this class.
            self.testList(helper, switches, itemName1, itemName2, badItem);
            self.testListServer(helper, switches, itemName1, itemName2, badItem);
            self.testListModified(helper, switches, itemName1, itemName2, badItem);
            self.testListAll(helper, switches, itemName1, itemName2, badItem);
            self.testListParamFail(helper, switches);
        });
    }

    testList (helper, switches, itemName1, itemName2, badItem) {
        describe("CLI-unit-listing", function () {
            it("test list no options working", function (done) {
                let error;

                // Create an fs.existsSync stub to return false, in case any spurious virtual folders still exist.
                const stubExists = sinon.stub(fs, "existsSync");
                stubExists.returns(false);

                // Create a stub to return prompt values.
                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"url": "http://www.ibm.com/foo/api"});

                // Execute the command to list the default local items.
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list"])
                    .then(function (msg) {
                        // Verify that the expected message was returned.
                        expect(msg).to.contain('artifacts listed');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods.
                        stubExists.restore();
                        stubPrompt.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list debug option working", function (done) {
                let error;

                // Create an fs.existsSync stub to return false, in case any spurious virtual folders still exist.
                const stubExists = sinon.stub(fs, "existsSync");
                stubExists.returns(false);

                // Create a stub to return prompt values.
                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"url": "http://www.ibm.com/foo/api"});

                // Execute the command to list the default local items.
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", "--debug"])
                    .then(function (msg) {
                        // Verify that the expected message was returned.
                        expect(msg).to.contain('artifacts listed');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Clear the debug flag so that it doesn't affect subsequent tests.
                        toolsCli.program.debug = false;

                        // Restore the original methods.
                        stubExists.restore();
                        stubPrompt.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list no mod param working", function (done) {
                const stub = sinon.stub(helper, "listModifiedLocalItemNames");
                stub.resolves([{name: itemName1, id: "foo", path: itemName1}, {name: itemName2, id: "bar", path: itemName2}, {name: badItem, id: undefined, path: badItem}]);

                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--dir", "./", "-q", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "listModifiedLocalItemNames" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list when base URL not defined", function (done) {
                const stubList = sinon.stub(helper, "listModifiedLocalItemNames");
                stubList.resolves([{name: itemName1, id: "foo", path: itemName1}, {name: itemName2, id: "bar", path: itemName2}, {name: undefined, id: badItem, path: badItem}]);

                // Create a stub to return a value for the "x-ibm-dx-tenant-base-url" key.
                const originalGetRelevantOption = options.getRelevantOption;
                const stubGet = sinon.stub(options, "getRelevantOption", function (context, opts, key) {
                    if (key === "x-ibm-dx-tenant-base-url") {
                        return null;
                    } else {
                        return originalGetRelevantOption(context, opts, key);
                    }
                });

                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed method.
                        stubList.restore();
                        stubGet.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list both types of assets", function (done) {
                if (switches !== "-a" ) {
                    return done();
                }

                const stub = sinon.stub(helper, "listModifiedLocalItemNames");
                stub.resolves([{name: itemName1, id: "foo", path: itemName1}, {name: itemName2, id: "bar", path: itemName2}, {name: badItem, id: badItem, path: undefined}]);

                // Execute the command to list the local assets.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", "-aw", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "listModifiedLocalItemNames" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list failure", function (done) {
                if (switches !== "-a" ) {
                    return done();
                }

                const LIST_ERROR = "Error listing assets, expected by unit test.";
                const stub = sinon.stub(ToolsApi, "getAssetsHelper");
                stub.throws(new Error(LIST_ERROR));

                // Execute the command to list the local assets.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(err.message).to.contain(LIST_ERROR);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "listModifiedLocalItemNames" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("fails if initializeManifests fails", function (done) {
                const stub = sinon.stub(manifests, "initializeManifests");
                stub.returns(false);

                // Execute the command to push using a manifest.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, '--write-manifest', 'foo', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // Verify that the expected message was returned.
                        expect(err.message).to.contain("could not be read");
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

    testListServer (helper, switches, itemName1, itemName2, badItem) {
        describe("CLI-unit-listing", function () {
            it("test list server error", function (done) {
                // Create a stub to return a value for the "username" key.
                const originalGetProperty = options.getProperty;
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "username") {
                        return "foo";
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Set the password for this test only.
                const originalPassword = process.env.WCHTOOLS_PASSWORD;
                process.env.WCHTOOLS_PASSWORD = "password";

                const stubList = sinon.stub(helper, "listModifiedRemoteItemNames");
                const LIST_ERROR = "Error listing artifacts - expected by unit test.";
                stubList.rejects(LIST_ERROR);

                const spyConsole = sinon.spy(BaseCommand, "displayToConsole");

                // Execute the command to list the items on the server.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--server", "--del", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 0');

                        // Verify that the spy was called once with the expected message.
                        expect(spyConsole).to.have.been.called;
                        expect(spyConsole.args[1][0]).to.contain(LIST_ERROR);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods and values.
                        stubGet.restore();
                        stubList.restore();
                        spyConsole.restore();
                        process.env.WCHTOOLS_PASSWORD = originalPassword;

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list server quiet error", function (done) {
                // Create a stub to return a value for the "username" key.
                const originalGetProperty = options.getProperty;
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "username") {
                        return "foo";
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Set the password for this test only.
                const originalPassword = process.env.WCHTOOLS_PASSWORD;
                process.env.WCHTOOLS_PASSWORD = "password";

                const LIST_ERROR = "Error listing artifacts - expected by unit test.";
                const stubList = sinon.stub(helper, "listModifiedRemoteItemNames", function () {
                    const deferred = Q.defer();
                    deferred.reject(LIST_ERROR);  // Reject with a string instead of an error.
                    return deferred.promise;
                });

                const spyConsole = sinon.spy(BaseCommand, "displayToConsole");

                // Execute the command to list the items on the server.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--quiet", "--server", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 0');

                        // Verify that the spy was not called.
                        expect(spyConsole).to.not.have.been.called;
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods and values.
                        stubGet.restore();
                        stubList.restore();
                        spyConsole.restore();
                        process.env.WCHTOOLS_PASSWORD = originalPassword;

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list server working with username and password defined", function (done) {
                // Create a stub to return a value for the "username" key.
                const originalGetProperty = options.getProperty;
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "username") {
                        return "foo";
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Set the password for this test only.
                const originalPassword = process.env.WCHTOOLS_PASSWORD;
                process.env.WCHTOOLS_PASSWORD = "password";

                const stubList = sinon.stub(helper, "listModifiedRemoteItemNames");
                stubList.resolves([itemName1, itemName2, badItem]);

                // Execute the command to list the items on the server.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--server", "-q", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods and values.
                        stubGet.restore();
                        stubList.restore();
                        process.env.WCHTOOLS_PASSWORD = originalPassword;

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list server working when save manifest fails", function (done) {
                // Create a stub to return a value for the "username" key.
                const originalGetProperty = options.getProperty;
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "username") {
                        return "foo";
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Set the password for this test only.
                const originalPassword = process.env.WCHTOOLS_PASSWORD;
                process.env.WCHTOOLS_PASSWORD = "password";

                const stubList = sinon.stub(helper, "listRemoteItemNames");
                stubList.resolves([itemName1, itemName2, badItem]);

                const stubInit = sinon.stub(manifests, "initializeManifests");
                stubInit.returns(true);

                const stubSave = sinon.stub(manifests, "saveManifest");
                stubSave.throws(new Error("Save manifest error expected by unit test."));

                // Execute the command to list the items on the server.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--server", "-q", "--write-manifest", "foo", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubSave).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods and values.
                        stubGet.restore();
                        stubList.restore();
                        stubInit.restore();
                        stubSave.restore();
                        process.env.WCHTOOLS_PASSWORD = originalPassword;

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list server working with no username and password defined", function (done) {
                // Create a stub to return a value for the "username" key.
                const originalGetProperty = options.getProperty;
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "username") {
                        return undefined;
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Set the password for this test only.
                const originalPassword = process.env.WCHTOOLS_PASSWORD;
                process.env.WCHTOOLS_PASSWORD = "";

                const stubList = sinon.stub(helper, "listModifiedRemoteItemNames");
                stubList.resolves([itemName1, itemName2, badItem]);

                // Create a stub to return prompt values.
                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"username": "foo", "password": "password"});

                // Execute the command to list the items on the server.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--server", "-q", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPrompt).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods and values.
                        stubGet.restore();
                        stubList.restore();
                        stubPrompt.restore();
                        process.env.WCHTOOLS_PASSWORD = originalPassword;

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list server working with password defined but no username", function (done) {
                // Create a stub to return a value for the "username" key.
                const originalGetProperty = options.getProperty;
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "username") {
                        return undefined;
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Set the password for this test only.
                const originalPassword = process.env.WCHTOOLS_PASSWORD;
                process.env.WCHTOOLS_PASSWORD = "password";

                const stubList = sinon.stub(helper, "listModifiedRemoteItemNames");
                stubList.resolves([itemName1, itemName2, badItem]);

                // Create a stub to return prompt values.
                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"username": "foo"});

                // Execute the command to list the items on the server.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--server", "-q", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPrompt).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods and values.
                        stubGet.restore();
                        stubList.restore();
                        stubPrompt.restore();
                        process.env.WCHTOOLS_PASSWORD = originalPassword;

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list server working with username defined but no password", function (done) {
                // Create a stub to return a value for the "username" key.
                const originalGetProperty = options.getProperty;
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "username") {
                        return "foo";
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Set the password for this test only.
                const originalPassword = process.env.WCHTOOLS_PASSWORD;
                process.env.WCHTOOLS_PASSWORD = "";

                const stubList = sinon.stub(helper, "listModifiedRemoteItemNames");
                stubList.resolves([itemName1, itemName2, badItem]);

                // Create a stub to return prompt values.
                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"password": "password"});

                // Execute the command to list the items on the server.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--server", "-q", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPrompt).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods and values.
                        stubGet.restore();
                        stubList.restore();
                        stubPrompt.restore();
                        process.env.WCHTOOLS_PASSWORD = originalPassword;

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("test list server working with prompt error", function (done) {
                // Create a stub to return a value for the "username" key.
                const originalGetProperty = options.getProperty;
                const stubGet = sinon.stub(options, "getProperty", function (context, key) {
                    if (key === "username") {
                        return "";
                    } else {
                        return originalGetProperty(context, key);
                    }
                });

                // Set the password for this test only.
                const originalPassword = process.env.WCHTOOLS_PASSWORD;
                process.env.WCHTOOLS_PASSWORD = "";

                const stubList = sinon.stub(helper, "listModifiedRemoteItemNames");
                stubList.resolves([itemName1, itemName2, badItem]);

                // Create a stub to return prompt values.
                const stubPrompt = sinon.stub(prompt, "get");
                const PROMPT_ERROR = "Error prompting for user name and password, expected by unit test.";
                stubPrompt.yields(new Error(PROMPT_ERROR), {});

                // Create a spy to make sure the console warn function is called.
                const spyConsole = sinon.spy(console, "warn");

                // Execute the command to list the items on the server.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--server", "-q", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stubList).to.have.been.calledOnce;
                        expect(stubPrompt).to.have.been.calledOnce;
                        expect(spyConsole).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the original methods and values.
                        stubGet.restore();
                        stubList.restore();
                        stubPrompt.restore();
                        spyConsole.restore();
                        process.env.WCHTOOLS_PASSWORD = originalPassword;

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testListModified (helper, switches, itemName1, itemName2, badItem) {
        describe("CLI-unit-listing", function () {
            it("test list mod param working", function (done) {
                const stub = sinon.stub(helper, "listModifiedLocalItemNames");
                stub.resolves([itemName1, itemName2, badItem]);

                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--mod", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "listModifiedLocalItemNames" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testListAll (helper, switches, itemName1, itemName2, badItem) {
        describe("CLI-unit-listing", function() {
            it("test list all param working", function (done) {
                const stub = sinon.stub(helper, "listLocalItemNames");
                stub.resolves([itemName1, itemName2, badItem]);

                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--ignore-timestamps", "-q", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (msg) {
                        // Verify that the stub was called once, and that the expected message was returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(msg).to.contain('artifacts listed 3');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's "listLocalItemNames" method.
                        stub.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testListParamFail (helper, switches) {
        describe("CLI-unit-listing", function() {
            it("test fail extra param", function (done) {
                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "foo", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        try {
                            // Verify that the expected error message was returned.
                            expect(err.message).to.contain('Invalid argument');
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
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, "--dir", "....", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        try {
                            // The stub should only have been called once, and the expected error should be returned.
                            expect(stub).to.have.been.calledOnce;
                            expect(err.message).to.contain('....');
                            expect(err.message).to.contain('does not exist');
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

            it("test fail path and not asset param", function (done) {
                // Execute the command to list the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", "-c", "--path", "./", "--user", "foo", "--password", "password", "--url", "http://foo.bar/api"])
                    .then(function (/*msg*/) {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        try {
                            // Verify that the expected error message was returned.
                            expect(err.message).to.contain('Invalid options, path can only be used for web assets.');
                        } catch (err) {
                            error = err;
                        }
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if initialization fails", function (done) {
                const INIT_ERROR = "API initialization failed, as expected by unit test.";
                const stub = sinon.stub(ToolsApi, "getInitializationErrors");
                stub.returns([new Error(INIT_ERROR)]);

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "list", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
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
}

module.exports = ListUnitTest;
