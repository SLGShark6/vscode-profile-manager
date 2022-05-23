
/**
 * Stricter Omit than the vanilla Omit utility type. Restricts the to a keyof
 * the supplied type.
 * 
 * @typedef T - The type to omit members from
 * @typedef Key - The key or union of keys to omit from the parent type
 */
export type OmitKey<T, Key extends keyof T> = Omit<T, Key>;
