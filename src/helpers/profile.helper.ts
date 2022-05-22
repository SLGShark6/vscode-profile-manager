import { injectable } from 'tsyringe';
import { commands, window, workspace } from 'vscode';
import {
   difference,
   forOwn,
   get,
   has,
   isEmpty,
   isEqual,
   isUndefined,
   join,
   last,
   merge,
   omit,
   pull,
   split,
   take,
   union,
   unset,
   values,
   without
} from "lodash";

import { Dictionary, Profile, ProfileStack } from "@extension/utilities";
import { ConfigHelper, ExtensionHelper } from "@extension/helpers";
import { configurationKeys } from "@extension/constants";

@injectable()
export class ProfileHelper {

   /**
    * Ctor
    */
   constructor(
      private _configHelper: ConfigHelper,
      private _extensionHelper: ExtensionHelper
   ) { }

   /**
    * Copies the current user settings.json (ignoring this extensions config
    * and any unmodified parent configs) and saves it in this extensions
    * profile config under the path specified.
    * 
    * @param path The hierarchial dot notated path to save the profile at
    * @throws Error if a profile doesn't exist at any part of parent nodes in
    * the passed path.
    */
   public async saveProfile(path: string) {
      // Split the provided path by dot notation
      const splitPath = split(path, '.');
      const parentPaths = take(splitPath, splitPath.length - 1);
      const profileKey = splitPath[splitPath.length - 1];

      // Get the current extension config to update with the profile
      const extensionConfig = await this._configHelper.getExtensionConfig();
      const profiles = extensionConfig.ProfilesList

      // Get the current user settings minus this extension's configs
      const userConfig = await this._configHelper.getUserConfig();

      // Get a list of the current extensions installed
      const extensionIds = this._extensionHelper.getInstalledExtensionIds();

      // Holds the spot where the new profile should be saved
      let profileStorage: Dictionary<string, Profile>;
      // Holds extensions unique to this profile
      let uniqueExtensionIds: Array<string>;
      // Holds the configs unique to this profile
      let uniqueConfig: Dictionary;

      // If there is more than one node (i.e. parent profiles)
      if (splitPath.length > 1) {
         // Get the direct parent profile reference of the profile being saved
         const lastParentProfile = get(profiles, join(parentPaths, ".children."));

         // If the parent of the profile being saved does not have a children
         // property
         if (isUndefined(lastParentProfile.children)) {
            // Set one
            lastParentProfile.children = {};
         }

         // Set the profile storage to children object of the direct parent
         profileStorage = lastParentProfile.children;


         // Get the merged profile config of the parent profiles (if any)
         let mergedParentsProfile = this.getProfile(join(parentPaths, "."));

         // Get the extension ID's unique to this profile
         uniqueExtensionIds = difference(extensionIds, mergedParentsProfile.extensions)

         // Initialize unique config
         uniqueConfig = {};

         // Iterate over the user config properties
         forOwn(userConfig, (value, key) => {
            // If the merged parent config doesn't have the configuration value OR
            // the value in this config is different than the merged parent's
            if (!has(mergedParentsProfile.settings, key) || !isEqual(value, mergedParentsProfile.settings[key])) {
               // Add it to the list of unique values
               uniqueConfig[key] = value;
            }
         });
      }
      // Otherwise just a single node
      else {
         // Set profile storage to the profiles list settings object
         profileStorage = profiles;

         // Set the unique settings for this profile to environment settings
         uniqueConfig = userConfig;
         uniqueExtensionIds = extensionIds;
      }


      // Attempt to get an existing profile object of the profile to be saved 
      // (if there is one)
      let profileToSave = profileStorage[profileKey];

      // If the profile at the final path node is empty, it must be a new
      // profile
      if (isEmpty(profileToSave)) {
         // So set it up with defaults
         profileToSave = this.getDefaultProfileSettings();
      }


      // Update profile with the unique items
      profileToSave.settings = uniqueConfig;
      profileToSave.extensions = uniqueExtensionIds;

      // Store the new/ updated profile under the final key in the supplied
      // path
      profileStorage[last(splitPath)!] = profileToSave;

      // Cleanup any now duplicated settings and extensions inside child
      // profiles (if any)
      this.cleanupChildProfiles(profileToSave);

      // Ensure this profile set as the active one
      extensionConfig.ActiveProfile = path;

      // Update the extension config with this modified config
      await this._configHelper.setExtensionConfig(extensionConfig);
   }

   /**
    * Cleans out any direct settings or extension ID's that have been
    * duplicated in any descendants of the passed profile.
    * 
    * @param profile - The profile reference whose settings and extensions you
    * want cleaned from children
    */
   public cleanupChildProfiles(profile: Profile) {
      // Iterate over this profiles direct children
      forOwn(profile.children, (childProfile: Profile) => {
         // Traverse the entire descendant tree removing duplicated extension ID's
         this.cleanChildMatchingExtensions(childProfile, profile.extensions);

         // Iterate over profile settings
         forOwn(profile.settings, (value, key) => {
            // Remove any setting that matches this key, value in this child or
            // descendant (will stop once it encounters a new value at the same
            // key) 
            this.cleanChildMatchingSetting(childProfile, key, value);
         });
      });
   }

