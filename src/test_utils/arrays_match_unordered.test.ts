/**
 * arraysMatchUnordered() - Checks if 2 arrays match without regard to order
 * @param a - first list
 * @param b - second list
 * @param comparator - function to compare elements, defaults to ===
 * @returns - If arrays match without regard to order
 */
export default function arraysMatchUnordered<T>(a: Array<T>, b: Array<T>, comparator?: (a: T, b: T) => boolean): boolean {
  if (!comparator) {
    comparator = (a, b) => {
      return a === b;
    };
  }
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    let found = false;
    for (let j = 0; j < b.length; j++) {
      if (comparator(a[i], b[j])) {
        found = true;
        break;
      }
    }

    if (!found) return false;
  }
  return true;
}
