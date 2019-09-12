import { untrackedStart, untrackedEnd } from './derivation';

export interface Lambda {
  (): void;
  name?: string;
}

function once(func: Lambda): Lambda {
  let invoked = false;
  return function(this: any) {
    if (invoked) {
      return;
    }
    invoked = true;
    return (func as any).apply(this, arguments);
  };
}

export interface IListenable {
  listened?: boolean;
  listeners?: Array<(change?: any) => void>;
  sleep?: () => void;
  wakeup?: () => void;
  observe(handler: (change?: any) => void): Lambda;
}

export function hasListeners(listenable: IListenable) {
  return listenable.listeners && listenable.listeners.length > 0;
}

export function registerListener(listenable: IListenable, handler: Lambda): Lambda {
  const listeners = listenable.listeners || (listenable.listeners = []);
  listeners.push(handler);
  if (listenable.listened) {
    if (listeners.length === 1 && listenable.wakeup) {
      listenable.wakeup();
    }
  } else {
    listenable.listened = true;
  }
  return once(() => {
    const idx = listeners.indexOf(handler);
    if (idx > -1) {
      listeners.splice(idx, 1);
      if (listeners.length < 1 && listenable.sleep) {
        listenable.sleep();
      }
    }
  });
}

export function notifyListeners(listenable: IListenable, change?: any) {
  const prevU = untrackedStart();
  let listeners = listenable.listeners;
  if (!listeners) {
    return;
  }
  listeners = listeners.slice();
  for (let i = 0, l = listeners.length; i < l; i++) {
    listeners[i](change);
  }
  untrackedEnd(prevU);
}
