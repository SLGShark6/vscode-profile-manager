import { injectable } from 'tsyringe';
import { extensions, workspace } from 'vscode';
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
   omit,
   pull,
   split,
   take,
   union,
   unset,
   values
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
      const userConfig = omit(await this._configHelper.getUserConfig(), values(configurationKeys));

      // ToDo extensions are not being listed properly, only this extension id is being saved
      // Get a list of the current extensions installed
      const extensionIds = extensions.all
         .filter((extension) => {
            return !extension.packageJSON.isBuiltin;
         })
         .map((value) => {
            return value.id;
         });

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

   public async loadProfile(path: string) {
      let helper = new ConfigHelper();
   }



}
