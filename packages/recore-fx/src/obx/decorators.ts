import { addHiddenProp, nextId } from './utils';
import { ObxFlag } from './observable/obx';
import { hasOwnProperty } from '../utils/has-own-property';
import { asObservable } from './observable/observable';
import { hasObx, injectObx } from './observable/obx';
import ObxInstance from './observable/obx-instance';
import { defineObxProperty } from './observable/obx-property';

type DecoratorHandler = (target: any, description: DecoratorDescription) => void;

export interface DecoratorDescription {
  prop: string;
  descriptor?: PropertyDescriptor;
  decoratorHandler: DecoratorHandler;
  [key: string]: any;
}

export const SYMBOL_DECORATORS = Symbol('__obxDecorators');

export interface DecoratorTarget {
  [SYMBOL_DECORATORS]?: { [prop: string]: DecoratorDescription };
}

function isDecoratorTarget(a: any): a is DecoratorTarget {
  return a[SYMBOL_DECORATORS] ? true : false;
}

function getDecorators(a: DecoratorTarget) {
  return a[SYMBOL_DECORATORS];
}

const descriptorCache: { [prop: string]: PropertyDescriptor } = {};

function createPropertyInitializerDescriptor(prop: string): PropertyDescriptor {
  return (
    descriptorCache[prop] ||
    (descriptorCache[prop] = {
      configurable: true,
      enumerable: false,
      get() {
        initializeDecoratorTarget(this as DecoratorTarget);
        // TODO not safe
        return (this as any)[prop];
      },
      set(value) {
        initializeDecoratorTarget(this as DecoratorTarget);
        // TODO not safe
        (this as any)[prop] = value;
      },
    })
  );
}

const SYMBOL_INITIALIZED = Symbol('__obxInitialized');

export function isUnInitializedDecoratorTarget(a: any): a is DecoratorTarget {
  return isDecoratorTarget(a) && (a as any)[SYMBOL_INITIALIZED] !== true;
}

export function initializeDecoratorTarget(target: DecoratorTarget) {
  if ((target as any)[SYMBOL_INITIALIZED] === true) {
    return;
  }
  addHiddenProp(target, SYMBOL_INITIALIZED, true);

  const decorators = getDecorators(target);
  if (decorators) {
    Object.keys(decorators).forEach(key => {
      const description = decorators[key];
      description.decoratorHandler(target, description);
    });
  }
}

function ensureObxInstance(target: any) {
  if (!hasObx(target)) {
    const name = (target.constructor.name || 'ObservableObject') + '@' + nextId();
    const obx = new ObxInstance(name, target);
    injectObx(target, obx);
  }
}

function obxDecoratorHandler(target: any, { prop, descriptor, flag }: DecoratorDescription) {
  ensureObxInstance(target);

  const initialValue = descriptor
    ? (descriptor as any).initializer
      ? (descriptor as any).initializer.call(target)
      : descriptor.value
    : undefined;

  defineObxProperty(
    target as any,
    prop,
    initialValue,
    {
      set: descriptor && descriptor.set,
      get: descriptor && descriptor.get,
    },
    flag,
  );
}

function computedDecoratorHandler(target: any, { prop, descriptor }: DecoratorDescription) {
  ensureObxInstance(target);

  if (!descriptor) {
    return;
  }

  if (descriptor.get) {
    defineObxProperty(
      target as any,
      prop,
      undefined,
      {
        set: descriptor.set,
        get: descriptor.get,
      },
      ObxFlag.REF,
    );
    return;
  }

  const originFn = descriptor
    ? (descriptor as any).initializer
      ? (descriptor as any).initializer.call(target)
      : descriptor.value
    : undefined;

  if (typeof originFn === 'function') {
    const x: any = {};
    defineObxProperty(
      x,
      'v',
      null,
      {
        get: () => originFn.call(target),
      },
      ObxFlag.REF,
    );
    Object.defineProperty(target, prop, {
      enumerable: false,
      configurable: true,
      value() {
        return x.v;
      },
    });
  }
}

function propDecoratorHandler(target: any, { prop, descriptor }: DecoratorDescription) {
  ensureObxInstance(target);

  let defaultValue = descriptor
    ? (descriptor as any).initializer
      ? (descriptor as any).initializer.call(target)
      : descriptor.value
    : undefined;

  defineObxProperty(
    target as any,
    prop,
    null,
    {
      get() {
        if (target.$props && target.$props[prop] !== undefined) {
          return target.$props[prop];
        }
        return defaultValue;
      },
      set(v) {
        if (defaultValue === undefined) {
          defaultValue = v;
        }
      },
    },
    ObxFlag.REF,
  );
}

// deep
export function observable(
  target: any,
  prop?: string,
  descriptor?: PropertyDescriptor,
  flag: ObxFlag = ObxFlag.DEEP,
): any {
  if (!prop) {
    const obx = asObservable(target, flag);
    if (obx) {
      return obx.target as any;
    }
    return target;
  }

  return decorator(target, prop, obxDecoratorHandler, descriptor, { flag });
}

function decorator(
  target: any,
  prop: string,
  decoratorHandler: DecoratorHandler,
  descriptor?: PropertyDescriptor,
  extras?: object,
) {
  if (!hasOwnProperty(target, SYMBOL_DECORATORS)) {
    const inheritedDecorators = target[SYMBOL_DECORATORS];
    addHiddenProp(target, SYMBOL_DECORATORS, { ...inheritedDecorators });
  }
  target[SYMBOL_DECORATORS][prop] = {
    prop,
    decoratorHandler,
    descriptor,
    ...extras,
  };
  return createPropertyInitializerDescriptor(prop);
}

export function prop(target: any, prop: string, descriptor?: PropertyDescriptor) {
  return decorator(target, prop, propDecoratorHandler, descriptor);
}

export function computed(target: any, prop?: string, descriptor?: PropertyDescriptor) {
  if (!prop) {
    if (typeof target === 'function') {
      const fn = target;
      target = {
        get value() {
          return fn();
        },
      };
    }
    const obx = asObservable(target, ObxFlag.VAL);
    if (obx) {
      return obx.target as any;
    }
    return target;
  }
  return decorator(target, prop, computedDecoratorHandler, descriptor);
}

export const obx = observable;

export function obxProperty(target: any, prop: string, flag: ObxFlag = ObxFlag.DEEP) {
  defineObxProperty(target, prop, null, undefined, flag);
}

// deep
observable.deep = function(target: any, prop?: string, descriptor?: PropertyDescriptor) {
  return observable(target, prop, descriptor, ObxFlag.DEEP);
};

// shallow
observable.shallow = function(target: any, prop?: string, descriptor?: PropertyDescriptor) {
  return observable(target, prop, descriptor, ObxFlag.SHALLOW);
};

// value
observable.val = function(target: any, prop?: string, descriptor?: PropertyDescriptor) {
  return observable(target, prop, descriptor, ObxFlag.VAL);
};

// alias value
observable.self = observable.val;

// ref
observable.ref = function(target: any, prop?: string, descriptor?: PropertyDescriptor) {
  return observable(target, prop, descriptor, ObxFlag.REF);
};
