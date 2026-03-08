import '@/shared/lib/i18n/config';
import { GlobalErrorBoundary } from '@/shared/ui/GlobalErrorBoundary';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './app/styles/index.css';

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <GlobalErrorBoundary>
 <App />
 </GlobalErrorBoundary>
 </StrictMode>
);
