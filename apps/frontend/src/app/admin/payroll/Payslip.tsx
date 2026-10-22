import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { PayrollItem } from '@presqio/lib';
import { amountInWords, monthLabel, slipAmount, slipDate } from './payroll-utils';
import { Slip } from './Payroll.style';
import { CompanyLogo, loadLogo } from './CompanyLogo';
import { useAdmin } from '@/hooks/use-admin';
function PayslipSheet({item,finalized,logoSrc}:{item:PayrollItem;finalized:boolean;logoSrc?:string}) {
  const s=item.snapshot, p=s.profile;
  const paid=item.payments.reduce((sum,p) => sum+p.amount,0);
  const details=[
    ['Emp. Code:',s.employee.code,'PF UAN No:',p.uan],
    ['Emp. Name:',s.employee.name,'ESI No:',p.esi],
    ['Designation:',s.employee.designation,'No.of Days in month',String(s.daysInMonth)],
    ['D.O.B:',slipDate(p.dateOfBirth),'Paid Days:',String(s.paidDays)],
    ['Pan No:',p.pan,'LOP Days:',String(s.lopDays)],
    ['Department:',p.department,'Bank Name',p.bankName],
    ['DOJ:',slipDate(s.employee.joinedOn,true),'Bank A/c No.',p.bankAccount],
  ];
  return <Slip aria-label="Employee payslip">
    <header className="slip-company">{s.company.logoUrl && <CompanyLogo logo={s.company.logoUrl} alt={s.company.legalName} src={logoSrc}/>}<h2>{s.company.legalName}</h2><p>{s.company.address}</p></header>
    <table className="slip-period"><tbody><tr><td>{finalized?'Payslip for the month of':'DRAFT payslip for the month of'}</td><td>{monthLabel(s.month).split(' ')[0]}</td><td>{s.month.slice(0,4)}</td></tr></tbody></table>
    <table className="slip-details"><tbody>{details.map((row,i) => <tr key={i}>{row.map((value,j) => <td key={j}>{value||'\u00a0'}</td>)}</tr>)}</tbody></table>
    <table><thead><tr><th>Earnings</th><th>Amount (Rs.)</th><th>Deductions</th><th>Amount (Rs.)</th></tr></thead><tbody>
      {Array.from({length:Math.max(s.earnings.length,s.deductions.length,6)},(_,i) => <tr key={i}>
        <td>{s.earnings[i]?.label||'\u00a0'}</td><td className="slip-money">{s.earnings[i] ? slipAmount(s.earnings[i].amount):''}</td>
        <td>{s.deductions[i]?.label||'\u00a0'}</td><td className="slip-money">{s.deductions[i] ? slipAmount(s.deductions[i].amount):''}</td>
      </tr>)}
      <tr className="slip-total"><td>Total Earnings</td><td className="slip-money">{slipAmount(s.totalEarnings)}</td><td>Total Deductions</td><td className="slip-money">{slipAmount(s.totalDeductions)}</td></tr>
      <tr className="slip-total"><td>{finalized && paid>=s.netPayable && s.netPayable>0 ? 'Net Paid':'Net Payable'}</td><td className="slip-money">{slipAmount(s.netPayable)}</td><td colSpan={2} /></tr>
    </tbody></table>
    <p className="slip-words">(In Words:- {amountInWords(s.netPayable)}.)</p>
    <p className="slip-foot">{s.periodStart && (s.periodStart!==`${s.month}-01` || Number(s.periodEnd?.slice(-2))!==s.daysInMonth) ? `Period: ${slipDate(s.periodStart,true)} to ${slipDate(s.periodEnd,true)} · `:''}Calendar-day proration · {s.eligibleDays} employed days · {s.lopDays} loss-of-pay days. {finalized ? 'Finalized payroll record.':'Subject to attendance and salary review.'}</p>
  </Slip>;
}
/** Renders payslips off-screen at A4 width and saves them as one PDF (one page each), then calls `onDone`. */
export function PayslipDownload({items,fileName,finalized,onDone}:{items:PayrollItem[];fileName:string;finalized:boolean;onDone:(error?:string)=>void}) {
  const root=useRef<HTMLDivElement>(null);
  const {organization,businessId}=useAdmin();
  // Logos load before rendering, so the capture never misses one that is still downloading.
  const [logos,setLogos]=useState<Map<string,string>|null>(null);
  useEffect(() => {
    let current=true;
    const ids=[...new Set(items.map(i => i.snapshot.company.logoUrl).filter(Boolean))];
    void Promise.all(ids.map(async id => [id,await loadLogo(organization?.id ?? '',businessId,id).catch(() => '')] as const))
      .then(pairs => current && setLogos(new Map(pairs)));
    return () => { current=false; };
  },[items,organization,businessId]);
  useEffect(() => {
    if (!logos) return;
    let cancelled=false;
    void (async () => {
      try {
        await Promise.all(Array.from(root.current?.querySelectorAll('img') ?? []).map(img => img.decode().catch(() => undefined)));
        // Loaded on demand: these libraries are only needed when someone downloads a payslip.
        const [{jsPDF},{default:html2canvas}]=await Promise.all([import('jspdf'),import('html2canvas')]);
        const pdf=new jsPDF({unit:'mm',format:'a4'});
        const sheets=Array.from(root.current?.children ?? []) as HTMLElement[];
        for (const [index,sheet] of sheets.entries()) {
          const canvas=await html2canvas(sheet,{scale:2,useCORS:true,backgroundColor:'#ffffff'});
          if (cancelled) return;
          // Fit inside A4 (210×297 mm) with 10 mm margins, keeping proportions.
          const ratio=Math.min(190/canvas.width,277/canvas.height);
          if (index) pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',(210-canvas.width*ratio)/2,10,canvas.width*ratio,canvas.height*ratio);
        }
        pdf.save(fileName);
        onDone();
      } catch (error) {
        if (!cancelled) onDone(error instanceof Error ? error.message : 'Could not create the PDF.');
      }
    })();
    return () => { cancelled=true; };
  },[logos,fileName,onDone]);
  return createPortal(<div ref={root} aria-hidden style={{position:'fixed',left:-10000,top:0,width:794}}>
    {logos && items.map(item => <PayslipSheet key={item.id} item={item} finalized={finalized} logoSrc={logos.get(item.snapshot.company.logoUrl) ?? ''}/>)}
  </div>,document.body);
}
export const payslipFileName=(item:PayrollItem)=>`payslip-${item.snapshot.employee.code}-${item.snapshot.month}.pdf`;
export function Payslip({item,finalized,onClose}:{item:PayrollItem;finalized:boolean;onClose:()=>void}) {
  const [downloading,setDownloading]=useState(false);
  const [error,setError]=useState('');
  const done=useCallback((message?:string)=>{setDownloading(false);setError(message??'');},[]);
  return <>
    <Dialog open onClose={onClose} maxWidth="md" fullWidth><DialogTitle>{item.snapshot.employee.name} · {monthLabel(item.snapshot.month)}</DialogTitle>
      <DialogContent>{error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}<PayslipSheet item={item} finalized={finalized}/></DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button><Button variant="contained" disabled={downloading} onClick={() => {setError('');setDownloading(true);}}>{downloading?'Preparing PDF…':'Download PDF'}</Button></DialogActions>
    </Dialog>
    {downloading && <PayslipDownload items={[item]} fileName={payslipFileName(item)} finalized={finalized} onDone={done}/>}
  </>;
}
