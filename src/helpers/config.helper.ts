import { workspace, WorkspaceConfiguration, ConfigurationTarget, ConfigurationScope } from 'vscode';
import { omit, isObject, isUndefined, isEmpty, forOwn, keys } from 'lodash';

import { constants } from '@extension';
import { CodeConfig, ExtensionConfig, flattenObject, UpdateMode, mapObjectPaths } from '@extension/utilities';

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
