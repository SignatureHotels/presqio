import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { EmployeePayrollDetails, PayrollCompensation, PayrollPreview, PayrollProfile, PayrollLine, PayrollSettings, PayrollRun, PayrollReview, PayrollSnapshot, PayrollSetup } from '@presqio/lib';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { PhotoStorageService } from '../../common/storage/photo-storage.service';
import { dateOnly, localDate } from '../../common/time/zoned';
import { AuditService } from '../audit/audit.service';
import { calculatePayroll, checkLines, EMPTY_PROFILE, EMPTY_REVIEW, isClean, itemIssues, monthBounds, validDate } from './payroll-calculation';
import type { EmployeePayrollDto, PayrollBulkPaymentDto, PayrollPaymentDto, PayrollReviewDto, PayrollSalaryDto, PayrollSettingsDto, SaveCompensationDto } from './payroll.dto';

type Tx = Prisma.TransactionClient;
const MAX_LOGO_BYTES = 500_000;
const LOGO_ID = /^[0-9a-f-]{36}\.(?:png|jpg|webp)$/;
const logoKey = (businessId:string,logo:string) => `logos/${businessId}/${logo}`;
type ItemRow = Prisma.payroll_itemsGetPayload<object>;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const date = (value: Date) => value.toISOString().slice(0,10);
const month = (value: Date) => date(value).slice(0,7);
type ProfileRow = Prisma.employee_payroll_profilesGetPayload<object>;
const toProfile = (row: ProfileRow | null | undefined): PayrollProfile => row ? {
  department:row.department,dateOfBirth:row.date_of_birth ? date(row.date_of_birth):'',pan:row.pan,uan:row.uan,esi:row.esi,
  bankName:row.bank_name,bankAccount:row.bank_account,bankIfsc:row.bank_ifsc,bankBranch:row.bank_branch,lastWorkingDate:row.last_working_date ? date(row.last_working_date):'',
} : EMPTY_PROFILE;
const toCompensation = (r: Prisma.payroll_compensationsGetPayload<object>): PayrollCompensation => ({id:r.id,employeeId:r.employee_id,effectiveMonth:month(r.effective_month),
  earnings:r.earnings_json as unknown as PayrollLine[],deductions:r.deductions_json as unknown as PayrollLine[]});

