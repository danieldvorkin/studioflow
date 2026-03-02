import React from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'
import client from './apollo/client'
import { AuthProvider } from './auth/AuthProvider'
import { ToastProvider } from './components/ToastProvider'
import { StudioProvider } from './studio/StudioProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import { LocationProvider } from './location/LocationProvider'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <ToastProvider>
            <StudioProvider>
              <ThemeProvider>
                <LocationProvider>
                  <App />
                </LocationProvider>
              </ThemeProvider>
            </StudioProvider>
          </ToastProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ApolloProvider>
  </React.StrictMode>,
)
