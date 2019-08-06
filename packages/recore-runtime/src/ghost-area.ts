import { nextTick } from '@recore/obx/next-tick';
import { untracked } from '@recore/obx/derivation';
import { hasOwnProperty } from '@recore/utils';

import { IScope } from './scope';
import Area, { IArea, AreaConfig } from './area';
import VirtualArea from './virtual-area';

export interface CursorData {
  $id: string;
  $each: any;
  [key: string]: any;
}

export default class GhostArea implements IArea {
  key: string;

  private sleeping = false;
  private areas: IArea[] = [];
  private areasMap: { [name: string]: IArea } = {};
  private marked: boolean = false;

  constructor(
    public scope: IScope,
    public config: AreaConfig,
    private notifier: (immediately?: boolean) => void
  ) {
    this.key = config.key;
  }

  replaceScope(scope: IScope) {
    this.scope = scope;
  }

  // 迭代派生域
  w(data: CursorData) {
    const key = data.$id;
    if (!this.marked) {
      this.marked = true;
      this.areas.forEach((item) => item.mark!(true));
      nextTick(() => {
        this.marked = false;
        this.areas.forEach((item) => {
          if (item.sleepMarked) {
            item.sleep();
          }
        });
      });
    }

    let area: IArea;
    if (hasOwnProperty(this.areasMap, key)) {
      area = this.areasMap[key]!;
      if (area.scope.$super !== this.scope || area.scope.$each !== data.$each) {
        const scope = this.scope.$derive(data);
        untracked(() => area.replaceScope(scope));
      }
      area.mark!(false);
    } else {
      const scope = this.scope.$derive(data);
      area = this.config.virtual === true
        ? new VirtualArea(scope, this.config, this.notifier)
        : new Area(scope, this.config);
      this.areas.push(area);
      this.areasMap[key] = area;
    }
    area.key = key;

    return area;
  }

  sleep() {
    if (this.sleeping) {
      return;
    }
    this.sleeping = true;
    this.areas.forEach((area) => area.sleep());
  }

  wakeup() {
    this.sleeping = false;
  }

  runImmediately() {
    this.notifier(true);
  }
}
