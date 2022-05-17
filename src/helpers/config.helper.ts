import { injectable } from 'tsyringe';
import {
   workspace,
   commands,
   window,
   Range,
   Position
} from 'vscode';
import { assign, defaults, pick, values } from 'lodash';
import * as JSONC from 'jsonc-parser';

import { UpdateMode, Dictionary, ExtensionConfig, Profile } from '@extension/utilities';
import { configurationKeys } from '@extension/constants';

@injectable()
export class ConfigHelper {

   // ToDo do not close the editor until everything using it is done (look at RXjs)
   // OR
   // Find a better way of accessing the settings.json (perhaps a custom editor)

   /**
    * Ctor
    */
   public constructor() {}

   /**
    * Gets the settings object directly from the settings.json file.
    * 
    * @returns Parsed object from the user settings.json file
    */
   public async getUserConfig(): Promise<Dictionary> {
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
    * @param updateMode Whether to merge or overwrite the settings.json file
    */
   public async setUserConfig(settings: Dictionary, updateMode: UpdateMode = UpdateMode.Merge) {
      
      // If settings should be merged
      if (updateMode === UpdateMode.Merge) {
         // Grab the current user config
         const currentSettings = await this.getUserConfig();

         // Merge configs
         settings = this.mergeConfigs(currentSettings, settings)
      }
      
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
    * Get a mapped ExtensionConfig object from the User settings values.
    * 
    * @returns Mapped configuration object with defaults where necessary
    */
    public async getExtensionConfig(): Promise<ExtensionConfig> {
      // Get the raw user config from the settings file
      const userConfig = await this.getUserConfig();

      // Get only the values pertaining to this extension's config
      const extensionConfig = pick(userConfig, values(configurationKeys));

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

      // Merge the new extension config items into the user settings
      await this.setUserConfig(mappedConfig, UpdateMode.Merge);
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
