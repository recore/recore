import { Component, StatelessComponent, createElement } from 'react';
import { globals } from '@recore/core/lib/utils';
import navigator from '../navigator';
import { MatchResult, locationIs, generateCommonRouterProps } from './utils';
import RouteContext from './route-context';

export interface RootProps {
  children: StatelessComponent<any>;
}

interface RootState {
  hasError: boolean;
  error?: Error;
}

export default class Root extends Component<RootProps, RootState> {
  private dispose: () => void;
  private rootContext: RouteContext;
  private location: any;

  constructor(props: RootProps) {
    super(props);

    const history = navigator.history!;
    this.location = history.location;
    this.rootContext = new RouteContext(new MatchResult('/', '/', this.location.pathname === '/'));
    this.dispose = history.listen(() => {
      const { location } = history;
      if (!locationIs(this.location, location)) {
        this.rootContext.setMatch(new MatchResult('/', '/', location.pathname === '/'));
        this.forceUpdate();
      }
      this.location = location;
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
    return false;
  }

  render() {
    if (this.state.hasError) {
      return globals.renderError(this.state.error);
    }

    const { children } = this.props;
    const { location, match } = this.rootContext;

    return createElement(
      RouteContext.Provider,
      {
        value: this.rootContext,
      },
      children({
        match,
        location,
        defined: {},
        // 以下属性为兼容 DSL 为 jsx 的情况
        ...generateCommonRouterProps(location, match),
      }),
    );
  }
}
