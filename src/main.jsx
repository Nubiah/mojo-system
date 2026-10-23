import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Enregistrement PWA — uniquement en prod (après `vite build`)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .catch((err) => console.warn('[PWA] SW register failed', err))
  })
}
