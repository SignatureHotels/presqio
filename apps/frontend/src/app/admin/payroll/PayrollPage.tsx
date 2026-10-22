import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Chip, IconButton, MenuItem, Skeleton, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import type { PayrollItem, PayrollPreview, PayrollRun, PayrollRunSummary, PayrollSetup } from '@presqio/lib';
import { payrollApi } from '@/api/payroll';
import { errorMessage } from '@/api/client';
import { useAdmin } from '@/hooks/use-admin';
import { useAuth } from '@/hooks/use-auth';
import { csvText } from '@/utils/csv';
import { BulkPaymentForm, CompanyForm, PaymentForm, ReviewForm, SalaryForm } from './PayrollForms';
import { Payslip, PayslipDownload } from './Payslip';
import { AttendanceDialog } from './AttendanceDialog';
import { Icon } from '@/components';
import { money, monthLabel, slipDate } from './payroll-utils';
import { PayrollRoot } from './Payroll.style';
import { isFresh, payrollCache } from './payroll-cache';

export default function PayrollPage() {
  const {organization,businessId,today,timezone}=useAdmin();
  const {activeOrganization}=useAuth();
  const organizationId=organization?.id??'';
  const allowed=activeOrganization?.role==='OWNER'||activeOrganization?.role==='ADMIN';
  const localToday=today??new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const currentMonth=localToday.slice(0,7);
  const [month,setMonth]=useState(currentMonth);
  const [opening,setOpening]=useState(false);
  const [openError,setOpenError]=useState('');
  const openRequest=useRef(0);
  // Custom From–To dates within the month; null means the default period (whole month, or up to today while it runs).
  const [range,setRange]=useState<{from:string;to:string}|null>(null);
  const [preview,setPreview]=useState<PayrollPreview|null>(null);
  const previewRequest=useRef(0);
  const monthEnd=(m:string)=>{const d=new Date(`${m}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return d.toISOString().slice(0,10);};
  const defaultTo=month===currentMonth?localToday:monthEnd(month);
  const period=range??{from:`${month}-01`,to:defaultTo};
  // Start from the last visit's data so returning to this page is instant; it revalidates only when stale.
  const cache=payrollCache(organizationId,businessId);
  const [setup,setSetup]=useState<PayrollSetup|null>(()=>cache.setup??null);
  const [runs,setRuns]=useState<PayrollRunSummary[]>(()=>cache.runs??[]);
  const [run,setRun]=useState<PayrollRun|null>(()=>cache.months.get(currentMonth)?.run??null);
  useEffect(()=>{if(setup)cache.setup=setup;},[cache,setup]);
  useEffect(()=>{cache.runs=runs;},[cache,runs]);
  useEffect(()=>{if(run)cache.months.set(run.month,{run,at:Date.now()});},[cache,run]);
  const [tab,setTab]=useState(0);
  const [loading,setLoading]=useState(()=>!cache.setup);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [salaryEmployee,setSalaryEmployee]=useState<string|null>(null);
  const [reviewItem,setReviewItem]=useState<PayrollItem|null>(null);
  const [paymentItem,setPaymentItem]=useState<PayrollItem|null>(null);
  const [slipItem,setSlipItem]=useState<PayrollItem|null>(null);
  const [attendanceItem,setAttendanceItem]=useState<PayrollItem|null>(null);
  const [search,setSearch]=useState('');
  const [view,setView]=useState<'all'|'attention'|'ready'|'unpaid'>('all');
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [printItems,setPrintItems]=useState<PayrollItem[]|null>(null);
  const [bulkPaying,setBulkPaying]=useState(false);
  const endPrint=useCallback((message?:string)=>{setPrintItems(null);if(message)setError(message);},[]);
  // A different payroll month starts with a clean selection.
  useEffect(()=>{setSelected(new Set());setView('all');},[run?.id]);
  const performing=useRef(false);
  const load=useCallback(async(force=false)=>{
    if(!allowed||!organizationId||!businessId)return;
    if(!force&&isFresh(cache.setupAt))return;
    setLoading(true);setError('');
    try{const [settings,history]=await Promise.all([payrollApi.setup(organizationId,businessId),payrollApi.runs(organizationId,businessId)]);setSetup(settings);setRuns(history);cache.setupAt=Date.now();}
    catch(error){setError(errorMessage(error));}finally{setLoading(false);}
  },[organizationId,businessId,allowed,cache]);
  useEffect(()=>{void load();},[load]);
  // Choosing a month opens it: the draft is created if needed and refreshed with the latest attendance and salaries.
  const openMonth=useCallback(async(target:string,force=false)=>{
    if(!allowed||!organizationId||!businessId||!/^\d{4}-\d{2}$/.test(target))return;
    const request=++openRequest.current;
    const known=cache.months.get(target);
    // Show what we already have straight away; skip the network entirely while it is fresh.
    setRun(known?.run??null);
    if(!force&&known&&isFresh(known.at)){setOpening(false);setOpenError('');return;}
    setOpening(true);setOpenError('');
    try{
      const next=await payrollApi.create(organizationId,businessId,target);
      if(request!==openRequest.current)return;
      setRun(next);setRuns(await payrollApi.runs(organizationId,businessId));
    }catch(error){if(request===openRequest.current){setRun(null);setOpenError(errorMessage(error));}}
    finally{if(request===openRequest.current)setOpening(false);}
  },[allowed,organizationId,businessId,cache]);
  useEffect(()=>{if(setup)void openMonth(month);},[month,setup!==null,openMonth]);
  useEffect(()=>{setRange(null);},[month]);
  useEffect(()=>{
    const request=++previewRequest.current;
    if(!range||!organizationId||!businessId){setPreview(null);return;}
    payrollApi.preview(organizationId,businessId,range.from,range.to)
      .then(result=>{if(request===previewRequest.current)setPreview(result);})
      .catch(error=>{if(request===previewRequest.current){setPreview(null);setError(errorMessage(error));}});
  },[range,organizationId,businessId]);
  function choosePeriod(next:{from:string;to:string}) {
    if(!next.from||!next.to||next.from>next.to)return;
    setRange(next.from===`${month}-01`&&next.to===defaultTo?null:next);
  }
  async function perform(action:()=>Promise<unknown>,message='') {
    if(performing.current)return false;
    performing.current=true;setBusy(true);setError('');setNotice('');
    try{await action();if(message)setNotice(message);return true;}catch(error){setError(errorMessage(error));return false;}finally{performing.current=false;setBusy(false);}
  }
  async function updateRun(next:PayrollRun) {
    setRun(next);setRuns(await payrollApi.runs(organizationId,businessId));
  }
  function exportRun(items:PayrollItem[]) {
    if(!run)return;
    const rows:(string|number)[][]=[['Payroll month','Status','Employee code','Employee name','Employed days','Paid days','LOP days','Earnings INR','Deductions INR','Net payable INR','Recorded paid INR']];
    for(const item of items){const s=item.snapshot;rows.push([run.month,run.status,s.employee.code,s.employee.name,s.eligibleDays,s.paidDays,s.lopDays,(s.totalEarnings/100).toFixed(2),(s.totalDeductions/100).toFixed(2),(s.netPayable/100).toFixed(2),(item.payments.reduce((sum,p)=>sum+p.amount,0)/100).toFixed(2)]);}
    const url=URL.createObjectURL(new Blob([csvText(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`payroll-${run.month}-${run.status.toLowerCase()}.csv`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  if(!allowed)return <Alert severity="info">Payroll is available to organization owners and admins.</Alert>;
  const custom=Boolean(range&&preview);
  const shown:PayrollRun|null=custom&&preview?{id:`preview-${preview.from}-${preview.to}`,month,status:'DRAFT',createdAt:'',finalizedAt:null,items:preview.items,missingEmployees:[]}:run;
  // The running month and custom date ranges are views: no reviews, approvals, finalizing or payments.
  const live=!custom&&shown?.status==='DRAFT'&&shown.month===currentMonth;
  const readOnly=live||custom;
  const isClean=(item:PayrollItem)=>{const a=item.snapshot.attendance;return !item.reviewed&&item.issues.length===1&&item.issues[0]==='Needs review.'&&!a.openSessions&&!a.pendingCorrections&&!a.missingDates.length&&!a.leaveDates.length;};
  const cleanCount=shown?.status==='DRAFT'?shown.items.filter(isClean).length:0;
  const pending=shown?.status==='DRAFT'?shown.items.filter(i=>i.issues.length).length:0;
  const ready=Boolean(shown&&!pending&&!shown.missingEmployees.length);
  const withoutSalary=shown&&setup?setup.employees.filter(e=>e.status==='ACTIVE'&&!setup.compensations.some(c=>c.employeeId===e.id&&c.effectiveMonth<=shown.month)):[];
  const paidOf=(item:PayrollItem)=>item.payments.reduce((sum,p)=>sum+p.amount,0);
  const term=search.trim().toLowerCase();
  const rows=shown?[...shown.items].sort((a,b)=>a.snapshot.employee.name.localeCompare(b.snapshot.employee.name)).filter(item=>{
    const s=item.snapshot;
    if(term&&!s.employee.name.toLowerCase().includes(term)&&!s.employee.code.toLowerCase().includes(term))return false;
    if(view==='attention')return item.issues.length>0;
    if(view==='ready')return shown.status==='DRAFT'&&!item.issues.length;
    if(view==='unpaid')return paidOf(item)<s.netPayable;
    return true;
  }):[];
  const chosen=shown?shown.items.filter(i=>selected.has(i.id)):[];
  const allShownSelected=rows.length>0&&rows.every(i=>selected.has(i.id));
  const toggle=(id:string)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});
  const toggleShown=()=>setSelected(current=>{const next=new Set(current);rows.forEach(i=>allShownSelected?next.delete(i.id):next.add(i.id));return next;});
  const totals=shown?.items.reduce((sum,i)=>({gross:sum.gross+i.snapshot.totalEarnings,deductions:sum.deductions+i.snapshot.totalDeductions,net:sum.net+i.snapshot.netPayable,paid:sum.paid+i.payments.reduce((total,p)=>total+p.amount,0)}),{gross:0,deductions:0,net:0,paid:0});
  return <PayrollRoot>
    <Tabs value={tab} onChange={(_e,value:number)=>setTab(value)} variant="scrollable" aria-label="Payroll sections"><Tab label="Monthly payroll"/><Tab label="Salary setup"/><Tab label="Company details"/></Tabs>
    {error&&<Alert severity="error" action={<Button color="inherit" disabled={busy} onClick={()=>void load(true)}>Reload</Button>}>{error}</Alert>}
    {notice&&<Alert severity="success" onClose={()=>setNotice('')}>{notice}</Alert>}
    {loading&&!setup?<Skeleton variant="rounded" height={240}/>:!setup?<Button onClick={()=>void load(true)}>Retry payroll setup</Button>:<>
      {tab===0&&<>
        <div className="card payroll-card"><Stack spacing={2}>
          <div className="payroll-controls"><TextField required size="small" label="Payroll month" type="month" value={month} onChange={e=>setMonth(e.target.value)} disabled={busy} slotProps={{inputLabel:{shrink:true},htmlInput:{min:'2000-01',max:currentMonth}}}/>
            <TextField select size="small" label="Previous payrolls" value={runs.some(r=>r.month===month)?month:''} disabled={busy} sx={{minWidth:220}} onChange={e=>setMonth(e.target.value)}>
              <MenuItem value="" disabled>Jump to a month</MenuItem>{runs.map(r=><MenuItem key={r.id} value={r.month}>{monthLabel(r.month)} · {r.status==='FINALIZED'?'Finalized':'Draft'}</MenuItem>)}
            </TextField>
            <TextField size="small" label="From" type="date" value={period.from} onChange={e=>choosePeriod({...period,from:e.target.value})} disabled={busy} slotProps={{inputLabel:{shrink:true},htmlInput:{min:`${month}-01`,max:period.to}}}/>
            <TextField size="small" label="To" type="date" value={period.to} onChange={e=>choosePeriod({...period,to:e.target.value})} disabled={busy} slotProps={{inputLabel:{shrink:true},htmlInput:{min:period.from,max:defaultTo}}}/>
            {month!==currentMonth&&<Button disabled={busy} onClick={()=>setMonth(currentMonth)}>Back to this month</Button>}
          </div><Typography variant="body2" color="text.secondary">All branches · monthly INR payroll · calendar-day proration. Paid days run up to today while the month is in progress. Pick From and To dates to see earnings for part of the month.</Typography>
        </Stack></div>
        {opening&&!shown&&<Skeleton variant="rounded" height={200}/>}
        {!opening&&!shown&&<Alert severity="info">{openError||'Set up employee salaries to see this month’s payroll.'}</Alert>}
        {shown&&<>
          {live&&<Alert severity="info">Live payroll for {monthLabel(shown.month)}, calculated up to today ({slipDate(localToday,true)}). It updates daily as attendance is recorded. Review and finalize once the month has ended.</Alert>}
          {custom&&<Alert severity="info" action={<Button color="inherit" onClick={()=>setRange(null)}>Show full period</Button>}>Showing what each employee earned from {slipDate(period.from,true)} to {slipDate(period.to,true)}, before any loss-of-pay review. This view isn't saved; payroll is finalized for whole months.</Alert>}
          {shown.status==='DRAFT'&&shown.missingEmployees.length>0&&<Alert severity="warning" action={<Button color="inherit" disabled={busy} onClick={()=>void perform(async()=>updateRun(await payrollApi.refresh(organizationId,businessId,shown.id)),'Draft refreshed.')}>Refresh draft</Button>}>Not in this draft yet: {shown.missingEmployees.map(e=>`${e.name} (${e.code})`).join(', ')}.</Alert>}
          {shown.status==='DRAFT'&&!readOnly&&pending>0&&<Alert severity="info">{pending} of {shown.items.length} employees still need attention before finalizing; see the Attendance review column.</Alert>}
          {shown.status==='DRAFT'&&withoutSalary.length>0&&<Alert severity="warning">Not included — no salary set up for {monthLabel(shown.month)}: {withoutSalary.map(e=>`${e.name} (${e.code})`).join(', ')}. Set up their salary (Employees → Edit, or Salary setup), then refresh the draft.</Alert>}
          <div className="payroll-summary"><div><small>Gross earnings</small><strong>{money(totals?.gross??0)}</strong></div><div><small>Deductions</small><strong>{money(totals?.deductions??0)}</strong></div><div><small>Net payable</small><strong>{money(totals?.net??0)}</strong></div><div><small>Recorded payments</small><strong>{money(totals?.paid??0)}</strong></div></div>
          <div className="card payroll-card"><Stack spacing={2}>
            <div className="payroll-controls"><Typography variant="h6">{monthLabel(shown.month)}</Typography><Chip size="small" label={custom?'DATE RANGE':live?'LIVE':shown.status} color={shown.status==='FINALIZED'?'success':'default'}/>
              <Button disabled={busy} onClick={()=>exportRun(shown.items)}>Export payroll CSV</Button>
              {shown.status==='DRAFT'&&!custom&&<><Button disabled={busy} onClick={()=>void perform(async()=>updateRun(await payrollApi.refresh(organizationId,businessId,shown.id)),'Draft refreshed. Reviews were kept unless salary or attendance changed.')}>Refresh draft</Button>
                {!readOnly&&<Button disabled={busy||!cleanCount} onClick={()=>void perform(async()=>{const result=await payrollApi.approveClean(organizationId,businessId,shown.id,'Approved in bulk: full attendance, no exceptions.');await updateRun(result.run);setNotice(`${result.approved} employee${result.approved===1?'':'s'} approved.`);})}>Approve {cleanCount} without exceptions</Button>}
                {!readOnly&&<Button color="error" disabled={busy} onClick={()=>{if(window.confirm(`Delete the ${monthLabel(shown.month)} draft? Reviews in it will be lost.`))void perform(async()=>{await payrollApi.remove(organizationId,businessId,shown.id);cache.months.delete(shown.month);setRun(null);setRuns(await payrollApi.runs(organizationId,businessId));},'Draft deleted.');}}>Delete draft</Button>}
                {!readOnly&&<Button variant="contained" disabled={busy||!ready} onClick={()=>{if(window.confirm(`Finalize ${monthLabel(shown.month)} payroll? The saved payslips and calculations will be locked.`))void perform(async()=>updateRun(await payrollApi.finalize(organizationId,businessId,shown.id)),'Payroll finalized. Payslips are ready to print.');}}>Finalize payroll</Button>}</>}
            </div>
            <div className="payroll-controls">
              <TextField size="small" type="search" label="Search employees" placeholder="Name or employee ID" value={search} onChange={e=>setSearch(e.target.value)} sx={{minWidth:240}}/>
              <TextField select size="small" label="Show" value={view} onChange={e=>setView(e.target.value as typeof view)} sx={{minWidth:180}}>
                <MenuItem value="all">All employees</MenuItem>
                {shown.status==='DRAFT'&&!readOnly&&<MenuItem value="attention">Needs attention</MenuItem>}
                {shown.status==='DRAFT'&&!readOnly&&<MenuItem value="ready">Ready</MenuItem>}
                <MenuItem value="unpaid">Not fully paid</MenuItem>
              </TextField>
              <Typography variant="body2" color="text.secondary">Showing {rows.length} of {shown.items.length}</Typography>
            </div>
            {chosen.length>0&&<div className="payroll-selection">
              <strong>{chosen.length} selected</strong>
              {shown.status==='DRAFT'&&!readOnly&&<Button size="small" disabled={busy} onClick={()=>void perform(async()=>{const result=await payrollApi.approveClean(organizationId,businessId,shown.id,'Approved in bulk: full attendance, no exceptions.',chosen.map(i=>i.id));await updateRun(result.run);const skipped=chosen.filter(i=>!i.reviewed).length-result.approved;setNotice(`${result.approved} approved.${skipped>0?` ${skipped} need individual review (attendance exceptions or blockers).`:''}`);})}>Approve selected</Button>}
              <Button size="small" disabled={busy} onClick={()=>exportRun(chosen)}>Export selected CSV</Button>
              <Button size="small" disabled={busy||Boolean(printItems)} onClick={()=>setPrintItems(chosen)}>{printItems?'Preparing PDF…':'Download payslips (PDF)'}</Button>
              {shown.status==='FINALIZED'&&<Button size="small" disabled={busy||chosen.every(i=>paidOf(i)>=i.snapshot.netPayable)} onClick={()=>setBulkPaying(true)}>Record payment</Button>}
              <Button size="small" disabled={busy} onClick={()=>setSelected(new Set())}>Clear selection</Button>
            </div>}
            <div className="payroll-scroll"><table className="payroll-table"><thead><tr><th className="select"><Checkbox size="small" checked={allShownSelected} indeterminate={!allShownSelected&&rows.some(i=>selected.has(i.id))} disabled={!rows.length} onChange={toggleShown} slotProps={{input:{'aria-label':'Select all shown employees'}}}/></th><th>Employee</th><th>Attendance review</th><th>Paid / LOP days</th><th>Earnings</th><th>Deductions</th><th>Net payable</th><th>Payment</th><th>Actions</th></tr></thead><tbody>
              {rows.map(item=>{const s=item.snapshot,a=s.attendance,paid=paidOf(item);return <tr key={item.id} className={selected.has(item.id)?'selected':undefined}>
                <td className="select"><Checkbox size="small" checked={selected.has(item.id)} onChange={()=>toggle(item.id)} slotProps={{input:{'aria-label':`Select ${s.employee.name}`}}}/></td>
                <td><strong>{s.employee.name}</strong><small>{s.employee.code}</small>{s.blockers.map(b=><small key={b} style={{color:'#b42318'}}>{b}</small>)}</td>
                <td>{shown.status==='FINALIZED'?'Finalized':custom?'Earned for the selected dates':live?'Live · review after month end':item.issues.length?<span style={{color:'#b42318'}}>{item.issues.join(' ')}</span>:'Ready'}<IconButton size="small" aria-label={`View ${s.employee.name}'s attendance`} title="View attendance" onClick={()=>setAttendanceItem(item)}><Icon name="calendar" className="tiny"/></IconButton><small>{a.presentDays} attended · {a.missingDates.length} missing · {a.leaveDates.length} leave</small><small>{a.openSessions} open · {a.pendingCorrections} corrections</small></td>
                <td>{s.paidDays} / {s.lopDays}<small>{s.eligibleDays} employed days</small></td><td>{money(s.totalEarnings)}</td><td>{money(s.totalDeductions)}</td><td><strong>{money(s.netPayable)}</strong></td>
                <td>{paid>0?(paid>=s.netPayable?'Paid':'Partially paid'):(s.netPayable===0?'No amount due':'Unpaid')}<small>{money(paid)}</small>{item.payments.map(p=><small key={p.id}>{p.paidOn} · {p.reference}</small>)}</td>
                <td><div className="actions">{shown.status==='DRAFT'&&!readOnly&&<Button size="small" disabled={busy} onClick={()=>setReviewItem(item)}>Review</Button>}<Button size="small" disabled={busy} onClick={()=>setSlipItem(item)}>{shown.status==='FINALIZED'?'Payslip':'Preview'}</Button>{shown.status==='FINALIZED'&&paid<s.netPayable&&<Button size="small" disabled={busy} onClick={()=>setPaymentItem(item)}>Record payment</Button>}</div></td>
              </tr>;})}
              {!rows.length&&<tr><td colSpan={9}>No employees match this search.</td></tr>}
            </tbody></table></div>
          </Stack></div>
        </>}
      </>}
      {tab===1&&<div className="card payroll-card"><Typography variant="h6" sx={{mb:2}}>Employee salary versions</Typography><div className="payroll-scroll"><table className="payroll-table"><thead><tr><th>Employee</th><th>Latest salary effective from</th><th>Fixed monthly earnings</th><th>Actions</th></tr></thead><tbody>
        {setup.employees.map(e=>{const c=setup.compensations.find(c=>c.employeeId===e.id);return <tr key={e.id}><td><strong>{e.name}</strong><small>{e.code} · {e.status}</small></td><td>{c?monthLabel(c.effectiveMonth):'Not configured'}</td><td>{c?money(c.earnings.reduce((sum,l)=>sum+l.amount,0)):'—'}</td><td><Button disabled={busy} onClick={()=>setSalaryEmployee(e.id)}>Set up salary</Button></td></tr>;})}
        {!setup.employees.length&&<tr><td colSpan={4}>Add employees to configure their salary.</td></tr>}
      </tbody></table></div></div>}
      {tab===2&&<div className="card payroll-card"><CompanyForm key={JSON.stringify(setup.settings)} settings={setup.settings} busy={busy} onSave={value=>perform(async()=>{await payrollApi.settings(organizationId,businessId,value);setSetup(await payrollApi.setup(organizationId,businessId));},'Company payslip details saved.')}/></div>}
      {salaryEmployee&&<SalaryForm key={salaryEmployee} setup={setup} employeeId={salaryEmployee} currentMonth={month} busy={busy} onClose={()=>setSalaryEmployee(null)} onSave={request=>perform(async()=>{await payrollApi.compensation(organizationId,businessId,request);setSetup(await payrollApi.setup(organizationId,businessId));await openMonth(month,true);},'Salary version saved and payroll updated.')}/>}
      {reviewItem&&run&&<ReviewForm key={reviewItem.id} item={reviewItem} busy={busy} onClose={()=>setReviewItem(null)} onSave={review=>perform(async()=>updateRun(await payrollApi.review(organizationId,businessId,run.id,reviewItem.id,review)),'Payroll calculation reviewed.')}/>}
      {paymentItem&&run&&<PaymentForm key={paymentItem.id} item={paymentItem} today={localToday} busy={busy} onClose={()=>setPaymentItem(null)} onSave={payment=>perform(async()=>updateRun(await payrollApi.payment(organizationId,businessId,run.id,paymentItem.id,payment)),'Payment recorded.')}/>}
      {attendanceItem&&<AttendanceDialog organizationId={organizationId} businessId={businessId} snapshot={attendanceItem.snapshot} onClose={()=>setAttendanceItem(null)}/>}
      {printItems&&shown&&<PayslipDownload items={printItems} finalized={shown.status==='FINALIZED'} fileName={printItems.length===1?`payslip-${printItems[0].snapshot.employee.code}-${shown.month}.pdf`:`payslips-${shown.month}.pdf`} onDone={endPrint}/>}
      {bulkPaying&&run&&<BulkPaymentForm items={chosen} today={localToday} busy={busy} onClose={()=>setBulkPaying(false)} onSave={value=>perform(async()=>{const result=await payrollApi.bulkPayment(organizationId,businessId,run.id,{itemIds:chosen.map(i=>i.id),...value});await updateRun(result.run);setNotice(`Payment recorded for ${result.recorded} employee${result.recorded===1?'':'s'}.`);})}/>}
      {slipItem&&run&&<Payslip item={slipItem} finalized={run.status==='FINALIZED'} onClose={()=>setSlipItem(null)}/>}
    </>}
  </PayrollRoot>;
}
