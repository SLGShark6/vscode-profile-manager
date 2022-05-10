import { workspace, ConfigurationTarget } from 'vscode';
import {
   omit,
   isObject,
   isUndefined,
   isEmpty,
   keys,
   get,
   has,
   isEqual,
   startsWith
} from 'lodash';

import { constants } from '@extension';
import { CodeConfig, ExtensionConfig, flattenObject, UpdateMode, mapObjectPaths, Dictionary } from '@extension/utilities';

export class ConfigHelper {

   /**
    * Ctor
    */
   public constructor() {}

   /**
    * Gets the current available global config and removes any options that
    * should not be changed.
    * 
    * @returns The current Global config with any of this extensions settings
    * omitted
    */
   public getGlobalConfig(): Readonly<CodeConfig> {
      
      // Get the unmerged workspace config sets and get the global settings value from it
      let globalConfig = workspace.getConfiguration().inspect("")?.globalValue;

      // Holds the config object with the omitted fields
      let processedConfig = {};

      // If the global config is defined and is an object
      if (!isUndefined(globalConfig) && isObject(globalConfig)) {
         // Omit any config settings related to this extension
         processedConfig = omit(globalConfig, [constants.internalName]);
      }

      // Return the cleaned up settings
      return processedConfig;
   }

   /**
    * Attempts to get an object that matches the contents of the user's
    * settings.json file exactly.
    * 
    * @returns An object that should match the contents of the user 
    * settings.json
    */
    public async getGlobalSettingsFileContents(): Promise<Dictionary> {
      // Get the current user settings (minus this extension's settings)
      const runningConfig = this.getGlobalConfig();
      // Get all the possible full dot notated paths in the config object (from
      // most specific to least specific)
      const configPaths = mapObjectPaths(runningConfig);

      // Grab the WorkSpaceConfiguration object update function for reuse
      const updateFunction = workspace.getConfiguration().update;

      // The settings object with the proper settings.json keys to store in the
      // profile
      let actualSettings: Dictionary = {};

      // Previously checked config object path
      let previousPath = "";

      // Iterate over all the possible configuration object's dot paths
      for (const configPath of configPaths) {
         // If the previous path was a valid settings key AND the current path
         // is just a less specific object path
         if (has(actualSettings, previousPath) && startsWith(previousPath, configPath)) {
            continue;
         }

         // Get the current value before testing
         const currentValue = get(runningConfig, configPath);

         // Attempt to see if unsetting the settings value at this object path
         // works
         await updateFunction(configPath, undefined, ConfigurationTarget.Global);

         // Get the new value after the attempted unset
         const newValue = get(this.getGlobalConfig(), configPath);

         // If the value has changed (newValue probably being undefined)
         if (!isEqual(currentValue, newValue)) {
            // Then this was a valid settings key, save it
            actualSettings[configPath] = currentValue;
         }

         // Save path for checking against the next path
         previousPath = configPath;
      }


      // Get the actual settings keys that were just probed
      const actualConfigKeys = keys(actualSettings);

      // Iterate over the settings keys
      for (const configKey of actualConfigKeys) {
         // Attempt to re-add all the settings that were removed in the probing
         // process
         // WILL FAIL IF THERE ISN'T AN EXTENSION THAT CORRESPONDS TO THE SETTING
         await updateFunction(configKey, actualSettings[configKey], ConfigurationTarget.Global);
      }

      // Return what should be in the actual settings.json file
      return actualSettings;
   }

   /**
    * Gets the current running config for this extension, or the default if
    * none exists.
    * 
    * @returns The current running config for this extension or the default
    */
   public getExtensionConfig(): Readonly<ExtensionConfig> {
      // Attempt to get the running extension config from the workspace
      let config = workspace.getConfiguration().get(constants.internalName);
      
      // If it is empty
      if (isEmpty(config)) {
         // Get the default extension config
         config = this.getDefaultExtensionConfig();
      }

      // Return extension config as readonly
      return config as Readonly<ExtensionConfig>;
   }

   /**
    * Gets the full extension config with default values.
    * 
    * @returns Full extension config with default values
    */
   public getDefaultExtensionConfig(): ExtensionConfig {
      return {
         "active-profile": "",
         profiles: {}
      };
   }

   /**
    * Clears out the Global (user) settings.json of all values.
    */
   public async clearGlobalConfig() {
      // Due to limitations on updating configuration values, all possible
      // paths must be attempted for an update, from most specific to least
      const fullConfigPaths = mapObjectPaths(this.getGlobalConfig());
      // WorkspaceConfig object for doing config update operations
      const workspaceConfig = workspace.getConfiguration();

      // Iterate over all possible config paths
      for (const key of fullConfigPaths) {
         // Attempt to unset the value (will not unset till it matches the
         // exact path as it matches in the settings.json file)
         await workspaceConfig.update(key, undefined, ConfigurationTarget.Global);
      }
   }

   public async setGlobalConfig(updateMode: UpdateMode, config: CodeConfig) {
      const runningConfig = this.getGlobalConfig();
      
      await this.clearGlobalConfig();

      await workspace.getConfiguration().update("", runningConfig, ConfigurationTarget.Global);



      console.log(mapObjectPaths(this.getGlobalConfig()));
   }
}
