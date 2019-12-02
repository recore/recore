import { Reaction, autorun, clearReactions } from './reaction';
import { nextTick, clearTicks } from './next-tick';
import { $get, $set, $del, $extend } from './utils';
import ObxArray from './observable/obx-array';
import ObxObject from './observable/obx-object';
import ObxSet from './observable/obx-set';
import ObxMap from './observable/obx-map';
import { asObservable } from './observable/observable';
import { globalState } from './global-state';
import { getRawValue as $raw } from './observable/proxy';
import { untracked } from './derivation';
import { reportChange, ObxFlag } from './observable/obx';
import { isPlainObject } from '../utils/is-plain-object';
import { asNewValue } from './observable/obx-property';

export function resetObx() {
  clearTicks();
  clearReactions();
  globalState.reset();
}

(asObservable as any).getObxContructor = (thing: object) => {
  if (Array.isArray(thing)) {
    return ObxArray;
  }
  if (thing instanceof Set || thing instanceof WeakSet) {
    return ObxSet;
  }
  if (thing instanceof Map) {
    return ObxMap;
  }
  if (isPlainObject(thing)) {
    return ObxObject;
  }
  return null;
};

// export api
export { Reaction, reportChange, asNewValue, ObxFlag, autorun, nextTick, untracked, $get, $set, $del, $extend, $raw };
export * from './decorators';
export * from './observer';
