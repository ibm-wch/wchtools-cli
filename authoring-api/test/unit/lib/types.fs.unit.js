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
 * Unit tests for the ContentsREST object.
 */
"use strict";

// Require the super classes for this class.
const UnitTest = require("./base.unit.js");
const TypesUnitTest = require("./types.unit.js");
const BaseFsUnit = require("./base.fs.unit.js");

// Require the node modules used in this test file.
const fs = require("fs");
const path = require("path");
const requireSubvert = require('require-subvert')(__dirname);
const sinon = require("sinon");

// Require the local module being tested.
const TypesFS = require(UnitTest.API_PATH + "lib/itemTypesFS.js");
const typesFS = TypesFS.instance;

class TypesFsUnitTest extends BaseFsUnit {
    constructor() {
        super();
    }
    run() {
        super.run(typesFS, TypesUnitTest.VALID_TYPE_1, TypesUnitTest.VALID_TYPE_2 );
    }

    // Override the base FS test to handle the difference between reading a single directory and recursive read.
    listNamesReadFileError (fsApi, itemName1, itemName2, done) {
        const FAKE_EXTENSION = ".json";
        const stubGetExtension = sinon.stub(fsApi, "getExtension");
        stubGetExtension.returns(FAKE_EXTENSION);

        const stubRead = sinon.stub(fs, "readFileSync");
        stubRead.throws(new Error("Error reading file, as expected by unit test."));

        this.addTestDouble(stubGetExtension);

        // Call the method being tested.
        let error;

        // Set the current working directory to the "valid resources" directory.
        fsApi.listNames(context, {"workingDir": UnitTest.API_PATH + UnitTest.VALID_RESOURCES_DIRECTORY})
            .then(function (items) {
                // Verify that the expected values are returned.
                expect(items).to.have.lengthOf(2);
                expect(items[0].path).to.be.oneOf([itemName1, itemName2]);
                expect(items[0].name).to.not.exist;
                expect(items[0].id).to.not.exist;
                expect(items[1].path).to.be.oneOf([itemName1, itemName2]);
                expect(items[1].name).to.not.exist;
                expect(items[1].id).to.not.exist;
            })
            .catch (function (err) {
                // NOTE: A failed expectation from above will be handled here.
                // Pass the error to the "done" function to indicate a failed test.
                error = err;
            })
            .finally(function () {
                // Must restore the stubRead stub before calling restoreOptions().
                stubRead.restore();

                // Restore the default options.
                UnitTest.restoreOptions(context);

                // Call mocha's done function to indicate that the test is over.
                done(error);
            });
    }

    // Override the base FS test to handle the difference between names (types return a path instead of a name).
    listNamesSuccess (fsApi, itemName1, itemName2, done) {
        const FAKE_EXTENSION = ".json";
        const stubGetExtension = sinon.stub(fsApi, "getExtension");
        stubGetExtension.returns(FAKE_EXTENSION);

        this.addTestDouble(stubGetExtension);

        // Call the method being tested.
        let error;

        // Set the current working directory to the "valid resources" directory.
        fsApi.listNames(context, {"workingDir": UnitTest.API_PATH + UnitTest.VALID_RESOURCES_DIRECTORY})
            .then(function (items) {
                // Verify that the expected values are returned.
                expect(items).to.have.lengthOf(2);
                expect(items[0].path).to.be.oneOf([itemName1, itemName2]);
                expect(items[1].path).to.be.oneOf([itemName1, itemName2]);
                expect(items[0].name).to.be.oneOf(["cli-test", "cli-test-existing"]);
                expect(items[1].name).to.be.oneOf(["cli-test", "cli-test-existing"]);

                // Only one of the local test items has an id.
                expect(items[0].id || items[1].id).to.exist;
                expect(items[0].id && items[1].id).to.not.exist;
            })
            .catch (function (err) {
                // NOTE: A failed expectation from above will be handled here.
                // Pass the error to the "done" function to indicate a failed test.
                error = err;
            })
            .finally(function () {
                // Restore the default options.
                // noinspection JSUnresolvedFunction
                UnitTest.restoreOptions(context);

                // Call mocha's done function to indicate that the test is over.
                done(error);
            });
    }

