import { Dictionary } from "@extension/utilities";

export type ExtensionConfig = {
   "active-profile": string,
   "profiles": Dictionary<string>
};
