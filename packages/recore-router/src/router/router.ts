import { Component, createElement, Fragment, FunctionComponentElement, ProviderProps, RefObject } from 'react';
import { globals } from '@recore/core/lib/utils';
import navigator from '../navigator';
import { matchPath, MatchResult, locationIs, generateCommonRouterProps } from './utils';
import RouteContext from './route-context';
import { RouteProps } from './route';
import { hasOwnProperty } from '@recore/utils';

export interface RouterProps {
  routes: RouteProps[];
  fixed: boolean;
  [key: string]: any;
}
type RouteElement = FunctionComponentElement<ProviderProps<RouteContext>>;

interface RouterState {
  hasError: boolean;
  error?: Error;
}

export default class Router extends Component<RouterProps, RouterState> {
  private dispose: () => void;
  private contextMap: { [path: string]: RouteContext } = {};
  private location: any;
  private cachedRoutes: Array<{ url: string; el: RouteElement; inst: RefObject<any> }> = [];
  private prevKeepAliveUrl: string; // 最近一个keep alive的页面 url

  constructor(props: RouterProps) {
    super(props);
    const history = navigator.history!;
    this.location = history.location;
    this.dispose = history.listen(() => {
      if (!locationIs(this.location, history.location)) {
        this.forceUpdate();
      }
      this.location = history.location;
    });
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    globals.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    this.dispose();
  }

  shouldComponentUpdate() {
    // TODO compare rest allow "rest" props pass-through
    if (this.props.fixed) {
      return false;
    }

    return true;
  }

  getSubContext(path: string, match: MatchResult) {
    if (!hasOwnProperty(this.contextMap, path)) {
      this.contextMap[path] = new RouteContext(match);
    } else {
      this.contextMap[path].setMatch(match);
    }

    return this.contextMap[path];
  }

  getMatchedRoute(ctx?: RouteContext): { route: RouteProps; match: MatchResult | null | undefined } {
    let match: MatchResult | null | undefined = null;
    let route = {} as RouteProps;
    const { location } = navigator.history!;
    const { routes } = this.props;

    for (const currentRoute of routes) {
      route = currentRoute;
      match = matchPath(location.pathname, route, (ctx || {}).match);
      if (match) {
        break;
      }
    }
    return {
      route,
      match,
    };
  }

  createRouteChildren(route: RouteProps, match: MatchResult): {  element: RouteElement; instance: RefObject<any> } {
    const { routes, fixed, ...rest } = this.props;
    const { location } = navigator.history!;
    let props: any = {
      match,
      location,
      defined: route!.defined,
      // 兼容 DSL 为 jsx 的情况
      ...generateCommonRouterProps(location, match),
      ...rest,
    };
    const instance: any = { current: null };
    if (typeof route?.children !== 'function') {
      props = {
        ...props,
        ref: (ref: any) => instance.current = ref, // 使用 callback 模式，兼容 react 16.3 以下版本
      };
    }
    const instance: any = { current: null };
    return {
      element: createElement(
        RouteContext.Provider,
        {
          value: this.getSubContext(route!.path, match),
        },
        createElement(route!.children, props)
      ),
      instance,
    };
  }

  render() {
    if (this.state.hasError) {
      return globals.renderError(this.state.error);
    }

    const { location } = navigator.history!;
    const currentUrl = location.pathname + location.search;
    let cacheMatch = false;

    this.location = location;

    return createElement(RouteContext.Consumer, null, (ctx: RouteContext) => {
      const { route, match } = this.getMatchedRoute(ctx);
      if (!match) {
        return createElement(
          Fragment,
          null,
          this.cachedRoutes.map(cache => createElement('div', { style: { display: 'none' } }, cache.el)),
        );
      }

      if (this.prevKeepAliveUrl && this.prevKeepAliveUrl !== currentUrl) {
        const prevKeepAliveRoute = this.cachedRoutes.find(cache => cache.url === this.prevKeepAliveUrl);
        if (typeof prevKeepAliveRoute?.inst?.current?.$deactivated === 'function') {
          // 缓存的路由被切走，触发失活的钩子
          prevKeepAliveRoute.inst.current.$deactivated();
          this.prevKeepAliveUrl = '';
        }
      }

      if (route && route.defined && route.defined.keepAlive) {
        // 当前路由匹配到缓存
        cacheMatch = true;
        this.prevKeepAliveUrl = currentUrl;
        const cachedRoute = this.cachedRoutes.find(cache => cache.url === currentUrl);
        if (!cachedRoute) {
          const { element, instance } = this.createRouteChildren(route, match);
          this.cachedRoutes = [
            ...this.cachedRoutes,
            { url: location.pathname + location.search, el: element, inst: instance },
          ];
        } else if (typeof cachedRoute?.inst?.current?.$activated === 'function') {
          // 缓存命中，触发激活的钩子
          cachedRoute.inst.current.$activated();
        }
      }

      return createElement(
        Fragment,
        null,
        cacheMatch ? null : this.createRouteChildren(route, match).element,
        this.cachedRoutes.map(cache => {
          const isRender = cacheMatch && currentUrl === cache.url;
          return createElement('div', { key: cache.url, style: { display: isRender ? 'block' : 'none' } }, cache.el);
        })
      );
    });
  }
}