    // Override the base FS test to handle the difference between names (types return a path instead of a name).
    listNamesAdditionalPropertiesSuccess (fsApi, itemName1, itemName2, done) {
        // Create a stub that will return a list of item names from the recursive function.
        const stub = sinon.stub(fs, "readdir");
        const err = null;
        stub.yields(err, [itemName1, itemName2]);

        const FAKE_EXTENSION = ".json";
        const stubGetExtension = sinon.stub(fsApi, "getExtension");
        stubGetExtension.returns(FAKE_EXTENSION);

        this.addTestDouble(stub);
        this.addTestDouble(stubGetExtension);

        // Call the method being tested.
        let error;

        // Set the current working directory to the "valid resources" directory. Specify two additional properties, one that exists and one that doesn't.
        fsApi.listNames(context, {"workingDir": UnitTest.API_PATH + UnitTest.VALID_RESOURCES_DIRECTORY, "additionalItemProperties": ["status", "foo"]})
            .then(function (items) {
                // Verify that the get stub was called once with the lookup URI.
                expect(stub).to.have.been.calledOnce;

                // Verify that the expected values are returned.
                expect(items).to.have.lengthOf(2);
                expect(items[0].path).to.be.oneOf([itemName1, itemName2]);
                expect(items[1].path).to.be.oneOf([itemName1, itemName2]);
                expect(items[0].name).to.be.oneOf(["cli-test", "cli-test-existing"]);
                expect(items[1].name).to.be.oneOf(["cli-test", "cli-test-existing"]);
                expect(items[0].status).to.be.oneOf(["ready", "draft"]);
                expect(items[1].status).to.be.oneOf(["ready", "draft"]);

                // Only one of the local test items has an id.
                expect(items[0].id || items[1].id).to.exist;
                expect(items[0].id && items[1].id).to.not.exist;
            })
            .catch (function (err) {
                // NOTE: A failed expectation from above will be handled here.
                // Pass the error to the "done" function to indicate a failed test.
                error = err;
            })
            .finally(function () {
                // noinspection JSUnresolvedFunction
                // Restore the default options.
                UnitTest.restoreOptions(context);

                // Call mocha's done function to indicate that the test is over.
                done(error);
            });
    }

    // Override the base FS test to test list by path.
    listNamesByPath (fsApi, itemName1, itemName2, done) {
        // Create a stub that will return a list of item names from the recursive function.
        const stubDir = sinon.stub();
        const err = null;
        const metadataPath1 = UnitTest.API_PATH + UnitTest.VALID_RESOURCES_DIRECTORY + "types/bar/foo1.json";
        const metadataPath2 = UnitTest.API_PATH + UnitTest.VALID_RESOURCES_DIRECTORY + "types/bar/foo2.json";
        const metadataPath3 = UnitTest.API_PATH + UnitTest.VALID_RESOURCES_DIRECTORY + "types/foo/bar1.json";
        const metadataPath4 = UnitTest.API_PATH + UnitTest.VALID_RESOURCES_DIRECTORY + "types/foo/bar2.json";
        stubDir.yields(err, [metadataPath1, metadataPath2, metadataPath3, metadataPath4]);

        // Subvert the "recursive-readdir" module with the specified stub.
        requireSubvert.subvert("recursive-readdir", stubDir);

        // Reload JSONPathBasedItemFS and itemTypesFS, so that fsApi gets will use the subverted recursive-readdir.
        requireSubvert.require(UnitTest.API_PATH + "lib/JSONPathBasedItemFS.js");
        fsApi = requireSubvert.require(UnitTest.API_PATH + "lib/itemTypesFS.js").instance;

        // Create an fs.readFileSync stub that will return an empty object.
        const stubFile = sinon.stub(fs, "readFileSync");
        stubFile.returns("{}");

        const FAKE_EXTENSION = ".json";
        const stubGetExtension = sinon.stub(fsApi, "getExtension");
        stubGetExtension.returns(FAKE_EXTENSION);

        this.addTestDouble(stubFile);
        this.addTestDouble(stubGetExtension);

        // Call the method being tested.
        let error;

        // Set the current working directory to the "valid resources" directory.
        fsApi.listNames(context, {"workingDir": UnitTest.API_PATH + UnitTest.VALID_RESOURCES_DIRECTORY, filterPath: "foo"})
            .then(function (items) {
                // Verify that the dir stub was called once and the file stub was called twice.
                expect(stubDir).to.have.been.calledOnce;
                expect(stubFile).to.have.been.calledTwice;

                // Verify that the expected values are returned.
                expect(items).to.have.lengthOf(2);
                expect(items[0].path).to.contain("/foo/");
                expect(items[1].path).to.contain("/foo/");
            })
            .catch (function (err) {
                // NOTE: A failed expectation from above will be handled here.
                // Pass the error to the "done" function to indicate a failed test.
                error = err;
            })
            .finally(function () {
                // Restore the subverted functions.
                requireSubvert.cleanUp();

                // Reload JSONPathBasedItemFS and itemTypesFS, so that fsApi gets the original recursive-readdir.
                require(UnitTest.API_PATH + "lib/JSONPathBasedItemFS.js");
                fsApi = require(UnitTest.API_PATH + "lib/itemTypesFS.js").instance;

                // Restore the default options.
                UnitTest.restoreOptions(context);

                // Call mocha's done function to indicate that the test is over.
                done(error);
            });
    }
}

module.exports = TypesFsUnitTest;
