import { Component, createElement, Fragment, FunctionComponentElement, ProviderProps } from 'react';
import navigator from '../navigator';
import { matchPath, MatchResult, locationIs } from './utils';
import RouteContext from './route-context';
import { RouteProps } from './route';
import { hasOwnProperty } from '@recore/utils';

export interface RouterProps {
  routes: RouteProps[];
  fixed: boolean;
  [key: string]: any;
}
type RouteElement = FunctionComponentElement<ProviderProps<RouteContext>>;

export default class Router extends Component<RouterProps> {
  private dispose: () => void;
  private contextMap: { [path: string]: RouteContext } = {};
  private location: any;
  private cachedRoutes: Array<{ url: string; el: RouteElement }> = [];

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

    for (let currentRoute of routes) {
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

  createRouteChildren(route: RouteProps, match: MatchResult): RouteElement {
    const { routes, fixed, ...rest } = this.props;
    const { location } = navigator.history!;
    return createElement(
      RouteContext.Provider,
      {
        value: this.getSubContext(route!.path, match),
      },
      route!.children({ match, location, defined: route!.defined, ...rest }),
    );
  }

  render() {
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

      const routeEl = this.createRouteChildren(route, match);
      if (route && route.defined && route.defined.keepAlive) {
        // 当前路由匹配到缓存
        cacheMatch = true;
        if (this.cachedRoutes.find(cache => cache.url === currentUrl)) {
          // 缓存命中
          // TODO: add lifecycle hooks
        } else {
          this.cachedRoutes = [...this.cachedRoutes, { url: location.pathname + location.search, el: routeEl }];
        }
      }
      return createElement(
        Fragment,
        null,
        cacheMatch ? null : this.createRouteChildren(route, match),
        this.cachedRoutes.map(cache => {
          const isRender = cacheMatch && currentUrl === cache.url;
          return createElement('div', { key: cache.url, style: { display: isRender ? 'block' : 'none' } }, cache.el);
        }),
      );
    })
  }
}
