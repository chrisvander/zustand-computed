# zustand-computed

[![NPM Package][npm-img]][npm-url]
[![Bundle Size][size-img]][size-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]

zustand-computed is a lightweight, TypeScript-friendly middleware for the state management system [Zustand](https://github.com/pmndrs/zustand). It's a simple layer which adds a transformation function after any state change in your store.

## Install

```bash
# one of the following
npm i zustand-computed
pnpm i zustand-computed
bun add zustand-computed
yarn add zustand-computed
```

## Usage

The middleware layer takes in your store creation function and a compute function, which transforms your state into a computed state. It does not need to handle merging states.

```js
import { createComputed } from "zustand-computed"

const computed = createComputed((state) => ({
  countSq: state.count ** 2,
}))

const useStore = create(
  computed(
    (set, get) => ({
      count: 1,
      inc: () => set((state) => ({ count: state.count + 1 })),
      dec: () => set((state) => ({ count: state.count - 1 })),
      // get() function has access to ComputedStore
      square: () => set(() => ({ count: get().countSq })),
      root: () => set((state) => ({ count: Math.floor(Math.sqrt(state.count)) })),
    })
  )
)
```

With types, the previous example would look like this:

```ts
import { createComputed } from "zustand-computed"

type Store = {
  count: number
  inc: () => void
  dec: () => void
}

type ComputedStore = {
  countSq: number
}

const computed = createComputed((state: Store): ComputedStore => ({
  countSq: state.count ** 2,
}))

const useStore = create<Store>()(
  computed(
    (set) => ({
      count: 1,
      inc: () => set((state) => ({ count: state.count + 1 })),
      dec: () => set((state) => ({ count: state.count - 1 })),
      // get() function has access to ComputedStore
      square: () => set(() => ({ count: get().countSq })),
      root: () => set((state) => ({ count: Math.floor(Math.sqrt(state.count)) })),
    })
  )
)
```

The store can then be used as normal in a React component or via the Zustand API.

```tsx
function Counter() {
  const { count, countSq, inc, dec } = useStore()
  return (
    <div>
      <span>{count}</span>
      <br />
      <span>{countSq}</span>
      <br />
      <button onClick={inc}>+1</button>
      <button onClick={dec}>-1</button>
    </div>
  )
}
```

## With Middleware

Here's an example with the Immer middleware.

```ts
const computed = createComputed((state: Store) => { /* ... */ })
const useStore = create<Store>()(
  devtools(
    immer(
      computed(
        (set) => ({
          count: 1,
          inc: () =>
            set((state) => {
              // example with Immer middleware
              state.count += 1
            }),
          dec: () => set((state) => ({ count: state.count - 1 })),
        })
      )
    )
  )
)
```

## Skip Computation

By default, your compute function runs every time the store changes. If you use slices, it will only run inside of the particular slice that changes. For simple functions, this may not make a big difference. If you want to skip computation, you've got two options: a `keys` array, or a `shouldRecompute` function. Both can be passed in the opts, like below:

```ts
// only recomputes when "count" changes
const computed = createComputed((state: Store) => { /* ... */ }, { keys: ["count"] })
// only recomputes when the current state's count does not equal the next state's count (same as above, but more explicit)
const computedWithShouldRecomputeFn = createComputed((state: Store) => { /* ... */ }, { shouldRecompute: (state, nextState) => {
  return state.count !== nextState.count
} })
const useStore = create<Store, [["chrisvander/zustand-computed", ComputedStore]]>(
  computed(
    (set) => ({
      count: 1,
      inc: () => set((state) => ({ count: state.count + 1 })),
      dec: () => set((state) => ({ count: state.count - 1 })),
    })
  )
)
```

# Memoization

`zustand-computed` ensures that, if a newly-computed value is equal to the previous value, it will prevent the reference from changing so your components don't have unnecessary re-renders. You can customize this behavior with an optional `equalityFn`, such as [fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal). By default, it uses `zustand/shallow` to compare values, but if you have a deeply nested state you may want to reach for something more powerful.

[build-img]: https://github.com/chrisvander/zustand-computed/actions/workflows/ci.yml/badge.svg
[build-url]: https://github.com/chrisvander/zustand-computed/actions/workflows/ci.yml
[size-img]: https://img.shields.io/bundlephobia/minzip/zustand-computed
[size-url]: https://bundlephobia.com/package/zustand-computed@1.4.2
[downloads-img]: https://img.shields.io/npm/dt/zustand-computed
[downloads-url]: https://www.npmtrends.com/zustand-computed
[npm-img]: https://img.shields.io/npm/v/zustand-computed
[npm-url]: https://www.npmjs.com/package/zustand-computed
[issues-img]: https://img.shields.io/github/issues/chrisvander/zustand-computed
[issues-url]: https://github.com/chrisvander/chrisvander/zustand-computed/issues
