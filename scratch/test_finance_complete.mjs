import assert from 'assert';

const BASE_URL = 'http://localhost:3005';

async function run() {
  console.log('--- STARTING COMPREHENSIVE FINANCE & CORE REGRESSION TESTS ---');

  // 1. Login as Admin
  console.log('1. Logging in as Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@company.com',
      password: 'Admin_Revent#2026',
    }),
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login failed');
  const setCookie = loginRes.headers.get('set-cookie');
  assert.ok(setCookie, 'No set-cookie returned');
  const cookieHeader = setCookie.split(';')[0];
  console.log('   ✓ Logged in as Admin successfully');

  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
  };

  const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers });
  const meData = await meRes.json();
  const currentUserId = meData.user.id;
  console.log(`   ✓ Current Admin user ID: ${currentUserId}`);

  // 2. Test Overview API
  console.log('2. Testing Finance Overview API...');
  const overviewRes = await fetch(`${BASE_URL}/api/finance/overview`, { headers });
  assert.strictEqual(overviewRes.status, 200);
  const overviewData = await overviewRes.json();
  assert.ok(overviewData.stats, 'Overview missing stats');
  assert.ok('totalInvoices' in overviewData.stats, 'Missing totalInvoices in stats');
  assert.ok('totalPaid' in overviewData.stats, 'Missing totalPaid in stats');
  console.log(`   ✓ Finance Overview verified (Total Invoices: ${overviewData.stats.totalInvoices}, Total Value: AED ${overviewData.stats.totalInvoiceValue})`);

  // 3. Create a Test Client
  console.log('3. Creating a Test Client...');
  const clientName = `Enterprise Corp ${Date.now()}`;
  const clientRes = await fetch(`${BASE_URL}/api/finance/clients`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: clientName,
      contact_person: 'John Doe',
      email: 'john@enterprisecorp.ae',
      phone: '+971 50 111 2222',
      address: 'Downtown Dubai',
    }),
  });
  assert.strictEqual(clientRes.status, 201);
  const clientJson = await clientRes.json();
  const clientId = clientJson.client.id;
  assert.ok(clientId, 'Client ID not returned');
  console.log(`   ✓ Client created with ID: ${clientId} (${clientName})`);

  // 4. Create an Invoice for Client
  console.log('4. Creating an Invoice for the Client...');
  const invNum = `INV-TEST-${Date.now().toString().slice(-4)}`;
  const invRes = await fetch(`${BASE_URL}/api/finance/invoices`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      client_id: clientId,
      invoice_number: invNum,
      invoice_date: '2026-09-01',
      due_date: '2026-09-15', // Past date -> should calculate as Overdue
      subtotal: 10000,
      vat_rate: 5.0,
      notes: 'Test invoice with 5% VAT',
    }),
  });
  assert.strictEqual(invRes.status, 201);
  const invJson = await invRes.json();
  const invoiceId = invJson.invoice.id;
  assert.strictEqual(invJson.invoice.total_amount, 10500, 'Subtotal + 5% VAT should equal 10500');
  console.log(`   ✓ Invoice created with ID: ${invoiceId} (#${invNum}), Total: AED ${invJson.invoice.total_amount}`);

  // 5. Query Single Invoice Detail
  console.log('5. Querying Invoice Detail...');
  const invDetailRes = await fetch(`${BASE_URL}/api/finance/invoices/${invoiceId}`, { headers });
  assert.strictEqual(invDetailRes.status, 200);
  const invDetail = await invDetailRes.json();
  assert.strictEqual(invDetail.invoice.effective_status, 'Overdue', 'Invoice with past due date and outstanding > 0 should be Overdue');
  assert.strictEqual(invDetail.invoice.outstanding_amount, 10500);
  console.log(`   ✓ Invoice detail verified (effective_status = ${invDetail.invoice.effective_status}, outstanding = ${invDetail.invoice.outstanding_amount})`);

  // 6. Record a Partial Payment
  console.log('6. Recording Partial Payment of 5000...');
  const payRes1 = await fetch(`${BASE_URL}/api/finance/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      invoice_id: invoiceId,
      amount: 5000,
      payment_date: '2026-09-20',
      payment_method: 'Bank Transfer',
      payment_reference: 'TR-TEST-001',
      notes: 'First installment',
    }),
  });
  assert.strictEqual(payRes1.status, 201);
  const payJson1 = await payRes1.json();
  assert.strictEqual(payJson1.newPaidAmount, 5000);
  assert.strictEqual(payJson1.newOutstandingAmount, 5500);
  console.log(`   ✓ First payment recorded. Outstanding now: AED ${payJson1.newOutstandingAmount}`);

  // 7. Record a Post-Dated Cheque (PDC)
  console.log('7. Recording a PDC for remaining amount...');
  const pdcRes = await fetch(`${BASE_URL}/api/finance/pdcs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      client_id: clientId,
      invoice_id: invoiceId,
      pdc_number: `PDC-${Date.now().toString().slice(-4)}`,
      bank_name: 'Emirates NBD',
      cheque_date: '2026-10-15',
      amount: 5500,
      status: 'Received',
      drawer_name: clientName,
    }),
  });
  assert.strictEqual(pdcRes.status, 201);
  const pdcJson = await pdcRes.json();
  const pdcId = pdcJson.pdc.id;
  console.log(`   ✓ PDC recorded with ID: ${pdcId}`);

  // 8. Create a Related Operational Task Linked to this Invoice
  console.log('8. Creating an Operational Task linked to this Invoice...');
  const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      task_name: `Collect payment: ${invNum}`,
      description: `Follow up with ${clientName} for invoice ${invNum}`,
      assigned_to: currentUserId,
      priority: 'Urgent',
      status: 'Not Started',
      due_date: '2026-09-30',
      department: 'Finance',
      invoice_id: invoiceId,
    }),
  });
  assert.ok(taskRes.status === 200 || taskRes.status === 201);
  const taskJson = await taskRes.json();
  const taskId = taskJson.task.id;
  assert.strictEqual(taskJson.task.invoice_id, invoiceId, 'Task not linked to invoice');
  console.log(`   ✓ Linked task created with ID: ${taskId}, linked to invoice ${invoiceId}`);

  // 9. Verify Bidirectional Linkage in Invoice Detail
  console.log('9. Verifying Bidirectional Link in Invoice Detail...');
  const updatedInvRes = await fetch(`${BASE_URL}/api/finance/invoices/${invoiceId}`, { headers });
  const updatedInv = await updatedInvRes.json();
  assert.strictEqual(updatedInv.payments.length, 1, 'Payments count should be 1');
  assert.strictEqual(updatedInv.pdcs.length, 1, 'PDCs count should be 1');
  assert.strictEqual(updatedInv.tasks.length, 1, 'Linked tasks count should be 1');
  assert.strictEqual(updatedInv.tasks[0].id, taskId, 'Linked task ID mismatch');
  console.log('   ✓ Bidirectional invoice <-> task and invoice <-> payments/pdcs verified');

  // 10. Record Full Balance Payment
  console.log('10. Recording Final Balance Payment of 5500...');
  const payRes2 = await fetch(`${BASE_URL}/api/finance/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      invoice_id: invoiceId,
      amount: 5500,
      payment_date: '2026-09-22',
      payment_method: 'PDC Clearance',
      payment_reference: 'PDC-CLEARED',
    }),
  });
  assert.strictEqual(payRes2.status, 201);
  const payJson2 = await payRes2.json();
  assert.strictEqual(payJson2.newPaidAmount, 10500);
  assert.strictEqual(payJson2.newOutstandingAmount, 0);
  assert.strictEqual(payJson2.newStatus, 'Paid');
  console.log(`   ✓ Final payment recorded. Invoice status successfully updated to Paid!`);

  // 11. Verify Client Financial Profile
  console.log('11. Verifying Client Financial Profile API...');
  const clientProfileRes = await fetch(`${BASE_URL}/api/finance/clients/${clientId}`, { headers });
  assert.strictEqual(clientProfileRes.status, 200);
  const clientProfile = await clientProfileRes.json();
  assert.strictEqual(clientProfile.financialSummary.totalInvoiced, 10500);
  assert.strictEqual(clientProfile.financialSummary.totalPaid, 10500);
  assert.strictEqual(clientProfile.financialSummary.totalOutstanding, 0);
  console.log('   ✓ Client profile balances accurately reconciled (Invoiced: 10500, Paid: 10500, Outstanding: 0)');

  // 12. Test Global Finance Search
  console.log('12. Testing Global Finance Search API...');
  const searchRes = await fetch(`${BASE_URL}/api/finance/search?q=${encodeURIComponent(invNum)}`, { headers });
  assert.strictEqual(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.ok(searchData.invoices.some(i => i.id === invoiceId), 'Invoice search match failed');
  console.log('   ✓ Global Finance Search successfully returned matching invoice');

  // 13. Regression Check: Existing Task Tracker, Chat, and Presence
  console.log('13. Performing Core App Regression Tests...');
  const tasksRes = await fetch(`${BASE_URL}/api/tasks`, { headers });
  assert.strictEqual(tasksRes.status, 200);
  const chatRes = await fetch(`${BASE_URL}/api/chat/conversations`, { headers });
  assert.strictEqual(chatRes.status, 200);
  const presenceRes = await fetch(`${BASE_URL}/api/presence`, { headers });
  assert.strictEqual(presenceRes.status, 200);
  console.log('   ✓ Existing Tasks, Chat, and Presence endpoints responding normally with 200 OK');

  console.log('\n======================================================');
  console.log('🎉 ALL FINANCE AND REGRESSION TESTS PASSED CLEANLY! 🎉');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
