import logo from "./logo.svg"
import "./App.css"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import { computed } from "zustand-computed"

type Store = {
  count: number
  inc: () => void
  dec: () => void
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
      immer((set) => ({
        count: 1,
        inc: () =>
          set((state) => {
            // example with Immer middleware
            state.count += 1
          }),
        dec: () => set((state) => ({ count: state.count - 1 })),
      })),
      computeState
    )
  )
)

useStore.setState({ countSq: 100 }) // error

function Counter() {
  const { count, countSq, inc, dec } = useStore()
  return (
    <div className="counter">
      <span>{count}</span>
      <br />
      <span>{countSq}</span>
      <br />
      <button onClick={inc}>+1</button>
      <button onClick={dec}>-1</button>
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <Counter />
      </header>
    </div>
  )
}

export default App
