import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'; // BrowserRouter 임포트
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* App 컴포넌트를 BrowserRouter로 감쌉니다. */}
      <App />
    </BrowserRouter>
  </StrictMode>,
)
