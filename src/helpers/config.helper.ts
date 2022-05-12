import {
   workspace,
   commands,
   window,
   Range,
   Position
} from 'vscode';
import { assign } from 'lodash';
import * as JSONC from 'jsonc-parser';

import { UpdateMode, Dictionary } from '@extension/utilities';

export class ConfigHelper {

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
}
