import type { PayrollProfile } from '@presqio/lib';
/** Default payslip rows; zero-amount rows print as "-". */
export const DEFAULT_EARNINGS = ['Basic Salary','HRA','Conveyance Allowance','Special Allowance','Other Allowance'];
// 'Income Tax' is hidden for now (TDS covers it); restore it after 'ESI' when needed.
export const DEFAULT_DEDUCTIONS = ['PF','VPF','ESI',/* 'Income Tax', */'PT','Mobile Deductions','TDS','Other Deductions'];
export const EMPTY_PROFILE:PayrollProfile={department:'',dateOfBirth:'',pan:'',uan:'',esi:'',bankName:'',bankAccount:'',bankIfsc:'',bankBranch:'',lastWorkingDate:''};
export const money = (paise:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(paise/100);
/** Payslip amount as printed on the slip: "1,40,000", "-" for zero. */
export const slipAmount = (paise:number) => paise===0 ? '-' : new Intl.NumberFormat('en-IN',{minimumFractionDigits:paise%100?2:0,maximumFractionDigits:2}).format(paise/100);
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/** YYYY-MM-DD as 04-06-1980, or 01-Mar-22 when `short`. */
export function slipDate(value:string,short=false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [y,m,d]=value.split('-');
  return short ? `${d}-${MONTHS[Number(m)-1]}-${y.slice(2)}` : `${d}-${m}-${y}`;
}
export function parseRupees(value:string) {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a non-negative amount with up to two decimal places.');
  const [whole,fraction=''] = value.trim().split('.');
  const amount = Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(amount) || amount>100_000_000_000) throw new Error('Amount is too large.');
  return amount;
}
export const inputRupees = (amount:number) => `${Math.trunc(amount/100)}.${String(amount%100).padStart(2,'0')}`;
const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function integerWords(n:number):string {
  if (n<20) return ones[n];
  if (n<100) return `${tens[Math.floor(n/10)]} ${ones[n%10]}`.trim();
  for (const [unit,name] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand'],[100,'Hundred']] as const)
    if (n>=unit) return `${integerWords(Math.floor(n/unit))} ${name} ${integerWords(n%unit)}`.trim();
  return '';
}
export function amountInWords(paise:number) {
  if (!Number.isSafeInteger(paise) || paise<0) return 'Review the calculated amount';
  const rupees=Math.floor(paise/100), fraction=paise%100;
  return `${integerWords(rupees)||'Zero'} Rupees${fraction ? ` and ${integerWords(fraction)} Paise`:''} Only`;
}
export const monthLabel = (month:string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'UTC'});
