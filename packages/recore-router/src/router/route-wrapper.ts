import { createElement as h, Component, ComponentType } from 'react';
import { RouteConfig } from './index';
import navigator from '../navigator';

enum AuthStatus {
  not = 'NOT',
  pass = 'PASS',
  fail = 'FAIL',
}

interface RouteWrapperProps {
  defined: RouteConfig;
  Component: ComponentType<any>;
  beforeRoute: (route: RouteConfig, match: any, history: any) => any;
  match: any;
}

interface RouteWrapperState {
  authPassed: AuthStatus;
  prevComponent: any;
}

function isRedirect(res: any) {
  const t = typeof res;
  return t === 'string' || t === 'number';
}

// TODO: use React.lazy React.Suspense instead
class RouteWrapper extends Component<RouteWrapperProps, RouteWrapperState> {
  state = {
    authPassed: AuthStatus.not,
    prevComponent: null,
  };

  static getDerivedStateFromProps(nextProps: RouteWrapperProps, prevState: RouteWrapperState) {
    if (nextProps.Component !== prevState.prevComponent) {
      return {
        authPassed: AuthStatus.not,
        prevComponent: nextProps.Component,
      };
    }
    return null;
  }

  componentDidUpdate() {
    if (this.state.authPassed === AuthStatus.not) {
      this.checkAuth();
    }
  }

  componentDidMount() {
    this.checkAuth();
  }

  checkAuth() {
    const { beforeRoute, defined, match } = this.props;
    const history = navigator.history!;
    if (beforeRoute) {
      const ret = beforeRoute(defined, match, history);
      if (ret === true) {
        this.setState({ authPassed: AuthStatus.pass });
      } else if (ret === false) {
        this.setState({ authPassed: AuthStatus.fail });
      } else if (isRedirect(ret)) {
        history.replace(String(ret));
      } else if (ret && ret.then) {
        ret.then(
          (res: any) => {
            if (isRedirect(res)) {
              history.replace(String(res));
              return;
            }
            this.setState({ authPassed: AuthStatus.pass });
          },
          (err: any) => {
            this.setState({ authPassed: AuthStatus.fail });
          },
        );
      }
    } else {
      this.setState({ authPassed: AuthStatus.pass });
    }
  }

  render() {
    const { Component, beforeRoute, ...others } = this.props;
    if (this.state.authPassed === AuthStatus.pass) {
      return h(Component, others as any);
    } else if (this.state.authPassed === AuthStatus.fail) {
      return h('div', null, 'You have no authority to view this page');
    }

    return h('div', { className: 'recore-loading' }, 'loading');
  }
}

export default RouteWrapper;
