import '../styles/team-operations.css';
import './workspaceStyles';
import '../styles/team-workspace.css';
import { ProtectedRoute, TeamLayout } from '../layouts/layouts';
import { TeamPlatformProvider } from '../services/PlatformDataContext';
export function Component() { return <ProtectedRoute area="team"><TeamPlatformProvider><TeamLayout /></TeamPlatformProvider></ProtectedRoute>; }
