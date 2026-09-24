import '../styles/team-operations.css';
import './workspaceStyles';
import '../styles/team-workspace.css';
import { ProtectedRoute } from '../layouts/layouts';
import { TeamLayout } from '../layouts/WorkspaceLayouts';
import { TeamPlatformProvider } from '../services/PlatformDataContext';
export function Component() { return <ProtectedRoute area="team"><TeamPlatformProvider><TeamLayout /></TeamPlatformProvider></ProtectedRoute>; }
