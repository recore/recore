import { ReactType, ReactNode, createElement } from 'react';

export function xId(obj: any, defaultKey: any): string {
  return String((obj && obj.$id) || defaultKey);
}

export function create(type: ReactType, props: any, children?: ReactNode[]) {
  if (!children || children.length < 1) {
    return createElement(type, props);
  }

  if (Array.isArray(children)) {
    return createElement(type, props, ...children);
  }

  return createElement(type, props, children);
}

export const globalUtils: { [key: string]: any } = {};

export function reportError(err: any) {
  console.error(err); // tslint:disable-line

  if (globals.reportError) {
    globals.reportError(err);
  }
}

export const globals: {
  renderError?: (err: any) => ReactNode;
  reportError?: (err: any) => void;
} = {
  reportError(e) {
    if (process.env.NODE_ENV === 'production') {
      // TODO refactor
      const { AliMonitor } = global as any;

      if (AliMonitor) {
        AliMonitor.reportError(typeof e === 'string' ? new Error(e) : e);
      }
    }
  },
};