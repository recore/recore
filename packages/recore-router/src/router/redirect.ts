import { Component } from 'react';
import { LocationDescriptor } from '@recore/history';
import navigator from '../navigator';
import { generatePath, MatchResult } from './utils';

export interface RedirectProps {
  computedMatch?: MatchResult;
  push?: boolean;
  to: LocationDescriptor;
}

/**
 * The public API for updating the location programmatically
 * with a component.
 */
class Redirect extends Component<RedirectProps> {
  static defaultProps = {
    push: false,
  };

  componentDidMount() {
    this.perform();
  }

  computeTo({ computedMatch, to }: RedirectProps) {
    if (computedMatch) {
      if (typeof to === 'string') {
        return generatePath(to, computedMatch.params);
      } else {
        return {
          ...to,
          pathname: generatePath(to.pathname, computedMatch.params),
        };
      }
    }

    return to;
  }

  perform() {
    const history = navigator.history!;
    const to = this.computeTo(this.props);

    if (this.props.push) {
      history.push(to as any);
    } else {
      history.replace(to as any);
    }
  }

  render() {
    return null;
  }
}

export default Redirect;
