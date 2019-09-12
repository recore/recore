import { isPlainObject } from './is-plain-object';

export function toJS(src: any): any {
  const type = typeof src;

  let data: any;
  if (src === null || src === undefined) {
    data = src;
  } else if (Array.isArray(src)) {
    data = src.map(item => toJS(item));
  } else if (type === 'object' && isPlainObject(src)) {
    data = {};
    for (const key in src) {
      if (src.hasOwnProperty(key)) {
        data[key] = toJS(src[key]);
      }
    }
  } else {
    data = src;
  }

  return data;
}
