import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './router/AppRouter.jsx'
import { ToastContainer } from './components/ui/Toast.jsx'
import './i18n.js'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRouter />
    <ToastContainer />
  </StrictMode>,
)

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('ServiceWorker registration failed: ', err);
    });
  });
}
