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

const computeState = createComputed((state) => ({
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

A fully-featured example can be found under the "example" directory.

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

## Selectors

By default, when `zustand-computed` runs your `computeState` function, it tracks accessed variables and does not trigger a computation if one of those variables do not change. This could potentially be problematic if you have nested control flow inside of `computeState`, or perhaps you want it to run on _all_ changes regardless of use inside of `computeState`. To disable automatic selector detection, you can pass a second `opts` variable to the `createComputed` function, e.g.

```ts
const computed = createComputed((state: Store) => { /* ... */ }, { disableProxy: true })
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

Other options include passing a `keys` array, which explicitly spell out the selectors which trigger re-computation. You can also pass a custom `equalityFn`, such as [fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal) instead of the default `zustand/shallow`.

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
