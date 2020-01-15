import { createElement, Component } from 'react';
import RouteContext from './route-context';
import { MatchResult, locationIs } from './utils';
import navigator from '../navigator';

export default function withRouter(Custom: any) {
  return class WithRouter extends Component<any> {
    static displayName = `withRouter(${Custom.displayName || Custom.name})`;
    static WrappedComponent = Custom;

    dispose: null | (() => void) = null;
    asRoutePage: boolean = false;
    location: any;

    constructor(props: any) {
      super(props);

      if (props.match instanceof MatchResult && props.location) {
        this.asRoutePage = true;
      } else {
        const history = navigator.history!;
        this.location = history.location;
        this.dispose = history.listen(() => {
          if (!locationIs(this.location, history.location)) {
            this.forceUpdate();
          }
          this.location = history.location;
        });
      }
    }

    componentWillUnmount() {
      if (this.dispose) {
        this.dispose();
      }
    }

    render() {
      const { wrappedComponentRef, ...originProps } = this.props;
      return this.asRoutePage
        ? createElement(Custom, {
            ...originProps,
            ref: wrappedComponentRef,
          })
        : createElement(RouteContext.Consumer, null, (ctx: RouteContext) => {
            const { match, history, location } = ctx;
            this.location = location;
            return createElement(Custom, {
              match,
              location,
              history,
              ...originProps,
              ref: wrappedComponentRef,
            });
          });
    }
  };
}
