import { forOwn, isArray, isEmpty, isObject } from "lodash";

/**
 * Maps out all the possible paths an object has, going from most specific to
 * least specific.
 * 
 * @param obj - The object to map paths for
 * @returns Array containing all possible object paths
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
 * would produce an array like this:
 * 
 * [
 *    "value",
 *    "parent.childValue",
 *    "parent.child.grandchildValue",
 *    "parent.child",
 *    "parent"
 * ]
 */
export function mapObjectPaths(obj: object): Array<string> {
   let paths: Array<string> = [];
   
   // Iterate over the objects own properties
   forOwn(obj, (value, key) => {

      // If not empty, is an object, but not an array
      if (!isEmpty(value) && isObject(value) && !isArray(value)) {
         // Map out this child object
         let childPaths = mapObjectPaths(value);

         // Iterate over the mapped child paths
         for (const childPath of childPaths) {
            // and prepend the current parent key to the mapped child path
            // adding it to the list of paths (most specific)
            paths.push(`${key}.${childPath}`);
         }
      }

      // Add the current to the list of paths (least specific)
      paths.push(key);
   });

   // Return list of possible paths
   return paths;
}
