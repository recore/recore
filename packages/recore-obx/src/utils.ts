import { globalState } from './global-state';
import { hasObx, injectObx, getObx } from './observable/obx';
import ObxInstance from './observable/obx-instance';
import { startBatch, endBatch } from './observable/observable';

export function nextId() {
  return (++globalState.guid).toString(36).toLocaleLowerCase();
}

export function walk(obj: object, fn: (obj: object, key: string, val: any) => void): void {
  const keys = Object.keys(obj) as any;
  for (let i = 0; i < keys.length; i++) {
    fn(obj, keys[i], (obj as any)[keys[i]]);
  }
}

export function addHiddenProp(object: any, propName: string | symbol, value: any) {
  Object.defineProperty(object, propName, {
    enumerable: false,
    writable: true,
    configurable: true,
    value,
  });
}

export function addHiddenFinalProp(object: any, propName: string | symbol, value: any) {
  Object.defineProperty(object, propName, {
    enumerable: false,
    writable: false,
    configurable: true,
    value,
  });
}

const RE_PATH = /^([^/]*)(?:\/(.*))?$/;
const RE_PATH_REVERSE = /^(?:(.*)\/)?([^/]+)$/;
export function splitPath(path: string, reverse: boolean = false) {
  return reverse ? RE_PATH_REVERSE.exec(path) : RE_PATH.exec(path);
}

export interface DecoratorDescription {
  prop: string;
  descriptor?: PropertyDescriptor;
  decoratorTarget: any;
}

export const SYMBOL_DECORATORS = Symbol('__obxDecorators');

export interface DecoratorTarget {
  [SYMBOL_DECORATORS]?: { [prop: string]: DecoratorDescription };
}

export function isDecoratorTarget(a: any): a is DecoratorTarget {
  return a[SYMBOL_DECORATORS] ? true : false;
}

export function getObxDecorators(a: DecoratorTarget) {
  return a[SYMBOL_DECORATORS];
}

const descriptorCache: { [prop: string]: PropertyDescriptor } = {};

export function createPropertyInitializerDescriptor(prop: string): PropertyDescriptor {
  return (descriptorCache[prop] || (descriptorCache[prop] = {
    configurable: true,
    enumerable: false,
    get() {
      initializeInstance(this as DecoratorTarget);
      // TODO not safe
      return (this as any)[prop];
    },
    set(value) {
      initializeInstance(this as DecoratorTarget);
      // TODO not safe
      (this as any)[prop] = value;
    },
  }));
}

export const SYMBOL_INITIALIZED = Symbol('__obxInitialized');

export function initializeInstance(target: DecoratorTarget) {
  if ((target as any)[SYMBOL_INITIALIZED] === true) {
    return;
  }
  addHiddenProp(target, SYMBOL_INITIALIZED, true);

  if (!hasObx(target)) {
    const name = (target.constructor.name || 'ObservableObject') + '@' + nextId();
    const obx = new ObxInstance(name, target);
    injectObx(target, obx);
  }
}

function formatNestValue(nestPath: string, val: any): any {
  if (!nestPath) {
    return val;
  }

  const pathArray = splitPath(nestPath, true);

  if (!pathArray) {
    return val;
  }

  const [ _, path, key ] = pathArray;

  return formatNestValue(path, key ? { [key]: val } : val);
}

export function $has(target: any, path: PropertyKey): boolean {
  if (path === '' || target == null) {
    return false;
  }

  let entry = path;
  let nestPath: string = '';

  if (typeof path === 'string') {
    const pathArray = splitPath(path, true);

    if (!pathArray) {
      return false;
    }

    entry = pathArray[2];
    nestPath = pathArray[1];
  }

  if (!entry) {
    return $has(target, nestPath);
  }

  let ret = target;
  if (nestPath) {
    ret = $get(target, nestPath);
    if (ret == null) {
      return false;
    }
  }

  return hasObx(ret) ? getObx(ret)!.has(entry) : (entry in ret);
}

export function $get(target: any, path: PropertyKey): any {
  if (path === '' || target == null) {
    return target;
  }

  let entry = path;
  let nestPath = '';

  if (typeof path === 'string') {
    const pathArray = splitPath(path);

    if (!pathArray) {
      return undefined;
    }

    entry = pathArray[1];
    nestPath = pathArray[2];
  }

  if (!entry) {
    return $get(target, nestPath);
  }

  const ret = hasObx(target) ? getObx(target)!.get(entry) : target[entry];

  if (!nestPath || ret == null) {
    return ret;
  }

  return $get(ret, nestPath);
}

export function $set(target: any, path: PropertyKey, val: any) {
  if (path === '' || target == null) {
    return;
  }

  let entry = path;
  let nestPath: string = '';

  if (typeof path === 'string') {
    const pathArray = splitPath(path);

    if (!pathArray) {
      return;
    }

    entry = pathArray[1];
    nestPath = pathArray[2];
  }

  if (!entry) {
    if (nestPath) {
      $set(target, nestPath, val);
    }
    return;
  }

  let v;
  if (hasObx(target)) {
    const obx = getObx(target)!;
    if (!nestPath || (v = obx.get(entry)) == null) {
      obx.set(entry, formatNestValue(nestPath, val));
      return;
    }
  } else if (!nestPath || (v = target[entry]) == null) {
    target[entry] = formatNestValue(nestPath, val);
    return;
  }

  $set(v, nestPath, val);
}

export function $del(target: any, path: PropertyKey) {
  if (path === '' || target == null) {
    return;
  }

  let entry = path;
  let nestPath: string = '';

  if (typeof path === 'string') {
    const pathArray = splitPath(path, true);

    if (!pathArray) {
      return;
    }

    entry = pathArray[2];
    nestPath = pathArray[1];
  }

  if (!entry) {
    $del(target, nestPath);
    return;
  }

  let ret = target;
  if (nestPath) {
    ret = $get(target, nestPath);
    if (ret == null) {
      return;
    }
  }

  if (hasObx(ret)) {
    getObx(ret)!.del(entry);
  } else {
    delete ret[entry];
  }
}

export function $extend(target: any, properties: object) {
  startBatch();
  walk(properties, (_, key, val) => $set(target, key, val));
  endBatch();
}


