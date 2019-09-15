import { createElement, Component } from 'react';
import classNames from 'classnames';
import { Location, LocationDescriptor } from 'history';
import navigator from '../navigator';
import Route from './route';
import Link from './link';
import { MatchResult } from './utils';

/**
 * A <Link> wrapper that knows if it's "active" or not.
 */
export interface NavLinkProps {
  to: LocationDescriptor;
  exact?: boolean;
  strict?: boolean;
  activeClassName?: string;
  className?: string;
  activeStyle?: object;
  style?: object;
  isActive?: (match: MatchResult, location: Location) => boolean;
  [rest: string]: any;
}

class NavLink extends Component<NavLinkProps> {
  static displayName = 'NavLink';

  static defaultProps = {
    activeClassName: 'active',
  };

  render() {
    const {
      to, exact, strict, isActive,
      className, style,
      activeClassName, activeStyle,
      ...rest
    } = this.props;
    const path = typeof to === 'object' ? to.pathname : to;
    const { location } = navigator.history!;

    return createElement(Route, {
      path: path || '',
      exact,
      strict,
      children({ match }: any) {
        const actived = !!(isActive ? isActive(match, location) : match);

        return createElement(Link, {
          to,
          className: classNames(className, actived && activeClassName),
          style: actived ? { ...style, ...activeStyle } : style,
          ...rest,
        });
      }
    });
  }
}

export default NavLink;
