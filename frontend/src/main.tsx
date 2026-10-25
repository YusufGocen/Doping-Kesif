import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { createAppRouter } from '@/app/router';
import '@/styles/index.css';

const router = createAppRouter();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App router={router} />
  </React.StrictMode>,
);
