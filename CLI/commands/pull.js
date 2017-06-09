/*
Copyright IBM Corporation 2016, 2017

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

const BaseCommand = require("../lib/baseCommand");

const toolsApi = require("wchtools-api");
const utils = toolsApi.utils;
const login = toolsApi.login;
const Q = require("q");
const ora = require("ora");

const i18n = utils.getI18N(__dirname, ".json", "en");

const PREFIX = "========== ";
const SUFFIX = " ===========";
const PullingTypes =                PREFIX + i18n.__('cli_pull_pulling_types') + SUFFIX;
const PullingAssets =               PREFIX + i18n.__('cli_pull_pulling_assets') + SUFFIX;
const PullingContentAssets =        PREFIX + i18n.__('cli_pull_pulling_content_assets') + SUFFIX;
const PullingWebAssets =            PREFIX + i18n.__('cli_pull_pulling_web_assets') + SUFFIX;
const PullingImageProfiles =        PREFIX + i18n.__('cli_pull_pulling_image_profiles') + SUFFIX;
const PullingContents =             PREFIX + i18n.__('cli_pull_pulling_content') + SUFFIX;
const PullingCategories =           PREFIX + i18n.__('cli_pull_pulling_categories') + SUFFIX;
const PullingRenditions =           PREFIX + i18n.__('cli_pull_pulling_renditions') + SUFFIX;
const PullingPublishingProfiles =   PREFIX + i18n.__('cli_pull_pulling_profiles') + SUFFIX;
const PullingPublishingSources =    PREFIX + i18n.__('cli_pull_pulling_sources') + SUFFIX;
const PullingPublishingSiteRevisions = PREFIX + i18n.__('cli_pull_pulling_site_revisions') + SUFFIX;

class PullCommand extends BaseCommand {
    /**
     * Create a PullCommand object.
     *
     * @param {object} program A Commander program object.
     */
    constructor (program) {
        super(program);

        // The directory specified by the "dir" command line option should be created.
        this.setCreateDir(true);

        // Only pull modified artifacts by default.
        this._modified = true;
    }

    /**
     * Pull the specified artifacts.
     */
    doPull (continueOnError) {
        const self = this;
        self._continueOnError = continueOnError;

        // Handle the cases of either no artifact type options being specified, or the "all" option being specified.
        self.handleArtifactTypes();

        // Make sure the "dir" option can be handled successfully.
        if (!self.handleDirOption()) {
            return;
        }

        // Make sure the url has been specified.
        self.handleUrlOption()
            .then(function () {
                // Make sure the user name and password have been specified.
                return self.handleAuthenticationOptions();
            })
            .then(function () {
                // Login using the current options.
                return login.login(self.getApiOptions());
            })
            .then(function () {
                // Start the display of the pulled artifacts.
                self.startDisplay();

                return self.pullArtifacts();
            })
            .then(function () {
                // End the display of the pulled artifacts.
                self.endDisplay();
            })
            .catch(function (err) {
                self.errorMessage(err.message);
            })
            .finally(function () {
                // Reset the command line options once the command has completed.
                self.resetCommandLineOptions();

                // Handle any necessary cleanup.
                self.handleCleanup();
            });
    }

    /**
     * Start the display for the pulled artifacts.
     */
    startDisplay () {
        // Display the console message that the list is starting.
        BaseCommand.displayToConsole( i18n.__(this._modified ? 'cli_pull_modified_started' : 'cli_pull_started'));

        // Start the spinner (progress indicator) if we're not doing verbose output.
        if (!this.getCommandLineOption("verbose")) {
            this.spinner = ora();
            this.spinner.start();
        }
    }

    /**
     * End the display for the pulled artifacts.
     */
    endDisplay () {
        const logger = this.getLogger();
        logger.info(PREFIX + i18n.__(this._modified ? 'cli_pull_modified_pulling_complete' : 'cli_pull_pulling_complete') + SUFFIX);
        if (this.spinner) {
            this.spinner.stop();
        }

        // FUTURE This is not translation compatible. We need to convert this to a string with substitution parameters.
        let message = i18n.__(this._modified ? 'cli_pull_modified_complete' : 'cli_pull_complete');
        if (this._artifactsCount > 0) {
            message += " " + i18n.__n('cli_pull_success', this._artifactsCount);
        }
        if (this._artifactsError > 0) {
            message += " " + i18n.__n('cli_pull_errors', this._artifactsError);

            // Set the exit code for the process, to indicate that some artifacts had pull errors.
            process.exitCode = this.CLI_ERROR_EXIT_CODE;
        }
        if ((this._artifactsCount > 0 || this._artifactsError > 0) && !this.getCommandLineOption("verbose")) {
            message += " " + i18n.__('cli_log_non_verbose');
        }
        if (this._artifactsCount === 0 && this._artifactsError === 0) {
            if (this.getCommandLineOption("ignoreTimestamps")) {
                message = i18n.__('cli_pull_complete_ignore_timestamps_nothing_pulled');
            } else {
                message = i18n.__('cli_pull_complete_nothing_pulled');
            }
        }
        logger.info(message);
        this.successMessage(message);
    }

    /**
     * Pull the artifacts for the types specified on the command line.
     *
     * @return {Q.Promise} A promise that resolves when all artifacts of the specified types have been pulled.
     */
    pullArtifacts () {
        const deferred = Q.defer();
        const self = this;

        self.readyToPull()
            .then(function () {
                if (self.getCommandLineOption("imageProfiles")) {
                    return self.handlePullPromise(self.pullImageProfiles());
                }
            })
            .then(function () {
                if (self.getCommandLineOption("categories")) {
                    return self.handlePullPromise(self.pullCategories());
                }
            })
            .then(function () {
                if (self.getCommandLineOption("assets") || self.getCommandLineOption("webassets")) {
                    return self.handlePullPromise(self.pullAssets());
                }
            })
            .then(function() {
                if (self.getCommandLineOption("renditions")) {
                    return self.handlePullPromise(self.pullRenditions());
                }
            })
            .then(function () {
                if (self.getCommandLineOption("types")) {
                    return self.handlePullPromise(self.pullTypes());
                }
            })
            .then(function () {
                if (self.getCommandLineOption("content")) {
                    return self.handlePullPromise(self.pullContent());
                }
            })
            .then(function () {
                if (self.getCommandLineOption("publishingProfiles")) {
                    return self.handlePullPromise(self.pullProfiles());
                }
            })
            .then(function () {
                if (self.getCommandLineOption("publishingSiteRevisions")) {
                    return self.handlePullPromise(self.pullSiteRevisions());
                }
            })
            .then(function () {
                if (self.getCommandLineOption("publishingSources")) {
                    return self.handlePullPromise(self.pullSources());
                }
            })
            .then(function () {
                deferred.resolve();
            })
            .catch(function (err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    /**
     * Prepare to pull the artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved when the command is ready to pull artifacts.
     */
    readyToPull () {
        const deferred = Q.defer();

        if (this.getOptionArtifactCount() > 0) {
            deferred.resolve();
        } else {
            deferred.reject("At least one artifact type must be specified.");
        }

        return deferred.promise;
    }

    /**
     * Handle the given pull promise according to whether errors should be returned to the caller.
     *
     * @param {Q.Promise} promise A promise to pull some artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved when the pull has completed.
     */
    handlePullPromise (promise) {
        const self = this;
        if (self._continueOnError) {
            // Create a nested promise. Any error thrown by this promise will be logged, but not returned to the caller.
            const deferredPull = Q.defer();
            promise
                .then(function () {
                    deferredPull.resolve();
                })
                .catch(function (err) {
                    const logger = self.getLogger();
                    logger.error(err.message);
                    deferredPull.resolve();
                });
            return deferredPull.promise;
        } else {
            // Any error thrown by this promise will be returned to the caller.
            return promise;
        }
    }

    /**
     * Pull the asset artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the asset artifacts.
     */
    pullAssets () {
        const helper = toolsApi.getAssetsHelper();
        const self = this;

        if (this.getCommandLineOption("assets") && this.getCommandLineOption("webassets")) {
            this.getLogger().info(PullingAssets);
            this.setApiOption(helper.ASSET_TYPES, helper.ASSET_TYPES_BOTH);
        } else if (this.getCommandLineOption("assets")) {
            this.getLogger().info(PullingContentAssets);
            this.setApiOption(helper.ASSET_TYPES, helper.ASSET_TYPES_CONTENT_ASSETS);
        } else {
            this.getLogger().info(PullingWebAssets);
            this.setApiOption(helper.ASSET_TYPES, helper.ASSET_TYPES_WEB_ASSETS);
        }

        // The api emits an event when an item is pulled, so we log it for the user.
        const assetPulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_asset_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", assetPulled);

        // The api can emit a warning event when an item is pulled, so we log it for the user.
        const assetPulledWarning = function (name) {
            self.getLogger().warn(i18n.__('cli_pull_asset_digest_mismatch', {asset: name}));
            self.warningMessage(i18n.__('cli_pull_asset_digest_mismatch', {asset: name}));
        };
        helper.getEventEmitter().on("pulled-warning", assetPulledWarning);

        // The api emits an event when there is a pull error, so we log it for the user.
        const assetPulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_asset_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", assetPulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", assetPulled);
            helper.getEventEmitter().removeListener("pulled-warning", assetPulledWarning);
            helper.getEventEmitter().removeListener("pulled-error", assetPulledError);
        });

        const apiOptions = this.getApiOptions();
        let assetPromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            assetPromise = helper.pullAllItems(apiOptions);
        } else {
            assetPromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return assetPromise;
    }

    /**
     * Pull image profiles
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the asset artifacts.
     */
    pullImageProfiles () {
        const helper = toolsApi.getImageProfilesHelper();
        const self = this;

        self.getLogger().info(PullingImageProfiles);

        // The api emits an event when an item is pulled, so we log it for the user.
        const imageProfilePulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_image_profile_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", imageProfilePulled);

        // The api emits an event when there is a pull error, so we log it for the user.
        const imageProfilePulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_image_profile_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", imageProfilePulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", imageProfilePulled);
            helper.getEventEmitter().removeListener("pulled-error", imageProfilePulledError);
        });

        // If ignoring timestamps then pull all sources. Otherwise only pull modified sources (the default behavior).
        const apiOptions = this.getApiOptions();
        let imageProfilesPromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            imageProfilesPromise = helper.pullAllItems(apiOptions);
        } else {
            imageProfilesPromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return imageProfilesPromise;
    }

    /**
     * Pull the rendition artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the rendition artifacts.
     */
    pullRenditions () {
        const helper = toolsApi.getRenditionsHelper();
        const self = this;

        self.getLogger().info(PullingRenditions);

        // The api emits an event when an item is pulled, so we log it for the user.
        const renditionPulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_rendition_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", renditionPulled);

        // The api emits an event when there is a pull error, so we log it for the user.
        const renditionPulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_rendition_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", renditionPulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", renditionPulled);
            helper.getEventEmitter().removeListener("pulled-error", renditionPulledError);
        });

        // If ignoring timestamps then pull all sources. Otherwise only pull modified sources (the default behavior).
        const apiOptions = this.getApiOptions();
        let renditionPromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            renditionPromise = helper.pullAllItems(apiOptions);
        } else {
            renditionPromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return renditionPromise;
    }

    /**
     * Pull the category artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the category artifacts.
     */
    pullCategories () {
        const helper = toolsApi.getCategoriesHelper();
        const self = this;

        self.getLogger().info(PullingCategories);

        // The api emits an event when an item is pulled, so we log it for the user.
        const categoryPulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_cat_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", categoryPulled);

        // The api emits an event when there is a pull error, so we log it for the user.
        const categoryPulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_cat_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", categoryPulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", categoryPulled);
            helper.getEventEmitter().removeListener("pulled-error", categoryPulledError);
        });

        // If ignoring timestamps then pull all sources. Otherwise only pull modified sources (the default behavior).
        const apiOptions = this.getApiOptions();
        let categoryPromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            categoryPromise = helper.pullAllItems(apiOptions);
        } else {
            categoryPromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return categoryPromise;
    }

    /**
     * Pull the type artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the type artifacts.
     */
    pullTypes () {
        const helper = toolsApi.getItemTypeHelper();
        const self = this;

        self.getLogger().info(PullingTypes);

        // The api emits an event when an item is pulled, so we log it for the user.
        const itemTypePulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_type_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", itemTypePulled);

        // The api emits an event when there is a pull error, so we log it for the user.
        const itemTypePulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_type_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", itemTypePulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", itemTypePulled);
            helper.getEventEmitter().removeListener("pulled-error", itemTypePulledError);
        });

        // If ignoring timestamps then pull all sources. Otherwise only pull modified sources (the default behavior).
        const apiOptions = this.getApiOptions();
        let typePromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            typePromise = helper.pullAllItems(apiOptions);
        } else {
            typePromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return typePromise;
    }

    /**
     * Pull the content artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the content artifacts.
     */
    pullContent () {
        const helper = toolsApi.getContentHelper();
        const self = this;

        self.getLogger().info(PullingContents);

        // The api emits an event when an item is pulled, so we log it for the user.
        const contentPulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_content_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", contentPulled);

        // The api emits an event when there is a pull error, so we log it for the user.
        const contentPulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_content_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", contentPulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", contentPulled);
            helper.getEventEmitter().removeListener("pulled-error", contentPulledError);
        });

        // If ignoring timestamps then pull all sources. Otherwise only pull modified sources (the default behavior).
        const apiOptions = this.getApiOptions();
        let contentPromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            contentPromise = helper.pullAllItems(apiOptions);
        } else {
            contentPromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return contentPromise;
    }

    /**
     * Pull the source artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the source artifacts.
     */
    pullSources () {
        const helper = toolsApi.getPublishingSourcesHelper();
        const self = this;

        self.getLogger().info(PullingPublishingSources);

        // The api emits an event when an item is pulled, so we log it for the user.
        const sourcePulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_source_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", sourcePulled);

        // The api emits an event when there is a pull error, so we log it for the user.
        const sourcePulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_source_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", sourcePulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", sourcePulled);
            helper.getEventEmitter().removeListener("pulled-error", sourcePulledError);
        });

        // If ignoring timestamps then pull all sources. Otherwise only pull modified sources (the default behavior).
        const apiOptions = this.getApiOptions();
        let sourcePromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            sourcePromise = helper.pullAllItems(apiOptions);
        } else {
            sourcePromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return sourcePromise;
    }

    /**
     * Pull the publishing profile artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the profile artifacts.
     */
    pullProfiles () {
        const helper = toolsApi.getPublishingProfilesHelper();
        const self = this;

        self.getLogger().info(PullingPublishingProfiles);

        // The api emits an event when an item is pulled, so we log it for the user.
        const profilePulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_profile_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", profilePulled);

        // The api emits an event when there is a pull error, so we log it for the user.
        const profilePulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_profile_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", profilePulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", profilePulled);
            helper.getEventEmitter().removeListener("pulled-error", profilePulledError);
        });

        // If ignoring timestamps then pull all sources. Otherwise only pull modified sources (the default behavior).
        const apiOptions = this.getApiOptions();
        let profilesPromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            profilesPromise = helper.pullAllItems(apiOptions);
        } else {
            profilesPromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return profilesPromise;
    }

    /**
     * Pull the publishing site revision artifacts.
     *
     * @returns {Q.Promise} A promise that is resolved with the results of pulling the site revision artifacts.
     */
    pullSiteRevisions () {
        const helper = toolsApi.getPublishingSiteRevisionsHelper();
        const self = this;

        self.getLogger().info(PullingPublishingSiteRevisions);

        // The api emits an event when an item is pulled, so we log it for the user.
        const siteRevisionPulled = function (name) {
            self._artifactsCount++;
            self.getLogger().info(i18n.__('cli_pull_site_revision_pulled', {name: name}));
        };
        helper.getEventEmitter().on("pulled", siteRevisionPulled);

        // The api emits an event when there is a pull error, so we log it for the user.
        const siteRevisionPulledError = function (error, name) {
            self._artifactsError++;
            self.getLogger().error(i18n.__('cli_pull_site_revision_pull_error', {name: name, message: error.message}));
        };
        helper.getEventEmitter().on("pulled-error", siteRevisionPulledError);

        // Cleanup function to remove the event listeners.
        this.addCleanup(function () {
            helper.getEventEmitter().removeListener("pulled", siteRevisionPulled);
            helper.getEventEmitter().removeListener("pulled-error", siteRevisionPulledError);
        });

        // If ignoring timestamps then pull all sources. Otherwise only pull modified sources (the default behavior).
        const apiOptions = this.getApiOptions();
        let artifactPromise;
        if (this.getCommandLineOption("ignoreTimestamps")) {
            artifactPromise = helper.pullAllItems(apiOptions);
        } else {
            artifactPromise = helper.pullModifiedItems(apiOptions);
        }

        // Return the promise for the results of the action.
        return artifactPromise;
    }

    /**
     * Reset the command line options for this command.
     *
     * NOTE: This is used to reset the values when the command is invoked by the mocha testing. Normally the process
     * ends after the command is executed and so these values go away. But when running the tests, the process isn't
     * terminated and these values need to be reset.
     */
    resetCommandLineOptions () {
        this.setCommandLineOption("types", undefined);
        this.setCommandLineOption("assets", undefined);
        this.setCommandLineOption("webassets", undefined);
        this.setCommandLineOption("imageProfiles", undefined);
        this.setCommandLineOption("content", undefined);
        this.setCommandLineOption("categories", undefined);
        this.setCommandLineOption("renditions", undefined);
        this.setCommandLineOption("publishingSources", undefined);
        this.setCommandLineOption("publishingProfiles", undefined);
        this.setCommandLineOption("publishingSiteRevisions", undefined);

        super.resetCommandLineOptions();
    }
}

