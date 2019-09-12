import {
  History,
  HashHistoryBuildOptions,
  BrowserHistoryBuildOptions,
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
  LocationState,
} from 'history';
import { invariant } from '../utils';

export type HistoryMode = 'browser' | 'hash' | 'memory';

export type HistoryOptions = {
  mode?: HistoryMode;
} & (HashHistoryBuildOptions | BrowserHistoryBuildOptions);

export class Navigator {
  private options: HistoryOptions | null = {};
  private _history: History | null = null;

  get history(): History {
    if (this._history) {
      return this._history;
    }

    invariant(this.options, 'should not use "navigator.history" before bootstrap');

    const options: any = this.options || {};

    if (options.mode === 'hash') {
      this._history = createHashHistory(options);
    } else if (options.mode === 'memory') {
      this._history = createMemoryHistory(options);
    } else {
      this._history = createBrowserHistory(options);
    }
    return this._history;
  }

  init(options: HistoryMode | HistoryOptions = {}) {
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
