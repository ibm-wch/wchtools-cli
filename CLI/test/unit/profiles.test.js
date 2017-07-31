/*
Copyright IBM Corporation 2017

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
 * Run the unit tests for the publishing profiles objects.
 */
"use strict";

const helper = require("wchtools-api").getPublishingProfilesHelper();
const rest = require("../../../authoring-api/lib/publishingProfilesREST.js").instance;
const fs = require("../../../authoring-api/lib/publishingProfilesFS.js").instance;

// PublishingSources Tests with CLI
const BASE_NAME = 'publishingProfiles';
const PullUnitTest = require("./lib/pull.unit.js");
const pullUnitTest = new PullUnitTest();
pullUnitTest.run(helper, rest, fs, '--publishing-profiles', BASE_NAME + '-1', BASE_NAME + '-2', BASE_NAME + '-bad-name', '_smd.json');

const PushUnitTest = require("./lib/push.unit.js");
const pushUnitTest = new PushUnitTest();
pushUnitTest.run(helper, rest, fs, '--publishing-profiles', BASE_NAME + '-1', BASE_NAME + '-2', BASE_NAME + '-bad-name', '_smd.json');

const ListUnitTest = require("./lib/list.unit.js");
const listUnitTest = new ListUnitTest();
listUnitTest.run(helper, '--publishing-profiles', BASE_NAME + '-1', BASE_NAME + '-2', BASE_NAME + '-bad-name');
