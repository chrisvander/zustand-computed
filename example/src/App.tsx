import logo from './logo.svg';
import './App.css';
import create from 'zustand';

const useStore = create((set) => ({
  count: 1,
  countSq: 1,
  inc: () => set((state) => ({ count: state.count + 1 })),
  dec: () => set((state) => ({ count: state.count - 1 }))
}))

function Counter() {
  const { count, countSq, inc, dec } = useStore()
  return (
    <div className="counter">
      <span>{count}</span><br />
      <span>{countSq}</span><br />
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
  );
}

export default App;
