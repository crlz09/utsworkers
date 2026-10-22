import test from 'node:test';
import assert from 'node:assert/strict';
import { addCalendarDays, formatInvoiceDate, weeklyInvoiceNumber, weekPeriodLabel, createWeeklyInvoice, updateWeeklyInvoice } from '../src/lib/ctsWeeklyInvoice.js';

test('week period spans seven inclusive calendar dates ending on the source date', () => {
  assert.equal(weekPeriodLabel('2026-10-18'), '10/12/2026 - 10/18/2026');
  assert.equal(weekPeriodLabel('2027-01-03'), '12/28/2026 - 01/03/2027');
  assert.equal(weekPeriodLabel('2026-11-01'), '10/26/2026 - 11/01/2026');
  assert.equal(weekPeriodLabel('2024-03-03'), '02/26/2024 - 03/03/2024');
  assert.equal(weekPeriodLabel(''), '—');
  assert.equal(weeklyInvoiceNumber('2026-02-30'), '');
});
test('new invoices use the supplied CTS contact defaults and seven-day payment terms', () => {
  const i = createWeeklyInvoice('2026-10-18', '2026-10-21');
  assert.deepEqual(i, {
    invoice_number:'UTS-CTS-20261018', client_name:'Commercial Trade Source (CTS)',
    client_address:'3924 Pendleton Way Indianapolis, IN 46226', client_contact_name:'Angie Triska',
    client_email:'angietriska@commercialtradesource.com', client_phone:'317-377-1988',
    invoice_date:'2026-10-21', due_date:'2026-10-28', notes:'Thank you for your business.',
  });
});
test('invoice number stays fixed; contacts and due date remain editable', () => {
  const original = createWeeklyInvoice('2026-10-18', '2026-10-21');
  assert.equal(updateWeeklyInvoice(original,'invoice_number','duplicate'), original);
  const edited = updateWeeklyInvoice(original,'client_contact_name','Other contact');
  assert.equal(edited.client_contact_name,'Other contact');
  const customDue = updateWeeklyInvoice(edited,'due_date','2026-11-05');
  assert.equal(customDue.due_date,'2026-11-05');
  const changedDate = updateWeeklyInvoice(customDue,'invoice_date','2026-12-28');
  assert.equal(changedDate.due_date,'2027-01-04');
  assert.equal(changedDate.client_contact_name,'Other contact');
});
test('date arithmetic does not shift at DST, month boundaries or leap days', () => {
  assert.equal(addCalendarDays('2026-10-28',7),'2026-11-04');
  assert.equal(addCalendarDays('2024-02-25',7),'2024-03-03');
  assert.equal(formatInvoiceDate('2026-10-21'),'10/21/2026');
  assert.equal(addCalendarDays('',7),'');
  assert.equal(formatInvoiceDate('2026-02-30'),'—');
});
