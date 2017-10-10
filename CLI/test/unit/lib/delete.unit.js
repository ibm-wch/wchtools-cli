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
 * Unit tests for the delete command.
 */
"use strict";

// Require the super classes for this class.
const UnitTest = require("./base.cli.unit.js");

// Require the node modules used in this test file.
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const diff = require("diff");
const sinon = require("sinon");
const ToolsApi = require("wchtools-api");
const utils = ToolsApi.getUtils();
const toolsCli = require("../../../wchToolsCli");
const mkdirp = require("mkdirp");
const prompt = require("prompt");

class DeleteUnitTest extends UnitTest {
    constructor () {
        super();
    }

    run (helper, switches, itemName1) {
        const self = this;
        describe("Unit tests for delete  " + switches, function () {
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
            if (helper.supportsDeleteById()) {
                self.testDeleteById(helper, switches, itemName1);
            }
            if (helper.supportsDeleteByPath()) {
                self.testDeleteByPath(helper, switches, itemName1);
            }
            if (helper.supportsDeleteByPathRecursive()) {
                self.testDeleteBySearch(helper, switches, itemName1);
            }
            self.testDeleteParamFail(helper, switches, itemName1);
        });
    }

    testDeleteById (helper, switches, itemName1) {
        describe("Deleting an item by id", function () {
            it("should fail if the helper fails", function (done) {
                const DELETE_ERROR = "Delete by id failed, as expected by unit test.";
                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--id', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stub should only have been called once, and the expected error should have been returned.
                        expect(stubDelete).to.have.been.calledOnce;
                        expect(err.message).to.contain(DELETE_ERROR);
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should succeed if the helper succeeds", function (done) {
                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.resolves({id: itemName1});

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--id', itemName1])
                    .then(function (msg) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubDelete).to.have.been.calledOnce;
                        expect(msg).to.contain('Deleted');
                        expect(msg).to.contain(itemName1);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testDeleteByPath (helper, switches, itemName1) {
        describe("Deleting an item by path", function () {
            it("should fail if the helper get fails", function (done) {
                const GET_ERROR = "Get by path failed, as expected by unit test.";
                const stubGet = sinon.stub(helper, "getRemoteItemByPath");
                stubGet.rejects(GET_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stub should only have been called once, and the expected error should have been returned.
                        expect(stubGet).to.have.been.calledOnce;
                        expect(err.message).to.contain(GET_ERROR);
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubGet.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if the helper delete fails", function (done) {
                const stubGet = sinon.stub(helper, "getRemoteItemByPath");
                stubGet.resolves({path: itemName1});

                const DELETE_ERROR = "Delete by path failed, as expected by unit test.";
                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stubs should only have been called once, and the expected error should have been returned.
                        expect(stubGet).to.have.been.calledOnce;
                        expect(stubDelete).to.have.been.calledOnce;
                        expect(err.message).to.contain(DELETE_ERROR);
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubGet.restore();
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should succeed if the helper succeeds", function (done) {
                const stubGet = sinon.stub(helper, "getRemoteItemByPath");
                stubGet.resolves({path: itemName1});

                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.resolves({path: itemName1});

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function (msg) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubDelete).to.have.been.calledOnce;
                        expect(msg).to.contain('Deleted');
                        expect(msg).to.contain(itemName1);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });
        });
    }

    testDeleteBySearch (helper, switches, itemName1) {
        describe("Deleting items by search", function () {
            it("should fail if no matching artifacts", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([]);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stub should only have been called once, and the expected error should have been returned.
                        expect(stubSearch).to.have.been.calledOnce;
                        expect(err.message).to.contain("no artifacts that match");
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should succeed for a single artifact", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}]);

                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.resolves(itemName1);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function (msg) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubDelete).to.have.been.calledOnce;
                        expect(msg).to.contain('Deleted');
                        expect(msg).to.contain(itemName1);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail when single delete fails", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}]);

                const DELETE_ERROR = "Delete failure expected by unit test.";
                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stubs should only have been called once, and the expected error should have been returned.
                        expect(stubSearch).to.have.been.calledOnce;
                        expect(stubDelete).to.have.been.calledOnce;
                        expect(err.message).to.contain(itemName1);
                        expect(err.message).to.contain(DELETE_ERROR);
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should not delete - preview", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const spyDelete = sinon.spy(helper, "deleteRemoteItem");

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-P', '--path', itemName1])
                    .then(function () {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubSearch).to.have.been.calledOnce;
                        expect(spyDelete).to.not.have.been.called;
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        spyDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should succeed when some deletes fail - quiet", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const DELETE_ERROR = "Delete failure expected by unit test.";
                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.onFirstCall().resolves(itemName1);
                stubDelete.onSecondCall().rejects(DELETE_ERROR);
                stubDelete.onThirdCall().rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-q', '--path', itemName1])
                    .then(function (msg) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubDelete).to.have.been.calledThrice;
                        expect(msg).to.contain('Complete');
                        expect(msg).to.contain('Deleted 1 artifact');
                        expect(msg).to.contain('Encountered 2 errors');
                        expect(msg).to.contain('wchtools-cli.log');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should succeed when all deletes fail - quiet", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const DELETE_ERROR = "Delete failure expected by unit test.";
                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.onFirstCall().rejects(DELETE_ERROR);
                stubDelete.onSecondCall().rejects(DELETE_ERROR);
                stubDelete.onThirdCall().rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-q', '--path', itemName1])
                    .then(function (msg) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubDelete).to.have.been.calledThrice;
                        expect(msg).to.contain('Complete');
                        expect(msg).to.contain('Encountered 3 errors');
                        expect(msg).to.contain('wchtools-cli.log');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should succeed for multiple artifacts - quiet", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.onFirstCall().resolves(itemName1);
                stubDelete.onSecondCall().resolves(itemName1 + "2");
                stubDelete.onThirdCall().resolves(itemName1 + "3");

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--verbose', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-q', '--path', itemName1])
                    .then(function (msg) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubDelete).to.have.been.calledThrice;
                        expect(msg).to.contain('Complete');
                        expect(msg).to.contain('Deleted 3 artifacts');
                        expect(msg).to.not.contain('errors');
                        expect(msg).to.not.contain('wchtools-cli.log');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail for multiple items if throttledAll fails", function (done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const DELETE_ERROR = "Delete failed, as expected by unit test.";
                const stubThrottle = sinon.stub(utils, "throttledAll");
                stubThrottle.rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-q', '--path', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stubs should only have been called once, and the expected error should have been returned.
                        expect(stubSearch).to.have.been.calledOnce;
                        expect(stubThrottle).to.have.been.calledOnce;
                        expect(err.message).to.contain(DELETE_ERROR);
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubSearch.restore();
                        stubThrottle.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail for multiple items if throttledAll fails - verbose", function (done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const DELETE_ERROR = "Delete failed, as expected by unit test.";
                const stubThrottle = sinon.stub(utils, "throttledAll");
                stubThrottle.rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--verbose', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '-q', '--path', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stubs should only have been called once, and the expected error should have been returned.
                        expect(stubSearch).to.have.been.calledOnce;
                        expect(stubThrottle).to.have.been.calledOnce;
                        expect(err.message).to.contain(DELETE_ERROR);
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubSearch.restore();
                        stubThrottle.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should succeed for multiple artifacts - prompt", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"test": "y", "test2": "y", "test3": "n"});

                const DELETE_ERROR = "Delete failure expected by unit test.";
                const stubDelete = sinon.stub(helper, "deleteRemoteItem");
                stubDelete.onFirstCall().resolves(itemName1);
                stubDelete.onSecondCall().rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function (msg) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubSearch).to.have.been.calledOnce;
                        expect(stubPrompt).to.have.been.calledOnce;
                        expect(stubDelete).to.have.been.calledTwice;
                        expect(msg).to.contain('Complete');
                        expect(msg).to.contain('Deleted 1 artifact');
                        expect(msg).to.contain('Encountered 1 error');
                        expect(msg).to.contain('wchtools-cli.log');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        stubPrompt.restore();
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail for multiple prompted artifacts if the delete fails", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"test": "y", "test2": "y", "test3": "n"});

                const DELETE_ERROR = "Delete failed, as expected by unit test.";
                const stubThrottle = sinon.stub(utils, "throttledAll");
                stubThrottle.rejects(DELETE_ERROR);

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubSearch).to.have.been.calledOnce;
                        expect(stubPrompt).to.have.been.calledOnce;
                        expect(stubThrottle).to.have.been.calledOnce;
                        expect(err.message).to.contain(DELETE_ERROR);
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        stubPrompt.restore();
                        stubThrottle.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should succeed for none confirmed - prompt", function(done) {
                const stubSearch = sinon.stub(helper, "searchRemote");
                stubSearch.resolves([{"path": itemName1, "id": UnitTest.DUMMY_ID}, {"path": itemName1 + "2", "id": UnitTest.DUMMY_ID + "2"}, {"path": itemName1 + "3", "id": UnitTest.DUMMY_ID + "3"}]);

                const stubPrompt = sinon.stub(prompt, "get");
                stubPrompt.yields(null, {"test": "n", "test2": "n", "test3": "n"});

                const stubDelete = sinon.stub(helper, "deleteRemoteItem");

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function (msg) {
                        // The stub should only have been called once, and the expected message should have been returned.
                        expect(stubSearch).to.have.been.calledOnce;
                        expect(stubPrompt).to.have.been.calledOnce;
                        expect(stubDelete).to.not.have.been.called;
                        expect(msg).to.contain('No artifacts were deleted');
                    })
                    .catch(function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the helper's stubbed methods.
                        stubSearch.restore();
                        stubPrompt.restore();
                        stubDelete.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if the search fails", function (done) {
                const stub = sinon.stub(helper, "searchRemote");
                const SEARCH_FAIL = "The remote searcxh failed, as expected by a unit test.";
                stub.rejects(new Error(SEARCH_FAIL));

                // Execute the command to delete the items to the download directory.
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password','password', '--url', 'http://foo.bar/api', '--path', itemName1])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stub should only have been called once, and the expected error should have been returned.
                        expect(stub).to.have.been.calledOnce;
                        expect(err.message).to.contain(SEARCH_FAIL);
                    })
                    .catch(function (err) {
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

        it("should fail if the dir parameter is invalid", function (done) {
            const stub = sinon.stub(fs, "statSync");
            const STAT_ERROR = new Error("BAD DIRECTORY");
            STAT_ERROR.code = "Invalid directory";
            stub.throws(STAT_ERROR);
            let error;
            toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--path', 'foo', '--dir', '....'])
                .then(function (/*msg*/) {
                    // This is not expected. Pass the error to the "done" function to indicate a failed test.
                    error = new Error("The command should have failed.");
                })
                .catch(function (err) {
                    // The stub should only have been called once, and the expected error should have been returned.
                    expect(stub).to.have.been.calledOnce;
                    expect(err.message).to.contain(STAT_ERROR.code);
                    expect(err.message).to.contain('....');
                })
                .catch(function (err) {
                    error = err;
                })
                .finally(function () {
                    // Restore the stubbed method.
                    stub.restore();

                    // Call mocha's done function to indicate that the test is over.
                    done(error);
                });
        });
    }

    testDeleteParamFail (helper, switches, itemName1) {
        describe("Deleting items", function () {
            it("should fail if there is an extra param", function (done) {
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--named', itemName1, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api', 'foo'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The expected error should have been returned.
                        expect(err.message).to.contain('Invalid argument');
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if no id, path, or named parameter is specified", function (done) {
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The expected error should have been returned.
                        expect(err.message).to.contain('Either --id or --path must be specified.');
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if no artifact type parameter is specified", function (done) {
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", '--path', 'red', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The expected error should have been returned.
                        expect(err.message).to.contain('Delete currently only supports deleting a web asset, layout or layout mapping');
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if multiple artifact type parameters are specified", function (done) {
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", '-wlm', '--path', 'red', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The expected error should have been returned.
                        expect(err.message).to.contain('one artifact type at a time');
                    })
                    .catch (function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if both path and id parameters are specified", function (done) {
                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--id', 'red', '--path', 'red', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The expected error should have been returned.
                        expect(err.message).to.contain('Both --id and --path');
                    })
                    .catch (function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if delete by id is not supported", function (done) {
                const stubId = sinon.stub(helper, "supportsDeleteById");
                stubId.returns(false);

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--id', 'red', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stub should have been called and the expected error should have been returned.
                        expect(stubId).to.have.been.calledOnce;
                        expect(err.message).to.contain('--id argument is not supported');
                    })
                    .catch (function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed method.
                        stubId.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if delete by path is not supported", function (done) {
                const stubPath = sinon.stub(helper, "supportsDeleteByPath");
                stubPath.returns(false);

                const stubRecursive = sinon.stub(helper, "supportsDeleteByPathRecursive");
                stubRecursive.returns(false);

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--path', 'red', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stubs should have been called and the expected error should have been returned.
                        expect(stubPath).to.have.been.calledOnce;
                        expect(stubRecursive).to.have.been.calledOnce;
                        expect(err.message).to.contain('--path argument is not supported');
                    })
                    .catch (function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubPath.restore();
                        stubRecursive.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if recursive delete by path is not supported", function (done) {
                const stubPath = sinon.stub(helper, "supportsDeleteByPath");
                stubPath.returns(true);

                const stubRecursive = sinon.stub(helper, "supportsDeleteByPathRecursive");
                stubRecursive.returns(false);

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--path', 'red', '--recursive', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
                    .then(function () {
                        // This is not expected. Pass the error to the "done" function to indicate a failed test.
                        error = new Error("The command should have failed.");
                    })
                    .catch(function (err) {
                        // The stubs should have been called and the expected error should have been returned.
                        expect(stubPath).to.have.been.calledOnce;
                        expect(stubRecursive).to.have.been.calledOnce;
                        expect(err.message).to.contain('--recursive argument is not supported');
                    })
                    .catch (function (err) {
                        // Pass the error to the "done" function to indicate a failed test.
                        error = err;
                    })
                    .finally(function () {
                        // Restore the stubbed methods.
                        stubPath.restore();
                        stubRecursive.restore();

                        // Call mocha's done function to indicate that the test is over.
                        done(error);
                    });
            });

            it("should fail if initialization fails", function (done) {
                const INIT_ERROR = "API initialization failed, as expected by unit test.";
                const stub = sinon.stub(ToolsApi, "getInitializationErrors");
                stub.returns([new Error(INIT_ERROR)]);

                let error;
                toolsCli.parseArgs(['', UnitTest.COMMAND, "delete", switches, '--path', 'red', '--user', 'foo', '--password', 'password', '--url', 'http://foo.bar/api'])
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

module.exports = DeleteUnitTest;
