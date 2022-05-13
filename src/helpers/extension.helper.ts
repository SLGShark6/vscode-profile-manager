import { Dictionary, ExtensionConfig, Profile, UpdateMode } from "@extension/utilities";
import { ConfigHelper } from "@extension/helpers";

import { configurationKeys } from "@extension/constants";
import { defaults, pick, values } from "lodash";

export class ExtensionHelper {

   // ToDo either rename this to be more meaningful or move it to the config helper

   private _configHelper: ConfigHelper;

   /**
    * Ctor
    */
   constructor() {
      this._configHelper = new ConfigHelper();
   }

   /**
    * Get a mapped object from the User settings values.
    * 
    * @returns Mapped configuration object with defaults where necessary
    */
   public async getConfig(): Promise<ExtensionConfig> {
      // Get the raw user config from the settings file
      const userConfig = await this._configHelper.getUserConfig();

      // Get only the values pertaining to this extension's config
      const extensionConfig = pick(userConfig, values(configurationKeys));

      // Map the raw config to a defined type, applying default values where
      // necessary
      const mappedConfig: ExtensionConfig = defaults({
         ActiveProfile: extensionConfig[configurationKeys.ActiveProfile] as string,
         ProfilesList: extensionConfig[configurationKeys.ProfilesList] as Dictionary<string, Profile>,
         IgnoreExtensions: extensionConfig[configurationKeys.IgnoreExtensions] as Array<string>,
         IgnoreSettings: extensionConfig[configurationKeys.IgnoreSettings] as Array<string>
      }, this.getDefaultConfig());

      // Return the mapped config
      return mappedConfig;
   }

   /**
    * Updates this extension's user settings with the calues in the passed
    * object.
    * 
    * @param newConfig - New extension config to save
    */
   public async setConfig(newConfig: ExtensionConfig) {
      // Map the config object to keys used in the settings file
      const mappedConfig = {
         [configurationKeys.ActiveProfile]: newConfig.ActiveProfile,
         [configurationKeys.ProfilesList]: newConfig.ProfilesList,
         [configurationKeys.IgnoreExtensions]: newConfig.IgnoreExtensions,
         [configurationKeys.IgnoreExtensions]: newConfig.IgnoreSettings
      }

      // Merge the new extension config items into the user settings
      await this._configHelper.setUserConfig(mappedConfig, UpdateMode.Merge);
   }

   /**
    * Get an ExtensionConfig value with default values applied.
    * 
    * @returns Default ExtensionConfig object
    */
   public getDefaultConfig(): ExtensionConfig {
      return {
         ActiveProfile: "",
         ProfilesList: {},
         IgnoreExtensions: [],
         IgnoreSettings: []
      }
   }

}
