import { render } from 'react-dom';
import { ReactType, ReactNode, createElement, Fragment } from 'react';
import Link from './router/link';
import NavLink from './router/nav-link';
import Route from './router/route';
import Redirect from './router/redirect';
import navigator, { HistoryOptions } from './navigator';
import Root from './router/root';
import { hasOwnProperty, isObject } from '../utils';

export function xId(obj: any, defaultKey: any): string {
  return String(obj && obj.$id || defaultKey);
}

export interface ComponentsMap {
  [key: string]: ReactType;
}

function notFound(type: string) {
  return () => createElement('div', null, `Component "${type}" Not Found.`);
}

function getComponent(maps: ComponentsMap, name: string) {
  const ns = name.split('.');
  let key = ns.shift()!;
  if (!hasOwnProperty(maps, key)) {
    return null;
  }

  let component = maps[key];
  while (ns.length > 0) {
    key = ns.shift()!;
    component = (component as any)[key];
    if (!component) {
      return notFound(name);
    }
  }
  return component;
}

export function create(type: ReactType, props: any, children?: ReactNode[]) {
  if (!children || children.length < 1) {
    return createElement(type, props);
  }

  return createElement(type, props, ...children);
}

export class Registry {
  constructor(private maps: ComponentsMap, private parent?: Registry) {
  }
  get(type: ReactType): ReactType {
    if (typeof type === 'string') {
      const temp = getComponent(this.maps, type);
      if (temp) {
        return temp;
      }
      if (!this.parent) {
        if (hasOwnProperty(internalMaps, type)) {
          return internalMaps[type];
        }

        if (process.env.NODE_ENV === 'development') {
          if (/^(A-Z)/.test(type)) {
            fail(`Component "type" not registered.`);
          }
        }
      }
    }

    return this.parent ? this.parent.get(type) : type;
  }
  register(typeOrMaps: string | ComponentsMap, Component?: ReactType) {
    return register(this.maps, typeOrMaps, Component);
  }
  wrapperWith(maps: ComponentsMap) {
    return new Registry(maps, this);
  }

  static create(maps?: ComponentsMap) {
    if (maps) {
      return defaultRegistry.wrapperWith(maps);
    }
    return defaultRegistry;
  }
}

function register(maps: ComponentsMap, typeOrMaps: string | ComponentsMap, Component?: ReactType) {
  if (typeof typeOrMaps === 'string' && Component) {
    maps[typeOrMaps] = Component;
  } else if (isObject(typeOrMaps)) {
    Object.keys(typeOrMaps).forEach((key) => {
      maps[key] = typeOrMaps[key];
    });
  }
}

const globalMaps: ComponentsMap = {};
const internalMaps: ComponentsMap = {
  Fragment,
  Link,
  NavLink,
  Route,
  Redirect,
};

const defaultRegistry = new Registry(globalMaps);

interface Modifiers {
  [modifier: string]: (e: KeyboardEvent) => false | void;
}

const ModifiersMap: Modifiers = {
  stop(e: Event) {
    e.stopPropagation();
  },
  prevent(e: Event) {
    e.preventDefault();
  },
  enter(e: KeyboardEvent): false | void {
    if ((e.keyCode || e.charCode) !== 13) {
      return false;
    }
  },
  ctrl(e: KeyboardEvent): false | void {
    if (!e.ctrlKey) {
      return false;
    }
  },
  alt(e: KeyboardEvent): false | void {
    if (!e.altKey) {
      return false;
    }
  },
  shift(e: KeyboardEvent): false | void {
    if (!e.shiftKey) {
      return false;
    }
  },
  meta(e: KeyboardEvent): false | void {
    if (!e.metaKey) {
      return false;
    }
  },
  tab(e: KeyboardEvent): false | void {
    if (e.keyCode !== 9) {
      return false;
    }
  },
  delete(e: KeyboardEvent): false | void {
    // 'Backspace', 'Delete'
    if (e.keyCode !== 8 && e.keyCode !== 46) {
      return false;
    }
  },
  esc(e: KeyboardEvent): false | void {
    if (e.keyCode !== 27) {
      return false;
    }
  },
  space(e: KeyboardEvent): false | void {
    if ((e.keyCode || e.charCode) !== 32) {
      return false;
    }
  },
  up(e: KeyboardEvent): false | void {
    if (e.keyCode !== 38) {
      return false;
    }
  },
  down(e: KeyboardEvent): false | void {
    if (e.keyCode !== 40) {
      return false;
    }
  },
  left(e: KeyboardEvent): false | void {
    if (e.keyCode !== 37) {
      return false;
    }
  },
  right(e: KeyboardEvent): false | void {
    if (e.keyCode !== 39) {
      return false;
    }
  }
};

export function xModifiers(modifiers: string | string[]) {
  if (!Array.isArray(modifiers)) {
    modifiers = modifiers.split('.');
  }
  const modifierQueue = modifiers.map((modifier) => ModifiersMap[modifier]).filter(Boolean);

  return (e: any): false | void => {
    if (e && e.nativeEvent) {
      const brk = modifierQueue.some((fn) => fn(e) === false);
      if (brk) {
        return false;
      }
    }
  };
}

export interface AppConfig {
  history?: HistoryOptions;
  globalComponents?: ComponentsMap;
  globalHelpers?: { [key: string]: any };
  globalUtils?: { [key: string]: any };
  containerId?: string;
  renderError?: (err: any) => ReactNode;
  reportError?: (err: any) => void;
}

export const globalUtils: { [key: string]: any } = {};

export function reportError(err: any) {
  console.error(err); // tslint:disable-line

  if (globals.reportError) {
    globals.reportError(err);
  }
}

export const globals: {
  renderError?: (err: any) => ReactNode;
  reportError?: (err: any) => void;
} = {};

export function runApp(AppComponent: any, config: AppConfig = {}, exposeModule = false): any {
  // init history
  navigator.init(config.history);

  if (config.globalComponents) {
    register(globalMaps, config.globalComponents);
  }

  if (config.globalUtils || config.globalHelpers) {
    Object.assign(globalUtils, config.globalUtils || config.globalHelpers);
  }

  if (config.renderError) {
    globals.renderError = config.renderError;
  }

  if (config.reportError) {
    globals.reportError = config.reportError;
  }

  if (exposeModule) {
    return (extraProps?: any) => {
      return createElement(
        Root, null,
        (props: any) => createElement(AppComponent as ReactType, {
          ...props,
          ...extraProps,
        }),
      )
    };
  }

  const containerId = config.containerId || 'app';

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
    container.id = containerId;
  }

  render(createElement(
    Root, null,
    (props: any) => createElement(AppComponent as ReactType, {
      ...props,
    }),
  ), container);
}
