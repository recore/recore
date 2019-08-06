export function setPrototypeOf(target: any, proto: any) {
  // @ts-ignore
  if (typeof Object.setPrototypeOf !== 'undefined') {
    // @ts-ignore
    Object.setPrototypeOf(target, proto);
  } else {
    target.__proto__ = proto;
  }
}
