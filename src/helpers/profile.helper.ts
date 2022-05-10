import { Dictionary, Profile, UpdateMode } from "@extension/utilities";
import { ConfigurationTarget, workspace } from 'vscode';
import { ConfigHelper } from "@extension/helpers";

export class ProfileHelper {

   private _configHelper: ConfigHelper;

   constructor() {
      this._configHelper = new ConfigHelper();
   }

   /**
    * Copies the current user's settings, saves it under this extensions
    * settings as a profile keyed with the provided path string, and then marks
    * it as the current profile.
    * 
    * @param path The hierarchial dot notated path to save the profile at
    */
   public async saveProfile(path: string) {
      
   }

   public getProfile(path: string)/*: Profile*/ {

   }

   public async loadProfile(path: string) {
      let helper = new ConfigHelper();

      await helper.setGlobalConfig(UpdateMode.Merge, {});
   }



}
