import { createElement as h, StatelessComponent } from 'react';
import { LocationDescriptor } from '@recore/history';
import { ViewController } from '@recore/core';
import compose from '../compose';
import { reportError } from '../utils';
import Loader from './loader';
import RouteWrapper from './route-wrapper';
import Router from './router';
import { RouteProps } from './route';
import Redirect from './redirect';
import Link from './link';
import NavLink from './nav-link';
import { resolve, matchPath } from './utils';
import withRouter from './with-router';

export { Router, withRouter, Link, NavLink, matchPath };

export interface RouteConfig {
  main?: string;
  children?: StatelessComponent<any>;
  path: string;
  name?: string;
  dynamic?: boolean;
  remote?: boolean;
  exact?: boolean;
  redirect?: LocationDescriptor;
  keepAlive?: boolean
}

export interface RoutesConfig {
  baseDir?: string;
  exact?: boolean;
  routes: RouteConfig[];
  [extra: string]: any;
}

export interface HooksConfig {
  beforeRoute: (...rest: any[]) => any;
  [extra: string]: any;
}

export const RoutePage404 = ({ match, defined }: any): any => {
  const msg = `route page "${match.url}" of file "${defined.main}" was not exists`;

  reportError(msg);

  if (process.env.NODE_ENV !== 'production') {
    return `404 NotFound: ${msg}.`;
  }

  return `404 NotFound: page "${match.url}" was not found.`;
};

export function createDynamicLoader(loader: any) {
  const page: any = (props: any) => {
    return h(Loader, {
      loader,
      ...props,
    });
  };

  page.displayName = 'DynamicPage';

  return page;
}

type Hooks = HooksConfig | ((config: RoutesConfig) => HooksConfig & RoutesConfig);

// TODO remove these codes, refactor
function patchBeforeRoute(beforeRoute: any) {
  const meta = document.head!.querySelector('meta[name="data-spm"]');
  const spmA = meta ? (meta as any).content : null;
  if (!spmA) {
    return beforeRoute;
  }

  return (defined: any, ...rest: any[]) => {
    const { spmB } = defined;
    if (spmB) {
      if (!(window as any).AliMonitorQueue) {
        (window as any).AliMonitorQueue = [];
      }
      (window as any).AliMonitorQueue.push(() => {
        (window as any).AliMonitor.switchPage({ spmA, spmB });
      });
    }
    return beforeRoute ? beforeRoute(defined, ...rest) : true;
  };
}

export function createRouter(config: RoutesConfig, pagesMap: any, hooks: Hooks, page?: true | ViewController): any {
  if (hooks) {
    if (typeof hooks === 'function') {
      // TODO support thenable return
      config = hooks(config) || config;
    } else {
      config = {
        ...config,
        ...hooks,
      };
    }
  }

  const { exact = false, baseDir, beforeRoute } = config;

  let normalizedRoutes: RouteProps[] | null = null;
  let normalized = false;
  function getRoutes() {
    if (normalized) {
      return normalizedRoutes;
    }
    normalized = true;
    if (!config.routes) {
      return normalizedRoutes;
    }

    const patchedBeforeRoute = patchBeforeRoute(beforeRoute);

    // normalize routes
    normalizedRoutes = config.routes
      .map(route => {
        const ret: any = {
          defined: route,
          path: route.path,
          exact: route.exact != null ? route.exact : exact,
        };

        if (route.children) {
          ret.children = route.children;
          return ret;
        }

        if (route.redirect) {
          ret.children = ({ match }: any) =>
            h(Redirect, {
              computedMatch: match,
              to: route.redirect!,
            });
          return ret;
        }

        let Component: any;
        if (route.main) {
          const key = resolve(route.main, baseDir);
          Component = pagesMap[key];
        } else {
          Component = () => null;
        }

        if (!patchedBeforeRoute) {
          ret.children = (props: any) => h(Component, props);
        } else {
          ret.children = (props: any) =>
            h(RouteWrapper, {
              ...props,
              beforeRoute: patchedBeforeRoute,
              Component,
            });
        }
        return ret;
      })
      .filter<RouteProps>(Boolean as any);

    return normalizedRoutes;
  }

  function factory(parentController: any, props?: any) {
    const routes = getRoutes();
    return routes
      ? h(Router, {
          ...props,
          parentController,
          routes,
          fixed: true,
        })
      : null;
  }

  function ViewRender(controller: any) {
    return controller.$root.render((area: any) => area.router('main'));
  }
  (ViewRender as any).compileVersion = 2;

  if (page) {
    return compose(
      ViewRender as any,
      typeof page === 'object' ? page : undefined,
      factory,
    );
  }

  return factory;
}
