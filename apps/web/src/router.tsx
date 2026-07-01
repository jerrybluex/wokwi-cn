import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { ShareViewPage } from './pages/ShareView';

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'p/:shareId', element: <ShareViewPage /> },
    ],
  },
]);
