import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css';
import { ThemeProvider, CssBaseline } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import theme from './Theme.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import SessionManager from './components/SessionManager.jsx';
import PageLoadingFallback from './components/PageLoadingFallback.jsx';
import { queryClient } from './lib/queryClient.js';

const routerBasename =
  import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/'
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : undefined

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <BrowserRouter basename={routerBasename}>
        <AuthProvider>
          <NotificationProvider>
            <QueryClientProvider client={queryClient}>
              <SessionManager />
              <CssBaseline /> {/* resets default browser styles */}
              <Suspense fallback={<PageLoadingFallback />}>
                <App />
              </Suspense>
            </QueryClientProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)

