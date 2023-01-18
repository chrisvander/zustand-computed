import { StateCreator, StoreApi, StoreMutatorIdentifier } from "zustand"
import shallow from "zustand/shallow"

type ComputedStateCreator = <
  T extends object,
  A extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, [...Mps, ["chrisvander/zustand-computed", A]], Mcs>,
  compute: (state: T) => A
) => StateCreator<T, Mps, [["chrisvander/zustand-computed", A], ...Mcs], T & A>

type Write<T, U> = Omit<T, keyof U> & U

type StoreCompute<T, A> = Write<
  StoreApi<T>,
  {
    getState: () => T & A
    subscribe: (listener: (state: T & A, prevState: T & A) => void) => () => void
  }
>

type WithCompute<S, A> = S extends { getState: () => infer T } ? Write<S, StoreCompute<T, A>> : never

declare module "zustand" {
  interface StoreMutators<S, A> {
    "chrisvander/zustand-computed": WithCompute<S, A>
  }
}

type ComputedStateImpl = <T extends object, A extends object>(
  f: StateCreator<T, [], []>,
  compute: (state: T) => A,
  opts?: {
    selector?: (state: T) => Partial<T> | Set<keyof T>
    disableProxy?: boolean
    equalityFn?: (a: T, b: T) => boolean
  }
) => StateCreator<T, [], [], T & A>

// set of keys that have been accessed in any compute call
const trackedSelectors = new Set<string | symbol>()
const computedImpl: ComputedStateImpl = (f, compute, opts) => (set, get, api) => {
  type T = ReturnType<typeof f>
  type A = ReturnType<typeof compute>

  const equalityFn = opts?.equalityFn ?? shallow

  if (opts?.selector) {
    const selector = opts.selector
    // check if selector is a Set
    if (selector instanceof Set) {
      selector.forEach((key) => trackedSelectors.add(key))
    } else {
      // selector is a function
      const keys = Object.keys(selector(get()))
      keys.forEach((key) => trackedSelectors.add(key))
    }
  }

  // we use a proxy to track which selectors are accessed if there's no selector and it hasn't been disabled
  const useProxy = opts?.disableProxy !== true && !opts?.selector
  const computeAndMerge = (state: T): T & A => {
    // create a Proxy to track which selectors are accessed
    const stateProxy = new Proxy(
      { ...state },
      {
        get: (_, prop) => {
          trackedSelectors.add(prop)
          return state[prop]
        },
      }
    )

    // calculate the new computed state
    const fullComputedState: A = compute(useProxy ? stateProxy : { ...state })
    const newState = { ...fullComputedState, ...state }

    // limit the new computed state down to object refs that changed
    for (const k of Object.keys(fullComputedState))
      if (!equalityFn(state[k], fullComputedState[k])) newState[k] = fullComputedState[k]

    // return state with the changed properties of computed
    return newState
  }

  // higher level function to handle compute & compare overhead
  const setWithComputed = (update: T | ((state: T) => T), replace?: boolean) => {
    set((state: T): T & A => {
      const updated = typeof update === "object" ? update : update(state)

      if (useProxy && trackedSelectors.size !== 0 && !Object.keys(updated).some((k) => trackedSelectors.has(k))) {
        // if we have a selector set, but none of the updated keys are in the selector set, then we can skip the compute
        return { ...state, ...updated } as T & A
      }

      return computeAndMerge({ ...state, ...updated })
    }, replace)
  }

  api.setState = setWithComputed
  const st = f(setWithComputed, get, api) as T & A
  return Object.assign({}, st, compute(st))
}

export const computed = computedImpl as unknown as ComputedStateCreator
export default computed
