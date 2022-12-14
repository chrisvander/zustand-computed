import { StateCreator, StoreApi, StoreMutatorIdentifier } from "zustand";
import deepEqual from "fast-deep-equal";

type ComputedStateCreator = <
  T extends object,
  A extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, [...Mps, ["chrisvander/zustand-computed", A]], Mcs>,
  compute: (state: T) => A
) => StateCreator<T, Mps, [["chrisvander/zustand-computed", A], ...Mcs], T & A>;

type Write<T, U> = Omit<T, keyof U> & U;

type StoreCompute<T, A> = Write<
  StoreApi<T>,
  {
    getState: () => T & A;
    subscribe: (listener: (state: T & A, prevState: T & A) => void) => () => void;
  }
>;

type WithCompute<S, A> = S extends { getState: () => infer T } ? Write<S, StoreCompute<T, A>> : never;

declare module "zustand" {
  interface StoreMutators<S, A> {
    "chrisvander/zustand-computed": WithCompute<S, A>;
  }
}

type ComputedStateImpl = <T extends object, A extends object>(
  f: StateCreator<T, [], []>,
  compute: (state: T) => A
) => StateCreator<T, [], [], T & A>;

const computedImpl: ComputedStateImpl = (f, compute) => (set, get, api) => {
  type T = ReturnType<typeof f>;
  type A = ReturnType<typeof compute>;

  const computeAndMerge = (state: T): T & A => {
    // calculate the new computed state
    const fullComputedState: A = compute({ ...state });
    const newState = { ...fullComputedState, ...state };

    // limit the new computed state down to object refs that changed
    for (const k of Object.keys(fullComputedState))
      if (!deepEqual(state[k], fullComputedState[k])) newState[k] = fullComputedState[k];

    // return state with the changed properties of computed
    return newState;
  };

  // higher level function to handle compute & compare overhead
  const setWithComputed = (update: T | ((state: T) => T), replace?: boolean) => {
    set((state: T): T & A => {
      const updated = typeof update === "object" ? update : update(state);
      return computeAndMerge({ ...state, ...updated });
    }, replace);
  };

  api.setState = setWithComputed;
  const st = f(setWithComputed, get, api) as T & A;
  return Object.assign({}, st, compute(st));
};

export const computed = computedImpl as unknown as ComputedStateCreator;
export default computed;
