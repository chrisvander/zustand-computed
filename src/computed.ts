import { StateCreator, StoreMutatorIdentifier, Mutate, StoreApi } from "zustand"
import * as deepEqual from "fast-deep-equal/es6";

type ComputedStateCreator = <
  T extends object,
  A,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, [...Mps, ['chrisvander/zustand-computed', A]], Mcs>,
  compute: (state: T) => A
) => StateCreator<T, Mps, [['chrisvander/zustand-computed', A], ...Mcs]>

type Write<T extends object, U extends object> = Omit<T, keyof U> & U
type Cast<T, U> = T extends U ? T : U

declare module 'zustand' {
  interface StoreMutators<S, A> {
    'chrisvander/zustand-computed': Write<Cast<S, object>, { foo: A }>
  }
}

type ComputedStateImpl = <T extends object, A extends object>(
  f: StateCreator<T, [], []>,
  compute: (state: T) => A
) => StateCreator<T, [], []>

const computedImpl: ComputedStateImpl = (f, compute) => (set, get, _store) => {
  type T = ReturnType<typeof f>
  type A = typeof compute

  const setWithComputed = (update: T | ((state: T) => T), replace?: boolean) => {
    set((state: T) => {
      const updated = typeof update === "object" ? update : update(state)
      
      // calculate the new computed state
      const fullComputedState = compute({ ...state, ...updated })
      const computed = {}

      // limit the full computed state down to object refs that changed
      for (const k of Object.keys(fullComputedState))
        if (!deepEqual(updated[k], fullComputedState[k]))
          computed[k] = fullComputedState[k]

      // return state with the changed properties of computed
      return { ...updated, ...computed }
    }, replace)
  }

  const store = _store as Mutate<StoreApi<T>, [['chrisvander/zustand-computed', A]]>
  store.setState = setWithComputed

  return f(set, get, { ..._store, setState: setWithComputed })
}

export const computed = computedImpl as unknown as ComputedStateCreator
