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

const JSONPathBasedItemHelper = require("./JSONPathBasedItemHelper.js");
const rest = require("./lib/layoutsREST").instance;
const fS = require("./lib/layoutsFS").instance;
const utils = require("./lib/utils/utils.js");
const i18n = utils.getI18N(__dirname, ".json", "en");

const singleton = Symbol();
const singletonEnforcer = Symbol();

class LayoutsHelper extends JSONPathBasedItemHelper {
    /**
     * The constructor for a LayoutsHelper object. This constructor implements a singleton pattern, and will fail
     * if called directly. The static instance property can be used to get the singleton instance.
     *
     * @param {Symbol} enforcer - A Symbol that must match a local Symbol to create the new object.
     */
    constructor (enforcer) {
        if (enforcer !== singletonEnforcer) {
            throw i18n.__("singleton_construct_error", {classname: "LayoutsHelper"});
        }
        super(rest, fS, "layouts");
    }

    /**
     * The instance property can be used to to get the singleton instance for this class.
     */
    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new LayoutsHelper(singletonEnforcer);
        }
        return this[singleton];
    }

    /**
     * Get the name to be displayed for the given item.  Path by default for layouts and layout mappings.
     *
     * @param {Object} item - The item for which to get the name.
     *
     * @returns {String} The name to be displayed for the given item.
     */
    getName (item) {
        return this.getPathName(item);
    }

    /**
     * Determine whether the helper supports deleting items by id.
     *
     * @override
     */
    supportsDeleteById() {
        return true;
    }

    /**
     * Determine whether the helper supports deleting items by path.
     *
     * @override
     */
    supportsDeleteByPath() {
        return true;
    }

    /**
     * Determine whether the helper supports searching by path.
     */
    supportsSearchByPath () {
        // Return false as the layouts search does not appear to accept a path filter.
        return false;
    }

    /**
     * Return a set of extra keys to be ignored for this artifact type.  This should be used to return a list
     * of synthetic fields per artifact type.
     *
     * @return {Array} the names of the JSON elements to be ignored.
     */
    getExtraIgnoreKeys() {
        return ["thumbnail/url"];
    }
}

/**
 * Export the LayoutsHelper class.
 */
module.exports = LayoutsHelper;
