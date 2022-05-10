import { Dictionary, Profile, UpdateMode } from "@extension/utilities";
import { ConfigurationTarget, workspace } from 'vscode';
import { ConfigHelper } from "@extension/helpers";
import { mapObjectPaths } from "@extension/utilities";
import { get, has, isEqual, keys, startsWith } from "lodash";

export class ProfileHelper {

   private _configHelper: ConfigHelper;

   constructor() {
      this._configHelper = new ConfigHelper();
   }

   public async saveProfile(path: string) {
      const runningConfig = this._configHelper.getGlobalConfig();
      const configPaths = mapObjectPaths(runningConfig);

      const updateFunction = workspace.getConfiguration().update;

      let newSettings: Dictionary = {};
      let previousPath = "";

      for (const configPath of configPaths) {
         if (has(newSettings, previousPath) && startsWith(previousPath, configPath)) {
            continue;
         }

         const currentValue = get(runningConfig, configPath);

         await updateFunction(configPath, undefined, ConfigurationTarget.Global);

         const newValue = get(this._configHelper.getGlobalConfig(), configPath);

         if (!isEqual(currentValue, newValue)) {
            newSettings[configPath] = currentValue;
         }

         previousPath = configPath;
      }


      const actualConfigKeys = keys(newSettings);

      for (const configKey of actualConfigKeys) {
         await updateFunction(configKey, newSettings[configKey], ConfigurationTarget.Global);
      }
   }

   public getProfile(path: string)/*: Profile*/ {

   }

   public async loadProfile(path: string) {
      let helper = new ConfigHelper();

      await helper.setGlobalConfig(UpdateMode.Merge, {});
   }



}
