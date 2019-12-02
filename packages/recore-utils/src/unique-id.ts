let guid = Date.now();
export function uniqueId(prefix: string = '') {
  return `${prefix}${(guid++).toString(36).toLowerCase()}`;
}
