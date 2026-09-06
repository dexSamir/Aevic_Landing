import { PwaUpdateNotice } from './components/pwa/PwaExperience';
import { RouterProvider, type createBrowserRouter } from 'react-router-dom';

export default function App({ router }: { router: ReturnType<typeof createBrowserRouter> }) {
  return <><PwaUpdateNotice /><RouterProvider router={router} /></>;
}
