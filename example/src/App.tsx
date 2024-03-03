import logo from "./logo.svg"
import "./App.css"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { computed } from "zustand-computed"

type Store = {
  count: number
  inc: () => void
  dec: () => void
  square: () => void
  root: () => void
}

type ComputedStore = {
  countSq: number
}

function computeState(state: Store): ComputedStore {
  return {
    countSq: state.count ** 2,
  }
}

const useStore = create<Store>()(
  devtools(
    computed(
      (set, get) => ({
        count: 1,
        inc: () =>
          set((state) => {
            // return { countSq: 1 } would error here; SetState does not include ComputedStore
            return { count: state.count + 1 }
          }),
        dec: () => set((state) => ({ count: state.count - 1 })),
        // the get() function has access to the computed store
        square: () => set({ count: get().countSq }),
        root: () => set({ count: Math.floor(Math.sqrt(get().count)) }),
      }),
      computeState,
    ),
  ),
)

// The following line would throw an error as well, for the same reason as above
//
// useStore.setState({ countSq: 100 })
//
// When using Immer, this line may not error, because Immer creates it's setState function
// by using the type of the get() function, which includes the ComputedStore

function Counter() {
  const { count, countSq, inc, dec, square, root } = useStore()
  return (
    <div className="counter">
      <span>{count}</span>
      <br />
      <span>{countSq}</span>
      <br />
      <button type="button" onClick={inc}>
        +1
      </button>
      <button type="button" onClick={dec}>
        -1
      </button>
      <button type="button" onClick={square}>
        Square
      </button>
      <button type="button" onClick={root}>
        Root
      </button>
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>
          <a href="https://github.com/chrisvander/zustand-computed">zustand-computed</a>
        </h1>
        <Counter />
      </header>
    </div>
  )
}

export default App
