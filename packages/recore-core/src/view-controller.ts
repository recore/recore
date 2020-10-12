import { ErrorInfo, ReactInstance } from 'react';
import { initializeDecoratorTarget } from '@recore/obx';
import { hasOwnProperty, setPrototypeOf, splitPath } from '@recore/utils';
import { $get, $set, addHiddenFinalProp } from '@recore/obx/lib/utils';
import { defineObxProperty } from '@recore/obx/lib/observable/obx-property';
import { ObxFlag } from '@recore/obx/lib/observable/obx';
import Area from './area';
import View from './view';
import { reportError, globalUtils } from './utils';

export interface ActionConfig {
  name: string;
  fn?: () => void;
  params?: {};
}

export type FlowAction = string | ActionConfig | (() => void);

export interface ComponentProps {
  [key: string]: any;
}

export interface PageRequest extends ComponentProps {
  uri: string;
  path: string;
  query: { [key: string]: any };
  params: { [key: string]: any };
  state: any;
}

export abstract class ViewController<T extends Object = PageRequest> {
  readonly $props: any = {};
  readonly $top = this;
  readonly $utils: any;
  readonly utils: any;
  readonly $refs: { [id: string]: ReactInstance | null } = {};

  constructor(props: T) {
    defineObxProperty(this, '$props', props, {}, ObxFlag.REF);
    defineObxProperty(this, '$refs', {}, {}, ObxFlag.VAL);
    defineObxProperty(this, '_views', {}, {}, ObxFlag.VAL);

    const ControllerType: any = this.constructor;
    const utils = ControllerType.utils || ControllerType.helpers || {};
    setPrototypeOf(utils, globalUtils);
    this.$utils = utils;
    this.utils = utils;
  }

  readonly $root = new Area(this, { id: 'root' });

  $init(params: T) {
    // 初始化, times: 1
  }

  $receive(params: T) {
    // 再次进入页面，times: 0+
  }

  $enter(firstEnter: boolean, params: T) {
    // 页面进入时（初始化 + 再次进入页面）, times: 1+
    if (firstEnter) {
      this.$init(params);
    } else {
      this.$receive(params);
    }
  }

  $didMount() {
    // 页面视图挂载 times: 1
  }

  $didUpdate(prevProps: any, prevState: any, snapshot: any) {
    // 页面更新 times: 0+
  }

  $didCatch(error: Error, info: ErrorInfo) {
    // 错误捕捉 times: 0+
  }

  $destroy() {
    // 页面卸载 times: 1
  }

  _action(actions: FlowAction | FlowAction[]): () => void {
    if (!Array.isArray(actions)) {
      actions = [actions];
    }

    const context = this;
    const scope = this;

    const actionList = parseActions(actions, context);

    return (...args: any[]) => {
      return doAction(actionList, context, scope, args);
    };
  }

  _get(key: string): any {
    if (key === '' || key == null) {
      return undefined;
    }

    const pathArray = splitPath(String(key));
    const entry = (pathArray && pathArray[1]) || key;

    if (entry in this) {
      const ret = $get(this, key);
      if (typeof ret === 'function') {
        return ret.bind(this);
      }
      return ret;
    }

    if (hasOwnProperty(this.$props, key)) {
      return this.$props[key];
    }

    const $utils = this.$utils;
    if (key in $utils) {
      return $utils[key];
    }

    if (hasOwnProperty(global, key)) {
      return (global as any)[key];
    }

    reportError(new ReferenceError(`property "${key}" was not declared`));

    return undefined;
  }

  _set(key: string, val: any) {
    $set(this, key, val);
  }

  _derive(data: any) {
    initializeDecoratorTarget(this as any);
    addHiddenFinalProp(data, '$super', this);
    setPrototypeOf(data, this);
    defineObxProperty(data, '$refs', {}, {}, ObxFlag.VAL);
    setPrototypeOf(data.$refs, this.$refs);
    defineObxProperty(data, '_views', {}, {}, ObxFlag.VAL);
    setPrototypeOf(data._views, this._views);
    // TODO: possably cause bug on IE
    return readonlyTarget(data);
  }

