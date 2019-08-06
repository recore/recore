import { obx, autorun, nextTick, $set, $del } from '../src';

describe('obx array tests', () => {
  class A {
    @obx xx: any = {};
  }

  const a = new A();
  const f = jest.fn();

  autorun(({ firstRun }) => {
    const y = JSON.stringify(a.xx);
    !firstRun && f(y);
  }, {
    runFirstNow: true,
  });

  // proxied set key
  test('set proxied object property', async () => {
    a.xx.q = 1;
    await nextTick();
    expect(f).toHaveBeenLastCalledWith('{"q":1}');
  });

  // proxied delete key
  test('del proxied object property', async () => {
    delete a.xx.q;
    await nextTick();
    expect(f).toHaveBeenLastCalledWith('{}');
  });

  // proxied get key

  // proxied has key

  // set del extend get test

  // deep shallow self ref test

});
