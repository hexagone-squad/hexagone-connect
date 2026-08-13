export interface RequestPrincipal { userId: string; tenantIds: readonly string[]; roles: readonly string[]; }

export const assertTenantAccess = (principal: RequestPrincipal, tenantId: string): void => {
  if (!principal.tenantIds.includes(tenantId)) throw new Error("Tenant access denied");
};
