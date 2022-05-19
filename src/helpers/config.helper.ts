import { injectable } from 'tsyringe';
import {
   workspace,
   commands,
   window,
   Range,
   Position
} from 'vscode';
import { assign, defaults, merge, omit, pick, values } from 'lodash';
import * as JSONC from 'jsonc-parser';

import { UpdateMode, Dictionary, ExtensionConfig, Profile } from '@extension/utilities';
import { configurationKeys } from '@extension/constants';

@injectable()
export class ConfigHelper {

   // ToDo do not close the editor until everything using it is done (look at RXjs)
   // OR
   // Find a better way of accessing the settings.json (perhaps a custom editor)

   // ToDo add get and set RawConfig functions and have the get and set User Config
   // functions only set the portion not pertaining to the extension config

   /**
    * Ctor
    */
   public constructor() {}

   /**
    * Gets the settings object directly from the settings.json file.
    * 
    * @returns Parsed object from the user settings.json file
    */
   public async getRawConfig(): Promise<Dictionary> {
      // Open the user settings.json file in a new editor
      await commands.executeCommand("workbench.action.openSettingsJson");

      // Grab the new active editor from the window (should be the one we just
      // opened)
      const activeEditor = window.activeTextEditor!;
      // Get the open document from the active editor (should be the
      // settings.json file)
      const settingsDocument = activeEditor.document;

      // Get all of the text contained in the file
      const documentText = settingsDocument.getText();

      // Close the active settings.json editor
      await commands.executeCommand("workbench.action.closeActiveEditor");

      // Return the document parsed to a proper object
      return JSONC.parse(documentText);
   }

   /**
    * Writes a passed settings object directly to the user settings.json file.
    * 
    * @see mergeConfigs - on how merges are handled
    * 
    * @param settings Settings object to overwrite the settings.json file with
    */
   public async setRawConfig(settings: Dictionary) {
      
      // Open the user settings.json file in a new editor
      await commands.executeCommand("workbench.action.openSettingsJson");

      // Grab the new active editor from the window (should be the one we just
      // opened)
      const activeEditor = window.activeTextEditor!;
      // Get the open document from the active editor (should be the
      // settings.json file)
      const settingsDocument = activeEditor.document;

      // Open an edit operation to update the settings document
      activeEditor.edit((editBuilder) => {
         // Make a range from start to end of the document
         const startPosition = new Position(0,0);
         const endPosition = settingsDocument.lineAt(settingsDocument.lineCount - 1).rangeIncludingLineBreak.end;
         const range = new Range(startPosition, endPosition);

         // Attempt to get the editor's tab size for pretty printing the
         // settings
         const tabSize = settings["editor.tabSize"] as number
            || workspace.getConfiguration("editor").get("tabSize") as number
            || 3;

         // Replace everything with the new settings object
         editBuilder.replace(range, JSON.stringify(settings, undefined, tabSize));
      });

      // Save the changed settings.json file
      await settingsDocument.save();
      // Close the active settings.json editor
      await commands.executeCommand("workbench.action.closeActiveEditor");
   }


   /**
    * Gets the raw parsed settings object from settings.json, excluding any
    * settings values pertaining to this extension's settings.
    * 
    * @returns Settings object parsed from settings.json
    */
   public async getUserConfig(): Promise<Dictionary> {
      // Get the raw settings object
      let rawSettings = await this.getRawConfig();

      // Return the settings object with this extensions configuration keys
      // omitted
      return omit(rawSettings, values(configurationKeys));
   }

   /**
    * Writes a passed settings object directly to the user settings.json file,
    * without overwriting or clearing out this extension's settings.
    * 
    * @param settings Settings object to overwrite the settings.json file with
    * @param updateMode Whether to merge or overwrite the settings.json file
    */
   public async setUserConfig(settings: Dictionary, updateMode: UpdateMode = UpdateMode.Merge) {
      // If settings should be merged
      if (updateMode === UpdateMode.Merge) {
         // Grab the current user config
         const currentSettings = await this.getRawConfig();

         // Merge configs
         settings = this.mergeConfigs(currentSettings, settings)
      }

      // Get the raw config for this extension
      const currentRawExtensionConfig = await this.getRawExtensionConfig();

      // Merge the raw extension config with the raw settings to save
      const mergedRawConfig = assign({}, settings, currentRawExtensionConfig);

      // Update the raw config, replacing completely
      await this.setRawConfig(mergedRawConfig);
   }


