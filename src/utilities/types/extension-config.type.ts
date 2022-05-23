import { Dictionary, Profile } from "@extension/utilities";

export type ExtensionConfig = {
   ActiveProfile: string,
   ProfilesList: Dictionary<string, Profile>,
   IgnoreExtensions: Array<string>,
   IgnoreSettings: Array<string>
};
