import { Component, createElement, StatelessComponent } from 'react';
import navigator from '../navigator';
import { matchPath, MatchResult, locationIs } from './utils';
import RouteContext from './route-context';
import { RouteConfig } from './index';

export interface RouteProps {
  computedMatch?: MatchResult;
  path: string;
  exact?: boolean;
  strict?: boolean;
  sensitive?: boolean;
  children: StatelessComponent<any>;
  defined?: RouteConfig;
}

function computeMatch(props: RouteProps, ctx: RouteContext) {
  const { computedMatch, path, strict, exact, sensitive } = props;

  if (computedMatch) return computedMatch; // maybe already computed the match for us

  const { pathname } = navigator.history!.location;

  return matchPath(pathname, { path, strict, exact, sensitive }, ctx.match);
}

export default class Route extends Component<RouteProps> {
  static displayName = 'Route';
  private dispose: () => void;
  private location: any;

  constructor(props: RouteProps) {
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

  render() {
    const { children } = this.props;

    return createElement(RouteContext.Consumer, null, (ctx: RouteContext) => {
      this.location = ctx.location;
      const match = computeMatch(this.props, ctx);
      return children({ match });
    });
  }
}
