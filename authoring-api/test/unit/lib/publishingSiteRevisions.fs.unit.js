/*
 Copyright 2017 IBM Corporation

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
 * Unit tests for the PublishingSiteRevisionsFS object.
 */
"use strict";

// Require the super classes for this class.
const UnitTest = require("./base.unit.js");
const PublishingSiteRevisionsUnitTest = require("./publishingSiteRevisions.unit.js");
const BaseFsUnit = require("./base.fs.unit.js");

// Require the local module being tested.
const fsApi = require(UnitTest.API_PATH + "lib/publishingSiteRevisionsFS.js").instance;

class PublishingSiteRevisionsFsUnitTest extends BaseFsUnit {
    constructor() {
        super();
    }
    run() {
        super.run(fsApi, PublishingSiteRevisionsUnitTest.VALID_PUBLISHING_SITEREVISION_1, PublishingSiteRevisionsUnitTest.VALID_PUBLISHING_SITEREVISION_2);
    }
}

module.exports = PublishingSiteRevisionsFsUnitTest;
