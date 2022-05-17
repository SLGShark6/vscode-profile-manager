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

   public getInstalledExtensions(): Array<Extension<unknown>> {
      return extensions.all
         .filter((extension) => {
            return !extension.packageJSON.isBuiltin
               && !isEqual(extension.id, this._extensionContext.extension.id);
         });
   }

   public getInstalledExtensionIds(): Array<string> {
      return this.getInstalledExtensions()
         .map((value) => {
            return value.id;
         });
   }

   public installExtensions(extensionIds: Array<string>) {

   }

   public uninstallExtensions(extensionIds: Array<string>) {

   }
}
