import type { EmployeePayrollDetails, PayrollPreview, PayrollRun, PayrollRunSummary, PayrollSetup, PayrollSettings, SaveCompensationRequest, PayrollReview } from '@presqio/lib';
import { api, apiObjectUrl } from './client';
const base = (org:string,business:string) => `/organizations/${org}/businesses/${business}/payroll`;
export const payrollApi = {
  setup:(o:string,b:string) => api<PayrollSetup>(`${base(o,b)}/setup`),
  uploadLogo:(o:string,b:string,dataUrl:string) => api<{logo:string}>(`${base(o,b)}/logo`,{method:'POST',body:{dataUrl}}),
  logoUrl:(o:string,b:string,logo:string) => apiObjectUrl(`${base(o,b)}/logos/${logo}`),
  settings:(o:string,b:string,body:PayrollSettings) => api<PayrollSettings>(`${base(o,b)}/settings`,{method:'PUT',body}),
  compensation:(o:string,b:string,body:SaveCompensationRequest) => api<{id:string}>(`${base(o,b)}/compensations`,{method:'PUT',body}),
  employee:(o:string,b:string,employeeId:string) => api<EmployeePayrollDetails>(`${base(o,b)}/employees/${employeeId}`),
  preview:(o:string,b:string,from:string,to:string) => api<PayrollPreview>(`${base(o,b)}/preview?from=${from}&to=${to}`),
  runs:(o:string,b:string) => api<PayrollRunSummary[]>(`${base(o,b)}/runs`),
  create:(o:string,b:string,month:string) => api<PayrollRun>(`${base(o,b)}/runs`,{method:'POST',body:{month}}),
  get:(o:string,b:string,id:string) => api<PayrollRun>(`${base(o,b)}/runs/${id}`),
  refresh:(o:string,b:string,id:string) => api<PayrollRun>(`${base(o,b)}/runs/${id}/refresh`,{method:'POST'}),
  approveClean:(o:string,b:string,id:string,note:string,itemIds?:string[]) => api<{approved:number;run:PayrollRun}>(`${base(o,b)}/runs/${id}/approve-clean`,{method:'POST',body:{note,itemIds}}),
  bulkPayment:(o:string,b:string,id:string,body:{itemIds:string[];reference:string;paidOn:string}) => api<{recorded:number;run:PayrollRun}>(`${base(o,b)}/runs/${id}/payments`,{method:'POST',body}),
  remove:(o:string,b:string,id:string) => api<void>(`${base(o,b)}/runs/${id}`,{method:'DELETE'}),
  review:(o:string,b:string,id:string,item:string,body:PayrollReview) => api<PayrollRun>(`${base(o,b)}/runs/${id}/items/${item}/review`,{method:'PUT',body}),
  finalize:(o:string,b:string,id:string) => api<PayrollRun>(`${base(o,b)}/runs/${id}/finalize`,{method:'POST'}),
  payment:(o:string,b:string,id:string,item:string,body:{amount:number;reference:string;paidOn:string}) => api<PayrollRun>(`${base(o,b)}/runs/${id}/items/${item}/payments`,{method:'POST',body}),
};
