import { Component, createElement } from 'react';
import { createLocation, LocationDescriptor } from '@recore/history';
import navigator from '../navigator';

function isModifiedEvent(event: MouseEvent): boolean {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

export interface LinkProps {
  onClick?: (e: MouseEvent) => void;
  target?: string;
  replace?: boolean;
  to: LocationDescriptor;
  [rest: string]: any;
}

export default class Link extends Component<LinkProps> {
  static displayName = 'Link';

  static defaultProps = {
    replace: false,
  };

  handleClick = (event: MouseEvent) => {
    if (this.props.onClick) {
      this.props.onClick(event);
    }

    if (
      !event.defaultPrevented && // onClick prevented default
      event.button === 0 && // ignore everything but left clicks
      !this.props.target && // let browser handle "target=_blank" etc.
      !isModifiedEvent(event) // ignore clicks with modifier keys
    ) {
      event.preventDefault();
      const { replace, to } = this.props;

      const { history } = navigator;

      if (history) {
        if (replace) {
          history.replace(to as any);
        } else {
          history.push(to as any);
        }
      }
    }
  };

  render() {
    const { replace, to, ...rest } = this.props; // eslint-disable-line no-unused-vars

    const history = navigator.history!;
    const location = typeof to === 'string' ? createLocation(to, null, undefined, history.location) : to;

    const href = history.createHref(location);

    return createElement('a', {
      ...rest,
      onClick: this.handleClick,
      href,
    });
  }
}