function pullCommand (program) {
    program
        .command('pull')
        .description(i18n.__('cli_pull_description'))
        .option('-t --types',            i18n.__('cli_pull_opt_types'))
        .option('-a --assets',           i18n.__('cli_pull_opt_assets'))
        .option('-w --webassets',        i18n.__('cli_pull_opt_web_assets'))
        .option('-i --image-profiles',   i18n.__('cli_pull_opt_image_profiles'))
        .option('-c --content',          i18n.__('cli_pull_opt_content'))
        .option('-C --categories',       i18n.__('cli_pull_opt_categories'))
        .option('-r --renditions',       i18n.__('cli_pull_opt_renditions'))
        .option('-P --publishing-profiles',i18n.__('cli_pull_opt_profiles'))
        .option('-R --publishing-site-revisions',i18n.__('cli_pull_opt_site_revisions'))
        .option('-s --publishing-sources',i18n.__('cli_pull_opt_sources'))
        .option('-v --verbose',          i18n.__('cli_opt_verbose'))
        .option('-I --ignore-timestamps',i18n.__('cli_pull_opt_ignore_timestamps'))
        .option('-A --all-authoring',    i18n.__('cli_pull_opt_all'))
        .option('--dir <dir>',           i18n.__('cli_pull_opt_dir'))
        .option('--user <user>',         i18n.__('cli_opt_user_name'))
        .option('--password <password>', i18n.__('cli_opt_password'))
        .option('--url <url>',           i18n.__('cli_opt_url', {"product_name": utils.ProductName}))
        .action(function (options) {
            const command = new PullCommand(program);
            if (command.setCommandLineOptions(options, this)) {
                if (command.getCommandLineOption("ignoreTimestamps")) {
                    command._modified = false;
                }
                command.doPull(true);
            }
        });
}

module.exports = pullCommand;
