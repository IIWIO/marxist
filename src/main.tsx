import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AIAgentProvider } from './hooks/useAIAgent'
import AppErrorBoundary from './components/common/AppErrorBoundary'
import 'katex/dist/katex.min.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AIAgentProvider>
        <App />
      </AIAgentProvider>
    </AppErrorBoundary>
  </React.StrictMode>
)
