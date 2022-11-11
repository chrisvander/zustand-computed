import { computed } from "./computed"
import create from "zustand"

type Store = {
  count: number,
  inc: () => void,
  dec: () => void
}

type ComputedStore = {
  countSq: number,
  nestedResult: {
    stringified: string
  }
}

function computeState(state: Store): ComputedStore {
  const nestedResult = {
    stringified: JSON.stringify(state.count)
  }

  return {
    countSq: state.count ** 2,
    nestedResult
  }
}


test('computed works on simple counter example', () => {
  const computeStateMock = jest.fn(computeState)
  const useStore = create<Store, [["chrisvander/zustand-computed", ComputedStore]]>(
    computed((set) => ({
      count: 1,
      inc: () => set((state) => ({ count: state.count + 1 })),
      dec: () => set((state) => ({ count: state.count - 1 }))
    }), computeStateMock)
  )

  expect(computeStateMock).toHaveBeenCalledTimes(1)
  expect(useStore.getState().count).toEqual(1)
  expect(useStore.getState().countSq).toEqual(1)
  useStore.getState().inc()
  expect(useStore.getState().count).toEqual(2)
  expect(useStore.getState().countSq).toEqual(4)
  useStore.getState().dec()
  expect(useStore.getState().count).toEqual(1)
  expect(useStore.getState().countSq).toEqual(1)
  useStore.setState({ count: 4 })
  expect(useStore.getState().countSq).toEqual(16)
  expect(computeStateMock).toHaveBeenCalledTimes(4)
})

test('computed does not modify object ref even after change', () => {
  const computeStateMock = jest.fn(computeState)
  const useStore = create<Store, [["chrisvander/zustand-computed", ComputedStore]]>(
    computed((set) => ({
      count: 1,
      inc: () => set((state) => ({ count: state.count + 1 })),
      dec: () => set((state) => ({ count: state.count - 1 }))
    }), computeStateMock)
  )

  useStore.setState({ count: 4 })
  expect(useStore.getState().count).toEqual(4)
  const obj = useStore.getState().nestedResult
  useStore.setState({ count: 4 })
  const toCompare = useStore.getState().nestedResult
  expect(obj).toEqual(toCompare)
})