@Injectable()
export class PayrollService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly storage: PhotoStorageService) {}

  /** Stores a company logo in B2 under `logos/<business>/` (outside the selfie retention rule) and returns its id. */
  async uploadLogo(businessId:string,dataUrl:string) {
    if (!this.storage.enabled) throw new BadRequestException('Logo uploads need file storage (B2) to be configured.');
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) throw new BadRequestException('Upload a PNG, JPEG or WebP image.');
    const data = Buffer.from(match[2],'base64');
    if (!data.length || data.length>MAX_LOGO_BYTES) throw new BadRequestException('The logo must be smaller than 500 KB.');
    const real = match[1]==='png' ? data.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
      : match[1]==='jpeg' ? data[0]===0xff && data[1]===0xd8 && data[2]===0xff
      : data.subarray(0,4).toString('ascii')==='RIFF' && data.subarray(8,12).toString('ascii')==='WEBP';
    if (!real) throw new BadRequestException('The logo file could not be read as an image.');
    // Each upload gets a new id, so payslips finalized with an older logo keep showing it.
    const logo = `${randomUUID()}.${match[1]==='jpeg' ? 'jpg':match[1]}`;
    await this.storage.put(logoKey(businessId,logo),data,`image/${match[1]}`);
    return {logo};
  }
  async logo(businessId:string,logo:string) {
    if (!LOGO_ID.test(logo)) throw new NotFoundException('Logo not found');
    const data = this.storage.enabled ? await this.storage.get(logoKey(businessId,logo)) : null;
    if (!data) throw new NotFoundException('Logo not found');
    return {data,contentType:`image/${logo.endsWith('.jpg') ? 'jpeg':logo.split('.')[1]}`};
  }

  private async company(tx: Tx, businessId: string): Promise<PayrollSettings> {
    const [settings, business] = await Promise.all([
      tx.payroll_settings.findUnique({where:{business_id:businessId}}),
      tx.businesses.findUniqueOrThrow({where:{id:businessId}, select:{name:true,address:true}}),
    ]);
    return settings ? settings.settings_json as unknown as PayrollSettings : {legalName:business.name,address:business.address ?? '',logoUrl:''};
  }
  async setup(businessId: string): Promise<PayrollSetup> {
    const [settings, rows, employees] = await Promise.all([
      this.company(this.db,businessId),
      this.db.payroll_compensations.findMany({where:{business_id:businessId},orderBy:[{effective_month:'desc'},{id:'asc'}]}),
      this.db.employees.findMany({where:{business_id:businessId},orderBy:{full_name:'asc'},select:{id:true,full_name:true,employee_code:true,status:true}}),
    ]);
    return {settings,compensations:rows.map(toCompensation),employees:employees.map(e => ({id:e.id,name:e.full_name,code:e.employee_code,status:e.status}))};
  }
  async settings(orgId:string,businessId:string,actor:string,dto:PayrollSettingsDto) {
    return this.db.$transaction(async tx => {
      await tx.payroll_settings.upsert({where:{business_id:businessId},create:{business_id:businessId,settings_json:json(dto)},update:{settings_json:json(dto)}});
      await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll_settings',objectId:businessId,action:'updated'},tx);
      return dto;
    });
  }
  async compensation(orgId:string,businessId:string,actor:string,dto:SaveCompensationDto) {
    return this.db.$transaction(async tx => {
      const employee = await tx.employees.findFirst({where:{business_id:businessId,id:dto.employeeId},select:{id:true}});
      if (!employee) throw new NotFoundException('Employee not found');
      return this.saveSalary(tx,orgId,businessId,actor,employee.id,dto);
    });
  }
  async employeeDetails(businessId:string,employeeId:string): Promise<EmployeePayrollDetails> {
    const employee = await this.db.employees.findFirst({where:{business_id:businessId,id:employeeId},select:{id:true}});
    if (!employee) throw new NotFoundException('Employee not found');
    const [profile,rows] = await Promise.all([
      this.db.employee_payroll_profiles.findUnique({where:{employee_id:employeeId}}),
      this.db.payroll_compensations.findMany({where:{business_id:businessId,employee_id:employeeId},orderBy:{effective_month:'desc'}}),
    ]);
    return {profile:toProfile(profile),compensations:rows.map(toCompensation)};
  }
  /** Saves an employee's payslip profile and, when given, a salary version, inside the caller's transaction. */
  async saveEmployeePayroll(tx:Tx,orgId:string,businessId:string,actor:string,employee:{id:string;joinedOn:string},dto:EmployeePayrollDto) {
    const p = dto.profile;
    for (const value of [p.dateOfBirth,p.lastWorkingDate]) if (value && !validDate(value)) throw new BadRequestException('Choose valid payroll profile dates.');
    if (p.lastWorkingDate && p.lastWorkingDate < employee.joinedOn) throw new BadRequestException('Last working date cannot precede joining date.');
    const data = {department:p.department,date_of_birth:p.dateOfBirth ? dateOnly(p.dateOfBirth):null,pan:p.pan,uan:p.uan,esi:p.esi,
      bank_name:p.bankName,bank_account:p.bankAccount,bank_ifsc:p.bankIfsc,bank_branch:p.bankBranch,last_working_date:p.lastWorkingDate ? dateOnly(p.lastWorkingDate):null};
    await tx.employee_payroll_profiles.upsert({where:{employee_id:employee.id},create:{business_id:businessId,employee_id:employee.id,...data},update:data});
    await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll_profile',objectId:employee.id,action:'updated'},tx);
    if (dto.salary) await this.saveSalary(tx,orgId,businessId,actor,employee.id,dto.salary);
  }
  private async saveSalary(tx:Tx,orgId:string,businessId:string,actor:string,employeeId:string,dto:PayrollSalaryDto) {
    monthBounds(dto.effectiveMonth); checkLines(dto.earnings); checkLines(dto.deductions);
    const key = {business_id:businessId,employee_id:employeeId,effective_month:dateOnly(`${dto.effectiveMonth}-01`)};
    const data = {earnings_json:json(dto.earnings),deductions_json:json(dto.deductions)};
    const row = await tx.payroll_compensations.upsert({where:{business_id_employee_id_effective_month:key},create:{...key,...data,created_by:actor},update:data});
    await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll_compensation',objectId:row.id,action:'updated'},tx);
    return {id:row.id};
  }
  async list(businessId:string) {
    const rows = await this.db.payroll_runs.findMany({where:{business_id:businessId},orderBy:{month:'desc'},take:60,include:{_count:{select:{items:true}}}});
    return rows.map(r => ({id:r.id,month:month(r.month),status:r.status as 'DRAFT'|'FINALIZED',employees:r._count.items}));
  }
  async get(businessId:string,runId:string): Promise<PayrollRun> {
    const row = await this.db.payroll_runs.findFirst({where:{business_id:businessId,id:runId},include:{items:{orderBy:{employee_id:'asc'},include:{payments:{orderBy:{created_at:'asc'}}}}}});
    if (!row) throw new NotFoundException('Payroll run not found');
    const check = row.status==='DRAFT' ? this.check(await this.sources(this.db,businessId,month(row.month)),row.items) : null;
    return {id:row.id,month:month(row.month),status:row.status as 'DRAFT'|'FINALIZED',createdAt:row.created_at.toISOString(),finalizedAt:row.finalized_at?.toISOString() ?? null,
      items:row.items.map(i => ({id:i.id,employeeId:i.employee_id,snapshot:i.snapshot_json as unknown as PayrollSnapshot,review:i.review_json as unknown as PayrollReview,reviewed:Boolean(i.reviewed_by),
        payments:i.payments.map(p => ({id:p.id,amount:Number(p.amount),reference:p.reference,paidOn:date(p.paid_on)})),issues:check?.issues.get(i.id) ?? []})),
      missingEmployees:check?.missing ?? []};
  }
  private async sources(tx:Tx,businessId:string,payMonth:string,period?:{from:string;to:string}) {
    const bounds = monthBounds(payMonth);
    const range = {gte:dateOnly(bounds.start),lte:dateOnly(bounds.end)};
    const [business,company,employees,compensations,profiles,sessions,leaves,assignments,corrections] = await Promise.all([
      tx.businesses.findUniqueOrThrow({where:{id:businessId},select:{timezone:true}}),this.company(tx,businessId),
      tx.employees.findMany({where:{business_id:businessId},orderBy:{id:'asc'},take:1001,select:{id:true,employee_code:true,full_name:true,job_title:true,joined_on:true,created_at:true,status:true}}),
      tx.payroll_compensations.findMany({where:{business_id:businessId,effective_month:{lte:range.gte}},orderBy:[{effective_month:'desc'},{id:'asc'}]}),
      tx.employee_payroll_profiles.findMany({where:{business_id:businessId}}),
      tx.attendance_sessions.findMany({where:{business_id:businessId,work_date:range},orderBy:{id:'asc'},select:{id:true,employee_id:true,work_date:true,opened_at:true,closed_at:true,status:true}}),
      tx.leave_days.findMany({where:{business_id:businessId,leave_date:range,cancelled_at:null},orderBy:{id:'asc'},select:{id:true,employee_id:true,leave_date:true}}),
      tx.shift_assignments.findMany({where:{business_id:businessId,effective_from:{lte:range.lte},OR:[{effective_to:null},{effective_to:{gte:range.gte}}]},orderBy:[{effective_from:'desc'},{id:'asc'}],include:{shift_id_ref:{select:{policy_json:true}}}}),
      tx.attendance_corrections.findMany({where:{business_id:businessId,status:'PENDING',session_id_ref:{work_date:range}},orderBy:{id:'asc'},select:{id:true,employee_id:true}}),
    ]);
    if (employees.length>1000) throw new BadRequestException('This payroll version supports up to 1,000 employee records per business.');
    const today = localDate(business.timezone);
    // A month still running is paid up to today, not to its last day.
    const window = period ?? {from:bounds.start,to:today<bounds.end ? today:bounds.end};
    return { bounds,today, build:(employeeId:string,review:PayrollReview) => {
      const e = employees.find(e => e.id===employeeId);
      if (!e) throw new NotFoundException('Employee not found');
      const c = compensations.find(c => c.employee_id===e.id);
      const employeeSessions = sessions.filter(s => s.employee_id===e.id);
      const employeeLeaves = leaves.filter(l => l.employee_id===e.id);
      const employeeAssignments = assignments.filter(a => a.employee_id===e.id);
      const employeeCorrections = corrections.filter(c => c.employee_id===e.id);
      const profile = toProfile(profiles.find(p => p.employee_id===e.id));
      const joinedOn = e.joined_on ? date(e.joined_on):localDate(business.timezone,e.created_at);
      // Only inputs that change pay; editing names, company or bank details must not undo a review.
      const source = {period:window,employee:{joinedOn,status:e.status,lastWorkingDate:profile.lastWorkingDate},
        compensation:c ? {id:c.id,earnings:c.earnings_json,deductions:c.deductions_json}:null,
        sessions:employeeSessions,leaves:employeeLeaves,assignments:employeeAssignments,corrections:employeeCorrections};
      return calculatePayroll({month:payMonth,today,company,period:window,
        employee:{id:e.id,code:e.employee_code,name:e.full_name,designation:e.job_title ?? '',joinedOn,status:e.status},
        compensation:c ? {id:c.id,earnings:c.earnings_json as unknown as PayrollLine[],deductions:c.deductions_json as unknown as PayrollLine[]}:null,profile,
        sessions:employeeSessions.map(s => ({id:s.id,date:date(s.work_date),openedAt:s.opened_at.toISOString(),closedAt:s.closed_at?.toISOString() ?? null})),
        leaves:employeeLeaves.map(l => date(l.leave_date)),
        assignments:employeeAssignments.map(a => ({from:date(a.effective_from),to:a.effective_to ? date(a.effective_to):null,workingDays:(Array.isArray(a.weekly_pattern) ? a.weekly_pattern : (a.shift_id_ref.policy_json as {workingDays?:number[]})?.workingDays ?? [1,2,3,4,5,6]) as number[]})),
        pendingCorrections:employeeCorrections.length,review,source});
    },
    employees,
    // Only employees with a salary version effective by this month are on payroll; others must not block finalization.
    employeeIds:employees.filter(e => compensations.some(c => c.employee_id===e.id) && (e.joined_on ? date(e.joined_on):localDate(business.timezone,e.created_at))<=bounds.end).map(e => e.id)};
  }
  private async lock(tx:Tx,businessId:string,runId:string) {
    const rows = await tx.$queryRaw<{id:string;status:string;month:Date}[]>`SELECT id,status,month FROM payroll_runs WHERE business_id=${businessId}::uuid AND id=${runId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException('Payroll run not found');
    return rows[0];
  }
  /** What each employee on payroll earned between two dates of the same month, before any LOP review. */
  async preview(businessId:string,from:string,to:string): Promise<PayrollPreview> {
    if (!validDate(from) || !validDate(to) || from>to) throw new BadRequestException('Choose a valid date range.');
    if (from.slice(0,7)!==to.slice(0,7)) throw new BadRequestException('Choose dates within one payroll month.');
    const source = await this.sources(this.db,businessId,from.slice(0,7),{from,to});
    if (to>source.today) throw new BadRequestException('Choose dates up to today.');
    const items = source.employeeIds.map(id => source.build(id,EMPTY_REVIEW)).filter(s => s.eligibleDays>0)
      .map(snapshot => ({id:snapshot.employee.id,employeeId:snapshot.employee.id,snapshot,review:EMPTY_REVIEW,reviewed:false,payments:[],issues:[]}));
    return {from,to,items};
  }
  /** Compares a draft's saved items with current data: per-item issues, plus employees eligible but not in the draft. */
  private check(source:Awaited<ReturnType<PayrollService['sources']>>,items:ItemRow[]) {
    const issues = new Map<string,string[]>();
    const current = new Map<string,PayrollSnapshot>();
    const inRun = new Set(items.map(i => i.employee_id));
    for (const item of items) {
      const review = item.review_json as unknown as PayrollReview;
      if (!source.employeeIds.includes(item.employee_id)) { issues.set(item.id,['No longer on payroll for this month. Refresh the draft.']); continue; }
      let snapshot: PayrollSnapshot;
      try { snapshot = source.build(item.employee_id,review); }
      catch (error) { issues.set(item.id,[error instanceof Error ? error.message : 'Review this employee again.']); continue; }
      if (snapshot.eligibleDays===0) { issues.set(item.id,['Not employed during this month. Refresh the draft.']); continue; }
      current.set(item.id,snapshot);
      issues.set(item.id,itemIssues(item.snapshot_json as unknown as PayrollSnapshot,snapshot,review,Boolean(item.reviewed_by)));
    }
    const missing = source.employeeIds.filter(id => !inRun.has(id) && source.build(id,EMPTY_REVIEW).eligibleDays>0)
      .map(id => source.employees.find(e => e.id===id)!).map(e => ({id:e.id,name:e.full_name,code:e.employee_code}));
    return {issues,current,missing};
  }
  /** Opens a month's payroll: creates the draft if needed, and brings an existing draft up to date with current data. */
  async create(orgId:string,businessId:string,actor:string,payMonth:string) {
    const bounds = monthBounds(payMonth);
    let existingDraft = false;
    const id = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM businesses WHERE id=${businessId}::uuid FOR UPDATE`;
      if (bounds.start>localDate((await tx.businesses.findUniqueOrThrow({where:{id:businessId},select:{timezone:true}})).timezone))
        throw new BadRequestException('Payroll can be prepared from the first day of the month.');
      const existing = await tx.payroll_runs.findUnique({where:{business_id_month:{business_id:businessId,month:dateOnly(bounds.start)}}});
      if (existing) { existingDraft = existing.status==='DRAFT'; return existing.id; }
      const source = await this.sources(tx,businessId,payMonth);
      const run = await tx.payroll_runs.create({data:{business_id:businessId,month:dateOnly(bounds.start),created_by:actor}});
      const snapshots = source.employeeIds.map(id => source.build(id,EMPTY_REVIEW)).filter(s => s.eligibleDays>0);
      if (!snapshots.length) throw new BadRequestException('No employees with a configured salary were employed during this month.');
      await tx.payroll_items.createMany({data:snapshots.map(s => ({business_id:businessId,run_id:run.id,employee_id:s.employee.id,snapshot_json:json(s),review_json:json(EMPTY_REVIEW)}))});
      await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll',objectId:run.id,action:'created',after:{name:`Payroll ${payMonth}`}},tx);
      return run.id;
    });
    return existingDraft ? this.refresh(orgId,businessId,actor,id) : this.get(businessId,id);
  }
  /**
   * Brings a draft up to date without discarding work: adds newly eligible employees, removes ineligible ones,
   * recalculates everyone with their saved review, and asks for a new review only where pay inputs changed.
   */
  async refresh(orgId:string,businessId:string,actor:string,runId:string) {
    await this.db.$transaction(async tx => {
      const run = await this.lock(tx,businessId,runId);
      if (run.status!=='DRAFT') throw new ConflictException('Finalized payroll cannot be changed.');
      const source = await this.sources(tx,businessId,month(run.month));
      const items = await tx.payroll_items.findMany({where:{business_id:businessId,run_id:runId}});
      const byEmployee = new Map(items.map(i => [i.employee_id,i]));
      const keep = new Set<string>();
      let changes = 0;
      for (const employeeId of source.employeeIds) {
        const item = byEmployee.get(employeeId);
        if (!item) {
          const snapshot = source.build(employeeId,EMPTY_REVIEW);
          if (snapshot.eligibleDays>0) { await tx.payroll_items.create({data:{business_id:businessId,run_id:runId,employee_id:employeeId,snapshot_json:json(snapshot),review_json:json(EMPTY_REVIEW)}}); changes++; }
          continue;
        }
        let review = item.review_json as unknown as PayrollReview;
        let snapshot: PayrollSnapshot;
        // A saved review can become invalid (e.g. LOP above the new employed days); start that employee over.
        try { snapshot = source.build(employeeId,review); } catch { review = EMPTY_REVIEW; snapshot = source.build(employeeId,review); }
        if (snapshot.eligibleDays===0) continue;
        keep.add(item.id);
        const changed = (item.snapshot_json as unknown as PayrollSnapshot).sourceHash!==snapshot.sourceHash || review===EMPTY_REVIEW;
        if (changed) changes++;
        await tx.payroll_items.update({where:{id:item.id},data:{snapshot_json:json(snapshot),review_json:json(review),...(changed ? {reviewed_by:null}:{})}});
      }
      const removed = items.filter(i => !keep.has(i.id)).map(i => i.id);
      if (removed.length) { await tx.payroll_items.deleteMany({where:{business_id:businessId,id:{in:removed}}}); changes+=removed.length; }
      if (!(await tx.payroll_items.count({where:{business_id:businessId,run_id:runId}}))) throw new BadRequestException('No employees with a configured salary were employed during this month.');
      // Opening a month refreshes it; only real changes belong in the audit log.
      if (changes) await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll',objectId:runId,action:'updated'},tx);
    });
    return this.get(businessId,runId);
  }
  async review(orgId:string,businessId:string,actor:string,runId:string,itemId:string,dto:PayrollReviewDto) {
    await this.db.$transaction(async tx => {
      const run = await this.lock(tx,businessId,runId);
      if (run.status!=='DRAFT') throw new ConflictException('Finalized payroll cannot be changed.');
      const item = await tx.payroll_items.findFirst({where:{id:itemId,business_id:businessId,run_id:runId}});
      if (!item) throw new NotFoundException('Payroll item not found');
      const source = await this.sources(tx,businessId,month(run.month));
      const snapshot = source.build(item.employee_id,dto);
      await tx.payroll_items.update({where:{id:item.id},data:{snapshot_json:json(snapshot),review_json:json(dto),reviewed_by:actor}});
      await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll_review',objectId:item.id,action:'updated'},tx);
    });
    return this.get(businessId,runId);
  }
  /**
   * Approves, with no LOP or adjustments, unreviewed employees whose month has nothing needing judgement —
   * all of them, or only `itemIds` when given. Employees with exceptions are skipped for individual review.
   */
  async approveClean(orgId:string,businessId:string,actor:string,runId:string,note:string,itemIds?:string[]) {
    let approved = 0;
    await this.db.$transaction(async tx => {
      const run = await this.lock(tx,businessId,runId);
      if (run.status!=='DRAFT') throw new ConflictException('Finalized payroll cannot be changed.');
      const source = await this.sources(tx,businessId,month(run.month));
      const items = await tx.payroll_items.findMany({where:{business_id:businessId,run_id:runId,reviewed_by:null,...(itemIds ? {id:{in:itemIds}}:{})}});
      const review: PayrollReview = {...EMPTY_REVIEW,note};
      for (const item of items) {
        if (!source.employeeIds.includes(item.employee_id)) continue;
        const snapshot = source.build(item.employee_id,review);
        if (snapshot.eligibleDays===0 || !isClean(snapshot) || (item.snapshot_json as unknown as PayrollSnapshot).sourceHash!==snapshot.sourceHash) continue;
        await tx.payroll_items.update({where:{id:item.id},data:{snapshot_json:json(snapshot),review_json:json(review),reviewed_by:actor}});
        approved++;
      }
      if (approved) await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll',objectId:runId,action:'approved',after:{name:`${approved} employees approved without exceptions`}},tx);
    });
    return {approved,run:await this.get(businessId,runId)};
  }
  async remove(orgId:string,businessId:string,actor:string,runId:string) {
    await this.db.$transaction(async tx => {
      const run = await this.lock(tx,businessId,runId);
      if (run.status!=='DRAFT') throw new ConflictException('Finalized payroll cannot be deleted.');
      await tx.payroll_items.deleteMany({where:{business_id:businessId,run_id:runId}});
      await tx.payroll_runs.delete({where:{id:runId}});
      await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll',objectId:runId,action:'deleted',after:{name:`Payroll ${month(run.month)}`}},tx);
    });
  }
  async finalize(orgId:string,businessId:string,actor:string,runId:string) {
    try {
      await this.db.$transaction(async tx => {
        const run = await this.lock(tx,businessId,runId);
        if (run.status==='FINALIZED') return;
        const source = await this.sources(tx,businessId,month(run.month));
        if (source.today<=source.bounds.end) throw new BadRequestException('Finalize payroll only after the month has ended.');
        const items = await tx.payroll_items.findMany({where:{business_id:businessId,run_id:runId}});
        const check = this.check(source,items);
        const problems = items.filter(i => check.issues.get(i.id)?.length).map(i => (i.snapshot_json as unknown as PayrollSnapshot).employee.name);
        if (check.missing.length || problems.length) {
          const parts = [
            problems.length ? `${problems.length} employee${problems.length>1?'s':''} need attention (${problems.slice(0,5).join(', ')}${problems.length>5?', …':''})` : '',
            check.missing.length ? `${check.missing.length} newly eligible employee${check.missing.length>1?'s are':' is'} missing; refresh the draft` : '',
          ].filter(Boolean);
          throw new BadRequestException(`Cannot finalize yet: ${parts.join('; ')}.`);
        }
        // Lock in the latest names, company and bank details; pay figures are unchanged (same source hash).
        for (const item of items) await tx.payroll_items.update({where:{id:item.id},data:{snapshot_json:json(check.current.get(item.id))}});
        await tx.payroll_runs.update({where:{id:runId},data:{status:'FINALIZED',finalized_by:actor,finalized_at:new Date()}});
        await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll',objectId:runId,action:'approved',after:{name:`Payroll ${month(run.month)}`}},tx);
      }, {isolationLevel:'Serializable',timeout:30_000});
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2034') throw new ConflictException('Payroll source data changed during finalization. Please review and retry.');
      throw error;
    }
    return this.get(businessId,runId);
  }
  /** Records one payment (same reference and date) of each selected employee's remaining amount, all or nothing. */
  async bulkPayment(orgId:string,businessId:string,actor:string,runId:string,dto:PayrollBulkPaymentDto) {
    if (!validDate(dto.paidOn)) throw new BadRequestException('Choose a valid payment date.');
    let recorded = 0;
    await this.db.$transaction(async tx => {
      const run = await this.lock(tx,businessId,runId);
      if (run.status!=='FINALIZED') throw new BadRequestException('Finalize payroll before recording payments.');
      const business = await tx.businesses.findUniqueOrThrow({where:{id:businessId},select:{timezone:true}});
      if (dto.paidOn>localDate(business.timezone)) throw new BadRequestException('Record payments only after they are made.');
      const items = await tx.payroll_items.findMany({where:{business_id:businessId,run_id:runId,id:{in:dto.itemIds}},include:{payments:true}});
      if (items.length!==new Set(dto.itemIds).size) throw new NotFoundException('Some selected employees are not in this payroll.');
      for (const item of items) {
        if (item.payments.some(p => p.reference===dto.reference)) continue; // Already recorded with this reference.
        const remaining = (item.snapshot_json as unknown as PayrollSnapshot).netPayable-item.payments.reduce((sum,p) => sum+Number(p.amount),0);
        if (remaining<=0) continue;
        const payment = await tx.payroll_payments.create({data:{business_id:businessId,item_id:item.id,amount:BigInt(remaining),reference:dto.reference,paid_on:dateOnly(dto.paidOn),recorded_by:actor}});
        await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll_payment',objectId:payment.id,action:'created'},tx);
        recorded++;
      }
    });
    return {recorded,run:await this.get(businessId,runId)};
  }
  async payment(orgId:string,businessId:string,actor:string,runId:string,itemId:string,dto:PayrollPaymentDto) {
    if (!validDate(dto.paidOn)) throw new BadRequestException('Choose a valid payment date.');
    await this.db.$transaction(async tx => {
      const run = await this.lock(tx,businessId,runId);
      if (run.status!=='FINALIZED') throw new BadRequestException('Finalize payroll before recording payments.');
      const item = await tx.payroll_items.findFirst({where:{id:itemId,business_id:businessId,run_id:runId},include:{payments:true}});
      if (!item) throw new NotFoundException('Payroll item not found');
      const previous = item.payments.find(p => p.reference===dto.reference);
      if (previous) {
        if (Number(previous.amount)!==dto.amount || date(previous.paid_on)!==dto.paidOn) throw new ConflictException('This payment reference already has different details.');
        return;
      }
      const business = await tx.businesses.findUniqueOrThrow({where:{id:businessId},select:{timezone:true}});
      if (dto.paidOn>localDate(business.timezone)) throw new BadRequestException('Record payments only after they are made.');
      const snapshot = item.snapshot_json as unknown as PayrollSnapshot;
      const paid = item.payments.reduce((sum,p) => sum+Number(p.amount),0);
      if (paid+dto.amount>snapshot.netPayable) throw new BadRequestException('Payment exceeds the remaining payable amount.');
      const payment = await tx.payroll_payments.create({data:{business_id:businessId,item_id:itemId,amount:BigInt(dto.amount),reference:dto.reference,paid_on:dateOnly(dto.paidOn),recorded_by:actor}});
      await this.audit.record({organizationId:orgId,businessId,actorId:actor,objectType:'payroll_payment',objectId:payment.id,action:'created'},tx);
    });
    return this.get(businessId,runId);
  }
}
