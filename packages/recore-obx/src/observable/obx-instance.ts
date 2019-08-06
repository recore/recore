import {
  walk,
  DecoratorTarget,
  getObxDecorators,
} from '../utils';
import { defineObxProperty } from './obx-property';
import Obx, { ObxFlag } from './obx';


export default class ObxInstance extends Obx<DecoratorTarget> {
  constructor(name: string, target: DecoratorTarget, obxFlag: ObxFlag = ObxFlag.REF) {
    super(name, target, obxFlag);

    const decorators = getObxDecorators(target);
    if (decorators) {
      walk(decorators, (_, key, d) => {
        const descriptor = d.descriptor;
        const initialValue = descriptor
              ? descriptor.initializer ? descriptor.initializer.call(target) : descriptor.value
              : undefined;
        defineObxProperty(target as any, key, initialValue, {
          set: descriptor && descriptor.set,
          get: descriptor && descriptor.get,
        }, d.flag);
      });
    }
  }

  set(key: PropertyKey, val: any) {
    const target = this.target;
    if (key in target) {
      (target as any)[key] = val;
      return;
    }

    super.set(key, val);
  }
}
