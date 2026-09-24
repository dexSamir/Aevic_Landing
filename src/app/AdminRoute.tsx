import './workspaceStyles';
import { ProtectedRoute } from '../layouts/layouts';
import { AdminLayout } from '../layouts/WorkspaceLayouts';
import { AdminPlatformProvider } from '../services/PlatformDataContext';
export function Component() { return <ProtectedRoute area="admin"><AdminPlatformProvider><AdminLayout /></AdminPlatformProvider></ProtectedRoute>; }
