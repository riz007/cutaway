import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { AppRoutes } from './app/routes';
import { mdxComponents } from './content/mdxComponents';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <MDXProvider components={mdxComponents}>
        <AppRoutes />
      </MDXProvider>
    </BrowserRouter>
  </StrictMode>,
);
