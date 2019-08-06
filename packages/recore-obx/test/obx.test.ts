import { autorun, nextTick, $get, $set, $del, $extend, obx } from '../src';
import { SYMBOL_DECORATORS } from '../src/utils';

describe('decorators', () => {
  test('decorators collection', () => {
    class A {
      @obx a = 1;
    }

    expect((A.prototype as any)[SYMBOL_DECORATORS]).toHaveProperty('a');
  });
})


describe('autorun', () => {
  class A {
    // @ts-ignore
    @obx x = 1;
  }
  test('firstrun', (done) => {
    const a = new A();
    const drink = jest.fn();
    autorun(() => {
      drink(a.x);
    });
    nextTick(() => {
      expect(drink).toHaveBeenCalledWith(1);
      done();
    });
  });
  test('reactiverun', (done) => {
    const a = new A();
    const drink = jest.fn();
    autorun(() => {
      drink(a.x);
    });
    a.x = 2;
    nextTick(() => {
      expect(drink).toHaveBeenCalledTimes(1);
      expect(drink).toHaveBeenLastCalledWith(2);
      done();
    });
  });
});

describe('data reaction', () => {
  // Set/WeakSet
  // Map
  // Array mutators slice/pop/push/shift/unshift/reverse/ accessors
  // Object
});

