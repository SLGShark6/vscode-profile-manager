import { QuickPickItem } from "vscode"

/**
 * Represents the options to show when a save profile command is chosen
 */
export type SaveProfileOptions = {
   /**
    * Option to save as a new profile
    */
   SaveAsNew: QuickPickItem,

   /**
    * Option to update the existing profile with the new settings
    */
   UpdateCurrent?: QuickPickItem,

   /**
    * Option to save as a child of the existing profile
    */
   SaveAsChild?: QuickPickItem
}
