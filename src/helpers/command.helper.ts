import { inject, injectable } from "tsyringe";
import { commands, ExtensionContext, window, QuickPickItem } from "vscode";
import { isEmpty, isEqual, isUndefined, trim, values } from "lodash";

import * as constants from "@extension";
import { ConfigHelper, ProfileHelper } from "@extension/helpers";
import { SaveProfileOptions } from "@extension/utilities";

@injectable()
export class CommandHelper {

   /**
    * Ctor
    */
   constructor(
      @inject("ExtensionContext") private _extensionContext: ExtensionContext,
      private _configHelper: ConfigHelper,
      private _profileHelper: ProfileHelper
   ) {}


   /**
    * Register the commands and their handlers to the extension context.
    */
   public registerCommands() {
      this._extensionContext.subscriptions.push(
         // Register the saveProfile command to the extension context
         commands.registerCommand(constants.commandKeys.saveProfile, async () => {
            await this.saveProfileHandler();
         }),
         commands.registerCommand(constants.commandKeys.loadProfile, async () => {
            await this.loadProfileHandler();
         })
      );
   }


   /**
    * Command action handler for `saveProfile`
    */
   public async saveProfileHandler() {
      // Initialize save options with the default
      const saveOptions: SaveProfileOptions = {
         SaveAsNew: {
            label: 'Save as "New" profile?'
         }
      };

      // Get the current extension config
      const currentExtensionConfig = await this._configHelper.getExtensionConfig();
      // And get the active profile name from it
      const activeProfile = currentExtensionConfig.ActiveProfile;

      // If there is an active profile
      if (!isEmpty(activeProfile)) {
         // Add the option to save this profile as a child
         saveOptions.SaveAsChild = {
            label: `Save as child of "${activeProfile}"?`
         };

         // As well add the option to update the settings of the current
         // profile with the changes
         saveOptions.UpdateCurrent = {
            label: `Update "${activeProfile}" with changes?`
         };
      }
   
      // Open up the choice picker and await a selection
      const saveChoice = await window.showQuickPick(values(saveOptions), {
         canPickMany: false,
         title: "Save Options"
      });
   
      // If a choice was made (and the menu was not closed)
      if (!isUndefined(saveChoice)) {
         // Option to save as new was selected
         if (saveChoice === saveOptions.SaveAsNew) {
            await this.saveNewProfileHandler();
         }
         // Option to update the current profile selected
         else if (saveChoice === saveOptions.UpdateCurrent) {
            await this.updateProfileHandler();
         }
         // Option to save as a child of the current profile selected
         else if (saveChoice === saveOptions.SaveAsChild) {
            await this.saveChildProfileHandler();
         }
      }
   }
   
   /**
    * Command action handler for saving new profile
    */
   public async saveNewProfileHandler() {
      // Show input box to get the new profile's name
      const profileName = await window.showInputBox({
         title: "Save New Profile",
         placeHolder: "Enter the new profile's name",
         validateInput: (value) => this.validateProfileName(value) || this.validateUniqueProfile(value)
      });
   
      // If a name was entered
      if (!isUndefined(profileName)) {
         // Save the new profile
         await this._profileHelper.saveProfile(profileName);
      }
   }
   
   /**
    * Command action handler for updating the current profile
    */
   public async updateProfileHandler() {
      // Get current extension config
      const currentExtensionConfig = await this._configHelper.getExtensionConfig();

      // Show prompt asking whether user is sure they want to overwrite the
      // existing profile
      const updateChoice = await window.showQuickPick(["Yes", "Cancel"], {
         canPickMany: false,
         title: `Are you sure you want to overwrite ${currentExtensionConfig.ActiveProfile}?`
      });

      // If they chose yes
      if (isEqual(updateChoice, "Yes")) {
         // Overwrite current profile
         await this._profileHelper.saveProfile(currentExtensionConfig.ActiveProfile);
      }
   }
   
   /**
    * Command action handler for saving profile as a child of the current one.
    */
   public async saveChildProfileHandler() {
      // Get current extension config
      const currentExtensionConfig = await this._configHelper.getExtensionConfig();

      // Show input box to get the child profile's name
      const profileName = await window.showInputBox({
         title: `Save Profile as Child of ${currentExtensionConfig.ActiveProfile}`,
         placeHolder: "Enter the new profile's name",
         validateInput: (value) => this.validateProfileName(value)
            || this.validateUniqueProfile(`${currentExtensionConfig.ActiveProfile}.${value}`)
      });
   
      // If a name was entered
      if (!isUndefined(profileName)) {
         // Save the child profile
         await this._profileHelper.saveProfile(`${currentExtensionConfig.ActiveProfile}.${profileName}`);
      }
   }
   
   
   /**
    * ToDo probably move this to a standalone function
    * Checks whether a string name value is a valid profile name identifier.
    * 
    * @param name - The string name value to test against
    * @returns - string if there is an error, undefined is valid
    */
   public validateProfileName(name: string): string | undefined {
      // Declare error
      let error;
      
      // Trim any whitespace from the profile
      name = trim(name);
   
      // If the name is empty
      if (isEmpty(name)) {
         // Provide error that a name is needed
         error = "A profile name cannot be empty";
      }
      // Otherwise if the name contains dots
      else if (name.includes('.')) {
         // Provide error a profile name cannot contain dots
         error = "A profile name cannot contain any '.' characters as this is used to denote parent-child profile paths";
      }
   
      // Return the error (if any)
      return error;
   }

   /**
    * ToDo probably move this to a standalone function
    * Checks whether a string path is unique and another profile doesn't
    * already exist at that path
    * 
    * @param path - The path to check if it already exists
    * @returns - string if there is an error, undefined is valid
    */
   public validateUniqueProfile(path: string): string | undefined {
      // Declare error
      let error;

      // Check if a profile at the name provided exists
      if (this._profileHelper.checkProfileExists(path)) {
         // Provide error that a profile already exists at the path
         error = `A profile already exists at the path "${path}"`;
      }

      // Return the error (if any)
      return error;
   }


   public async loadProfileHandler() {   
      await this._profileHelper.loadProfile("Test");
   }
}
