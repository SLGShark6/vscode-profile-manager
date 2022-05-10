import { Dictionary } from "@extension/utilities";

/**
 * Defines the possible types of values that is held at a specific key inside of a CodeConfig
 */
export type CodeConfigValue = string | number | boolean | null | Array<CodeConfigValue> | ICodeConfig;

/**
 * Defines the type for working with configuration objects for vscode
 */
export type CodeConfig = Dictionary<string, CodeConfigValue>;

/**
 * Used to get around circular references
 */
interface ICodeConfig extends CodeConfig {}
