import { inject, injectable } from "tsyringe";
import { commands, ExtensionContext } from "vscode";

import { ConfigHelper, ProfileHelper } from "@extension/helpers";
import * as constants from "@extension";

@injectable()
export class CommandHelper {

   /**
    * Ctor
    */
   constructor(
      @inject("ExtensionContext") private _extensionContext: ExtensionContext,
      private _profileHelper: ProfileHelper
   ) {}

   public registerCommands() {
      this._extensionContext.subscriptions.push(
         commands.registerCommand(`${constants.internalName}.saveProfile`, async () => {
            await this.saveProfileHandler();
         })
      );
   
      this._extensionContext.subscriptions.push(
         commands.registerCommand(`${constants.internalName}.loadProfile`, async () => {
            await this.loadProfileHandler();
         })
      );
   }

   public async saveProfileHandler() {   
      await this._profileHelper.saveProfile("Test");
   }
   
   public async loadProfileHandler() {
      await this._profileHelper.loadProfile("Test");
   }
}
