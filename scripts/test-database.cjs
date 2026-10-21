// Run only against a disposable, migrated PostGIS database. All fixtures roll back.
const { PrismaClient } = require('@prisma/client');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const db = new PrismaClient();
const rollback = new Error('TEST_ROLLBACK');
async function run() {
  try {
    await db.$transaction(async tx => {
      async function rejects(operation, message) {
        await tx.$executeRawUnsafe('SAVEPOINT expected_failure');
        try { await assert.rejects(operation, message); }
        finally { await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT expected_failure'); }
      }
      const organization = await tx.organizations.create({ data: { name: 'Constraint test', slug: `test-${randomUUID()}` } });
      const a = await tx.businesses.create({ data: { organization_id: organization.id, code: randomUUID(), employee_prefix: 'TSTA', slug: 'test-a', name: 'A' } });
      const b = await tx.businesses.create({ data: { organization_id: organization.id, code: randomUUID(), employee_prefix: 'TSTB', slug: 'test-b', name: 'B' } });
      const employee = await tx.employees.create({ data: { business_id: a.id, employee_code: `TST${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`, full_name: 'Test employee' } });
      const branch = await tx.branches.create({ data: { business_id: a.id, code: 'HQ', name: 'HQ' } });
      const foreignBranch = await tx.branches.create({ data: { business_id: b.id, code: 'HQ', name: 'HQ' } });
      await rejects(() => tx.employee_branch_assignments.create({ data: { business_id: a.id, employee_id: employee.id, branch_id: foreignBranch.id } }), 'Cross-business assignment must fail');
      const sessionData = { business_id: a.id, employee_id: employee.id, branch_id: branch.id, work_date: new Date('2026-10-21'), opened_at: new Date() };
      const session = await tx.attendance_sessions.create({ data: sessionData });
      await rejects(() => tx.attendance_sessions.create({ data: sessionData }), 'Second open session must fail');
      const reviewer = await tx.users.create({ data: { display_name: 'Reviewer' } });
      const attempt = await tx.attendance_attempts.create({ data: { business_id: a.id, employee_id: employee.id, branch_id: branch.id, action: 'CHECK_IN', challenge_nonce_hash: randomUUID(), idempotency_key: randomUUID(), expires_at: new Date(Date.now() + 120000) } });
      const eventData = { business_id: a.id, employee_id: employee.id, branch_id: branch.id, session_id: session.id, attempt_id: attempt.id, type: 'CHECK_IN' };
      await rejects(() => tx.attendance_events.create({ data: eventData }), 'Unverified punch must fail');
      const geofenceId = randomUUID();
      await tx.$executeRaw`INSERT INTO geofences(id,business_id,branch_id,center,radius_m,max_accuracy_m) VALUES (${geofenceId}::uuid,${a.id}::uuid,${branch.id}::uuid,ST_SetSRID(ST_MakePoint(78.4867,17.3850),4326)::geography,100,50)`;
      const location = { business_id: a.id, attempt_id: attempt.id, geofence_id: geofenceId, reported_lat: 17.385, reported_lon: 78.4867, accuracy_m: 10, distance_m: 0, client_position_timestamp: new Date(), result: 'PASS' };
      await tx.location_checks.create({ data: location });
      await tx.attendance_attempts.update({ where: { id: attempt.id }, data: { status: 'CONSUMED', consumed_at: new Date() } });
      await rejects(() => tx.attendance_events.create({ data: eventData }), 'Missing selfie must fail even with a passing GPS check');
      await tx.attendance_photos.create({ data: {
        business_id: a.id, employee_id: employee.id, attempt_id: attempt.id,
        content_type: 'image/jpeg', size_bytes: 3, data: Buffer.from([0xff, 0xd8, 0xff]),
      } });
      const event = await tx.attendance_events.create({ data: { ...eventData, occurred_at: new Date('2000-01-01') } });
      assert.ok(event.occurred_at.getFullYear() > 2000, 'Server must override client event time');
      await rejects(() => tx.attendance_events.create({ data: eventData }), 'Replayed attempt must fail');
      await rejects(() => tx.attendance_events.update({ where: { id: event.id }, data: { occurred_at: new Date() } }), 'Punch update must fail');
      await rejects(() => tx.attendance_events.delete({ where: { id: event.id } }), 'Punch deletion must fail');
      const audit = await tx.audit_logs.create({ data: { organization_id: organization.id, business_id: a.id, actor_id: reviewer.id, object_type: 'TEST', object_id: employee.id, action: 'TEST' } });
      await rejects(() => tx.audit_logs.delete({ where: { id: audit.id } }), 'Audit deletion must fail');
      console.log('PASS: tenant isolation, open sessions, selfie/GPS verification gate, server timestamp, replay and immutability');
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
