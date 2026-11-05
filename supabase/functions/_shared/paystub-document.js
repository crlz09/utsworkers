const money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const paystubDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? `${value.slice(5,7)}/${value.slice(8,10)}/${value.slice(0,4)}` : '—';
export const paystubUsd = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
export function paystubTotals(values) {
  const regular=money(Number(values.regular_hours)*Number(values.hourly_rate));
  const overtime=money(Number(values.overtime_hours)*Number(values.hourly_rate)*1.5);
  return {regular,overtime,net:money(regular+overtime+Number(values.per_diem)+Number(values.extras)-Number(values.deductions))};
}
export const paystubFilename = stub => `UTS-1099-${stub.worker_name.replace(/[^\p{L}\p{N}]+/gu,'-')}-${stub.period_start}-v${stub.revision || 1}.pdf`;
