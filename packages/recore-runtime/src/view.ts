import { nextId, $set } from '@recore/obx/utils';
import {
  IObservable,
  reportObserved,
  startBatch,
  endBatch,
  propagateMaybeChanged,
  propagateChangeConfirmed,
} from '@recore/obx/observable/observable';
import {
  IDerivation,
  DerivationState,
  clearObserving,
  runDerivedFunction,
  shouldCompute,
  isCaughtException,
} from '@recore/obx/derivation';
import { globalState } from '@recore/obx/global-state';
import { isPlainObject, hasOwnProperty, looseEqual, looseIndexOf, invariant } from '@recore/utils';
import { cloneDeep } from '@recore/utils/clone-deep';
import classNames from 'classnames';

import Prop, { PropConfig } from './prop';
import { IArea } from './area';
import { IScope } from './scope';

export interface ViewConfig {
  key: string;
  name: string;
  props: PropConfig[];
}

function matchClassProperty(key: string): boolean | string {
  if (key === 'class' || key === 'className') {
    return true;
  }
  if (key.slice(0, 6) === 'class.') {
    return key.slice(6);
  }
  if (key.slice(0, 10) === 'className.') {
    return key.slice(10);
  }
  return false;
}

const RE_EVENT = /^on[A-Z]/;
function matchEventProperty(key: string) {
  return RE_EVENT.test(key);
}

function combo(fns: Function[]) {
  if (fns.length < 2) {
    return fns[0];
  }
  return function(this: any, ...rest: any[]) {
    for (let i = 0, l = fns.length; i < l; i++) {
      fns[i].apply(this, rest);
    }
  };
}

interface EventsMap {
  [type: string]: Function [];
}

function mergeEvents(maps: any, events: EventsMap, listen: (v: any) => any) {
  Object.keys(events).forEach((type) => {
    maps[type] = listen(combo(events[type]));
  });
}

const RE_SPLIT = /\b\./;
function formatNestValue(nestPath: string[], val: any): any {
  if (nestPath.length < 1) {
    return val;
  }

  const key = nestPath.pop()!;
  return formatNestValue(nestPath, key ? { [key]: val } : val);
}
function deepSet(origin: any, path: string[], val: any): any {
  if (origin == null || !isPlainObject(origin)) {
    return formatNestValue(path, val);
  }

  const key = path.shift();
  if (!key) {
    return val;
  }

  const cloned: any = { ...origin };
  if (path.length > 0) {
    cloned[key] = deepSet(cloned[key], path, val);
  } else {
    cloned[key] = val;
  }

  return cloned;
}

function processData(
  key: string, value: any,
  klass: any[], events: EventsMap,
  rest: { [k: string]: any },
  listen: (v: any) => any,
) {
  const m = matchClassProperty(key);
  if (m) {
    if (m === true) {
      klass.push(value);
    } else {
      if (value) {
        klass.push(m);
      }
    }
    return;
  }

  if (key === 'style') {
    rest[key] = cloneDeep(value);
    return;
  }

  const isFn = typeof value === 'function';

  if (matchEventProperty(key) && isFn) {
    if (!hasOwnProperty(events, key)) {
      events[key] = [ value ];
    } else {
      events[key].push(value);
    }
    return;
  }

  if (key.indexOf('.') > -1) {
    const path = key.split(RE_SPLIT);
    if (path.length > 1) {
      key = path.shift()!;
      rest[key] = deepSet(rest[key], path, value);
      return;
    }
  }

  rest[key] = isFn ? listen(value) : value;
}

export default class View implements IObservable, IDerivation {
  id = nextId();
  key: string;
  name: string;
  observing: IObservable[] = [];
  observers = new Set();
  dependenciesState = DerivationState.NOT_TRACKING;
  lowestObserverState = DerivationState.UP_TO_DATE;

  private scope: IScope;
  private isComputing: boolean = false;
  private computeFn: () => any;
  private data: any;
  private propsArr: Prop[] = [];
  private propsMap: any = {};

  constructor(private area: IArea, { key, name, props }: ViewConfig) {
    this.key = key;
    this.name = `${name}@${this.id}`;
    this.propsArr = (props || []).map((config) => {
      const prop = new Prop(area, config, this);
      if (!prop.isSpread()) {
        this.propsMap[prop.key] = prop;
      }
      return prop;
    });
    this.scope = this.area.scope;
    const component = this.scope.__V.get(name);

    const v = this; // tslint:disable-line
    const listen = (prop: any): any => {
      return function f(this: any, ...args: any[]) {
        const ret = prop.apply(this, args);
        v.refresh();
        return ret;
      };
    }

    this.computeFn = () => {
      const maps: any = {};
      const klass: any[] = [];
      const events: EventsMap = {};
      for (let i = 0, l = this.propsArr.length; i < l; i++) {
        const prop = this.propsArr[i];

        if (prop.isSpread()) {
          const spreadData = prop.getData();
          for (let key in spreadData) {
            if (hasOwnProperty(spreadData, key)) {
              processData(key, spreadData[key], klass, events, maps, listen);
            }
          }
        } else {
          processData(prop.key, prop.getData(), klass, events, maps, listen);
        }
      }
      // FIXME: remove these codes
      if (!maps.key) {
        // maps.key = `${this.key}-${this.id}`;
      }
      if (klass.length > 0) {
        maps.className = classNames(klass);
      }
      if (maps.ref && typeof maps.ref === 'string') {
        const refKey = maps.ref;
        maps.ref = (ref: any) => {
          $set(this.scope, `$refs/${refKey}`, ref);
        };
      }
      if ('x-model' in maps) {
        let data = maps['x-model'];
        delete maps['x-model'];
        if (component === 'input') {
          if (maps.type === 'radio') {
            maps.checked = looseEqual(maps.value, data);
          } else if (maps.type === 'checkbox') {
            if (Array.isArray(data)) {
              maps.checked = looseIndexOf(data, maps.value) > -1
            } else {
              maps.checked = looseEqual(data, true);
            }
          } else {
            maps.value = data;
          }
        } else if (component && component.propTypes) {
          maps[component.propTypes.checked ? 'checked' : 'value'] = data;
        } else {
          maps.value = data;
        }
      }
      mergeEvents(maps, events, listen);
      return maps;
    };
  }

  onBecomeDirty() {
    propagateMaybeChanged(this);
  }

  onBecomeUnobserved() {
    clearObserving(this);
  }

  ifModified() {
    if (this.checkRun()) {
      propagateChangeConfirmed(this);
    }
  }

  get props() {
    invariant(!this.isComputing, `Cycle detected in computation ${this.name}`);

    reportObserved(this);

    this.ifModified();

    const result = this.data;

    if (isCaughtException(result)) {
      throw result.cause;
    }

    return result;
  }

  refresh() {
    if (shouldCompute(this)) {
      this.area.runImmediately();
    }
  }

  private checkRun() {
    if (this.scope !== this.area.scope || shouldCompute(this)) {
      this.scope = this.area.scope;
      startBatch();
      this.isComputing = true;
      globalState.computationDepth++;
      this.data = runDerivedFunction(this, this.computeFn!);
      globalState.computationDepth--;
      this.isComputing = false;
      endBatch();
      return true;
    }
    return false;
  }
}
