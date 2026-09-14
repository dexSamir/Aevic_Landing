import './workspaceStyles';
import { ProtectedRoute, AdminLayout } from '../layouts/layouts';
import { AdminPlatformProvider } from '../services/PlatformDataContext';
export function Component() { return <ProtectedRoute area="admin"><AdminPlatformProvider><AdminLayout /></AdminPlatformProvider></ProtectedRoute>; }
