import { Component, StatelessComponent, createElement } from 'react';
import navigator from '../navigator';
import { MatchResult, locationIs } from './utils';
import RouteContext from './route-context';

export interface RootProps {
  children: StatelessComponent<any>;
}

export default class Root extends Component<RootProps> {
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
  }

  componentWillUnmount() {
    this.dispose();
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { children } = this.props;
    const { location, match } = this.rootContext;

    return createElement(
      RouteContext.Provider,
      {
        value: this.rootContext,
      },
      children({ match, location, defined: {} }),
    );
  }
}