  private _views: { [id: string]: any } = {};
  // eg. $('viewid') get current scope viewref
  $(id: string, useRef: boolean = true) {
    if (!id) {
      return null;
    }

    let m = RE_AREA_VIEW.exec(id);
    if (!m) {
      return null;
    }

    const [ _, vid, sub ] = m;
    const view = this._views[vid] || null;
    if (!view || typeof view !== 'string') {
      if (!view || !useRef) {
        return view;
      }
      return view.$ref || view;
    }

    let path = view;
    if (sub) {
      let index = 0;
      while (m = RE_INDEX.exec(sub.substring(index))) {
        const p = path.replace(RE_STAR, `/${m[1]}$1`);
        if (p === path) {
          return null;
        }
        path = p;
        index += m.index + m[0].length;
      }
    }

    return getView(this.$root.get(path), vid, useRef);
  }
}

const RE_AREA_VIEW = /^([\w\-]+)((?:\[\d+\])*)$/;
const RE_INDEX = /\[(\d+)\]/;
const RE_STAR = /\/\*(\/|$)/;

type Views = Array<null | View | View[] | Array<null | View | View[]>>;

function getView(area: Area | Area[] | null, vid: string, useRef: boolean): null | View | Views {
  if (!area) {
    return null;
  }
  if (Array.isArray(area)) {
    return area.map(a => getView(a, vid, useRef)) as any;
  }
  return area.getView(vid, useRef);
}

const supportProxy = 'Proxy' in global;

function readonlyTarget(target: any) {
  if (!supportProxy) {
    return target;
  }
  return new Proxy(target, {
    set(_, name: PropertyKey, value: any) {
      if (!hasOwnProperty(target, name)) {
        (target as any).$super[name] = value;
      }
      return true;
    },
    deleteProperty() {
      return false;
    },
    preventExtensions() {
      return false;
    },
  });
}

function parseActions(actions: FlowAction[], context: any): any {
  return actions
    .map((action: any) => {
      if (!action) {
        return null;
      }

      if (Array.isArray(action)) {
        const subActions = parseActions(action, context);
        return {
          name: 'ActionGroup',
          fn: (...args: any[]) => {
            const scope = args.pop();
            return doAction(subActions, context, scope, args);
          },
        };
      }

      const t = typeof action;

      if (t === 'function') {
        return {
          name: 'anonymous',
          fn: action,
        };
      }

      // recore-loader not support yet
      if (t === 'string' && typeof context[action] === 'function') {
        if (action in context) {
          return {
            name: action,
            fn: context[action],
          };
        }
        return null;
      }

      // recore-loader not support yet
      if (action.name && typeof context[action.name] === 'function') {
        return {
          name: action.name,
          fn: context[action.name],
          params: action.params,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function derive(parent: any, data: object) {
  setPrototypeOf(data, parent);
  return data;
}

function doAction(queue: any[], context: any, scope: any, args: any[]) {
  if (!queue) {
    return;
  }

  queue = queue.slice(0);

  let _resolve: () => void;

  const i = new Promise(resolve => {
    _resolve = resolve;
  });

  const fail = reportError;

  const next = (previousResult?: any) => {
    const item = queue.shift();
    if (!item) {
      return _resolve();
    }

    let res;
    try {
      const actionContextData = derive(scope, {
        previousResult,
        ...item.params,
      });
      res = item.fn.apply(context, args.concat([actionContextData]));
    } catch (e) {
      return fail(e);
    }

    if (res === false) {
      // interrupt
      return null;
    }

    if (res && res.then) {
      res.then(next).catch(fail);
    } else if (res instanceof Error) {
      fail(res);
    } else {
      next(res);
    }
    return null;
  };

  next();

  return i;
}
