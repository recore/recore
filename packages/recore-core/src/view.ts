import classNames from 'classnames';
import { ReactType, ReactNode } from 'react';
import { isPlainObject, hasOwnProperty, looseEqual, looseIndexOf, shallowEqual, cloneDeep } from '@recore/utils';
import { shouldCompute, untracked } from '@recore/obx/lib/derivation';
import { Reaction } from '@recore/obx/lib/reaction';
import { $set, $get } from '@recore/obx/lib/utils';
import { defineObxProperty } from '@recore/obx/lib/observable/obx-property';
import { ObxFlag, getObx } from '@recore/obx/lib/observable/obx';
import Area from './area';
import { nextId } from './utils';

const PROP_GS = Symbol.for('prop-gs');

export default class View {
  private computedProps: { [key: string]: any } = {};
  private xmodelAssign?: {
    (v: any): void;
    prop: string;
  };
  private shadowModel: any;

  $ref: any = null;

  constructor(
    area: Area,
    id: string,
    component: ReactType,
    getProps?: (scope: object, area: Area) => any[],
    getSlots?: (area: Area) => { [slot: string]: ReactNode },
  ) {
    defineObxProperty(this, '$ref', null, {}, ObxFlag.REF);
    const scope = area.scope;
    if (id) {
      scope._views[id] = this;
      if (scope.$top !== scope) {
        if (!scope.$top._views[id]) {
          scope.$top._views[id] = area.path;
        } else if (process.env.NODE_ENV === 'development') {
          if (scope.$top._views[id] !== area.path) {
            console.warn(`Duplicated view id "${id}"`);
          }
        }
      }
    }

    const refresh = () => {
      const obx = getObx(this._props);
      if (!obx || shouldCompute(obx)) {
        area.runImmediately();
      }
    };

    const listen = (prop: any) => {
      return function f(this: any, ...args: any[]) {
        const ret = prop.apply(this, args);
        refresh();
        return ret;
      };
    };

    class ShadowModel {
      value: any;

      constructor(getter: () => any) {
        defineObxProperty(this, 'value', {}, {}, ObxFlag.DEEP);
        const that = this;
        const reactionName = 'ViewAutorun@' + nextId();
        const reaction = new Reaction(
          reactionName,
          function(this: Reaction) {
            this.track(() => {
              // console.log('------ [autorun] shadowModel value changes to', getter());
              that.value = getter && getter();
            });
          },
          0,
          0
        );
        reaction.runReaction();
      }
    }

    const processXModelMediator = (getter: () => any, maps: any, events: any) => {
      if (!this.shadowModel) {
        this.shadowModel = new ShadowModel(getter);
      }

      addToEvents(events, 'onChange', (data: any) => {
        return assign((v) => {
          // console.log(`------ ${this.props.fieldId} [onChange] shadowModel value changes to`, v);
          this.shadowModel.value = hasOwnProperty(v, 'value') ? v.value : v;
        }, () => this.shadowModel.value, data);
      });
      const data = this.shadowModel.value;

      const useChecked =
        component === 'input'
          ? maps.type === 'radio' || maps.type === 'checkbox'
          : (component as any).propTypes && (component as any).propTypes.checked;
      if (useChecked) {
        if (component === 'input' && maps.type === 'checkbox') {
          if (Array.isArray(data)) {
            maps.checked = looseIndexOf(data, maps.value) > -1;
          } else {
            maps.checked = looseEqual(data, true);
          }
        } else {
          maps.checked = looseEqual(maps.value, data);
        }
      } else {
        maps.value = data;
      }
    };

    const processXModel = (xmodel: [() => any, (v: any) => void], maps: any, events: any) => {
      this.xmodelAssign = undefined;
      if (!xmodel) {
        return;
      }

      const [getter, setter] = xmodel;
      if (!getter || !setter) {
        return;
      }
      addToEvents(events, 'onChange', (data: any) => {
        return assign(setter, getter, data);
      });
      const data = getter();
      const useChecked =
        component === 'input'
          ? maps.type === 'radio' || maps.type === 'checkbox'
          : (component as any).propTypes && (component as any).propTypes.checked;
      if (useChecked) {
        // FIXME: checked xmodelAssign
        // this.xmodelAssign!.prop = 'checked';
        if (component === 'input' && maps.type === 'checkbox') {
          if (Array.isArray(data)) {
            maps.checked = looseIndexOf(data, maps.value) > -1;
          } else {
            maps.checked = looseEqual(data, true);
          }
        } else {
          maps.checked = looseEqual(maps.value, data);
        }
      } else {
        this.xmodelAssign = setter as any;
        this.xmodelAssign!.prop = 'value';
        maps.value = data;
      }
    };

    const addAPI = (ref: any) => {
      if (ref && (!ref.prop || !ref.prop[PROP_GS])) {
        try {
          ref.prop = this.prop.bind(this);
          (ref.prop as any)[PROP_GS] = true;
          ref.get = this.get.bind(this);
          ref.set = this.set.bind(this);
        } catch (e) {
          // warning
        }
      }
    };

    const processRef = (maps: any) => {
      let originRef = maps.ref;
      if (typeof originRef === 'string') {
        const refKey = originRef;
        originRef = (ref: any) => {
          $set(scope, `$refs/${refKey}`, ref);
        };
      }
      maps.ref = (inst: any) => {
        let instance = inst;
        if (inst && typeof inst.getInstance === 'function') {
          instance = inst.getInstance();
        }
        if (instance) {
          addAPI(instance);
        }
        this.$ref = instance;
        if (originRef) {
          if (typeof originRef === 'function') {
            originRef(instance);
          } else {
            try {
              originRef.current = instance;
            } catch (e) { }
          }
        }
      };
    };

    const processProps = (maps: any, propsArr: any[]) => {
      const klass: any[] = [];
      const events: EventsMap = {};
      // [name, value]
      // [null, value]  spread
      for (let i = 0, l = propsArr.length; i < l; i++) {
        const [name, data] = propsArr[i];

        if (!name) {
          for (let key in data) {
            if (hasOwnProperty(data, key)) {
              processData(key, data[key], klass, events, maps, listen);
            }
          }
        } else {
          processData(name, data, klass, events, maps, listen);
        }
      }
      if (klass.length > 0) {
        maps.className = classNames(klass);
      }
      processRef(maps);
      if ('x-model' in maps) {
        if (maps['x-model'].mediator) {
          processXModelMediator(maps['x-model'].mediator[0], maps, events);
        } else {
          processXModel(maps['x-model'], maps, events);
        }
        delete maps['x-model'];
      }
      mergeEvents(maps, events, listen);
    };

    defineObxProperty(
      this,
      'computedProps',
      {},
      {
        get() {
          const maps: any = {};
          processProps(maps, getProps ? getProps(scope, area) : []);
          if (getSlots) {
            Object.assign(maps, getSlots(area));
          }
          return maps;
        },
      },
      ObxFlag.REF,
    );
    defineObxProperty(this, '_props', {}, {}, ObxFlag.VAL);
    defineObxProperty(this, '_setted', {}, {}, ObxFlag.VAL);
  }

