import { hasOwnProperty } from '@recore/utils/has-own-property';

import { createPropertyInitializerDescriptor, addHiddenProp, SYMBOL_DECORATORS } from './utils';
import { ObxFlag } from './observable/obx';
import { asObservable } from './observable/observable';

// deep
export function observable(
  target: any,
  prop?: string,
  descriptor?: PropertyDescriptor,
  flag: ObxFlag = ObxFlag.DEEP
): any {
  if (!prop) {
    const obx = asObservable(target, flag);
    if (obx) {
      return obx.target as any;
    }
    return target;
  }
  if (!hasOwnProperty(target, SYMBOL_DECORATORS)) {
    const inheritedDecorators = target[SYMBOL_DECORATORS];
    addHiddenProp(target, SYMBOL_DECORATORS, { ...inheritedDecorators });
  }
  target[SYMBOL_DECORATORS][prop] = {
    prop,
    descriptor,
    flag,
  };
  return createPropertyInitializerDescriptor(prop);
}

export const obx = observable;

// deep
observable.deep = function (target: any, prop?: string, descriptor?: PropertyDescriptor) {
  return observable(target, prop, descriptor, ObxFlag.DEEP);
};

// shallow
observable.shallow = function (target: any, prop?: string, descriptor?: PropertyDescriptor) {
  return observable(target, prop, descriptor, ObxFlag.SHALLOW);
};

// value
observable.val = function (target: any, prop?: string, descriptor?: PropertyDescriptor) {
  return observable(target, prop, descriptor, ObxFlag.VAL);
};

// alias value
observable.self = observable.val;

// ref
observable.ref = function (target: any, prop?: string, descriptor?: PropertyDescriptor) {
  return observable(target, prop, descriptor, ObxFlag.REF);
};
