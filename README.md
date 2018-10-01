# wchtools
## IBM Watson Content Hub Developer Tools


### Summary
The IBM Watson Content Hub Developer Tools provide a command line interface (CLI) based utility called wchtools for working with Watson Content Hub. This utility allows developer or other users to upload (push) and download (pull) any content, assets, and content model artifacts from Watson Content Hub. With the tool you can easily install sample packages or pull authoring artifacts for archiving locally. You can also use it for bulk upload of assets such as images, and to trigger a publishing job to publish your "ready" assets.


### License and Notices
Please review the [LICENSE](https://github.com/ibm-wch/wchtools-cli/blob/master/LICENSE) and [NOTICE](https://github.com/ibm-wch/wchtools-cli/blob/master/NOTICE) files at the root of this project's git repository before you download and get started with this toolkit.

### Install

 Pre-Requisite: Before you install the wchtools CLI, you must install NodeJS.

   - Install the latest Node 6.x LTS or Node 8.x LTS version of Node
     - Note, early versions of 6.x had emitter issues and early versions of both 6.x and 8.x may have security risks, so use the latest point release of 6.x or 8.x available, to ensure you take advantage of available functional and security fixes.

 Learn more about installing NodeJS at the following locations

  - https://developer.ibm.com/node/sdk/v6/
  - https://developer.ibm.com/node/sdk/v8/
  - https://nodejs.org/en/

 You may install the wchtools CLI as a node module directly from the npm registry at https://npmjs.com .   If for some reason you are unable to access the public npm registry, you may download and installing a release from the wchtools-cli git repository releases tab as described below.

#### Installing the wchtools-cli module from the npm registry

Execute the following npm command, to install the wchtools CLI module and its dependencies from the npm registry:

  - Note, npm is a node package manager utility that is installed when you install Node itself.

  -For Windows:

       npm install -g --production --no-optional wchtools-cli

  -For Mac or Linux:

       sudo npm install -g --production --no-optional wchtools-cli

Then follow the Getting Started instructions below, to configure and start using the wchtools command.

#### Installing from a release in this git repository

 Complete the following steps to install and run the wchtools CLI from a downloadable release in the git repository:

   1. Download the latest wch.developer.tools.zip release available from the [releases](https://github.com/ibm-wch/wchtools-cli/releases) page of the wchtools-cli git repository and extract the files to a temporary folder on your local filesystem.

   2. Run the installation command from that temporary folder as follows:-

 Note: To uninstall a currently installed version before you install a specific version, for example, to rollback to a prior version for a specific test, run the reinstall command script. The reinstall command script uninstalls then installs for you.

  -For Windows:

        - Run the install command for both initial install and upgrade.

         or

        - To uninstall the current version and then install, run the reinstall command.

  -For Mac or Linux:

        - Run sudo chmod a+x ./install.sh and then sudo ./install.sh for both initial install and upgrade.

        or

        - To uninstall the current version and then install, run the sudo chmod a+x ./reinstall.sh and sudo ./reinstall.sh.


### Notification of updated versions of wchtools

  By default, the wchtools CLI uses the update-notifier node module to check the npm registry for a newer version of wchtools-cli module than the one you have currently installed on your system.   The check runs as an asynchronous background task, to avoid slowing down your wchtools commands, and will notify you on the next successful execution of wchtools after it detects that there is a newer version.

   - To avoid nagging you, when you know there's a newer version but aren't ready to update yet,  it only checks once every 10 minutes that wchtools is invoked, and will only notify you once within that time interval.

   - To disable checking the npm registry for a newer version and notification of updates, set the environment variable NO_UPDATE_NOTIFIER to any value, prior to executing wchtools CLI.   You may set this as a persistent environment variable manually for your OS or unix shell profile script,  or in a build script, if wchtools is run as part of a build process.


### Getting Started

  After you successfully install the wchtools CLI, initialize the username and the API URL for your Watson Content Hub tenant.   Obtain the API URL from the "Hub Information" dialog, which is available from the "About" flyout menu off the left navigation pane of the Watson Content Hub authoring UI.  The API URL is of the form:  https://{tenant-host}/api/{tenant-id}

#### Initializing wchtools with a username and API URL for a non-federated IBM id

      wchtools init
      User: myWCHusername@mycompany.com
      API URL: https://my11.digitalexperience.ibm.com/api/00000000-1111-2222-3333-444444444444

#### Using a Federated Identity (user) with Watson Content Hub tooling and APIs

  Some user IBM ids are "Federated" accounts as described here: https://www.ibm.com/support/knowledgecenter/SS3UMF/dch/admin/fed_authentication_admin.html

  Federated user accounts may use the WCH Authoring UI with the user's username and password, but cannot use that same username and password for either WCH REST API access, or for use with wchtools, which uses those same WCH REST APIs.

  If your IBM id account is federated, you may receive an error when wchtools tries to authenticate that user to the WCH login API, indicating that you are trying to use a federated account.   If this happens, you may instead create an API key as described in the following IBM Bluemix documentation, and then use "apikey" as the username and the value of that API key as the password, for both WCH REST APIs and for wchtools.

#### Using an API key instead of a username and password, with Watson Content Hub tooling and APIs

  You may authenticate to the Watson Content Hub login API via wchtools using an API key, instead of a username and password, whether or not your IBM id is associated with a federated user.   While federated users, "must" authenticate with an API key, other users may also choose to do so.

https://console.bluemix.net/docs/iam/userid_keys.html#userapikey

  When creating your API key with the referenced documentation, save the value of the API key to a safe location for later use.   Then use "apikey" as the value for "Username" on the init command or as passed to the --user argument of wchtools, and use the value of the API key as the password to authenticate with, associated with that API key.

      wchtools  init
      Username: apikey
      API URL: https://my11.digitalexperience.ibm.com/api/00000000-1111-2222-3333-444444444444

      wchtools list -A --server
      Password:  0zXyZMapDLGaFDmebg1Fh1d2wDLMXmvXbU666t0TL-zz

      or
      wchtools list -A --server --password 0zXyZMapDLGaFDmebg1Fh1d2wDLMXmvXbU666t0TL-zz

#### Specifying default options and command line options

The init command generates a .wchtoolsoptions file in the user's home directory with the values provided during the init command. You may also create the .wchtoolsoptions file in a tooling project working-directory with the init command by using the --dir option.

The wchtools CLI utility will first load the options from the .wchtoolsoptions file in the user's home directory. If a .wchtoolsoptions file exists in the tooling project working-directory (as specified by the --dir option or from the current working directory of the process if --dir is not specified), the values from that copy of .wchtoolsoptions will override anything specified in the copy from the user's home directory. Finally, arguments specified directly on the wchtools command line will override any values read from the .wchtoolsoptions files.

#### Trying your first wchtools commands

  Then try the following commands:

    wchtools --help
        - Use this command to get a list of all commands.

    wchtools  push --help
        - Use this command to get a list of all options for the push command.

    wchtools  pull --help
        - Use this command to get a list of all options for the pull command.

    wchtools  list --help
        - Use this command to get a list of all options for the list command.

### Local filesystem layout and working directory

  The wchtools CLI utility operates against a working directory, and requires specific folders as direct children of that working directory.  Each child folder of the working directory separates artifacts based on the Watson Content Hub service that manages those artifacts.

  The working directory for the root of this filesystem layout is either the current directory where the wchtools CLI is run, or the path that is specified by the specified by the --dir argument.

  The actual authoring or web resource artifacts are stored in the following subfolders under the working directory.

    <working dir>
       assets/...          ( Non-managed (web resource) assets, such as html, js, css, managed with wchtools, not authoring UI )
       assets/dxdam/...    ( Managed Authoring Assets, uploaded via Authoring UI and tagged with additional metadata )
       assets/dxconfig/... ( configuration storage area, including manifests )
       categories/         ( authoring categories and taxonomies )
       content/            ( authoring content items )
       image-profiles/     ( authoring image profiles )
       renditions/         ( authoring renditions )
       sites/{site-id}/{pages}  site metadata and page node hierarhy for the site
       resources/          ( image resources no longer referenced by asset metadata, when images updated on assets )
       types/              ( authoring content types )


### Naming of artifact files for non-default sites

  The artifact file for the default site is named "default.json". The artifact file for the draft version of the default site is named "default_wchdraft.json". The names of artifact files for non-default sites are based on the contextRoot property of the site. The folders containing a site's page artifact files follow the same naming convention.

### Sample Usage and Commands

#### Pushing sample content from a local file system
  To push a sample that you extracted to a local working directory that contains the above subfolders of authoring artifacts, run the following command:

      wchtools push -A --dir <path-to-working-directory>

  That command  pushes all authoring artifacts such as content model, content, and assets from the specified working directory and its subfolders. You can add the "-v" to enable verbose logging.

#### Pulling sites, pages, content and related authoring artifacts to a local file system

  To pull (export) all sites, pages, content model, content, and assets to a local working directory, run the following command:

    wchtools pull -A --dir <path-to-working-directory>

  When you pull artifacts from the Watson Content Hub authoring services, wchtools CLI creates folders for types, assets, and content under the working directory. The tool does not operate on raw artifacts in a current working directory. You must specify the <working-directory> parent of the subfolders that contain the contain artifacts, or be in the <working-directory> parent folder that contains such subfolders, when you run wchtools CLI with the push, pull or list commands.

#### Pulling artifacts under a specific folder or path

  To pull web assets, content types, layouts, layout mappings, and/or pages under a specific path, specify the --path option.  For example:

    wchtools pull -w -v --path /myNavigationWidget  --dir <path-to-working-directory>

#### Pushing a full site's pages, content, and related authoring artifacts from a local file system folder

  To push (import) all pages, content model, content, and assets to a local working directory, run the following command:

    wchtools push -A --dir <path-to-working-directory>

  This will push the artifacts in the order of least dependencies (eg, image profiles), to most (eg, pages), in order for dependent items to be there before items that depend on them.

  In most cases, the metadata for the default site (<working-directory>/sites/default.json) is not changed across pulling/pushing pages and content etc. And since the default site metadata is created out of the box for new tenants, the revision in your package may not match the revision in the Watson Content Hub tenant data. So even if you're not changing the default site metadata (eg, site name or description), you may get a conflict error when pushing the site to a different tenant. If you do push it and it fails with a conflict error, you may either ignore the conflict if you haven't made any changes, or push the default site again with -f (--force-override) to override the conflict and update the current default site metadata on the server side, for your Watson Content Hub tenant.

#### Uploading new managed content assets such as images

  To upload a number of files into Watson Content Hub with a single command, copy the files into the assets/dxdam/ folder under your working directory. Then, run the following command:

    wchtools push -a --dir <path-to-working-directory>

  That command uploads managed assets as described previously.

#### Uploading web assets such as html, Javascript and CSS

  Web resource assets are manipulated only via the wchtools CLI at this time and not by the Authoring UI.  To upload web resource assets, place them below the assets folder in your working directory anywhere except under assets/dxdam/... path, then push -A for all authoring artifacts or -w to push only web resource assets.

    wchtools push -w --dir <path-to-working-directory>

#### Forcing an immediate publish of updated web assets or content, even when a global publish schedule is set.

  When a global publish schedule is set, by default any web or managed assets or content you push will wait in a pending state on that schedule, prior to publishing your updates.  If you need to immediately publish assets or content (for example, to fix an urgent issue in a web application asset), you may use the optional --publish-now argument to the push command.

    wchtools push -w --dir <path-to-working-directory> --publish-now

### Pulling all artifact instances and deleting local stale copies

By default a wchtools pull of all or specified artifact types, only pulls new or updated (modified) items, using a by-modified endpoint on each WCH Authoring API.    The wchtools pull -I or --ignore-timestamps  options will pull all artifacts of that type (whether modified or not, but is still additive and update only (it only gets a list of everything that currently exists on the server for each authoring service, and pulls those to the local working directory.  For any artifacts that were pulled previously, but have since been deleted on the server by a business user using the authoring UI, (eg, drafts of content or assets,  or content items no longer needed), you may still have local copies of those artifacts locally, if you had pulled them from WCH prior to their deletion.

wchtools 2.2 and later adds a new pull option called --deletions which can help with this scenario.

wchtools pull -A (or specified artifact type)  with --deletions
  - Is a super-set of -I --ignore-timestamps, in that it will walk every instance of the specified artifact types, ensuring you have the latest copy of each
  - When finished, it compares the list of what you had started with in your local working directory with everything just pulled from the WCH authoring services, and for any local files that were "not" found and pulled from the server during this pull session, it will ask if you want to delete them from the local filesystem.
  - It asks whether you want to delete these local-only files, rather than deleting by default, in case they were local files just created by the developer, that you just haven't pushed yet.
  - If you know the local working directory shouldn't have any locally created files that you haven't pushed yet (eg, it's used for backup only, not for creating new artifacts) you may run wchtools pull -A --deletions --quiet to tell it to quietly (no-prompt) delete artifacts that exist locally but were not pulled during this pull --deletions (ignoring timestamps) session.
  - To create a manifest of the deleted (local) artifacts, use the --write-deletions-manifest option. (In this case, the --write-manifest option is used to create a manifest of the pulled artifacts.)

#### Pulling all artifact types, ignoring timestamps, prompting to delete stale local files

    wchtools pull -A -v --deletions

#### Pulling all artifact types, ignoring timestamps, quietly deleting stale local files (files not found on the server)

    wchtools pull -A -v --deletions --quiet

#### Pulling only assets, ignoring timestamps, prompting to delete stale local files (files not found on the server)

    wchtools pull -a -v --deletions


#### Pulling content by type name, along with assets directly referenced by image and video elements, and renditions directly referenced by that content.

Scenario: Using Content as a Service, a developer wants to pull all Content of a given type (eg, Article or Recipe) from one tenant, and push that set of artifacts to a second tenant (eg, if using a separate authoring tenant from production tenant, with manual migration of Content and Assets).

Please note that this particular option is targeted at Content as a Service customers, not those using WCH Sites and Pages, since it does not operate on the latter artifact types.

    wchtools pull -A -v --by-type-name "Sample Article"

This limited pull option allows you to pull all content associated with a specified type name, along with assets directly referenced by that content, in image and video elements, and referenced renditions.

Use -A (for all authoring artifacts supported by the --by-type-name option) to benefit from any improvements that may be made to this option in future releases (eg, additional authoring artifact types).  Unlike other pull options -A means all artifact types that are currently supported by --by-type-name, when used with this option.

If using this to move content between WCH tenants, you will need to pull and push categories and image profiles between those tenants first, using the existing pull -c -i options.

The current --by-type-name option does not support pulling other content types and content and assets associated via "reference" elements, or other authoring artifacts.  Specifying a content type that includes reference elements to other types and artifacts, which are not followed by the current version of this option, will result in a warning in verbose output and in the log, that not all artifacts associated with the type may be pulled during this operation.

Specifying an artifact type that this option does not currently support, will result in an error.   The --deletions option which relies on pulling "all" artifacts and comparing with what was in the local working directory prior to the pull, is not compatible with pulling by type (which relies on searching for content by the type and then walking the content looking for asset references) and will also result in an error, if specified with this option.

Since this option works by finding the type by name, retrieving all content by that type and then walking the content to find asset and rendition references, it does not use the WCH "by-modified" APIs which the pull-modified operations rely on.  This results in all artifacts that it finds directly associated with the type being pulled each time you run the command with this option, rather than only those that are created or modified since the last pull by type.   If you then push all artifacts to a second WCH tenant where you had already pushed those same artifacts before, the revision values will be different than the prior push.  In this case, you can use the -f (--force-override) option to push with an override of the revision check, if you encounter revision conflict errors and with to overwrite what was pushed before, in case the artifats had been updated.   As always, it is not recommended to edit the same artifacts across multiple WCH tenancies and then attempt to migrate one to the other, as that may result in conflicts, or overwritten changes.

If you have more complex content types and references, or need to pull other authoring artifacts, then the existing pull all or pull all modified options may be more appropriate for your use cases.

### Comparing a source and target tenant, optionally generating an update and deletion manifest

Some deployment scenarios involve a separate development WCH tenant from the staging and/or production tenant.  In order to compare the WCH artifacts between your two tenants, wchtools provides a command that allows you to compare an export from your source tenant (eg, your source code repository representing the latest state of your tested development tenant) with either the live state of your staging/production tenant, or an export from your target tenant.

The compare command allows you to compare specified artifacts between two locations. The artifacts to compare can be located locally in a working directory or located in the Watson Content Hub.

The compare command can output the results of the compare operation either as verbose output to the console, which includes detailed diffs between the compared artifacts, or it can generate a manifest file that is useful for performing additional actions on the set of artifacts that differ.

The compare command automatically ignores differences in the artifacts that are not meaningful (for example differences in the rev field, created or modified timestamps as well as calculated/synthetic fields).

The compare command requires a --source and --target argument to be provided, which point to the locations of the artifacts to compare.

To compare two local working directories:

    wchtools compare -A --source <working_directory_1> --target <working_directory_2>

To compare two Watson Content Hub tenants:

    wchtools compare -A --source <url_1> --target <url_2>

Or to compare a local working directory with Watson Content Hub:

    wchtools compare -A --source <working_directory> --target <url>

To output the detailed differences to the console, use the --verbose argument:

    wchtools compare -A --source <url_1> --target <url_2> -v

The compare command will optionally generate manifests which represent the complete list of all artifacts that differ between the source and target.

    wchtools compare -A --source <working_directory> --target <url> --write-manifest my_diffs --write-deletions-manifest my_deletions

The resulting my_diffs manifest would contain all of the added and changed artifacts between the compared locations.
The resulting my_deletions manifest would contain all of the deleted artifacts that exist in the target location but are removed from the source location.

When comparing two directories or a source directory and a target WCH tenant, any manifest files read or written by the compare command will be loaded or saved using the source directory as identified by the --source argument.
When comparing two Watson Content Hub tenants, any manifest files read or written by the compare command will be loaded or saved using the current working directory where the command is executed from.

##### Limiting the scope of the comparison

In some scenarios, the development tenant may have more artifacts than you want to consider migrating from development to staging/production (eg, additional development-only test artifacts).  To restrict a compare action to only consider a subset of files, the --manifest argument can be used, pointing to a manifest of the total set of artifacts that you want to include in the comparison.   This option requires you to keep an up to date manifest of everything you want considered for migration between the tenants, and is not a default or necessarily commonly used option.

For example:

    wchtools compare -A --source <working_directory> --target <url> --manifest my-complete-site

#### Using the results of compare to synchronize a target environment

The compare command should be used to generate manifests which will contain the list of all artifacts that differ between the source and target.

    wchtools compare -A --source <working_directory> --target <url> --write-manifest my_diffs --write-deletions-manifest my_deletions

The results of a compare can then be used to synchronize the target environment with the source.
The following push and delete commands will push all of the changes from the source environment into the target environment.

    wchtools push --dir <working_directory> --url <url> --manifest my_diffs
    wchtools delete --dir <working_directory> --url <url> --manifest my_deletions

### Delete command (for explicit deletion of server side artifacts)

The delete command allows you to delete specified artifacts from Watson Content Hub.

It is for remote service hosted artifact deletion only, not for deleting files off the local filesystem.  Use your operating system's file explorer or command line delete support, to delete local files from the local working directory.

#### Deleting non-managed web assets such as html, Javascript and CSS, from the Watson Content Hub

  Since non-managed (not located under assets/dxdam/...) web application assets are manipulated only via the wchtools CLI at this time and not by the Authoring UI, you must use wchtools to delete a web application asset, should you choose to do so.  To delete a web application asset, specify the portion of the asset path that was below the <working-directory>/assets/  folder, when you pushed the web resource, as shown in the following command.

    wchtools delete -w --path /js/mytestscript.js

  The delete command supports the following options:

    -p --path <path> this specifies the path to the assets, layout or layout mapping to delete.  Not applicable to other artifact types at this time.
    -r --recursive this specifies whether the delete should apply recursively to all descendants of the matching folder path
    -P --preview this specifies whether to simply preview the artifacts to be deleted, but does not actually execute the delete operation
    -q --quiet this specifies whether the user should be prompted for each artifact to be deleted

  The --path and --recursive options are interpreted by the delete web assets command according to the following:

  - If the path ends with the wildcard '*' and --recursive is supplied, the action will recursively match all artifacts that start with the supplied path
  - If the path does not end with a '*' and --recursive is supplied, the action will recursively match all descendants of the supplied folder
  - If the path ends with the wildcard '*' and --recursive is not supplied, the action will match all artifacts that start with the supplied path but will not match any children of the artifacts
  - If the path does not end with a '*' and --recursive is not supplied, the action will match only the path supplied by the user.  If this path is a folder, the direct children of the folder will match.

#### Deleting managed content assets (Assets visible in WCH UI and having path /dxdam/...  below workingdir/assets)

  You may delete managed content assets via wchtools as of 2.1.x and later.

  Managed content assets (eg, images and videos) are those uploaded via Authoring UI and/or located under /dxdam/... in the local filesystem working directory.

  The path that you specify to the delete command is the path that the asset is known to the WCH Authoring Services such as /dxdam/myimages/background.png and not the full local filesystem absolute path.

  For example, if you have mistakenly uploaded one, or a large number of images, by pushing from /dxdam/myimages/... you may now delete them with:

    wchtools delete -a -v --path /dxdam/myimages/myincorrectimage.png

  To delete all images directly under /dxdam/myimages from the WCH Authoring services:

    wchtools delete -a -v --path /dxdam/myimages/*

  To delete a folder path and all children folders and files

    wchtools delete -a -v --path /dxdam/myimages --recursive

#### Deleting pages by hierarchical path or by id

  You can delete pages by hierarchical path, or by id.  The hierarchical path is the tree based path shown in the Watson Content Hub site manager user interface, which is not necessarily the same as the URL path to the page.  The hierarchical path is made up of the page names, separated by / characters (eg, /Home/Products/Outdoors) and is case sensitive.   The "path" field when creating a page or editing a page settings is for the URL path, which by default is the same as the hierarchical name based path, but may differ, if a sites developer decides to set alternate URL path fields for some pages.   To see a list of "hierarchical" page paths for your site, try the following command:

    wchtools list --pages --server

  Note, Watson Content Hub will delete all child pages of a specified page, when that page is deleted, whether deleted from the Sites UI, wchtools, or via API, so be sure you want to delete that entire page hierarchy before deleting a page that has child pages below it.

    wchtools delete -p -v --path /Home/Products/Details    (delete the page named Details, and any child pages below that)

    wchtools delete -p -v --path "/Home/Lawn and Garden"  (delete page "Lawn and Garden" and any pages below that)

    wchtools delete -p -v --id {page-id}

  NOTE:  the WCH Sites API treats the page path (constructed by concatenating the "Name" fields of pages, with / separators) as case sensitive, so it will not find a page named "Lawn and Garden"  if you pass the path "/Home/lawn and garden".

  By default the WCH Sites Pages API endpoint only deletes the page definition when you delete a page, but leaves the page content directly associated with that page behind, in case you need to do anything with that content before deleting it.
  To delete both the page and the page content at the same time, pass the additional --page-content flag to the delete -p command.

    wchtools delete -p -v --path /testpage --page-content  (delete testpage and the page content item that was created with testpage).

#### Deleting content, types or assets by specified tag

  To delete content, types or assets with a specific tag, specify the artifact type and -T or --tag followed by the tag,  enclosing the tag in quotes if it contains a space character.

    wchtools delete -c -v --tag "IBM Sample"
    wchtools delete -t -v --tag "IBM Sample"
    wchtools delete -a -v --tag beach

  Note:  The Watson Content Hub API will not allow you to delete assets or types that are still referenced by content, and this version of the wchtools delete command only allows for deletion of a single artifact type, by tag, at a time.

#### Deleting content or types by name

  To delete content or types by name, specify the artifact type and -n or --name followed by the name of the artifact,  enclosing the name in quotes if it contains a space character.

    wchtools delete -c -v --tag "My Test Article"
    wchtools delete -t --tag "Sample Article"

  Note:  The Watson Content Hub API will not allow you to delete types that are still referenced by content, and this version of the wchtools delete command only allows for deletion of a single artifact type, by name, at a time.

#### Deleting content by the name of the content type that the content is associated with

  To delete content by type name (ie, all articles of type "Sample Article"), specify -c --by-type-name  followed by the name of the content type.

    wchtools delete -c -v --by-type-name "Sample Article"

  Note:  As with deleting assets with wildcards,  if the command would result in deleting multiple artifacts, you will be queried with each content item name, and may answer y or n to delete (or not) each content item.  Use the -q --quiet argument to avoid the prompt and have it delete whatever the search by type finds for content items with that type name.

#### Deleting content, types, layouts and layout mappings by id

  You may delete content, types, layouts or layout mappings by id

    --id {id-of-artifact} Delete a layout or layout mapping by id (as opposed to path).  This argument cannot be combined with the --path argument.

  The WCH APIs do not allow for deleting a specified artifact if that artifact has references to it from other items (eg, content reference by another content item, type referenced by a mapping).   You should receive an error that the item has references to it, if you attempt to delete an artifact that has incoming references.

  For example:

    wchtools delete -c -v --id {content-item-id}
    wchtools delete -m -v --id {layout-mapping-id}
    wchtools delete -t -v --id {type-id}
    wchtools delete -l -v --id {layout-id}

#### Deleting "all" instances of a specified artifact type or all instances of all artifact types

  A less common use case, but still useful when you need to clean out a demo or prototype tenant or site to populate your content hub tenant with all new data, is the need to delete all artifacts of a specified type (eg, all pages) or all artifacts of all types (eg, to clear all the sample article assets, type, content from an Essentials tier tenant, or to clear all Oslo pages from a Trial tenant, in order to populate it with your own pages).

  To delete all pages from your tenant:

    wchtools delete -p --all -v

  To delete all instances of all artifacts from your tenant:

    wchtools delete -A --all -v

    - use with care and only after using up to date wchtools to pull all artifacts to a safe location
    - use only when you intend to completely clean out your Watson Content Hub tenant of all artifacts, to start with a clean empty hub.

### Pushing, pulling, and deleting, by manifest
A manifest file can be used to control the set of authoring artifacts that are acted upon by the wchtools commands. The push, pull, and delete actions all support using a manifest to specify which artifacts to perform the desired operation on. Likewise, the push, pull, delete and list commands can be used to generate a new manifest from your environment. The manifest file is a simple JSON list of artifacts grouped by artifact type.

Please note that manifests just provide the wchtools commands with a list of artifacts to operate on, they cannot and do not change the behavior of WCH APIs.  These manifest based commands are thus subject to the same validation and limitations those APIs provide.  For instance, if other pages and/or content that are "not" listed in a manfiest refer to a content type listed in the manifest, you will not be able to delete that content type via manifest, until those pages and content are first removed (by UI or by another wchtools delete command).

#### Manifest file location
When a manifest is created, it is created in the /assets/dxconfig/manifests directory of the local working directory for the command. When specifying a manifest on the command line, you need only specify the name of the manifest, wchtools will automatically locate the manifest in the /assets/dxconfig/manifests directory. For example:

    wchtools pull --manifest my_site

will look for a file called my_site.json in the assets/dxconfig/manifests directory relative to your working directory.

Alternatively, if you specify the manifest using a full path, you can point to a manifest anywhere on your local file system.

    wchtools pull --manifest /Users/wchuser/manifests/my_site.json

The manifest can also be loaded from Watson Content Hub using the --server-manifest option.

    wchtools pull --server-manifest my_site

will look for a manifest file named my_site.json in /dxconfig/manifests on Watson Content Hub.

#### Using a manifest
A manifest can be specified using the manifest or server-manifest option on the command line. For example:

    wchtools push --manifest <manifest>
    wchtoosl pull --server-manifest <manifest>

When a manifest is specified, the manifest provides the list of artifacts that the command should act on. For example, if your manifest contained only 3 content items, but your working directory contained 10 content items, the command:

    wchtools push --manifest <manifest>

will only push the 3 content items that are listed in the manifest.

If no artifact type specifiers (e.g. -c, -t, -a, etc) are provided on the command line, the action will also use the manifest to determine which artifact types to act on. For example, if a manifest contained only types and content artifacts, a command such as:

    wchtools pull --manifest <manifest>

would handle pulling only types and content since those are the only artifacts specified in the manifest.

If artifact type specifiers (e.g. -c, -t, -a, etc) are provided on the command line, the command will only act on those artifact types and only on those artifacts specified in the manifest. For example, if a manifest contained types, content, layouts, sites and pages, the following command would only pull the types and content artifacts included in the manifest:

    wchtools pull -c -t --manifest <manifest>

A manifest can be used as a list of artifacts to delete, using:

    wchtools delete --manifest <manifest>

This will delete only those artifacts that are specified in the manifest file.

Or

    wchtools delete --server-manifest <manifest>

will delete only those artifacts that are specified in the named manifest obtained from Watson Content Hub.

#### Creating a new manifest
A manifest file can be created based on the results of the artifacts successfully processed by the push, pull, delete and list commands.

To generate a new manifest from the contents of your local working directory, execute:

    wchtools list --write-manifest <manifest>

The set of artifacts that are included in the manifest can be further restricted if desired. For example, to generate a manifest for just content artifacts, execute:

    wchtools list -c --write-manifest <manifest>

To generate a new manifest from the contents of your WCH tenant, use:

    wchtools list --server --write-manifest <manifest>

To generate a new manifest of artifacts under a specific folder path, use the --path argument. For example:

    wchtools list -w --server --write-manifest <manifest> --path /myNavWidget
    wchtools list -tlm --server --write-manifest <manifest> --path /standard

To push the modified contents of your local working directory to your tenant and generate a manifest that includes only the artifacts that were pushed, use:

    wchtools push --write-manifest <manifest>

To pull all artifacts from your WCH tenant to a local working directory and generate a manifest of everything that was pulled, use:

    wchtools pull -A --write-manifest <manifest>

Since manifests are stored in a folder called "/dxconfig/manifests" under the {working-directory}/assets folder, they will be pushed with the web application assets and can be shared with other developers using the same tenant, by pushing them to your WCH tenant with those web application assets.  They may also be shared by checking the manifest(s) in to the source code control repository that you and the other developers are using to track your web application artifacts.

#### Using both --manifest and --write-manifest

It is possible to use both --manifest and --write-manifest in the same command. This may be useful if you want to restrict the set of artifacts that are processed by the command (using the specified manifest) and then generate a new manifest that contains only those artifacts that were successfully processed by the action. For example:

    wchtools push -c --manifest my_site --write-manifest new_content

Assuming you had an existing manifest called my_site which included all artifacts for your site, the above command would push only the locally modified content items to your tenant and afterwards generate a new manifest called new_content which includes only those content items that were modified (and successfully pushed to your tenant).

#### Storing a manifest on Watson Content Hub

Manifests can be stored on Watson Content Hub. The manifest file can be treated as a web asset and pushed to Watson Content Hub. The following command

    wchtools push -w --path /dxconfig/manifests

will push any manifests in the /dxconfig/manifests directory to Watson Content Hub. Any manifests stored like this on Watson Content Hub can then be accessed using the --server-manifest argument.

### Pulling, pushing, and listing only "ready" artifacts.
Some artifact types (content items, content assets, pages, and sites) support draft versions. A draft version of an artifact is a working copy that will not be published until it is set to ready. For this reason a site developer may not want to include draft versions in a push, pull, or list operation.

#### Pulling only ready artifacts
When populating a new WCH tenant, a site developer may not want to include draft versions of artifacts. In this case, the developer can pull only the ready artifacts to a directory on the local file system.

    wchtools pull -A -v --ready

The local file system directory will contain only the ready artifacts from the current WCH tenant, which can then be pushed to the new WCH tenant.

#### Creating a manifest that contains only ready artifacts
When creating a manifest for a set of WCH artifacts, it may be desirable to include only the ready items.

    wchtools list --server -AI --ready --write-manifest ready_only_content

The manifest created from this command will include all of the ready artifacts in the current WCH tenant.

#### Triggering a publish job
  By default, authoring artifacts such as assets are published to the delivery system when they are uploaded and authoring artifacts such as content are moved from draft to ready state. Therefore, an explicit publish command is not necessary.   If needed, you can use wchtools CLI to trigger an explicit publish with the following publish command. The publish command updates publish by default, that is, it publishes only the artifacts that are not already in the delivery system.

    wchtools publish --verbose

  Note: Publishing currently uses the default publishing source and publishing profile.

  If for some reason the published artifacts need to be republished, you can do a "rebuild" publish with the following command.
  Note: Republishing artifacts is not a typical use case.

    wchtools publish -r --verbose

  Both of the above publish commands display the publishing job id on successful creation of a publishing job.  The following command may be used (with or without --verbose) to see the current status of the specified publishing job.

    wchtools publish --status [<id>] [--verbose]

  If the optional id is not specified to the publish --status command, then the status of the most recent publishing job found will be shown.


#### Defaults
  By default, wchtools CLI pushes and pulls only the authoring artifacts and web resources that are "ready" (not draft)), and have been modified since the last successful push or pull.  To push or pull artifacts again whether they are modified or not since the last successful push or pull, use the -I option to Ignore-timestamps. To push or pull "draft" authoring artifacts, use the --draft option.

  An initial push of a starter kit or sample package is done to populate the initial authoring artifacts. Those authoring artifacts and successive ones are typically manipulated in the Watson Content Hub web based Authoring UI and not locally on the filesystem. Web resource artifacts such as html, css, js, and handlebars templates are managed and edited externally and pushed to the Watson Content Hub with the wchtools CLI utility. Therefore, the default is to push and pull only web resource artifacts, if no options are specified to the push and pull commands.

  Use the following command to push only web resource artifacts that have been modified locally since they were last pushed or pulled.

    wchtools push

  Use the following command to pull only the assets, content, and types that were modified since your last pull.

    wchtools pull -act

  Use the following command to pull assets, content, and types, ignoring timestamps.  This allows you to pull these artifacts whether they were modified or not since the last successful pull or push, to or from this working directory.

    wchtools pull -act -I

  Use the following command to pull to a specific directory.

    wchtools pull --dir <some directory>

  Use the following command to pull draft assets and content artifacts.

    wchtools pull -ac --draft

  Use the following command to pull ready AND draft assets and content artifacts.

    wchtools pull -ac --draft --ready

  Pushing and pulling assumes the <working-directory>/<artifact-type> folder structure that was described earlier. You can specify a more granular folder structure when pushing or pulling web assets, content types, layouts, layout mappings, and pages. By using the --path option, you can specify a path below the <working-directory>/<artifact-type>/ folder. For example, consider a working directory with an assets/ subfolder, and the assets folder contains its own subfolders: simpleSpa , topNav, and sideNav.

   - To push only the web assets under a folder called /topNav, you would use

              wchtools push -w --path /topNav

   - To pull only the style folder that is below the topNav folder, you would use

             wchtools pull -w --path /topNav/style

   - To push content types from a specific folder, use

            wchtools push -t --path <somefolder>

   - To pull layouts from a specific folder, use

            wchtools pull -l --path <somefolder>

   - To pull pages from a specific folder, use

            wchtools pull -p --path "/Design articles"

#### Granular Options

NOTE:  Granular options such as pushing only one or more artifact types at a time, are not typically used. Granular options must be used only when instructed by support or by explicit package instructions, for a very specific use case.  Since artifacts reference each other by embedded identifiers, it is easy to cause referential integrity errors by trying to push artifacts by artifact type without having pushed artifacts that they depend on yet. The push -A command that is used to push all authoring artifacts at the same time, pushes them in dependency order. The order helps to preserve the referential integrity of the artifacts and the overall content as a whole.

   Use the following command to push only modified artifacts for assets, content, and types.

           wchtools push -act

  Use the following command to push all categories, assets, contents, types from a specific directory. The -I switch pushes even unmodified items.

           wchtools push -Cact  --I --dir <some_working_directory>

#### Publishing Site Revision and Auto-Publishing

Auto-publishing is enabled by default, meaning that each time you push a web or managed asset to the authoring service, it will be published to the CDN, and each time you make a content item ready in the UI or by pushing a new ready item, it will be published to the content delivery service.   If you need to disable auto-publishing, to make a series of changes before any of them are published to the delivery services, you may do so by using wchtools to pull the default site revision, disable auto publishing and then push the site revision back to the publishing manager.

           wchtools pull -R -v --dir <working_directory>
           edit <somedirectory>/site-revisions/default_srmd.json  and change the "autoPublishEnabled" value to false
           wchtools push -R -v --dir <working_directory>

After you disable auto-publishing, you may either invoke a publish manually with "wchtools publish -v"  or you may re-enable auto-publishing again using the above steps and changing the "autoPublishEnabled" value back to true, before making your final updates to the assets and content.

#### Logging
  The Watson Content Hub public APIs that the wchtools CLI utility uses, provides server side logging. The server side logging aids customer support in helping you diagnose an issue if problems occur when you use Watson Content Hub from the authoring UI or the command line tools. The wchtools creates 2 log files locally, in the current directory to aid you the user to identify causes of issues that you can fix. For example, an issue in the artifacts you're trying to push.

     - wchtools-cli.log - Contains command log, for commands run through wchtools.
     - wchtools-api.log - Contains errors, if any, encountered while you ran commands against Watson Content Hub authoring and publishing services.

  Using the -v or --verbose option with wchtools commands, logs additional information about the status of the command and any error information to the output console while the command is running.

#### Localization
  The command descriptions and usage messages are translated into a few languages to assist users who use other languages with the tool. The messages fall back to English if translations for the current OS locale are not found. A dependent node module attempts to determine the locale from the OS localization settings.  If you need to or choose to change the locale back to English for communicating issues or questions with others, you may set the environment variable LANG=en  in the command shell environment where you are running wchtools. To see the current languages available, look under the CLI/nls folder in the git repository for this tool.

#### Ignore Files
  Some local files and folders should not be stored in Watson Content Hub, including for example, project files, source control data, logs, and backups. By default, the wchtools CLI will ignore these local files and folders for the push and list commands.

  To ignore additional local files and folders, a file named <i>.wchtoolsignore</i> can be added to the "assets" virtual directory. For example, to ignore all local files with the "abc" extension and all files within the local "xyz" folder, the ignore file could contain the following lines:

     *.abc
     xyz/

  To ignore only the local files and folders specified by the ignore file in the "assets" virtual directory (overriding the default behavior), the "is_ignore_additive" property can be set to false in the .wchtoolsoptions file.

     "is_ignore_additive": false

  By default, the .wchtoolsoptions file can be found in the user's home directory after running the init command.   You may also specify a tooling project working-directory with the init command, to write configuration for a particular working directory of artifacts that you wish to push or pull with different configuration options than the default .wchtoolsoptions configuration file is set to use.

#### Creating and managing templates, layouts and layout mappings

 - To work with Watson Content Hub sites based on an Angular Single Page Application, with Angular layout components and type mappings, please refer to the WCH Site Customization documentation here: https://developer.ibm.com/customer-engagement/docs/wch/developing-your-own-website/customizing-sample-site/

 - Watson Content Hub also supports Handlebars templates for rendering purposes, where a content type and item can be mapped to a layout object, via layout mapping, where the layout object then refers to a handlebars template, that is associated with that content type.

 - For example, you can create a handlebars template under working-dir/assets/templates/article.hbs  for the "Article" content type

               <div>
                 ...
                   <img src="{{elements.image.url}}" alt="" width="360" height="225">
                 ...
                   <h4 style="color:#000;padding:25px 0px 5px 0px">
                       <a>{{elements.title.value}}</a>
                   </h4>
               </div>

  - The above handlebars file then needs to be described to the Authoring and Publishing/Rendering system via a Layout, which provides additional metadata for those services to identify and find the template.  Create a Layout for your new Article template under workingdir/layouts/templates/article.json  with metadata like this:

           {
             "id": "defaultArticleLayout",
             "name": "Default Article Layout",
             "prerender": true,
             "template": "/templates/article.hbs"
           }

  - To let the Authoring and Publishing/Rendering services know that you want this new template and layout associated with your Article content type, you then need to create a "Layout Mapping" under workingdir/layout-mappings/templates/article.json like this:

           {
             "id": "articleLayoutMapping",
             "name": "My Article Layout Mapping",
             "type": {
               "name": "Article"
             },
             "mappings": [
               {
                 "defaultLayout": {
                   "id": "defaultArticleLayout",
                   "name": "Default Article Layout"
                 },
                 "layouts": [
                   {
                     "id": "defaultArticleLayout",
                     "name": "Default Article Layout"
                   }
                 ]
               }
             ]
           }

  - Note, the content "Type" can be referenced from the layout mapping by "name", but the "layout" has to be referenced by "id" at this point, so be sure to give your layout a developer readable and remember-able "id" field when you create it, so that you can easily reference it when creating the layout mapping metadata in the above format.

  - Now that you have created an hbs template, a layout object and a layout mapping object for your article type, you may push those all to Watson Content Hub with the following command:

             wchtools push -wlm -v --dir <some_working_directory>

  - Note, push -A (for all Authoring artifacts) will also push the web assets, layouts and mapping.

  - Note, the above sample using the "/templates" folder under assets, layouts and layout-mappings is an example for reference only.  You may choose another folder name and multiple subfolder levels if desired.  It is recommended that you keep the folder names and filenames under assets, layouts and layout-mappings,   and the name of the template, layout and layout mapping files similar and similar to the Type name that you are creating these artifacs for,  to make it easier to find when making further edits, and to make it easier for others on your team to understand the relationship between the files quickly and easily, when browsing the local artifacs in an IDE.

  - See the Watson Content Hub online documentation for more information on Layout, Layout Mapping syntax and metadata supported, and the Publishing and Rendering documentation, for how these artifacts are combined during a publishing and rendering job, to generate HTML.

#### Clearing the Watson Content Hub content delivery network cache

 The content delivery network caches web artifacts, for performance reasons.  When you push updates to web artifacts with wchtools, you may still see the older cached artifacts for some amount of time, even after the assets are published to the delivery network by WCH.  If you need to invalidate the cache and see the changes immediately, you may use the following wchtools command to clear the CDN cache (invalidate the cache entries).  This results in all artifacts in the cache being cleared, not just the modified artifacts.  This may have performance implications (artifacts that have not changed will also have to be re-cached on the CDN and downloaded again by callers), so the following command should only be used when necessary and not on every push.

             wchtools clear --cache

#### Specifying maximum heap size
  The maximum heap size used for the node process can be specified by setting an environment variable and running an alternate command provided with Watson Content Hub Developer Tools.  An alternate command "wchtools_heap" provides the ability to configure the maximum heap used by node.  To set the maximum heap, set the environment variable WCHTOOLS_MAX_HEAP to a numeric value, specified in megabytes.  For example, to use a 2GB heap, set WCHTOOLS_MAX_HEAP=2048.

  On linux launch Watson Content Hub Developer Tools using:

            export WCHTOOLS_MAX_HEAP=2048
            wchtools_heap push ...

  On Windows launch Watson Content Hub Developer Tools using:

            set WCHTOOLS_MAX_HEAP=2048
            wchtools_heap push ...

#### Setting non-default number of retries and back-off delay, for network issues on WCH API requests.

  The init command supports optional arguments for setting the maximum number of retry attempts per WCH API request error, on network issues or HTTP 429 server too busy responses.  It also allows you to specify the minimum time and maximum time (in milliseconds) to wait, between retry attempts.  By default, 5 total attempts will be tried, starting at a 1 second delay (1000 ms) and backing off by a factor of 2, up to a maximum of 16 seconds (16000 milliseconds).   You do not need to initialize these settings, if the default values meet your needs.

      wchtools init --help
      ...
      --retry-max-attempts <n>  The maximum number of attempts if a WCH API request fails due to a network or server too busy error. The default is 5.
      --retry-min-time <n>      The minimum amount of time in milliseconds to wait before attempting to retry a failed WCH API request. The default is 1000.
      --retry-max-time <n>      The maximum amount of time in milliseconds to wait before attempting to retry a failed WCH API request. The default is 16000.

  The default retry backoff factor is 2, so the actual time delay between retries will be (1 x the min time), then (2 x the min time), then 4x, etc, until the maximum number of attempts is tried for that request.  The time delay will be the smaller of the current backoff calculation, and the specified or default retry max time.  In other words, if the backoff calculation specified a delay time of 32 seconds (32000 milliseconds), but the maximum time was set to 16 seconds (16000 milliseconds), then it would wait maximum 16 seconds between retry attempts, rather than the calculated backoff factor.

  For example, if you are having temporary network issues that affect an asset push, and have not set these configuration values, a request will be attempted 5 times (including the initial attempt), with the following delays:
    - Retry #1 after a 1 second delay
    - Retry #2 after a 2 second delay
    - Retry #3 after a 4 second delay
    - Retry #4 after an 8 second delay

  If you use the above init options to set 10 attempts, with a min of 5000 (5 seconds) and a max of 15000 (15 seconds) then retry #1 will be after a 5 second delay, retry #2 after a 10 second delay and retries #3 through #9 will all use the maximum 15 second delay,  for that particular WCH API request.   Each WCH API request (eg, to create or update an asset or content item) will be attempted the maximum number of attempts set, and start at the minimum retry attempt time (the settings are per artifact pushed or pulled, not per push command).

#### Conflict Handling

When pushing artifacts using wchtools, it is possible to encounter a scenario where the version of the artifact being pushed conflicts with changes made to that artifact on the tenant. In this situation, wchtools will compare the local version of the artifact with the remote version of the artifact to determine if meaningful differences are detected. If meaningful differences are found the copy of the artifact on the tenant is written to the local file system with a .conflict suffix and the push action for that item is logged as an error. After a manual inspection of the conflicting artifacts (and resolution of any important conflicts), you can use the -f --force-override option to re-attempt the push action. If no meaningful differences are found, the rejection of the push update request by the tenant is ignored and a warning is written to the log instead. wchtools uses a list of ignorable fields to determine if changes are meaninfgul or not. This list includes fields such as rev, created, lastModified, systemModified, createorId, lastModifierId, creator, lastModifier, as well as other calculated/synthetic fields such as links, types, categories, publishing.

#### Limitations
  The wchtools functions are limited by what the Watson Content Hub public REST APIs allow, including but not limited to the following list:

  - The authoring APIs and services do not allow you to push an update to an authoring artifact, where the "revision" field of the item you are trying to push does not match the current revision stored that is stored on the server by the authoring service. This action is enforced by the services to help prevent overwriting newer updates by another user through authoring UI with an older copy of an artifact.  If a wchtools push encounters such a 409 conflict error for an authoring artifact or artifacts, each conflicting copy is saved to the appropriate artifact subfolder with a "conflict" suffix. Some conflicts are not meaningful (for example, a difference in the lastModified timestamp field) and are automatically ignored by wchtools which treats the push as successful but logs a warning indicating that a conflict was ignored. You can compare the files locally to determine which changes are appropriate.  If you determine that it is safe to override the conflicting server changes with your local artifacts, you may try pushing again with the -f or --force-override options to ask the authoring services to override the revision conflict validation.

  - The authoring content service does not allow pushing a "ready" state content item, if that content item currently has a "draft" outstanding. You can push a draft content item, whether a draft exists, or no artifact exists for that content ID. But you cannot push a "ready" content item if that item has a draft.  If you must push a ready item, for example, to recover from a server side mistake, where a draft exists, you can cancel the draft and try again. Or you can fix the issue with the authoring UI and then pull the content down to the local filesystem again for archiving.

  - Authoring artifacts refer to each other by internal identifiers (the 'id' field). The Watson Content Hub authoring services enforce validation of referential integrity as artifacts are created or updated through the public REST APIs.   For this reason, it is suggested that you use the -A or --All-authoring options when you push authoring artifacts. This option is not needed if you are pushing up only a new set of low level artifacts such as content types (where you could use -t to specify that's what what you want to push). Low-level artifacts are those artifacts without references to other types of artifacts. The all authoring artifact options push artifacts in order from those with no dependencies, to those with the most dependencies. This ordering helps avoid issues where dependent artifacts don't exist yet on the server, during a push.

  - Pulling (exporting) a set of artifacts from one tenant and moving them to another by pushing (importing) to the new tenant is "additive", in that if something was removed from the source tenant between pull and push iterations, they won't automatically be removed from the target tenant.  You will need to use the Authoring UI to remove authoring artifacts (content, pages etc) on the target tenant explicitly,  if they were removed in the source tenant, when migrating a new version of an application to a target tenant (for example, when using multiple Watson Content Hub tenants to develop, test and then release iterative versions of an application).

#### Git Repository
  The IBM Watson Content Hub Developer Tools are provided as open source and made available in github.
  While it is not necessary to obtain the source from the github repository in order to install the release version of wchtools, you may choose to clone the github repository to access the source for the developer tools.  After cloning the github repository you can run npm install from the root folder of the local copy.
  - npm install

  Unit tests for the developer tools are provided in the github repository and can be run by executing:
  - npm run unit
