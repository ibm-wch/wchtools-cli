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
"use strict";

const JSONItemREST = require("./JSONItemREST.js");
const utils = require("./utils/utils.js");
const i18n = utils.getI18N(__dirname, ".json", "en");

const singleton = Symbol();
const singletonEnforcer = Symbol();

class CategoriesREST extends JSONItemREST {

    constructor(enforcer) {
        if (enforcer !== singletonEnforcer) {
            throw i18n.__("singleton_construct_error", {classname: "CategoriesREST"});
        }
        // We must use /views/by-modified for the allUriSuffix because it returns categories from the entire hierarchy, not
        // just the top level taxonomies as the standard GET /authoring/v1/categories would.
        super("categories", "/authoring/v1/categories", "/views/by-modified", "/views/by-modified");
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new CategoriesREST(singletonEnforcer);
        }
        return this[singleton];
    }
}

module.exports = CategoriesREST;
