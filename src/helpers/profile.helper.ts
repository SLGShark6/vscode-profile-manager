import { Dictionary, Profile, UpdateMode } from "@extension/utilities";
import { ConfigurationTarget, Extension, extensions, workspace } from 'vscode';
import { ConfigHelper, ExtensionHelper } from "@extension/helpers";
import { difference, forOwn, has, isEmpty, isEqual, last, omit, pull, split, transform, union, unset, values, without } from "lodash";
import { configurationKeys } from "@extension/constants";

export class ProfileHelper {

   private _configHelper: ConfigHelper;

   private _extensionHelper: ExtensionHelper;

   constructor() {
      this._configHelper = new ConfigHelper();
      this._extensionHelper = new ExtensionHelper();
   }

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

      // Get the current extension config to update with the profile
      const extensionConfig = await this._extensionHelper.getConfig();
      const profiles = extensionConfig.ProfilesList

      // Get the current user settings minus this extension's configs
      const userConfig = omit(await this._configHelper.getUserConfig(), values(configurationKeys));
      // Get a list of the current extensions installed
      const extensionIds = transform(extensions.all, (result: Array<string>, current: Extension<unknown>) => {
         result.push(current.id);
      });

      // Holds the configs of parent profiles up until the final profile
      let mergedParentConfigs: Dictionary = {};
      let mergedParentExtensionIds: Array<string> = [];

      // Get the first profile in the chain
      let lastProfile: Profile = profiles[splitPath[0]];
      // Store the reference to where the new profile needs to be saved
      let profileStorage = profiles;

      // Iterate over the paths to read the children at each, skipping the
      // first since that would be in the ProfilesList config item, and not in
      // a children sub object.
      for (let i = 1; i < splitPath.length; i++) {
         // If the last profile was not set in the previous iteration
         if (isEmpty(lastProfile)) {
            // Throw an error
            throw new Error(`Profile item at child path "${splitPath[i - 1]}" does not exist.`)
         }

         // Merge in the profile's settings from the precvious iteration
         mergedParentConfigs = this._configHelper.mergeConfigs(mergedParentConfigs, lastProfile.settings);
         mergedParentExtensionIds = union(mergedParentExtensionIds, lastProfile.extensions);

         // Get the children's object reference of the previous profile to
         // store the new profile in
         profileStorage = lastProfile.children;

         // Update last profile to the current iteration (final one will be the
         // path node that needs to be saved, which may or may not exist)
         lastProfile = lastProfile.children[splitPath[i]]
      }

      // If the profile at the final path node is empty, it must be a new
      // profile
      if (isEmpty(lastProfile)) {
         // So set it up with defaults
         lastProfile = this.getDefaultProfileSettings();
      }

      // Holds the configs unique to this profile
      const uniqueConfig: Dictionary = {};

      // Iterate over the user config properties
      forOwn(userConfig, (value, key) => {
         // If the merged parent config doesn't have the configuration value OR
         // the value in this config is different than the merged parent's
         if (!has(mergedParentConfigs, key) || !isEqual(value, mergedParentConfigs[key])) {
            // Add it to the list of unique values
            uniqueConfig[key] = value;
         }
      });

      // Holds extensions unique to this profile
      const uniqueExtensionIds = difference(extensionIds, mergedParentExtensionIds)

      // Update profile with the unique items
      lastProfile.settings = uniqueConfig;
      lastProfile.extensions = uniqueExtensionIds;

      // Store the new/ updated profile under the final key in the supplied
      // path
      profileStorage[last(splitPath)!] = lastProfile;

      // Cleanup any now duplicated settings and extensions inside child
      // profiles (if any)
      this.cleanupChildProfiles(lastProfile);

      // Update the extension config with this modified config
      await this._extensionHelper.setConfig(extensionConfig);
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

   public getProfile(path: string)/*: Profile*/ {

   }

   public getDefaultProfileSettings(): Profile {
      return {
         settings: {},
         extensions: [],
         children: {}
      };
   }

   public async loadProfile(path: string) {
      let helper = new ConfigHelper();
   }



}
