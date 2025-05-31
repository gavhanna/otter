import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App.tsx'; // We will use RouterProvider instead
import './index.css';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router'; // Import our router instance

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
