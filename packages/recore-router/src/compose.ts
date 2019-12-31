import { ReactNode, Component, ReactElement } from 'react';
import { Registry } from './utils';
import { ViewController } from '@recore/core';
// import { ViewController } from '../core';
import { MatchResult } from './router/utils';
import navigator from './navigator';
import { prerendering } from './prerendering';
import { hasOwnProperty, shallowEqual, invariant } from '@recore/utils';

export type RenderType = (c: any) => ReactNode;
export interface RenderFunction {
  (c: any): ReactElement;
  compileVersion: number;
}

export interface PageRequest {
  uri: string;
  path: string;
  query: { [key: string]: any };
  params: { [key: string]: any };
  state: any;
}

function decode(s: string): string {
  if (s) {
    s = s.replace(/\+/g, '%20');
    s = decodeURIComponent(s);
  }
  return s;
}

function parseQuery(search: string): object {
  const params: any = {};

  if (!search) {
    return params;
  }

  if (search.indexOf('?') === 0) {
    search = search.substring(1);
  }

  const ps = search.split(/[&;]/);
  let p;
  let n;
  let k;
  let v;

  for (let i = 0, l = ps.length; i < l; i++) {
    p = ps[i];
    n = p.indexOf('=');

    if (n === 0) {
      continue;
    }
    if (n < 0) {
      k = p;
      v = null;
    } else {
      k = decode(p.substring(0, n));
      v = decode(p.substring(n + 1));
    }

    if (hasOwnProperty(params, k)) {
      if (!Array.isArray(params[k])) {
        params[k] = [params[k]];
      }
      params[k].push(v);
    } else {
      params[k] = v;
    }
  }
  return params;
}

export default function compose(render: RenderFunction, ControllerType?: any, routerView?: any): any {
  invariant(
    render.compileVersion === 2,
    `Project compiled result not suitable for current Recore version, please update "reload-loader" to 2.x`,
  );

  if (!ControllerType) {
    ControllerType = class extends ViewController {};
  }

  const proto = ControllerType.prototype;

  invariant(proto instanceof ViewController, `Controller ${ControllerType.name} must be extends "ViewController"`);

  Object.defineProperty(proto, '__routerView', {
    configurable: false,
    enumerable: false,
    value(props?: any) {
      return routerView ? routerView(this, props) : null;
    },
  });

  ControllerType.registry = Registry.create(ControllerType.components);
  const cssText = ControllerType.cssText;

  function createController(props: object) {
    const controller = new ControllerType(props);
    controller.$prerendering = prerendering;
    controller.$registry = ControllerType.registry;
    return controller;
  }

  function compileRequest(props: any, state: any) {
    let { controller } = state;
    const { match, location, defined, ...extras } = props;
    const loc = navigator.history!.location;
    const reload = loc.state && loc.state.__reload;
    if (match instanceof MatchResult) {
      const uri = loc.pathname + loc.search;

      if (
        !controller ||
        reload ||
        state.uri !== uri ||
        !shallowEqual(state.state, loc.state) ||
        !shallowEqual(state.extras, extras)
      ) {
        const nextState: any = {
          uri,
          defined,
          state: loc.state,
          extras,
        };

        const request = {
          ...ControllerType.defaultProps,
          ...nextState,
          path: loc.pathname,
          params: match.params,
          query: parseQuery(loc.search),
        };

        if (!controller || reload) {
          controller = createController(request);
          controller.$enter(true, request);
          nextState.controller = controller;
        } else {
          controller.$props = request;
          controller.$enter(false, request);
        }

        return nextState;
      }
    } else if (!controller || reload) {
      const params = {
        ...ControllerType.defaultProps,
        ...extras,
      };
      controller = createController(params);
      controller.$enter(true, params);
      return {
        controller,
      };
    } else {
      const params = {
        ...ControllerType.defaultProps,
        ...extras,
      };
      controller.$props = params;
      controller.$enter(false, params);
    }

    return null;
  }

  class View extends Component<any> {
    static getDerivedStateFromProps(props: any, state: any) {
      return compileRequest(props, state);
    }

    static displayName = ControllerType.name || 'View';

    state: any = {};

    private style?: HTMLStyleElement;

    constructor(props: any) {
      super(props);
      if (cssText) {
        const element = document.createElement('style');
        element.setAttribute('type', 'text/css');
        element.setAttribute('data-for', 'page');
        element.appendChild(document.createTextNode(cssText));
        document.head.appendChild(element);
        this.style = element;
      }
    }

    componentWillUnmount() {
      if (this.state.controller) {
        this.state.controller.$destroy();
      }
      if (this.style) {
        document.head.removeChild(this.style);
      }
    }

    shouldComponentUpdate() {
      return false;
    }

    componentDidMount() {
      if (this.state.controller) {
        this.state.controller.$didMount();
      }
      if (this.props.match && this.props.match.isExact) {
        try {
          document.dispatchEvent(new Event('render-event'));
        } catch (e) {
          // ignore
        }
      }
    }

    render() {
      if (!this.state.controller) {
        return '';
      }

      return render(this.state.controller);
    }
  }

  return View;
}
