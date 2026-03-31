import React from 'react'
import ReactDOM from 'react-dom/client'
import { SWRConfig } from 'swr'
import App from './App.tsx'
import './index.css'
import { swrConfig } from './lib/swr'
import { ToastProvider } from './components/ui/toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SWRConfig value={swrConfig}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </SWRConfig>
  </React.StrictMode>,
)

