import { initializeInstance, splitPath, $get, $set, addHiddenFinalProp } from '@recore/obx/utils';
import { defineObxProperty } from '@recore/obx/observable/obx-property';
import { ObxFlag } from '@recore/obx/observable/obx';
import { asObservable } from '@recore/obx/observable/observable';
import { hasOwnProperty, setPrototypeOf } from '@recore/utils';

import { globalHelpers, reportError } from '../lib';

import Area, { AreaConfig, IArea } from './area';

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

export default abstract class ViewController<T extends Object = PageRequest> {
  readonly $parent: ViewController | undefined;
  readonly $props: any = {};
  private __area: Area | null = null;

  constructor(props: T) {
    defineObxProperty(this, '$props', props, {}, ObxFlag.REF);
    defineObxProperty(this, '$refs', {}, {}, ObxFlag.SHALLOW);
  }

  __m(config: AreaConfig): Area {
    if (!this.__area) {
      this.__area = new Area(this, config);
    }

    return this.__area;
  }

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

  $destroy() {
    // 页面卸载 times: 1
  }

  $action(actions: FlowAction | FlowAction[], area: IArea): () => void {
    if (!Array.isArray(actions)) {
      actions = [ actions ];
    }

    const actionList = parseActions(actions, this);

    return (...args: any[]) => {
      return doAction(actionList, this, area.scope, args);
    };
  }

  $(key: string): any {
    if (key === '' || key == null) {
      return undefined;
    }

    const pathArray = splitPath(String(key));
    const entry = pathArray && pathArray[1] || key;

    if (entry in this) {
      const ret = this.$get(key);
      if (typeof ret === 'function') {
        return ret.bind(this);
      }
      return ret;
    }

    if (hasOwnProperty(this.$props, key)) {
      return this.$props[key];
    }

    const helpers = (this as any).__vxHelpers;
    if (hasOwnProperty(helpers, key)) {
      return helpers[key];
    }

    if (hasOwnProperty(globalHelpers, key)) {
      return globalHelpers[key];
    }

    if (hasOwnProperty(global, key)) {
      return (global as any)[key];
    }

    throw new ReferenceError(`property "${key}" was not declared`);
  }

  $get(key: string) {
    initializeInstance(this as any);
    return $get(this, key);
  }

  $set(key: string, val: any) {
    initializeInstance(this as any);
    $set(this, key, val);
  }

  $derive(data: object) {
    initializeInstance(this as any);
    asObservable(data, ObxFlag.SHALLOW);
    addHiddenFinalProp(data, '$super', this);
    setPrototypeOf(data, this);
    return (data as any);
  }
}

function parseActions(actions: FlowAction[], context: any): any {
  return actions.map((action: any) => {
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
          fn: context[action].bind(context),
        };
      }
      return null;
    }

    // recore-loader not support yet
    if (action.name && typeof context[action.name] === 'function') {
      return {
        name: action.name,
        fn: context[action.name].bind(context),
        params: action.params,
      };
    }

    return null;
  }).filter(Boolean);
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

  const i = new Promise((resolve) => {
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
      res = item.fn.apply(context, args.concat([ actionContextData ]));
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
