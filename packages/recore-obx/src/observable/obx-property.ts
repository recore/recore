import { isPrimitive } from '@recore/utils/is-primitive';
import { invariant } from '@recore/utils/invariant';
import { hasOwnProperty } from '@recore/utils/has-own-property';

import { globalState } from '../global-state';
import {
  untrackedStart,
  untrackedEnd,
  IDerivation,
  DerivationState,
  runDerivedFunction,
  shouldCompute,
  isCaughtException,
  clearObserving,
  setDerivationDirty,
} from '../derivation';
import { nextId } from '../utils';

import { IObservable, reportObserved, startBatch, endBatch, propagateChangeConfirmed, propagateMaybeChanged, reportPropValue } from './observable';
import { ObxFlag, SYMBOL_OBX, getObx } from './obx';
import { getProxiedValue } from './proxy';
import { is } from './compare';

function getVer(obj: any): number {
  const obx = getObx(obj);
  return obx ? obx.localVer : 0;
}

export function asNewValue(obj: object) {
  const obx = getObx(obj);
  if (obx) {
    obx.localVer = obx.localVer + 1;
  }
  return obj;
}

export default class ObxProperty implements IObservable, IDerivation {
  id = nextId();
  observing: IObservable[] = [];
  // @ts-ignore
  observers = new Set();
  dependenciesState = DerivationState.NOT_TRACKING;
  lowestObserverState = DerivationState.UP_TO_DATE;

  private isComputing: boolean = false;
  private isRunningSetter: boolean = false;
  private pending: boolean = false;
  private pendingValue: any = null;
  private objectVer: number = 0;

  constructor(
    public name: string,
    public scope: object | null,
    private getter?: (...rest: any[]) => any,
    private setter?: (v: any) => void,
    private value?: any,
    private extraGetterParams?: any[],
    private obxFlag: ObxFlag = ObxFlag.DEEP
  ) { }

  onBecomeDirty() {
    propagateMaybeChanged(this as any);
  }

  onBecomeUnobserved() {
    clearObserving(this);
  }

  ifModified() {
    if (this.getter && shouldCompute(this)) {
      startBatch();
      if (this.computeValue()) {
        propagateChangeConfirmed(this as any);
        this.objectVer = getVer(this.value);
      }
      endBatch();
    } else if (this.pending) {
      this.pending = false;
      const oldValue = this.value;
      this.value = this.pendingValue;
      if (!this.is(this.value, oldValue)) {
        propagateChangeConfirmed(this as any);
        this.objectVer = getVer(this.value);
      }
    }
  }

  get() {
    invariant(!this.isComputing, `Cycle detected in computation ${this.name}`, this.getter);

    reportObserved(this as any);

    this.ifModified();
    const result = this.value!;

    if (isCaughtException(result)) {
      throw result.cause;
    }

    reportPropValue(result, this.obxFlag);

    return getProxiedValue(result);
  }

  set(value: any) {
    invariant(
      !this.isRunningSetter,
      `The setter of observable value '${this.name}' is trying to update itself.`
    );

    invariant(
      Boolean(this.setter || !this.getter),
      `Cannot assign a new value to readonly value '${this.name}'.`
    );

    const oldValue = this.pending ? this.pendingValue : this.value;

    if (!isCaughtException(oldValue) && this.is(oldValue, value)) {
      return;
    }

    if (!this.setter) {
      this.pendingValue = value;
      if (!this.pending) {
        this.pending = true;
        propagateMaybeChanged(this as any);
      }
    } else {
      this.isRunningSetter = true;
      const prevTracking = untrackedStart();
      try {
        this.setter!.call(this.scope, value);
      } finally {
        untrackedEnd(prevTracking);
      }
      this.isRunningSetter = false;
      setDerivationDirty(this);
    }
  }

  private is(oldValue: any, value: any) {
    return is(oldValue, value) && (isPrimitive(value) || (getVer(value) === this.objectVer));
  }

  private computeValue(): boolean {
    const oldValue = this.value;
    this.isComputing = true;
    globalState.computationDepth++;
    this.value = runDerivedFunction(this, this.getter!, this.scope, this.extraGetterParams);
    globalState.computationDepth--;
    this.isComputing = false;
    return (isCaughtException(oldValue) || isCaughtException(this.value) || !this.is(this.value, oldValue));
  }
}

function isObxProperty(descriptor?: PropertyDescriptor) {
  if (!descriptor || !descriptor.get) {
    return false;
  }
  return (descriptor.get as any)[SYMBOL_OBX] ? true : false;
}

export function ensureObxProperty(obj: any, prop: PropertyKey, obxFlag: ObxFlag = ObxFlag.DEEP) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
  if (!descriptor || isObxProperty(descriptor)) {
    return;
  }
  defineObxProperty(obj, prop, undefined, descriptor, obxFlag);
}

export function defineObxProperty(
  obj: object, key: PropertyKey, val: any,
  descriptor?: PropertyDescriptor,
  obxFlag: ObxFlag = ObxFlag.DEEP
): void {
  if (!descriptor) {
    descriptor = Object.getOwnPropertyDescriptor(obj, key);
  }
  if (descriptor && descriptor.configurable === false) {
    return;
  }

  if (val == null && descriptor && hasOwnProperty(descriptor, 'value')) {
    val = descriptor.value;
  }

  const getter = descriptor && descriptor.get;
  const setter = descriptor && descriptor.set;
  const property = new ObxProperty(String(key), obj, getter, setter, val, undefined, obxFlag);
  const get = () => property.get();
  (get as any)[SYMBOL_OBX] = property;

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get,
    set: (newVal) => property.set(newVal),
  });
}

export function getObxProperty(obj: object, key: PropertyKey) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, key);

  if (!descriptor || !descriptor.get) {
    return null;
  }

  return (descriptor.get as any)[SYMBOL_OBX] as ObxProperty;
}
