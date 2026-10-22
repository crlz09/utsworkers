// Date-only arithmetic uses UTC to avoid DST and local timezone shifts.
export function addCalendarDays(isoDate, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || '')) return '';
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function formatInvoiceDate(isoDate) {
  return addCalendarDays(isoDate, 0) ? `${isoDate.slice(5, 7)}/${isoDate.slice(8, 10)}/${isoDate.slice(0, 4)}` : '—';
}
export function weeklyInvoiceNumber(weekEnding) {
  return addCalendarDays(weekEnding, 0) ? `UTS-CTS-${weekEnding.replaceAll('-', '')}` : '';
}
export function weekPeriodLabel(weekEnding) {
  const start = addCalendarDays(weekEnding, -6);
  return start ? `${formatInvoiceDate(start)} - ${formatInvoiceDate(weekEnding)}` : '—';
}
export function createWeeklyInvoice(weekEnding, invoiceDate) {
  return {
    invoice_number: weeklyInvoiceNumber(weekEnding),
    client_name: 'Commercial Trade Source (CTS)',
    client_address: '3924 Pendleton Way Indianapolis, IN 46226',
    client_contact_name: 'Angie Triska',
    client_email: 'angietriska@commercialtradesource.com',
    client_phone: '317-377-1988',
    invoice_date: invoiceDate,
    due_date: addCalendarDays(invoiceDate, 7),
    notes: 'Thank you for your business.',
  };
}
export function updateWeeklyInvoice(invoice, key, value) {
  if (key === 'invoice_number') return invoice;
  return { ...invoice, [key]: value, ...(key === 'invoice_date' ? { due_date: addCalendarDays(value, 7) } : {}) };
}
