import { nextId } from '@recore/obx/utils';
import { IListenable, notifyListeners, registerListener } from '@recore/obx/listener';
import { Reaction } from '@recore/obx/reaction';
import { setDerivationDirty, resetDerivationState, isCaughtException } from '@recore/obx/derivation';
import { reportObserved, IObservable } from '@recore/obx/observable/observable';
import { hasObx, getObx } from '@recore/obx/observable/obx';
import { nextTick } from '@recore/obx';
import { hasOwnProperty } from '@recore/utils';

import Prop, { PropConfig } from './prop';
import { IScope } from './scope';
import View, { ViewConfig } from './view';
import GhostArea from './ghost-area';
import VirtualArea from './virtual-area';

export interface AreaConfig {
  key: string;
  throttle?: number;
  views?: ViewConfig[];
  exprs?: PropConfig[];
  /**
   * @deprecated
   */
  priority?: number;
  level?: number;
  virtual?: boolean;
}

export interface IArea {
  key: string;
  scope: IScope;
  sleepMarked?: boolean;
  mark?: (sleep: boolean) => void;
  sleep(): void;
  wakeup(): void;
  replaceScope(scope: IScope): void;
  runImmediately(): void;
}

export default class Area implements IListenable, IArea {
  readonly key: string;
  readonly level: number;
  sleepMarked: boolean = false;

  private sleeping = false;
  private revision: number = -1;
  private areasMap: { [name: string]: IArea } = {};
  private areas: IArea[] = [];
  private viewsData: { [name: string]: object } = {};
  private exprsData: { [name: string]: any } = {};
  private views: { [name: string]: View } = {};
  private exprs: { [name: string]: Prop } = {};
  private reaction: Reaction;
  private notify: boolean = false;
  private running: boolean = false;
  private caughtException: any = null;

  constructor(
    public scope: IScope,
    public config: AreaConfig
  ) {
    this.level = config.level || config.priority || 0;
    this.key = config.key || nextId();

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

    this.reaction = new Reaction(`Area@${this.key}`, () => {
      this.revision += 1;

      this.running = true;
      this.reaction.track(() => {
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
      });

      if (hasObx(this.scope)) {
        const obx = getObx(this.scope) as IObservable;
        reportObserved(obx);
      }
      this.running = false;

      if (this.notify) {
        notifyListeners(this);
      } else {
        this.notify = true;
      }
    }, this.level, config.throttle || 10);
  }

  replaceScope(scope: IScope) {
    this.scope = scope;
    this.notify = false;
    resetDerivationState(this.reaction);
  }

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

    const notifier = (immediately?: boolean, err?: any) => {
      if (isCaughtException(err)) {
        this.revision += 1;
        (err as any).revision = this.revision;
        this.caughtException = err;
        nextTick(() => notifyListeners(this));
        return;
      }
      if (immediately) {
        this.runImmediately();
      } else {
        setDerivationDirty(this.reaction);
      }
    };

    if (ghost) {
      area = new GhostArea(this.scope, config, notifier);
    } else if (config.virtual) {
      area = new VirtualArea(this.scope, config, notifier);
    } else {
      area = new Area(this.scope, config);
    }

    this.areas.push(area);
    this.areasMap[area.key] = area;

    return area;
  }

  isDirty() {
    return this.reaction.isDirty();
  }

  getRevision() {
    this.checkRun();
    return this.revision;
  }

  getCaughtException() {
    if (this.caughtException && this.caughtException.revision === this.revision) {
      return this.caughtException;
    }
    return this.reaction.caughtException;
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
    this.revision = -1;
    this.sleeping = true;
    this.reaction.sleep();
    this.areas.forEach((area) => area.sleep());
  }

  wakeup() {
    if (!this.sleeping) {
      return;
    }
    this.sleeping = false;
    this.reaction.wakeup();
    this.areas.forEach((area) => area.wakeup());
  }

  observe(fn: () => void): () => void {
    return registerListener(this, fn);
  }

  runImmediately() {
    if (this.isDirty()) {
      this.reaction.runReaction();
    }
  }

  private checkRun() {
    if (this.revision < 0 || this.isDirty()) {
      this.notify = false;
      this.reaction.run();
      this.notify = true;
    }
  }
}
