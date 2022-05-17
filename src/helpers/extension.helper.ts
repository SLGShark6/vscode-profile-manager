import { isEqual } from "lodash";
import { inject, injectable } from "tsyringe";
import { Extension, ExtensionContext, extensions } from "vscode";

@injectable()
export class ExtensionHelper {

   /**
    * Ctor
    */
   constructor(
      @inject("ExtensionContext") private _extensionContext: ExtensionContext
   ) { }

   /**
    * Gets a list of all extensions installed on the machine this extension is
    * installed on, excluding built-in ones and this extension.
    * 
    * @returns Array of Extension objects
    */
   public getInstalledExtensions(): Array<Extension<unknown>> {
      // Use vscode api for getting all run environment extensions
      return extensions.all
         // Filter out any built-ins and this extension
         .filter((extension) => {
            return !extension.packageJSON.isBuiltin
               && !isEqual(extension.id, this._extensionContext.extension.id);
         });
   }

   /**
    * Gets a list of extension ID's for all installed extensions.
    * 
    * @returns Array of string extension ID's
    * @see getInstalledExtensions
    */
   public getInstalledExtensionIds(): Array<string> {
      // Get installed extensions
      return this.getInstalledExtensions()
         // Remap to a list of just the ID's
         .map((value) => {
            return value.id;
         });
   }

   public installExtensions(extensionIds: Array<string>) {

   }

   public uninstallExtensions(extensionIds: Array<string>) {

   }
}
