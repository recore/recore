import { globalState } from './global-state';
import { hasObx, getObx } from './observable/obx';
import { startBatch, endBatch } from './observable/observable';
import { isUnInitializedDecoratorTarget, initializeDecoratorTarget } from './decorators';
import { splitPath } from '../utils/split-path';

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

  if (isUnInitializedDecoratorTarget(target)) {
    initializeDecoratorTarget(target);
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

  if (isUnInitializedDecoratorTarget(target)) {
    initializeDecoratorTarget(target);
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

  if (isUnInitializedDecoratorTarget(ret)) {
    initializeDecoratorTarget(ret);
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