   /**
    * Merges configs left to right, only accounting for surface level keys. If
    * config item that is to be merged contains an object, when merged the
    * object will be completely overwritten, and no deep comparison is
    * performed. This is done to mimic how settings are defined and represented
    * in vscode.
    * 
    * @param configItem - First config object to merge into
    * @param mergeItems - Proceeding items to merge into the first
    * @returns a merged config object
    * 
    * @example
    * Given
    * object1 = {
    *    "config1": ["val1", "val2"],
    *    "config2.key": {
    *       "settingA": true
    *    }
    * }
    * 
    * And
    * 
    * object2 = {
    *    "config2.key": {
    *       "settingB": "Value"
    *    },
    *    "config3.key": "V for value"
    * }
    * 
    * After the merge, the value would be:
    * {
    *    "config1": ["val1", "val2"],
    *    "config.key": {
    *       "settingB": "Value"
    *    },
    *    "config3.key": "V for value"
    * }
    */
   public mergeConfigs(configItem: Dictionary, ...mergeItems: Array<Dictionary>): Dictionary {
      return assign({}, configItem, ...mergeItems);
   }


   /**
    * Gets the portion of the raw user config object pertaining to this
    * extension's settings.
    * 
    * @returns - Object with this extension's user config value
    */
   public async getRawExtensionConfig(): Promise<Dictionary> {
      // Get the raw user config from the settings file
      const userConfig = await this.getRawConfig();

      // Return only the values pertaining to this extension's config
      return pick(userConfig, values(configurationKeys));
   }

   /**
    * Get a mapped ExtensionConfig object from the User settings values.
    * 
    * @returns Mapped configuration object with defaults where necessary
    */
    public async getExtensionConfig(): Promise<ExtensionConfig> {
      // Get the raw extension config values 
      const extensionConfig = await this.getRawExtensionConfig();

      // Map the raw config to a defined type, applying default values where
      // necessary
      const mappedConfig: ExtensionConfig = defaults({
         ActiveProfile: extensionConfig[configurationKeys.ActiveProfile] as string,
         ProfilesList: extensionConfig[configurationKeys.ProfilesList] as Dictionary<string, Profile>,
         IgnoreExtensions: extensionConfig[configurationKeys.IgnoreExtensions] as Array<string>,
         IgnoreSettings: extensionConfig[configurationKeys.IgnoreSettings] as Array<string>
      }, this.getDefaultExtensionConfig());

      // Return the mapped config
      return mappedConfig;
   }

   /**
    * Updates this extension's user settings with the values in the passed
    * object.
    * 
    * @param newConfig - New extension config to save
    */
   public async setExtensionConfig(newConfig: ExtensionConfig) {
      // Map the config object to keys used in the settings file
      const mappedConfig = {
         [configurationKeys.ActiveProfile]: newConfig.ActiveProfile,
         [configurationKeys.ProfilesList]: newConfig.ProfilesList,
         [configurationKeys.IgnoreExtensions]: newConfig.IgnoreExtensions,
         [configurationKeys.IgnoreExtensions]: newConfig.IgnoreSettings
      }

      // Get the current running raw config object
      const currentRawConfig = await this.getRawConfig();

      // Merge in the new extension settings to the current raw config
      const mergedRawConfig = assign({}, currentRawConfig, mappedConfig);

      // Merge the new extension config items into the user settings
      await this.setRawConfig(mergedRawConfig);
   }

   /**
    * Get an ExtensionConfig value with default property values applied.
    * 
    * @returns Default ExtensionConfig object
    */
   public getDefaultExtensionConfig(): ExtensionConfig {
      return {
         ActiveProfile: "",
         ProfilesList: {},
         IgnoreExtensions: [],
         IgnoreSettings: []
      }
   }
}
