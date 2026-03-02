import { useAuth } from './useAuth';
import type { UserRole } from '@/types/auth.types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  CADRE: 80,
  INSPECTEUR: 60,
  RH: 60,
  COMPTABLE: 40,
  CONSULTANT: 20,
};

export function usePermissions() {
  const { user, isAdmin } = useAuth();

  const canUpload = !!user && user.role !== 'CONSULTANT';
  const canDelete = isAdmin;
  const canManageUsers = isAdmin;
  const canViewAudit = !!user && ROLE_HIERARCHY[user.role] >= 80;
  const canApproveWorkflow = !!user && ROLE_HIERARCHY[user.role] >= 60;
  const canViewReports = !!user && ROLE_HIERARCHY[user.role] >= 40;
  const canUseAITools = !!user && user.role !== 'CONSULTANT';

  const hasMinRole = (minRole: UserRole): boolean => {
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole];
  };

  return { canUpload, canDelete, canManageUsers, canViewAudit, canApproveWorkflow, canViewReports, canUseAITools, hasMinRole };
}
