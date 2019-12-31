import {
  History,
  HashHistoryBuildOptions,
  BrowserHistoryBuildOptions,
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
  LocationState,
} from '@recore/history';
import { invariant } from '@recore/utils';

export type HistoryMode = 'browser' | 'hash' | 'memory';

export type HistoryOptions = {
  mode?: HistoryMode;
} & (HashHistoryBuildOptions | BrowserHistoryBuildOptions);

function isHistory(obj: any): obj is History {
  return obj && obj.push && obj.replace;
}

export function createHistory(options: HistoryOptions): History {
  if (options.mode === 'hash') {
    return createHashHistory(options);
  }
  if (options.mode === 'memory') {
    return createMemoryHistory(options);
  }
  return createBrowserHistory(options);
}

export class Navigator {
  private options: HistoryOptions | null = null;
  private _history: History | null = null;

  get history(): History {
    if (this._history) {
      return this._history;
    }

    invariant(this.options, 'should not use "navigator.history" before bootstrap');

    this._history = createHistory(this.options || {});

    return this._history;
  }

  init(options: HistoryMode | HistoryOptions | History = {}) {
    if (isHistory(options)) {
      this._history = options;
      return;
    }
    if (typeof options === 'string') {
      options = { mode: options };
    }
    this.options = options;
  }

  goto(path: string, state?: LocationState, reload?: true): void {
    if (reload) {
      if (state) {
        state.__reload = Date.now();
      } else {
        state = { __reload: Date.now() };
      }
    }
    this.history.push(path, state);
  }

  goBack(): void {
    this.history.goBack();
  }
}

export default new Navigator();