  private computedKeys?: string[];
  private settedKeys: string[] = [];
  private _props?: { [key: string]: any };
  private _setted: { [key: string]: any } = {};
  get props() {
    const keys = Object.keys(this.computedProps);
    const settedKeys = Object.keys(this._setted);
    if (this._props && shallowEqual(this.computedKeys, keys) && shallowEqual(this.settedKeys, settedKeys)) {
      return this._props;
    }

    this.settedKeys = settedKeys;
    this.computedKeys = keys;
    const props = {};

    unionArray(keys, settedKeys).forEach(key => {
      Object.defineProperty(props, key, {
        configurable: false,
        enumerable: true,
        get: () => {
          return this._setted[key] !== undefined ? this._setted[key] : this.computedProps[key];
        },
        set: val => {
          if (this.xmodelAssign && this.xmodelAssign.prop === key) {
            this.xmodelAssign(val);
          } else {
            this._setted[key] = val;
          }
        },
      });
    });
    this._props = props;
    return this._props;
  }

  get(key: string): any {
    if (this.shadowModel && key === 'value') {
      return this.shadowModel.value;
    }
    return $get(this.props, key);
  }

  set(key: string, val: any) {
    if (this.shadowModel && key === 'value') {
      this.shadowModel.value = val;
      return;
    }
    if (hasOwnProperty(this._props, key)) {
      this._props![key] = val;
    } else {
      $set(this._setted, key, val);
    }
  }

  prop(key: string, val?: any): any {
    if (val === undefined) {
      return this.get(key);
    } else {
      this.set(key, val);
    }
  }
}

function unionArray(arr1: any[], arr2: any[]) {
  return Array.from(new Set(arr1.concat(arr2)));
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
  [type: string]: Function[];
}

function mergeEvents(maps: any, events: EventsMap, listen: (v: any) => any) {
  Object.keys(events).forEach(type => {
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

function addToEvents(events: EventsMap, key: string, fn: any) {
  if (!hasOwnProperty(events, key)) {
    events[key] = [fn];
  } else {
    events[key].push(fn);
  }
}

function processData(
  key: string,
  value: any,
  klass: any[],
  events: EventsMap,
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
    addToEvents(events, key, value);
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

function isNativeEvent(e: any) {
  if (e && e.nativeEvent && e.target) {
    return true;
  }
  return false;
}

function assign(setter: (v: any) => void, getter: () => any, data: any) {
  if (!isNativeEvent(data)) {
    setter(data);
    return;
  }

  const target = data.target;
  if (target.nodeName === 'INPUT') {
    if (target.type === 'radio') {
      if (target.checked) {
        setter(target.value);
      }
    } else if (target.type === 'checkbox') {
      const data = untracked(() => getter());
      if (Array.isArray(data)) {
        if (target.checked) {
          data.push(target.value);
        } else {
          let l = data.length;
          while (l-- >= 0) {
            if (looseEqual(data[l], target.value)) {
              data.splice(l, 1);
            }
          }
        }
        setter(data);
      } else {
        setter(target.checked);
      }
    } else {
      setter(target.value);
    }
  } else if (target.nodeName === 'SELECT') {
    const data = Array.prototype.filter.call(target.options, (o: any) => o.selected).map((o: any) => o.value);
    setter(target.multiple ? data : data[0]);
  } else {
    setter(target.value);
  }
}
