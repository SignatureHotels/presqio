import { useState } from 'react';
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { PayrollCompensation, PayrollItem, PayrollLine, PayrollReview, PayrollSettings, PayrollSetup, SaveCompensationRequest } from '@presqio/lib';
import { payrollApi } from '@/api/payroll';
import { errorMessage } from '@/api/client';
import { useAdmin } from '@/hooks/use-admin';
import { CompanyLogo as CompanyLogoPreview } from './CompanyLogo';
import { DEFAULT_DEDUCTIONS, DEFAULT_EARNINGS, inputRupees, money, monthLabel, parseRupees } from './payroll-utils';

export type EditableLine={label:string;value:string};
export const editable=(lines:PayrollLine[]) => lines.map(l => ({label:l.label,value:inputRupees(l.amount)}));
/** Blank rows are dropped and a blank amount counts as 0, so optional rows never block saving. */
export const lines=(rows:EditableLine[]) => rows.filter(l => l.label.trim()||l.value.trim()).map(l => {
  if (!l.label.trim()) throw new Error('Give each amount a component name, or remove the row.');
  return {label:l.label.trim(),amount:l.value.trim()?parseRupees(l.value):0};
});
export const defaultLines=(labels:string[]) => labels.map(label => ({label,value:'0.00'}));
export function LineEditor({title,rows,onChange,disabled,required=true}:{title:string;rows:EditableLine[];onChange:(rows:EditableLine[])=>void;disabled:boolean;required?:boolean}) {
  return <Stack spacing={1}><Typography fontWeight={700}>{title}</Typography>{rows.map((row,i) => <Stack direction="row" spacing={1} key={i}>
    <TextField label="Component" size="small" fullWidth required={required} value={row.label} disabled={disabled} onChange={e => onChange(rows.map((l,j) => j===i ? {...l,label:e.target.value}:l))} slotProps={{htmlInput:{maxLength:80}}}/>
    <TextField label="Amount (₹)" size="small" required={required} value={row.value} disabled={disabled} onChange={e => onChange(rows.map((l,j) => j===i ? {...l,value:e.target.value}:l))} slotProps={{htmlInput:{inputMode:'decimal'}}} sx={{minWidth:120,width:160}}/>
    <Button aria-label={`Remove ${row.label||'component'}`} disabled={disabled} onClick={() => onChange(rows.filter((_,j) => j!==i))}>Remove</Button>
  </Stack>)}<Button sx={{alignSelf:'flex-start'}} disabled={disabled||rows.length>=20} onClick={() => onChange([...rows,{label:'',value:'0.00'}])}>Add component</Button></Stack>;
}
export function SalaryForm({setup,employeeId,currentMonth,busy,onSave,onClose}:{setup:PayrollSetup;employeeId:string;currentMonth:string;busy:boolean;onSave:(request:SaveCompensationRequest)=>Promise<boolean>;onClose:()=>void}) {
  const existing=setup.compensations.find(c => c.employeeId===employeeId);
  const [effectiveMonth,setEffectiveMonth]=useState(existing?.effectiveMonth??currentMonth);
  const [earnings,setEarnings]=useState<EditableLine[]>(existing?editable(existing.earnings):defaultLines(DEFAULT_EARNINGS));
  const [deductions,setDeductions]=useState<EditableLine[]>(existing?editable(existing.deductions):defaultLines(DEFAULT_DEDUCTIONS));
  const [error,setError]=useState('');
  const employee=setup.employees.find(e => e.id===employeeId);
  function applyVersion(version:PayrollCompensation) {setEffectiveMonth(version.effectiveMonth);setEarnings(editable(version.earnings));setDeductions(editable(version.deductions));}
  async function save(event:React.FormEvent) {
    event.preventDefault();setError('');
    try {
      const earned=lines(earnings),deducted=lines(deductions);
      if (!earned.length||!earned.some(l => l.amount>0)) throw new Error('Add at least one positive earning component.');
      if (await onSave({employeeId,effectiveMonth,earnings:earned,deductions:deducted})) onClose();
    } catch(error) {setError(error instanceof Error?error.message:'Check the salary fields.');}
  }
  return <Dialog open onClose={busy?undefined:onClose} fullWidth maxWidth="md"><form onSubmit={save}><DialogTitle>Salary setup · {employee?.name}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
    {error&&<Alert severity="error">{error}</Alert>}
    <Alert severity="info">Fixed earnings use calendar-day proration. Deductions are manually configured monthly amounts and are not prorated. Tax and contribution rules are not calculated automatically.</Alert>
    <TextField select label="Load a saved salary version" value={setup.compensations.some(c => c.employeeId===employeeId&&c.effectiveMonth===effectiveMonth)?effectiveMonth:''} onChange={e => {const version=setup.compensations.find(c => c.employeeId===employeeId&&c.effectiveMonth===e.target.value);if(version)applyVersion(version);}} disabled={busy}>
      <MenuItem value="">New version</MenuItem>{setup.compensations.filter(c => c.employeeId===employeeId).map(c => <MenuItem key={c.id} value={c.effectiveMonth}>{monthLabel(c.effectiveMonth)}</MenuItem>)}
    </TextField>
    <TextField required label="Effective from month" type="month" value={effectiveMonth} onChange={e => setEffectiveMonth(e.target.value)} disabled={busy} slotProps={{inputLabel:{shrink:true}}} helperText="Applies from the first day of this month until the next salary version. Saving an existing month replaces that version; finalized payslips stay unchanged."/>
    <LineEditor title="Monthly earnings" rows={earnings} onChange={setEarnings} disabled={busy}/>
    <LineEditor title="Monthly deductions (optional)" required={false} rows={deductions} onChange={setDeductions} disabled={busy}/>
    <Typography variant="body2" color="text.secondary">PAN, bank, PF/ESI and other payslip details are edited in the employee's details (Employees → Edit).</Typography>
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy} type="submit" variant="contained">Save salary version</Button></DialogActions></form></Dialog>;
}
/** Uploads a logo to file storage; the id is saved with the company details. */
function LogoPicker({logo,name,disabled,onChange}:{logo:string;name:string;disabled:boolean;onChange:(logo:string)=>void}) {
  const {organization,businessId}=useAdmin();
  const [uploading,setUploading]=useState(false);const [error,setError]=useState('');
  async function upload(file:File) {
    setError('');
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError('Choose a PNG, JPEG or WebP image.');
    if (file.size>500_000) return setError('The logo must be smaller than 500 KB.');
    setUploading(true);
    try {
      const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
      onChange((await payrollApi.uploadLogo(organization?.id??'',businessId,dataUrl)).logo);
    } catch(caught) {setError(errorMessage(caught));} finally {setUploading(false);}
  }
  return <Stack spacing={1}><Typography fontWeight={700}>Company logo</Typography>
    {logo&&<CompanyLogoPreview logo={logo} alt={name} style={{maxWidth:280,maxHeight:72,objectFit:'contain',alignSelf:'flex-start'}}/>}
    <Stack direction="row" spacing={1}>
      <Button component="label" variant="outlined" disabled={disabled||uploading}>{uploading?'Uploading…':logo?'Replace logo':'Upload logo'}
        <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/></Button>
      {logo&&<Button color="error" disabled={disabled||uploading} onClick={()=>onChange('')}>Remove logo</Button>}
    </Stack>
    {error&&<Alert severity="error">{error}</Alert>}
    <Typography variant="body2" color="text.secondary">PNG, JPEG or WebP, under 500 KB. Stored privately and printed at the top of payslips. Click Save to apply.</Typography>
  </Stack>;
}
export function CompanyForm({settings,busy,onSave}:{settings:PayrollSettings;busy:boolean;onSave:(value:PayrollSettings)=>Promise<boolean>}) {
  const [value,setValue]=useState(settings);
  return <form onSubmit={e => {e.preventDefault();void onSave(value);}}><Stack spacing={2} sx={{maxWidth:720}}><Typography variant="h6">Company details on payslips</Typography>
    <TextField required label="Legal company name" value={value.legalName} onChange={e=>setValue({...value,legalName:e.target.value})} disabled={busy} slotProps={{htmlInput:{maxLength:160}}}/>
    <TextField label="Company address" multiline minRows={3} value={value.address} onChange={e=>setValue({...value,address:e.target.value})} disabled={busy} slotProps={{htmlInput:{maxLength:1000}}}/>
    <LogoPicker logo={value.logoUrl} name={value.legalName} disabled={busy} onChange={logoUrl=>setValue({...value,logoUrl})}/>
    <Typography color="text.secondary" variant="body2">Updated details apply when drafts are reviewed. Finalized payslips retain their original company details.</Typography>
    <Button sx={{alignSelf:'flex-start'}} type="submit" variant="contained" disabled={busy}>Save company details</Button>
  </Stack></form>;
}
export function ReviewForm({item,busy,onSave,onClose}:{item:PayrollItem;busy:boolean;onSave:(review:PayrollReview)=>Promise<boolean>;onClose:()=>void}) {
  const [lop,setLop]=useState(String((item.reviewed?item.review.lopHalfDays:item.snapshot.suggestedLopHalfDays)/2));
  const [earnings,setEarnings]=useState(editable(item.review.additionalEarnings));
  const [deductions,setDeductions]=useState(editable(item.review.additionalDeductions));
  const [note,setNote]=useState(item.review.note);
  const [accepted,setAccepted]=useState(item.review.acceptAttendanceExceptions);
  const [error,setError]=useState('');
  const s=item.snapshot,a=s.attendance;
  const exceptions=a.openSessions+a.pendingCorrections+a.missingDates.length+a.leaveDates.length;
  async function save(event:React.FormEvent) {
    event.preventDefault();setError('');
    try {
      if (!/^\d+(?:\.5|\.0)?$/.test(lop)||Number(lop)>s.eligibleDays) throw new Error(`Enter LOP in half-day increments, up to ${s.eligibleDays} days.`);
      if (await onSave({lopHalfDays:Number(lop)*2,acceptAttendanceExceptions:accepted,additionalEarnings:lines(earnings),additionalDeductions:lines(deductions),note})) onClose();
    }catch(error){setError(error instanceof Error?error.message:'Check the review fields.');}
  }
  return <Dialog open onClose={busy?undefined:onClose} fullWidth maxWidth="md"><form onSubmit={save}><DialogTitle>Review · {s.employee.name} · {monthLabel(s.month)}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
    {error&&<Alert severity="error">{error}</Alert>}
    <Alert severity="info">{s.eligibleDays} employed calendar days · {a.presentDays} days with attendance · {Math.floor(a.completedMinutes/60)}h {a.completedMinutes%60}m recorded. Missing attendance does not automatically deduct salary. Review paid leave, holidays and weekly offs before entering LOP.</Alert>
    {s.blockers.map(message=><Alert severity="warning" key={message}>{message}</Alert>)}
    {!!exceptions&&<Alert severity="warning"><div>{a.openSessions} open sessions · {a.pendingCorrections} pending corrections</div><div>Missing dates: {a.missingDates.join(', ')||'None'}</div><div>Recorded leave: {a.leaveDates.join(', ')||'None'}</div></Alert>}
    <Typography variant="body2">Current calculation: {s.paidDays} paid days · {money(s.netPayable)} net payable. Saving this review refreshes salary and attendance from the server.</Typography>
    <TextField required label="Loss-of-pay days" type="number" value={lop} onChange={e=>setLop(e.target.value)} disabled={busy} slotProps={{htmlInput:{min:0,max:s.eligibleDays,step:0.5}}}
      helperText={`Suggested: ${s.suggestedLopHalfDays/2} (missing working days). Reduce it for holidays and paid leave.`}/>
    <LineEditor title="Approved additional earnings (optional: overtime, bonus, arrears)" required={false} rows={earnings} onChange={setEarnings} disabled={busy}/>
    <LineEditor title="Additional deductions (optional: advance recovery, adjustments)" required={false} rows={deductions} onChange={setDeductions} disabled={busy}/>
    {!!exceptions&&<FormControlLabel control={<Checkbox checked={accepted} onChange={e=>setAccepted(e.target.checked)} disabled={busy}/>} label="I have classified the listed attendance exceptions and leave, and approved their treatment in this payroll."/>}
    <TextField required label="Review note and reason for adjustments" multiline minRows={2} value={note} onChange={e=>setNote(e.target.value)} disabled={busy} slotProps={{htmlInput:{minLength:5,maxLength:1000}}}/>
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>Save reviewed calculation</Button></DialogActions></form></Dialog>;
}
export function PaymentForm({item,today,busy,onSave,onClose}:{item:PayrollItem;today:string;busy:boolean;onSave:(value:{amount:number;reference:string;paidOn:string})=>Promise<boolean>;onClose:()=>void}) {
  const remaining=item.snapshot.netPayable-item.payments.reduce((sum,p)=>sum+p.amount,0);
  const [amount,setAmount]=useState(inputRupees(remaining));const [reference,setReference]=useState('');const [paidOn,setPaidOn]=useState(today);const [error,setError]=useState('');
  return <Dialog open onClose={busy?undefined:onClose} fullWidth maxWidth="sm"><form onSubmit={async e=>{e.preventDefault();setError('');try{if(await onSave({amount:parseRupees(amount),reference,paidOn}))onClose();}catch(error){setError(error instanceof Error?error.message:'Invalid payment');}}}><DialogTitle>Record payment · {item.snapshot.employee.name}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
    <Alert severity="info">Record a payment already made through your bank or another payment method. This action does not transfer money.</Alert>{error&&<Alert severity="error">{error}</Alert>}
    <Typography>Remaining payable: {money(remaining)}</Typography><TextField required label="Amount paid (₹)" value={amount} onChange={e=>setAmount(e.target.value)} disabled={busy} slotProps={{htmlInput:{inputMode:'decimal'}}}/>
    <TextField required label="Bank / payment reference" value={reference} onChange={e=>setReference(e.target.value)} disabled={busy} slotProps={{htmlInput:{minLength:2,maxLength:120}}}/>
    <TextField required label="Payment date" type="date" value={paidOn} onChange={e=>setPaidOn(e.target.value)} disabled={busy} slotProps={{inputLabel:{shrink:true},htmlInput:{max:today}}}/>
    {item.payments.map(p=><Typography variant="body2" key={p.id}>{p.paidOn} · {p.reference} · {money(p.amount)}</Typography>)}
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy} variant="contained" type="submit">Record payment</Button></DialogActions></form></Dialog>;
}
export function BulkPaymentForm({items,today,busy,onSave,onClose}:{items:PayrollItem[];today:string;busy:boolean;onSave:(value:{reference:string;paidOn:string})=>Promise<boolean>;onClose:()=>void}) {
  const due=items.map(i=>({item:i,remaining:i.snapshot.netPayable-i.payments.reduce((sum,p)=>sum+p.amount,0)})).filter(d=>d.remaining>0);
  const total=due.reduce((sum,d)=>sum+d.remaining,0);
  const [reference,setReference]=useState('');const [paidOn,setPaidOn]=useState(today);
  return <Dialog open onClose={busy?undefined:onClose} fullWidth maxWidth="sm"><form onSubmit={e=>{e.preventDefault();void onSave({reference,paidOn}).then(ok=>{if(ok)onClose();});}}><DialogTitle>Record payment · {due.length} employee{due.length===1?'':'s'}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
    <Alert severity="info">Records each selected employee's remaining amount as paid with one bank reference (for example a bulk transfer batch). This does not transfer money.</Alert>
    {due.length<items.length&&<Typography variant="body2" color="text.secondary">{items.length-due.length} selected employee{items.length-due.length===1?' is':'s are'} already fully paid and will be skipped.</Typography>}
    <Typography>Total: <strong>{money(total)}</strong></Typography>
    <TextField required label="Bank / batch reference" value={reference} onChange={e=>setReference(e.target.value)} disabled={busy} slotProps={{htmlInput:{minLength:2,maxLength:120}}}/>
    <TextField required label="Payment date" type="date" value={paidOn} onChange={e=>setPaidOn(e.target.value)} disabled={busy} slotProps={{inputLabel:{shrink:true},htmlInput:{max:today}}}/>
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy||!due.length} variant="contained" type="submit">Record {money(total)}</Button></DialogActions></form></Dialog>;
}
