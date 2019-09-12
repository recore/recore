import { Component, createElement as h, ReactNode } from 'react';
import { globals, reportError } from './utils';
import { observer } from '../obx';
import Area from '../core/area';

export interface XState {
  error: any;
}

export interface XProps {
  area: Area;
  children: (area: any) => any;
}

function renderError(error: any): any {
  if (!error) {
    return null;
  }

  reportError(error);

  const msg = error.stack || error.message || error;
  if (process.env.NODE_ENV !== 'production') {
    return globals.renderError ? globals.renderError(error) : h('pre', { style: {
      border: '1px solid #ffa39e',
      backgroundColor: '#fff1f0',
      padding: '8px 15px',
    } }, `${msg}`);
  }

  return globals.renderError ? globals.renderError(error) : 'Render Error';
}

export function DisplayError({ error }: { error: any }) {
  return renderError(error);
}

export function isDisplayError(obj: any): obj is ReactNode {
 return obj && obj.type === DisplayError;
}

export default observer(class extends Component<XProps, XState> {
  static displayName = 'X';

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  state: XState  = { error: null };

  shouldComponentUpdate(_: any, nextState: XState) {
    return this.props.area.inExpression || nextState.error != null;
  }

  componentDidMount() {
    this.props.area.connect(this);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return renderError(error);
    }

    try {
      return this.props.children(this.props.area);
    } catch (e) {
      return renderError(e);
    }
  }
});