   /**
    * Traverses the entire descendant tree of a passed profile, removing
    * duplicated extension ID's from the passed profile and it's descendants.
    * 
    * @param childProfile - The child profile to remove duplicated extension
    * ID's from
    * @param extensions - List of extensions to remove from the child profile
    */
   public cleanChildMatchingExtensions(childProfile: Profile, extensions: Array<string>) {
      // Remove any duplicated extension ID's from this child profile
      pull(childProfile.extensions, ...extensions)

      // Iterate over the children of this profile (if any)
      forOwn(childProfile.children, (grandChildProfile: Profile) => {
         // Recurse and remove any duplicated extension ID's from children of
         // this profile
         this.cleanChildMatchingExtensions(grandChildProfile, extensions);
      });
   }
   
   /**
    * Traverses the descendant tree of a passed profile, stopping when it finds
    * a matching key, and removing the value if it matches the passed value
    * (duplicated value). i.e If the value has been overriden there is no
    * reason to go any further, and if the value is duplicated then it needs to
    * be removed.
    * 
    * @param childProfile - The child profile to remove duplicated settings from
    * @param key - The key of the setting to check for
    * @param value - The value to check against
    */
   public cleanChildMatchingSetting(childProfile: Profile, key: string, value: unknown) {
      // If this profile has the settings key passed
      if (has(childProfile.settings, key)) {
         // And if the value has been duplicated
         if (isEqual(childProfile.settings[key], value)) {
            // Remove the setting from this child profile
            unset(childProfile.settings, key);
         }
      }
      // Otherwise the setting item was not set on this profile
      else {
         // Iterate over the children of this profile
         forOwn(childProfile.children, (grandChildProfile: Profile) => {
            // Recurse and traverse the tree further searching for any
            // duplicated or overriden setting
            this.cleanChildMatchingSetting(grandChildProfile, key, value);
         });
      }
   }

   /**
    * Gets the flattened (and merged) representation of the Profile stored at
    * the path specified.
    * 
    * @param path - The path to get the flattened profile from
    */
   public getProfile(path: string): Profile {
      // Get the profile stack at the path passed
      const profileStack = this.getProfileStack(path);

      // Holds the configs of parent profiles up until the final profile
      let mergedConfigs: Dictionary = profileStack.settings;
      let mergedExtensionIds: Array<string> = profileStack.extensions;

      // Set the last stack whose settings were merged
      let lastStack = profileStack;

      while (!isEmpty(lastStack.child)) {
         // Set the last stack to the new child
         lastStack = lastStack.child!;

         // Merge in the profile's settings from the previous iteration
         mergedConfigs = this._configHelper.mergeConfigs(mergedConfigs, lastStack.settings);
         mergedExtensionIds = union(mergedExtensionIds, lastStack.extensions);
      }

      // Return the merged settings in a new Profile object
      return {
         settings: mergedConfigs,
         extensions: mergedExtensionIds
      };
   }

   /**
    * Gets the profile/ children storage object at the path specified. Provides
    * the top level profile storage if the path is empty.
    * 
    * @param path - Path of profile to get the children for, empty for top
    * level  
    * @returns - Found profile/ child storage object for the path provided
    * @throws Error if a profile doesn't exist at any of the nodes in the path
    */
   public getChildren(path?: string): Dictionary<string, Profile> {
      // Declare object to return
      let childrenStorage: Dictionary<string, Profile>;
      
      // If the path is empty
      if (isEmpty(path)) {
         // Provide the top level profile storage as children object
         childrenStorage = workspace.getConfiguration()
            .get(configurationKeys.ProfilesList) as Dictionary<string, Profile>;
      }
      // Otherwise
      else {
         // Get the node at the path provided
         const profileNode = this.getProfileNode(path!);

         // Set return to the children object if it has one or an empty object
         // otherwise
         childrenStorage = profileNode.children ?? {};
      }

      // Return found children object
      return childrenStorage;
   }


   // ToDo update iterative functions to use the new fetProfileNodeList function internally

   /**
    * Gets the exact profile object contained at each node in the path
    * provided.
    * 
    * @param path - string path to get profile nodes for
    * @returns - A list containing profile objects at each node in the path
    * @throws Error if no path is provided OR a profile doesn't exist at any of
    * the nodes in the path
    */
   public getProfileNodeList(path: string): Array<Profile> {
      // If the path is empty
      if (isEmpty(path)) {
         // Throw an error
         throw new Error("No path provided.");
      }

      // Split the provided path by dot notation
      const splitPath = split(path, '.');

      // Initialize the list
      const nodeList: Array<Profile> = [];

      // Initialize the object containing the profiles to get the next node
      // from, with the list of top level profiles
      let profileStorage = workspace.getConfiguration()
         .get(configurationKeys.ProfilesList) as Dictionary<string, Profile>;

      // If no profiles exist
      if (isEmpty(profileStorage)) {
         throw new Error("No profiles exist to get.");
      }

      // Iterate over the nodes in the path
      for (let i = 0; i < splitPath.length; i++) {
         // Get the current profile node in the chain
         const currentNode = profileStorage[splitPath[i]];

         // If there is no profile at the current path node
         if (isEmpty(currentNode)) {
            // Get the current full path being iterated
            const currentPath = join(take(splitPath, i + 1), ".");
            // Throw an error
            throw new Error(`Profile item at path "${currentPath}" does not exist.`)
         }
         
         // Add the found node to the list of profile nodes
         nodeList.push(currentNode);

         // Set the next object to get the next node from to the children
         // object of this node (if it has one)
         profileStorage = currentNode.children!;
      }

      // Return the found node
      return nodeList;
   }

