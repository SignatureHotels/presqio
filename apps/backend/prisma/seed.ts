import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
  const organization = await db.organizations.upsert({ where: { id: '00000000-0000-4000-8000-000000000001' }, update: {}, create: { id: '00000000-0000-4000-8000-000000000001', name: 'Demo Organization', slug: 'demo-organization', onboarding_step: 'COMPLETED', onboarding_completed_at: new Date() } });
  const business = await db.businesses.upsert({ where: { code: 'DEMO' }, update: {}, create: { organization_id: organization.id, code: 'DEMO', employee_prefix: 'DEMO', slug: 'demo', name: 'Demo Business' } });
  await db.branches.upsert({ where: { business_id_code: { business_id: business.id, code: 'HQ' } }, update: {}, create: { business_id: business.id, code: 'HQ', name: 'Head Office' } });
  console.log('Demo organization, business and branch seeded. No login accounts or biometrics created.');
}
main().catch(() => { console.error('Seed failed. Check database connectivity and migrations.'); process.exitCode = 1; }).finally(() => db.$disconnect());
