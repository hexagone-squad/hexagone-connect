import type { RequestPrincipal } from '@hexagone/identity-tenant';

const principals = new Map<string, RequestPrincipal>([
  [
    'synthetic-operator-1',
    { userId: 'operator-1', tenantIds: ['tenant-1', 'tenant-empty'], roles: ['work-qualifier'] },
  ],
]);

export function authenticateSyntheticBearer(
  authorization: string | undefined,
): RequestPrincipal | undefined {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  return principals.get(authorization.slice('Bearer '.length));
}
