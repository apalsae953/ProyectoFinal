import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AjustesProvider } from './context/AjustesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AjustesProvider>
      <App />
    </AjustesProvider>
  </StrictMode>,
)
