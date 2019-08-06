import ObxProperty from '@recore/obx/observable/obx-property';
import { resetDerivationState } from '@recore/obx/derivation';
import { ObxFlag } from '@recore/obx/observable/obx';

import { IArea } from './area';
import { IScope } from './scope';
import View from './view';

export type PropGetter = (scope: IScope, area: IArea) => any;

export interface PropConfig {
  key: string;
  expr?: PropGetter;
  value?: any;
  spread?: boolean;
}

export default class Prop {
  key: string;

  private spread: boolean = false;
  private data: any;
  private reactiveData: ObxProperty | null = null;

  constructor(private area: IArea, config: PropConfig, view?: View) {
    this.key = config.key;

    if (config.expr) {
      this.reactiveData = new ObxProperty(
        config.key,
        area.scope,
        config.expr,
        undefined,
        config.value,
        [ area, view ],
        ObxFlag.REF
      );
    } else {
      this.data = config.value;
    }

    this.spread = Boolean(config.spread);
  }

  getData(): any {
    if (this.reactiveData) {
      if (this.reactiveData.scope !== this.area.scope) {
        this.reactiveData.scope = this.area.scope;
        resetDerivationState(this.reactiveData);
      }

      return this.reactiveData.get();
    } else {
      return this.data;
    }
  }

  isSpread() {
    return this.spread;
  }
}
