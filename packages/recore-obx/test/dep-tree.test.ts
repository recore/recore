import { obx } from '../src';
import { getObx } from '../src/observable/obx';
import { getObxProperty } from '../src/observable/obx-property';
import { DerivationState, shouldCompute } from '../src/derivation';

describe('DepTree check', () => {
  class A {
    @obx a = 1;
    @obx b = {
      c: 1
    };
    @obx get u() {
      return this.a + this.b.c;
    }
    @obx get g() {
      return this.u * 0;
    }
    @obx get h() {
      return this.g + 1;
    }
  }

  const a = new A();
  a.h;

  test('check observing', () => {
    const obx_a = getObxProperty(a, 'a')!;
    const obx_b = getObxProperty(a, 'b')!;
    const obx_u = getObxProperty(a, 'u')!;
    const obx_bv = getObx(a.b)!;
    const obx_bvc = getObxProperty(a.b, 'c')!;
    expect(obx_a.observing).toEqual([]);
    expect(obx_u.observing.map(x => x.id)).toEqual([ obx_a.id, obx_b.id, obx_bv.id, obx_bvc.id ]);
  });
  test('check observers', () => {
    const obx_a = getObxProperty(a, 'a')!;
    const obx_u = getObxProperty(a, 'u')!;
    const obx_g = getObxProperty(a, 'g')!;
    expect(Array.from(obx_a.observers).map(x => x.id)).toEqual([obx_u.id]);
    expect(Array.from(obx_u.observers).map(x => x.id)).toEqual([obx_g.id]);
  });
  test('dirty check', () => {
    a.a = 2;
    const obx_a = getObxProperty(a, 'a')!;
    const obx_u = getObxProperty(a, 'u')!;
    const obx_g = getObxProperty(a, 'g')!;
    const obx_h = getObxProperty(a, 'h')!;
    expect(obx_a.lowestObserverState).toBe(DerivationState.MYBE_DIRTY);
    expect(obx_u.dependenciesState).toBe(DerivationState.MYBE_DIRTY);
    expect(obx_g.dependenciesState).toBe(DerivationState.MYBE_DIRTY);
    expect(obx_h.dependenciesState).toBe(DerivationState.MYBE_DIRTY);
    expect(shouldCompute(obx_u)).toBe(true);
    expect(obx_a.lowestObserverState).toBe(DerivationState.DIRTY);
    expect(obx_u.dependenciesState).toBe(DerivationState.DIRTY);
    expect(shouldCompute(obx_g)).toBe(true);
    expect(obx_g.dependenciesState).toBe(DerivationState.DIRTY);
    expect(shouldCompute(obx_h)).toBe(false);
    expect(obx_h.dependenciesState).toBe(DerivationState.UP_TO_DATE);
    a.g;
    expect(obx_a.lowestObserverState).toBe(DerivationState.UP_TO_DATE);
    expect(obx_u.dependenciesState).toBe(DerivationState.UP_TO_DATE);
    expect(obx_g.dependenciesState).toBe(DerivationState.UP_TO_DATE);
    a.b.c = 2;
    a.b.c = 1;
    expect(obx_u.dependenciesState).toBe(DerivationState.MYBE_DIRTY);
    expect(shouldCompute(obx_h)).toBe(false);
    expect(obx_u.dependenciesState).toBe(DerivationState.UP_TO_DATE);
    expect(obx_g.dependenciesState).toBe(DerivationState.UP_TO_DATE);
    expect(obx_h.dependenciesState).toBe(DerivationState.UP_TO_DATE);
  });
});