   /**
    * Gets the exact profile object at the path specified with ONLY the
    * settings contained in that node (including children).
    * 
    * @param path - Path to attempt to get the profile node for
    * @returns - Profile node object at path specified
    * @throws Error if no path is provided OR a profile doesn't exist at any of
    * the nodes in the path
    */
   public getProfileNode(path: string): Profile {
      // Get the list of nodes for the path
      const nodes = this.getProfileNodeList(path);

      // Return the last node in the list
      return nodes[nodes.length - 1];
   }

   /**
    * Gets a Profile object with default values and only required fields set.
    * 
    * @returns - Profile with default values
    */
   public getDefaultProfileSettings(): Profile {
      return {
         settings: {},
         extensions: []
      };
   }

   /**
    * Gets the unflattened limb pointed to by the path from the profiles list tree.
    * 
    * @param path 
    */
   public getProfileStack(path: string): ProfileStack {
      // Split the provided path by dot notation
      const splitPath = split(path, '.');

      // Get the current profiles list
      const profilesList = workspace.getConfiguration().get(configurationKeys.ProfilesList) as Dictionary<string, Profile>;

      // If no profiles exist
      if (isEmpty(profilesList)) {
         throw new Error("No profiles exist to get.");
      }

      // Initialize the profile stack
      let profileStack: ProfileStack = this.getDefaultProfileStack();

      // Initialize the next stack to set values for
      let nextStack = profileStack;

      for (let i = 0; i < splitPath.length; i++) {
         // Get the current profile in the chain
         let currentProfile: Profile = profilesList[splitPath[i]];

         // If the profile was not set in the previous iteration
         if (isEmpty(currentProfile)) {
            // Get the current path being iterated
            const currentPath = join(take(splitPath, i + 1), ".");
            // Throw an error
            throw new Error(`Profile item at path "${currentPath}" does not exist.`)
         }

         // Set the settings from the current profile
         nextStack.id = splitPath[i];
         nextStack.settings = currentProfile.settings;
         nextStack.extensions = currentProfile.extensions;

         // If there are still more children to iterate through
         if ((i + 1) < splitPath.length) {
            // Initialize the next child
            nextStack.child = this.getDefaultProfileStack();

            // Set the next stack to the next child
            nextStack = nextStack.child;
         }
      }

      return profileStack;
   }

   /**
    * Gets a ProfileStack object with default values and only required fields
    * set.
    * 
    * @returns - ProfileStack with default values
    */
   public getDefaultProfileStack(): ProfileStack {
      return {
         id: "",
         settings: {},
         extensions: []
      };
   }


   /**
    * Checks whether a profile exists at the provided path
    * 
    * @param path - Dot notated path of the profile to check if exists
    */
   public checkProfileExists(path: string): boolean {
      // Init does exist to false by default
      let doesExist: boolean = false;

      try {
         // Try to get the profile at the path (will throw an error if it
         // doesn't exist)
         this.getProfileStack(path);

         // Mark profile as existant, no error was thrown
         doesExist = true;
      }
      catch (error) { }

      // Return profile existence status
      return doesExist;
   }


   /**
    * Destructively attempts to load in the profile set at the specified path
    * 
    * @param path - Dot notated path of the profile to load
    */
   public async loadProfile(path: string) {
      // Get the compiled profile configs
      const profile = this.getProfile(path);

      // Get the current list of installed extension ID's
      let currentExtensionIds = this._extensionHelper.getInstalledExtensionIds();

      // Get any installed extensions that are NOT in the profile to load
      const extensionsNotInProfile = without(currentExtensionIds, ...profile.extensions);
      // Uninstall those extensions not in the profile
      await this._extensionHelper.uninstallExtensions(extensionsNotInProfile);

      // Get the updated list of installed extensions
      currentExtensionIds = this._extensionHelper.getInstalledExtensionIds(); 

      // Get any extensions in the profile that aren't currently installed
      const notInstalledExtensions = without(profile.extensions, ...currentExtensionIds);
      // ToDo: Handle installation failure
      // Install the not installed extensions
      await this._extensionHelper.installExtensions(notInstalledExtensions);

      // Update the user config with the profile settings (excluding this
      // extension's settings)
      await this._configHelper.setUserConfig(profile.settings);

      const action = "Reload";

      window.showInformationMessage(
         `Reload window to ensure profile changes to take effect.`,
         action
      )
         .then(selectedAction => {
            if (selectedAction === action) {
               commands.executeCommand('workbench.action.reloadWindow');
            }
         });
   }



}
