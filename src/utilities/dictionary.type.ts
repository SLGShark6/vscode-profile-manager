
/**
 * Same as typescript's Record utility type, just with some defaults applied
 * 
 * @template Key - @default string
 * @template Value - @default unknown
 */
export type Dictionary<Key extends string | number | symbol = string, Value = unknown> = Record<Key, Value>;
