import { Outlet } from '@tanstack/react-router';
// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css';

function App() {
  // const [count, setCount] = useState(0)

  return (
    <>
      {/* You can add global layout components here, like a navbar */}
      {/* <nav>
        <Link to="/">Home</Link> | {" "}
        <Link to="/about">About</Link> // Example for a future about route
      </nav> */}
      <hr />
      <Outlet /> {/* This is where child routes will be rendered */}
      {/* You can also add a global footer here */}
    </>
  );
}

export default App;
