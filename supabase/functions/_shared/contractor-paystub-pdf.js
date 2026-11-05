import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { paystubDate, paystubTotals, paystubUsd } from './paystub-document.js';

const NAVY = rgb(18/255,49/255,75/255), BLUE = rgb(220/255,236/255,243/255), INPUT = rgb(241/255,248/255,252/255), WHITE = rgb(1,1,1), MUTED = rgb(.38,.46,.55);
// Version 1 remains available for previously finalized statements.
export async function buildContractorPaystubPdf(stub) {
  if (stub.template_version && stub.template_version !== 1) throw new Error('Unsupported paystub template version.');
  const pdf = await PDFDocument.create(), page = pdf.addPage([612,792]);
  page.drawRectangle({x:0,y:0,width:612,height:792,color:WHITE});
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const safe = (value) => [...String(value ?? '')].map(c => { try { font.encodeText(c); return c; } catch { return '?'; } }).join('');
  const text = (value,x,y,options={}) => page.drawText(safe(value),{x,y:792-y,size:10,font,color:NAVY,...options});
  const rect = (x,y,w,h,color) => page.drawRectangle({x,y:792-y-h,width:w,height:h,color});
  const right = (value,x,y,options={}) => { const f=options.font || font, size=options.size || 10; text(value,x-f.widthOfTextAtSize(safe(value),size),y,options); };
  const wrapped = (value,x,y,width,{maxLines=2,...options}={}) => {
    const size=options.size || 10, f=options.font || font, lines=[];
    let line='';
    for(const char of safe(value).replace(/\s+/g,' ')) {
      if(f.widthOfTextAtSize(line+char,size)>width){lines.push(line.trimEnd());line='';} line+=char;
    }
    if(line)lines.push(line.trim());
    lines.slice(0,maxLines).forEach((s,i)=>text(i===maxLines-1&&lines.length>maxLines?s.slice(0,-3)+'...':s,x,y+i*(size+3),options));
  };
  const band = (label,y) => {rect(30,y,552,25,NAVY);text(label,38,y+17,{font:bold,color:WHITE});};
  const totals=paystubTotals(stub);
  pdf.setTitle(`UTS 1099 Statement - ${safe(stub.worker_name)} - ${stub.period_start}`);
  pdf.setAuthor('Universal Talent Source');
  rect(30,30,552,55,NAVY);text('UNIVERSAL TALENT SOURCE',40,63,{font:bold,size:18,color:WHITE});
  rect(30,85,552,28,BLUE);text('INDEPENDENT CONTRACTOR PAYMENT STATEMENT | 1099',38,103,{font:bold,size:10});
  right(stub.finalized_at?`FINAL - VERSION ${stub.revision}`:'DRAFT - NOT FINAL',582,133,{font:bold,size:9});
  band('CONTRACTOR',146);
  text('Contractor name',38,193);rect(175,174,407,31,INPUT);wrapped(stub.worker_name,182,190,390);
  text('Project',38,226);rect(175,207,407,33,INPUT);wrapped(stub.project_name,182,222,390);
  band('PAYMENT DETAILS',254);
  text('Period start',38,301);text(paystubDate(stub.period_start),165,301);
  text('Period end',305,301);right(paystubDate(stub.period_end),574,301);
  text('Payment date',38,325);text(paystubDate(stub.payment_date),165,325);
  text('Statement number',305,325);wrapped(stub.statement_number || 'N/A',416,325,158,{maxLines:2,size:9});
  band('PAYMENT BREAKDOWN',355);
  rect(30,380,552,25,BLUE);
  text('Description',38,397,{font:bold});right('Hours / Qty',300,397,{font:bold});right('Rate',380,397,{font:bold});right('Multiplier',465,397,{font:bold});right('Amount',574,397,{font:bold});
  const lines=[['Regular hours',stub.regular_hours,paystubUsd(stub.hourly_rate),'1',totals.regular],['Overtime hours',stub.overtime_hours,paystubUsd(stub.hourly_rate),'1.5',totals.overtime],['Extras','','','',Number(stub.extras)],['Per diem','','','',Number(stub.per_diem)],['Deductions (subtract)','','','',Number(stub.deductions)]];
  lines.forEach(([label,hours,rate,mult,amount],i)=>{const y=424+i*25;text(label,38,y);right(String(hours),300,y);right(rate,380,y);right(mult,465,y);right(paystubUsd(amount),574,y);});
  rect(30,540,552,37,BLUE);text('NET PAYMENT',38,564,{font:bold,size:12});right(paystubUsd(stub.net_payment ?? totals.net),574,564,{font:bold,size:14});
  text('PAYMENT METHOD',38,603,{font:bold});wrapped(stub.payment_method || '—',195,603,375,{maxLines:2});
  let noteSize=9;
  while(noteSize>6&&Math.ceil(font.widthOfTextAtSize(safe(stub.notes||''),noteSize)/528)*(noteSize+3)>62)noteSize-=.5;
  text('Notes',38,627,{font:bold});wrapped(stub.notes || '',38,645,528,{maxLines:8,size:noteSize});
  text('Contractor payment statement — not a W-2 wage statement.',38,714,{size:8,color:MUTED});
  text('Tax treatment of reimbursements depends on documentation and applicable rules.',38,728,{size:8,color:MUTED});
  if(stub.finalized_at){text(`Record ID: ${stub.id}`,38,752,{size:7,color:MUTED});right(`Finalized ${paystubDate(stub.finalized_at.slice(0,10))}`,574,752,{size:7,color:MUTED});}
  return pdf.save();
}
