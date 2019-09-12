/**
 * 动态加载Wrapper
 * @author changming<changming.zy@alibaba-inc.com>
 */
import { Component, createElement as h } from 'react';

interface LoaderProps {
  loader: () => Promise<any>;
}

interface LoaderState {
  Component: any;
}

function interopRequireDefault(obj: any) { return obj && obj.__esModule ? obj.default : obj; }

// TODO: use React.lazy React.Suspense instead
class Loader extends Component<LoaderProps, LoaderState> {
  static displayName = 'Loader';

  state = {
    Component: null,
  };

  componentDidMount() {
    // TODO support more states
    this.props.loader().then((Component: any) => {
      this.setState({ Component: interopRequireDefault(Component) });
    });
  }

  render() {
    const { loader, ...props } = this.props;
    const { Component } = this.state;
    if (Component) {
      return h(Component as any, props);
    }
    // TODO customer loading handler?
    return h('div', { className: 'recore-loading' }, 'loading');
  }
}

export default Loader;
