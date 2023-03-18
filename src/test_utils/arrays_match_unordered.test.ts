/**
 * arraysMatchUnordered() - Checks if 2 arrays match without regard to order
 * @param a - first list
 * @param b - second list
 * @param comparator - function to compare elements, defaults to ===
 * @returns - If arrays match without regard to order
 */
export default function arraysMatchUnordered(
  a: Array<any>,
  b: Array<any>,
  comparator?: (a: any, b: any) => boolean
): boolean {
  if (!comparator) {
    comparator = (a, b) => {
      return a === b;
    };
  }
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    let found = false;
    for (let j = 0; j < b.length; j++) {
      if (comparator(a, b)) {
        found = true;
        break;
      }
    }

    if (!found) return false;
  }
  return true;
}
