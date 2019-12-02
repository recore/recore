import { Component, createElement as h, ReactNode } from 'react';
import { globals, reportError } from './utils';
import { observer } from '../obx';
import Area from '../core/area';

export interface XState {
  error: any;
}

export interface XProps {
  area: Area;
  render: (area: any) => any;
}

function renderError(error: any): any {
  if (!error) {
    return '';
  }

  reportError(error);

  const msg = error.stack || error.message || error;
  if (process.env.NODE_ENV !== 'production') {
    return globals.renderError
      ? globals.renderError(error)
      : h(
          'pre',
          {
            style: {
              border: '1px solid #ffa39e',
              backgroundColor: '#fff1f0',
              padding: '8px 15px',
            },
          },
          `${msg}`,
        );
  }

  return globals.renderError ? globals.renderError(error) : 'Render Error';
}

export function DisplayError({ error }: { error: any }) {
  return renderError(error);
}

export function isDisplayError(obj: any): obj is ReactNode {
  return obj && obj.type === DisplayError;
}

export default observer(
  class extends Component<XProps, XState> {
    static displayName = 'X';

    static getDerivedStateFromError(error: any) {
      return { error };
    }

    state: XState = { error: null };
    private area: Area = this.props.area;

    shouldComponentUpdate(nextProps: XProps, nextState: XState) {
      if (nextProps.area !== this.area) {
        this.area.purge();
        this.area = nextProps.area;
        return true;
      }
      return this.area.inExpression || nextState.error != null;
    }

    componentDidMount() {
      this.area.connect(this);
    }

    componentDidUpdate() {
      this.area.connect(this);
    }

    render() {
      const { error } = this.state;
      if (error) {
        return renderError(error);
      }

      try {
        return this.props.render(this.area);
      } catch (e) {
        return renderError(e);
      }
    }
  },
);
