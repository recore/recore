import { autorun, nextTick, obx } from '../src';

describe('Decorators check', () => {
  class A {
    @obx.ref a = 1;
    @obx.ref b = {};
    @obx.ref c: any[] = [];
    @obx.ref d = new Set([1, 2, 3]);
    @obx.ref e = new Map<string, any>([['name', 'bingbing'], ['sex', 1]]);
    @obx.self s1 = new Set([1, 2, 3]);
    @obx.self s2 = new Map<string, any>();
    @obx.shallow g = new Map<string, any>([['name', { a: 2 }]]);
    @obx.shallow h = [{ a: 1 }];
    @obx.shallow i = { a: { b: 1 } };
    @obx.deep j: any = {};
  }

  const x = new A();

  test('obx.ref', async () => {
    const f = jest.fn();
    autorun(() => {
      f(x.a, x.b, x.c, x.d, x.e);
    }, {
      runFirstNow: true,
    });
    const a = 2;
    const b = { x: 1 };
    const c = [ 1, 2, 3 ];
    const d = new Set([]);
    const e = new Map<string, any>();
    x.a = a;
    x.b = b;
    x.c = c;
    x.d = d;
    x.e = e;

    await nextTick();
    expect(f).toHaveBeenLastCalledWith(a, b, c, d, e);
    expect(f).toHaveBeenCalledTimes(2);

    x.d.add(4);
    x.d.delete(2);
    x.d.clear();
    x.e.set('123', 4);
    x.e.delete('sex');
    x.e.clear();
    await nextTick();
    expect(f).toHaveBeenCalledTimes(2);
  });

  test('obx.self', async () => {
    const f = jest.fn();
    autorun(() => {
      f(Array.from(x.s1), x.s2 && x.s2.get('s'));
    }, {
      runFirstNow: true,
    });
    x.s1.add(4);
    await nextTick();
    expect(f).toHaveBeenCalledTimes(2);
    x.s2.set('s', new Set());
    await nextTick();
    expect(f).toHaveBeenCalledTimes(3);
    x.s1.add(4);
    x.s2.get('s').add(1);
    await nextTick();
    expect(f).toHaveBeenCalledTimes(3);
  });

  test('obx.shallow', async () => {
    const f = jest.fn();
    autorun(() => {
      f(x.g.get('name'), x.h[0], x.i.a);
    }, {
      runFirstNow: true,
    });

    x.g.get('name').c = 4;
    await nextTick();
    expect(f).toHaveBeenCalledTimes(2);

    (x.h[0] as any).b = 2;
    await nextTick();
    expect(f).toHaveBeenCalledTimes(3);

    (x.i.a as any).c = 2;
    await nextTick();
    expect(f).toHaveBeenCalledTimes(4);

    x.g.get('name').a = 3;
    (x.h[0] as any).b = 3;
    (x.i.a as any).c = 3;
    await nextTick();
    expect(f).toHaveBeenCalledTimes(4);
  });


  test('obx.deep', async () => {
    const f = jest.fn();
    autorun(() => {
      f(x.j.a && x.j.a[0] && x.j.a[0].get('s'));
    }, {
      runFirstNow: true,
    });

    x.j.a = [];
    await nextTick();
    expect(f).toHaveBeenCalledTimes(2);
    x.j.a.push(new Map());
    await nextTick();
    expect(f).toHaveBeenCalledTimes(3);
    x.j.a[0].set('s', new Set());
    await nextTick();
    expect(f).toHaveBeenCalledTimes(4);
    x.j.a[0].get('s').add(123);
    await nextTick();
    expect(f).toHaveBeenCalledTimes(5);
  });
});
