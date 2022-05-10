import { forOwn, isArray, isEmpty, isObject } from "lodash";
import { Dictionary } from "@extension/utilities";

/**
 * Flattens and object into a single level, compressing keys using dot
 * notation.
 * 
 * @param obj - Object to flatten
 * @returns Flattened object
 * 
 * @example
 * {
 *    value: "random value",
 *    parent: {
 *       childValue: "child value",
 *       child: {
 *          grandchildValue: "grandchild value"
 *       }
 *    }
 * }
 * 
 * would yield:
 * 
 * {
 *    value: "random value",
 *    "parent.childValue": "child value",
 *    "parent.child.grandchildValue": "grandchild value"
 * }
 */
export function flattenObject(obj: object): Dictionary {
   let returnObj: Dictionary = {};

   // Iterated over objects own properties
   forOwn(obj, (parentValue, parentKey) => {

      // If not empty, is an object, but not an array
      if (!isEmpty(parentValue) && isObject(parentValue) && !isArray(parentValue)) {
         // Flatten the child object
         let flatChild = flattenObject(parentValue);

         // Iterate over the flattened child object
         forOwn(flatChild, (childValue, childKey) => {
            // Prepending the keys with the current parent's and adding the
            // value to the return object
            returnObj[`${parentKey}.${childKey}`] = childValue;
         });
      }
      // Otherwise it is a normal value
      else {
         // Add it to the return object
         returnObj[parentKey] = parentValue;
      }
   });
   
   // Return the flattened object
   return returnObj;
}
