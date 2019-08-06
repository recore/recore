import { nextId } from '@recore/obx/utils';
import {
  IDerivation,
  DerivationState,
  clearObserving,
  shouldCompute,
  runDerivedFunction,
  resetDerivationState,
  isCaughtException,
  CaughtException,
} from '@recore/obx/derivation';
import { IObservable, startBatch, endBatch } from '@recore/obx/observable/observable';
import { hasOwnProperty } from '@recore/utils';

import Prop from './prop';
import { IScope } from './scope';
import View from './view';
import Area, { IArea, AreaConfig } from './area';
import GhostArea from './ghost-area';

export default class VirtualArea implements IDerivation, IArea {
  id = nextId();
  key: string;
  name: string;
  observing: IObservable[] = [];
  dependenciesState = DerivationState.NOT_TRACKING;
  isVirtual = true;
  sleepMarked: boolean = false;

  private sleeping = false;
  private running: boolean = false;

  private areasMap: { [name: string]: IArea } = {};
  private areas: IArea[] = [];
  private viewsData: { [name: string]: object } = {};
  private exprsData: { [name: string]: any } = {};
  private views: { [name: string]: View } = {};
  private exprs: { [name: string]: Prop } = {};
  private reaction: () => void;

  constructor(
    public scope: IScope,
    public config: AreaConfig,
    private notifier: (immediately?: boolean, err?: CaughtException) => void
  ) {
    this.key = config.key || this.id;
    this.name = `varea@${this.key}`;

    const views = (config.views || []).map((viewConfig) => {
      const view = new View(this, viewConfig);
      this.views[view.key] = view;
      return view;
    });

    const exprs = (config.exprs || []).map((exprConfig) => {
      const expr = new Prop(this, exprConfig);
      this.exprs[expr.key] = expr;
      return expr;
    });

    this.reaction = () => {
      this.viewsData = {};
      this.exprsData = {};

      views.forEach((view) => {
        if (!hasOwnProperty(this.viewsData, view.key)) {
          this.viewsData[view.key] = view.props;
        }
      });

      exprs.forEach((expr) => {
        if (!hasOwnProperty(this.exprsData, expr.key)) {
          this.exprsData[expr.key] = expr.getData();
        }
      });
    };
  }

  onBecomeDirty() {
    this.notifier();
  }

  replaceScope(scope: IScope) {
    this.scope = scope;
    resetDerivationState(this);
  }

  /**
   * get view props data
   */
  p(name: string): object | undefined {
    if (this.running) {
      if (!hasOwnProperty(this.viewsData, name) && hasOwnProperty(this.views, name)) {
        this.viewsData[name] = this.views[name].props;
      }
    } else {
      this.checkRun();
    }
    return this.viewsData[name];
  }

  /**
   * get expr data
   */
  e(name: string): any {
    if (this.running) {
      if (!hasOwnProperty(this.exprsData, name) && hasOwnProperty(this.exprs, name)) {
        this.exprsData[name] = this.exprs[name].getData();
      }
    } else {
      this.checkRun();
    }
    return this.exprsData[name];
  }

  c(config: AreaConfig, ghost: boolean = false, create: boolean = false): IArea {
    if (create) {
      return new Area(this.scope, config);
    }
    if (config.key === this.key) {
      return this;
    }

    let area: IArea;
    if (hasOwnProperty(this.areasMap, config.key)) {
      area = this.areasMap[config.key]!;
      if (area.scope !== this.scope) {
        area.replaceScope(this.scope);
      }
      return area;
    }

    if (ghost) {
      area = new GhostArea(this.scope, config, this.notifier);
    } else if (config.virtual) {
      area = new VirtualArea(this.scope, config, this.notifier);
    } else {
      area = new Area(this.scope, config);
    }

    this.areasMap[area.key] = area;
    this.areas.push(area);

    return area;
  }

  mark(sleep: boolean) {
    this.sleepMarked = sleep;
    if (sleep === false) {
      this.wakeup();
    }
  }

  sleep() {
    if (this.sleeping) {
      return;
    }
    this.sleepMarked = false;
    this.sleeping = true;
    startBatch();
    this.areas.forEach((area) => area.sleep());
    if (!this.running) {
      clearObserving(this);
    }
    endBatch();
  }

  wakeup() {
    if (!this.sleeping) {
      return;
    }
    this.sleeping = false;
    this.areas.forEach((area) => area.wakeup());
  }

  runImmediately() {
    this.notifier(true);
  }

  private checkRun() {
    if (this.sleeping) {
      return;
    }
    startBatch();
    let result: any;
    if (shouldCompute(this)) {
      this.running = true;
      result = runDerivedFunction(this, this.reaction);
      this.running = false;
    }
    if (this.sleeping) {
      clearObserving(this);
    }
    endBatch();

    if (isCaughtException(result)) {
      this.notifier(false, result);
    }
  }
}
