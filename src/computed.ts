import type { Mutate, StateCreator, StoreApi, StoreMutatorIdentifier } from "zustand"
import { shallow } from "zustand/shallow"

/**
 * Options for when and how your compute function is called.
 */
export type ComputedStateOpts<T> = (
  | {
      /**
       * An explicit list of keys to track for recomputation. By default,
       * `zustand-computed` will run your compute function on any change.
       * This lets you filter those keys out. It's better to use the
       * `compareFn` to be more explicit about how comparison is determined.
       */
      keys?: (keyof T)[]
    }
  | {
      /**
       * Custom comparison function to determine whether to recompute.
       * Receives the previous and next store state, should return true if
       * compute should run, false to skip recomputation. This function
       * should be *fast* - it determines whether or not you need to
       * recompute.
       */
      shouldRecompute?: (state: T, nextState: T | Partial<T>) => boolean
    }
) & {
  /**
   * @deprecated removed proxy; this does nothing and will be removed.
   */
  disableProxy?: boolean
  /**
   * Custom equality function for comparing computed values. By default, we use
   * `zustand/shallow` to compare each key in your store against the newly-
   * computed values. This is likely the desired method of comparison.
   *
   * The motivation for this function is to ensure that, in the case your
   * computed function returns a value that is identical structurally, it
   * should not cause a re-render despite the reference being different.
   *
   * You can disable comparison, so that the most recent result of the
   * compute function always triggers downstream re-renders, by simply
   * returning false.
   */
  equalityFn?: <Y>(a: Y, b: Y) => boolean
}

export type ComputedStateCreator = <T extends object, A extends object>(
  compute: (state: T) => A,
  opts?: ComputedStateOpts<T>,
) => <
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
  U = T,
>(
  f: StateCreator<T, [...Mps, ["chrisvander/zustand-computed", A]], Mcs>,
) => StateCreator<T, Mps, [["chrisvander/zustand-computed", A], ...Mcs], U & A>

type Cast<T, U> = T extends U ? T : U
type Write<T, U> = Omit<T, keyof U> & U
type StoreCompute<S, A> = S extends {
  getState: () => infer T
}
  ? Omit<StoreApi<T & A>, "setState">
  : never
type WithCompute<S, A> = Write<S, StoreCompute<S, A>>

declare module "zustand/vanilla" {
  interface StoreMutators<S, A> {
    "chrisvander/zustand-computed": WithCompute<Cast<S, object>, A>
  }
}

type ComputedStateImpl = <T extends object, A extends object>(
  compute: (state: T) => A,
  opts?: ComputedStateOpts<T>,
) => (f: StateCreator<T, [], []>) => StateCreator<T, [], [], T & A>

const computedImpl: ComputedStateImpl = (compute, opts) => (f) => {
  type T = ReturnType<typeof f>
  type A = ReturnType<typeof compute>

  const optsKeys = !opts || !("keys" in opts) || opts.keys == null ? undefined : opts.keys
  const keysSet = optsKeys ? new Set(optsKeys as string[]) : undefined

  function defaultShouldRecomputeFn<T>(_: T, nextState: T | Partial<T>): boolean {
    if (!keysSet || nextState == null) return true
    return Object.keys(nextState).some((k) => keysSet.has(k))
  }

  const shouldRecomputeFn =
    opts && "shouldRecompute" in opts ? (opts.shouldRecompute ?? defaultShouldRecomputeFn) : defaultShouldRecomputeFn

  // Set of keys that have been accessed in any compute call.
  return (set, get, api) => {
    const equalityFn = opts?.equalityFn ?? shallow

    function computeAndMerge(state: T | (T & A)): T & A {
      // Calculate the new computed state.
      const computedState = compute(state)

      // If part of the computed state did not change according to the equalityFn,
      // then delete that key from the newly calculated computed state.
      for (const k of Object.keys(computedState) as (keyof A)[]) {
        if (k in state && equalityFn(computedState[k], (state as T & A)[k])) {
          delete computedState[k]
        }
      }

      return Object.assign(state, computedState)
    }

    const _api = api as Mutate<StoreApi<T>, [["chrisvander/zustand-computed", A]]>

    /**
     * Higher level function to handle compute & compare overhead.
     */
    function setState(partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: false): void
    function setState(state: T | ((state: T) => T), replace: true): void
    function setState(arg: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean): void {
      if (replace === false || replace == null) {
        // Merge the partial state with the current state.
        set((state) => {
          const newState = typeof arg === "function" ? arg(state) : arg
          if (!shouldRecomputeFn(state, newState)) return newState
          return computeAndMerge(Object.assign(state, newState))
        }, replace)
        return
      }

      set((state) => {
        const newArg = arg as T | ((state: T) => T)
        const newState: T = typeof newArg === "function" ? newArg(state) : newArg
        if (!shouldRecomputeFn(state, newState)) return newState
        return computeAndMerge(newState)
      }, replace)
    }

    _api.setState = setState
    const st = f(setState, get, _api)
    return Object.assign({}, st, compute(st))
  }
}

export const createComputed = computedImpl as unknown as ComputedStateCreator
