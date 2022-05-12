import { Dictionary } from "./dictionary.type";

/**
 * Type definition for vscode profile-manager extension profile
 */
export type Profile = {
   /**
    * List of extension ID's installed for this profile
    */
   extensions: Array<string>,

   /**
    * Copy of the standard vscode config object
    */
   settings: Dictionary,

   /**
    * Optional child profiles that extend on the base config stored in this
    * profile
    */
   children: Dictionary<string, Profile>
};
