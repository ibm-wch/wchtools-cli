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
"use strict";

const JSONPathBasedItemFS = require("./JSONPathBasedItemFS.js");
const utils = require("./utils/utils.js");
const i18n = utils.getI18N(__dirname, ".json", "en");

const singleton = Symbol();
const singletonEnforcer = Symbol();

class LayoutMappingsFS extends JSONPathBasedItemFS {

    constructor(enforcer) {
        if (enforcer !== singletonEnforcer) {
            throw i18n.__("singleton_construct_error", {classname: "LayoutMappingsFS"});
        }
        super("layout-mappings", "layout-mappings", ".json");
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new LayoutMappingsFS(singletonEnforcer);
        }
        return this[singleton];
    }
}

module.exports = LayoutMappingsFS;
