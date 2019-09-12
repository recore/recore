import { invariant } from './invariant';

export function fail(message: string, thing?: any): never {
  invariant(false, message, thing);
  throw 'X'; // tslint:disable-line
}
