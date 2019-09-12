import { isObject } from './is-object';

export function looseEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }
  if (!isObject(a) && !isObject(b)) {
    return String(a) === String(b);
  }
  return false;
}
