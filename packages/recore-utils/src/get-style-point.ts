import StylePoint from '../../../utils/style-point';

const stylePointTable: any = {};

function getAppPoint() {
  if (!stylePointTable.app) {
    stylePointTable.app = new StylePoint('app', 1000, document.head.querySelector('style[base-point]')!);
  }
  return stylePointTable.app;
}

export function getStylePoint(id: string, level: number = 2000): StylePoint {
  if (stylePointTable[id]) {
    return stylePointTable[id];
  }

  const app = getAppPoint();

  if (id === 'app') {
    return app;
  }

  const point = new StylePoint(id, level);
  if (level >= app.level) {
    let prev = app;
    let next = prev.next;
    while (next && level >= next.level) {
      prev = next;
      next = prev.next;
    }
    prev.next = point;
    point.prev = prev;
    if (next) {
      point.next = next;
      next.prev = point;
    }
  } else {
    let next = app;
    let prev = next.prev;
    while (prev && level < prev.level) {
      next = prev;
      prev = next.prev;
    }
    next.prev = point;
    point.next = next;
    if (prev) {
      point.prev = prev;
      prev.next = point;
    }
  }
  point.insert();
  stylePointTable[id] = point;

  return point;
}
