import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { ForgotPage } from './pages/Forgot';
import { ShareViewPage } from './pages/ShareView';
import { EditorPage } from './pages/Editor';
import { ProjectsPage } from './pages/Projects';
import { CoursePage } from './pages/Course';
import { RequireAuth } from './auth/RequireAuth';

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'editor', element: <RequireAuth><EditorPage /></RequireAuth> },
      { path: 'projects', element: <RequireAuth><ProjectsPage /></RequireAuth> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot', element: <ForgotPage /> },
      { path: 'p/:shareId', element: <ShareViewPage /> },
      { path: 'learn/:slug', element: <RequireAuth><CoursePage /></RequireAuth> },
    ],
  },
]);
