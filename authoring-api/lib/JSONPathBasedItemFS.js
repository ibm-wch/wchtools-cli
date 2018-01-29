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

const BaseFS = require("./BaseFS.js");
const JSONItemFS = require("./JSONItemFS.js");

const fs = require("fs");
const Q = require("q");
const utils = require("./utils/utils.js");
const recursiveReadDir = require("recursive-readdir");

class JSONPathBasedItemFS extends JSONItemFS {

    constructor(serviceName, folderName, extension) {
        super(serviceName, folderName, extension);
    }

    /**
     * Gets the item with the given path from the local filesystem
     * Rely on JSONItemFS.getItem, BUT add the path field back in after reading
     * from disk so that it will be saved in authoring service with the path val.
     *
     * @param {Object} context The API context to be used for this operation.
     * @param {string} name - The name of the item
     * @param {Object} opts Any override options to be used for this operation.
     *
     * @returns {Q.Promise} A promise that resolves with the requested item. The promise
     *                    will reject if the item doesn't exist.
     */
    getItem(context, name, opts) {
        const fsObject = this;
        return super.getItem(context, name, opts)
            .then(function(item) {
                // Set the path (property to be set is based on class.)
                fsObject.setMutablePath(item, (name && name.path) ? name.path : name);
                return item;
            });
    }

    /*
     * Clear the mutable path value.
     *
     * @param {Object} item The item with a mutable path.
     *
     * @protected
     */
    clearMutablePath(item) {
        delete item.path;
    }

    /*
     * Set the mutable path value.
     *
     * @param {Object} item The item with a mutable path.
     * @param {String} path The path to be set.
     *
     * @protected
     */
    setMutablePath(item, path) {
        item.path = path;
    }

    /**
     * Prune the item by deleting the properties that should not be stored on disk
     * @param {Object} item The item being pruned.
     * @param {Object} opts Any override options to be used for this operation.
     *
     * @override
     */
     pruneItem(item, opts) {
         delete item.created;
         delete item.creator;
         delete item.creatorId;
         delete item.lastModifier;
         delete item.lastModifierId;
         delete item.lastModified;

         // Clear the path (property to be cleared is based on class.)
         this.clearMutablePath(item);
     }

    /**
     * Returns the file name to use for the provided item.
     *
     * @param {Object} item the item to get the filename for
     *
     * @returns {String} the file name to use for the provided item
     *
     * @override
     */
    getFileName (item) {
        if (item) {
            if (item.path) {
                return BaseFS.getValidFileName(item.path);
            } else if (item.name) {
                return BaseFS.getValidFileName(item.name);
            }
        }
    }

    /**
     * Get a list of all items stored in the working dir.
     *
     * @param {Object} context The API context to be used by the listt operation.
     * @param {Object} opts Any override options to be used for this operation.
     *
     * @returns {Q.Promise} A promise that resolves with a list of all items stored in the working dir.
     *                      There is no guarantee that the names refer to a valid file.
     */
    listNames(context, opts) {
        const fsObject = this;
        const artifactDir = this.getPath(context, opts);
        return Q.Promise(function(resolve, reject) {
            const path = fsObject.getPath(context, opts);
            if (fs.existsSync(path)) {
                recursiveReadDir(path, function(err, files) {
                    if (err) {
                        reject(err);
                    } else {
                        const extension = fsObject.getExtension();
                        const names = files.filter(function(file) {
                            return file.endsWith(extension);
                        }).map(function(file) {
                            let id;
                            let name;
                            try {
                                const item = JSON.parse(fs.readFileSync(file));
                                id = item.id;
                                name = item.name;
                            } catch (err) {
                                // ignore: we couldn't open the file to read the id/name
                            }
                            return {
                                id: id,
                                name: name,
                                path: utils.getRelativePath(artifactDir, file)
                            };
                        });
                        resolve(names);
                    }
                });
            } else {
                // Silently return an empty array.
                resolve([]);
            }
        });
    }
}

module.exports = JSONPathBasedItemFS;
