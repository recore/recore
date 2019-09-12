import { looseEqual } from './loose-equal';

export function looseIndexOf(arr: any[], val: any): number {
  for (let i = 0, l = arr.length; i < l; i++) {
    if (looseEqual(arr[i], val)) {
      return i;
    }
  }
  return -1;
}
