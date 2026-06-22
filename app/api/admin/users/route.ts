import { NextResponse } from 'next/server';
import { getFreshSessionUser } from '@/lib/auth-user';
import { isAdmin } from '@/lib/auth-session';
import { isSuperAdmin } from '@/lib/auth-permissions';
import { listPublicUsers } from '@/lib/user-storage';

export async function GET() {
  const user = await getFreshSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const superAdmin = isSuperAdmin(user);
  const users = await listPublicUsers(superAdmin ? undefined : user.cohort);
  return NextResponse.json({
    users,
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    cohort: user.cohort,
    isSuperAdmin: superAdmin,
  });
}
