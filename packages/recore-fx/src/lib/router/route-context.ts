import { createContext } from 'react';
import { MatchResult } from './utils';
import navigator from '../navigator';

const { Provider, Consumer } = createContext<RouteContext>({} as any);

export default class RouteContext {

  get history() {
    return navigator.history!;
  }
  get location() {
    return this.history.location;
  }
  constructor(
    public match?: MatchResult
  ){}

  setMatch(match: MatchResult) {
    this.match = match;
  }

  static Provider = Provider;
  static Consumer = Consumer;
}
