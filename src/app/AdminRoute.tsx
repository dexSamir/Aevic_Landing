import './workspaceStyles';
import '../styles/admin-workspace.css';
import '../styles/admin-premium.css';
import { ProtectedRoute } from '../layouts/ProtectedRoute';
import { AdminLayout } from '../layouts/WorkspaceLayouts';
import { AdminPlatformProvider } from '../services/PlatformDataContext';
export function Component() { return <ProtectedRoute area="admin"><AdminPlatformProvider><AdminLayout /></AdminPlatformProvider></ProtectedRoute>; }
