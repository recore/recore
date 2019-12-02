import { Component, createElement } from 'react';
import navigator from '../navigator';
import { matchPath, MatchResult, locationIs } from './utils';
import RouteContext from './route-context';
import { RouteProps } from './route';
import { hasOwnProperty } from '../../utils';

export interface RouterProps {
  routes: RouteProps[];
  fixed: boolean;
  [key: string]: any;
}

export default class Router extends Component<RouterProps> {
  private dispose: () => void;
  private contextMap: { [path: string]: RouteContext } = {};
  private location: any;

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
    // TODO compare rest allow "rest" props passthrough
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

  render() {
    const { routes, fixed, ...rest } = this.props;
    const { location } = navigator.history!;
    this.location = location;

    return createElement(RouteContext.Consumer, null, (ctx: RouteContext) => {
      let match;
      let route: RouteProps;
      for (let i = 0, l = routes.length; i < l; i++) {
        route = routes[i];
        match = matchPath(location.pathname, route, ctx.match);
        if (match) {
          break;
        }
      }
      if (!match) {
        return null;
      }

      return createElement(
        RouteContext.Provider,
        {
          value: this.getSubContext(route!.path, match),
        },
        route!.children({ match, location, defined: route!.defined, ...rest }),
      );
    });
  }
}
