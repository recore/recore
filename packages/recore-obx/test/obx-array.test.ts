import { obx, autorun, nextTick, $set, $del } from '../src';
import { SYMBOL_OBX } from '../src/observable/obx';
import { SYMBOL_PROXY } from '../src/observable/proxy';

describe('obx array tests', () => {
  class A {
    @obx arr = [1];
  }
  const a = new A;
  const f = jest.fn();
  autorun(() => {
    f(a.arr);
  }, {
    runFirstNow: true,
  });

  test('set array indexed deepkey', async () => {
    $set(a.arr, '1/otherKey', 1);
    await nextTick();
    expect(f).toHaveBeenCalledTimes(2);
  });

  test('set array deepkey', async () => {
    $set(a.arr, 'x/otherKey', 1);
    await nextTick();
    expect(f).toHaveBeenCalledTimes(3);
  });

  test('del array otherkey', async () => {
    $del(a, 'arr/x');
    await nextTick();
    expect(f).toHaveBeenCalledTimes(4);
  });

  test('del array indexedkey', async () => {
    $del(a, 'arr/0');
    await nextTick();
    expect(f).toHaveBeenCalledTimes(5);
  });

  test('set proxied array other keys', async () => {
    (a.arr as any).awefaw = '123';
    await nextTick();
    expect(f).toHaveBeenCalledTimes(5);
  });

  test('set internal property throw TypeError', () => {
    expect(() => {
      (a.arr as any)[SYMBOL_OBX] = '123';
    }).toThrow();
    expect(() => {
      (a.arr as any)[SYMBOL_PROXY] = '123';
    }).toThrow();
    expect(() => {
      (a.arr as any).pop = '123';
    }).toThrow();
  });

  test('del proxied array other keys', async () => {
    delete (a.arr as any)['awefaw'];
    await nextTick();
    expect(f).toHaveBeenCalledTimes(5);
  });

  test('del internal property throw error', () => {
    expect(() => {
      delete (a.arr as any)[SYMBOL_OBX];
    }).toThrow();
    expect(() => {
      delete (a.arr as any)[SYMBOL_PROXY];
    }).toThrow();
    expect(() => {
      delete (a.arr as any)['pop'];
    }).toThrow();
  })

  // Array mutators slice/pop/push/shift/unshift/reverse/ accessors
});
