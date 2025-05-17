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
      shouldRecompute?: (state: T, nextState: T) => boolean
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

type SetStateWithArgs = Parameters<ReturnType<ReturnType<ComputedStateImpl>>>[0] extends (...args: infer U) => void
  ? (...args: [...U, ...unknown[]]) => void
  : never

const computedImpl: ComputedStateImpl = (compute, opts) => (f) => {
  type T = ReturnType<typeof f>
  type A = ReturnType<typeof compute>

  const optsKeys = !opts || !("keys" in opts) || opts.keys == null ? undefined : opts.keys
  const keysSet = optsKeys ? new Set(optsKeys as string[]) : undefined

  function defaultShouldRecomputeFn<T>(_: T, nextState: T): boolean {
    if (!keysSet || nextState == null) return true
    return Object.keys(nextState).some((k) => keysSet.has(k))
  }

  const shouldRecomputeFn =
    opts && "shouldRecompute" in opts ? (opts.shouldRecompute ?? defaultShouldRecomputeFn) : defaultShouldRecomputeFn

  // Set of keys that have been accessed in any compute call.
  return (set, get, api) => {
    const equalityFn = opts?.equalityFn ?? shallow

    const computeAndMerge = (state: T | (T & A)): T & A => {
      // Calculate the new computed state.
      const computedState: A = compute({ ...state })

      // If part of the computed state did not change according to the equalityFn,
      // then delete that key from the newly calculated computed state.
      for (const k of Object.keys(computedState) as (keyof A)[]) {
        if (equalityFn(computedState[k], (state as T & A)[k])) {
          delete computedState[k]
        }
      }

      return { ...state, ...computedState }
    }

    /**
     * Higher level function to handle compute & compare overhead.
     */
    const setWithComputed = (update: T | ((state: T) => T), replace?: boolean, ...args: unknown[]) => {
      ;(set as SetStateWithArgs)(
        (state: T): T & A => {
          const updated = typeof update === "object" ? update : update(state)
          if (!shouldRecomputeFn?.(state, updated)) return { ...state, ...updated } as T & A
          return computeAndMerge({ ...state, ...updated })
        },
        replace,
        ...args,
      )
    }

    const _api = api as Mutate<StoreApi<T>, [["chrisvander/zustand-computed", A]]>
    _api.setState = setWithComputed
    const st = f(setWithComputed, get, _api) as T & A
    return Object.assign({}, st, compute(st))
  }
}

export const createComputed = computedImpl as unknown as ComputedStateCreator
