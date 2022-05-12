import { Dictionary, Profile, UpdateMode } from "@extension/utilities";
import { ConfigurationTarget, workspace } from 'vscode';
import { ConfigHelper } from "@extension/helpers";
import { split } from "lodash";

export class ProfileHelper {

   private _configHelper: ConfigHelper;

   constructor() {
      this._configHelper = new ConfigHelper();
   }

   /**
    * Copies the current user settings.json (ignoring this extensions config
    * and any unmodified parent configs) and saves it in this extensions
    * profile config under the path specified.
    * 
    * @param path The hierarchial dot notated path to save the profile at
    */
   public async saveProfile(path: string) {
      const splitPath = split(path, '.');

      const parentConfigs = [];
   }

   public getProfile(path: string)/*: Profile*/ {

   }

   public async loadProfile(path: string) {
      let helper = new ConfigHelper();
   }



}
