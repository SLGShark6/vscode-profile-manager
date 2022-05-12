import { Dictionary } from "@extension/utilities";

/**
 * The internal extension ID
 */
export const internalName = "profile-manager";

/**
 * The human readable extension name
 */
export const displayName = "Profile Manager";

/**
 * Keyed list of all registered configuration contributions for the extension
 */
export const configurationKeys
   : Readonly<Dictionary<"ActiveProfile" | "ProfilesList" | "IgnoreExtensions" | "IgnoreSettings", string>> = {
   ActiveProfile: `${internalName}.active-profile`,
   ProfilesList: `${internalName}.profiles`,
   IgnoreExtensions: `${internalName}.ignore-extensions`,
   IgnoreSettings: `${internalName}.ignore-settings`
}