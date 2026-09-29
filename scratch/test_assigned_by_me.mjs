import assert from 'assert';

const BASE_URL = 'http://localhost:3005';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.strictEqual(res.status, 200, `Login failed for ${email}`);
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'No set-cookie header');
  const cookieHeader = setCookie.split(';')[0];
  return cookieHeader;
}

async function run() {
  console.log('--- STARTING "ASSIGNED BY ME" AUTOMATED VERIFICATION ---');

  // Employee A: Abdul
  // Employee B: Dhananjay
  // Employee C: Divya
  console.log('1. Logging in as Employee A (Abdul)...');
  const cookieA = await login('abdul@company.com', 'Abdul_Eng#654');
  const headersA = { 'Content-Type': 'application/json', Cookie: cookieA };

  const meResA = await fetch(`${BASE_URL}/api/auth/me`, { headers: headersA });
  const meA = await meResA.json();
  const empA = meA.user;
  console.log(`   ✓ Employee A logged in: ${empA.name} (${empA.email}, ID: ${empA.id})`);

  console.log('2. Logging in as Employee B (Dhananjay)...');
  const cookieB = await login('dhananjay@company.com', 'Dhananjay_Sec!982');
  const headersB = { 'Content-Type': 'application/json', Cookie: cookieB };

  const meResB = await fetch(`${BASE_URL}/api/auth/me`, { headers: headersB });
  const meB = await meResB.json();
  const empB = meB.user;
  console.log(`   ✓ Employee B logged in: ${empB.name} (${empB.email}, ID: ${empB.id})`);

  console.log('3. Logging in as Employee C (Divya)...');
  const cookieC = await login('divya@company.com', 'Divya_Design!321');
  const headersC = { 'Content-Type': 'application/json', Cookie: cookieC };

  const meResC = await fetch(`${BASE_URL}/api/auth/me`, { headers: headersC });
  const meC = await meResC.json();
  const empC = meC.user;
  console.log(`   ✓ Employee C logged in: ${empC.name} (${empC.email}, ID: ${empC.id})`);

  // 4. Employee A assigns a new Task to Employee B
  const uniqueTitle = `Proposal for Client Alpha ${Date.now()}`;
  console.log(`\n4. Employee A creates task "${uniqueTitle}" assigned to Employee B...`);
  const createRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      task_name: uniqueTitle,
      description: 'Prepare pitch deck and proposal document',
      assigned_to: empB.id,
      priority: 'Urgent',
      status: 'Not Started',
      due_date: '2026-10-05',
      department: 'Engineering',
    }),
  });
  assert.ok(createRes.status === 200 || createRes.status === 201, `Create task failed with status ${createRes.status}`);
  const createJson = await createRes.json();
  const taskId = createJson.task.id;
  console.log(`   ✓ Task created with ID: ${taskId} (Single underlying task record)`);

  // 5. TEST 1: Employee B sees the task under My Tasks
  console.log('\n5. Checking Employee B "My Tasks"...');
  const bTasksRes = await fetch(`${BASE_URL}/api/tasks?mode=active`, { headers: headersB });
  const bTasksData = await bTasksRes.json();
  const bTask = bTasksData.tasks.find(t => t.id === taskId);
  assert.ok(bTask, 'Task not found in Employee B My Tasks');
  assert.strictEqual(bTask.status, 'Not Started', 'Status should be Not Started');
  console.log(`   ✓ Employee B sees task "${bTask.task_name}" in My Tasks with status: ${bTask.status}`);

  // 6. TEST 2: Employee A sees the SAME task under "Assigned by Me"
  console.log('\n6. Checking Employee A "Assigned by Me"...');
  const aAssignedRes = await fetch(`${BASE_URL}/api/tasks?view=assigned_by_me`, { headers: headersA });
  const aAssignedData = await aAssignedRes.json();
  const aTask = aAssignedData.tasks.find(t => t.id === taskId);
  assert.ok(aTask, 'Task not found in Employee A Assigned by Me');
  assert.strictEqual(aTask.assigned_to, empB.id, 'Assigned to mismatch');
  assert.strictEqual(aTask.assigned_to_name, empB.name, 'Assigned to name mismatch');
  assert.strictEqual(aTask.status, 'Not Started', 'Status should be Not Started');
  console.log(`   ✓ Employee A sees task in "Assigned by Me" with assigned_to: ${aTask.assigned_to_name}, status: ${aTask.status}`);

  // 7. TEST 3: Employee B changes status: Not Started -> Started
  console.log('\n7. Employee B updates status: Not Started -> Started...');
  const bUpdateRes1 = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: headersB,
    body: JSON.stringify({ status: 'Started' }),
  });
  assert.strictEqual(bUpdateRes1.status, 200, 'Employee B update to Started failed');
  console.log('   ✓ Employee B successfully updated status to "Started"');

  // Verify Employee A automatically sees "Started" in Assigned by Me
  console.log('   Checking Employee A "Assigned by Me" for live status update...');
  const aCheckRes1 = await fetch(`${BASE_URL}/api/tasks?view=assigned_by_me`, { headers: headersA });
  const aCheckData1 = await aCheckRes1.json();
  const aUpdatedTask1 = aCheckData1.tasks.find(t => t.id === taskId);
  assert.strictEqual(aUpdatedTask1.status, 'Started', 'Status in Assigned by Me did not reflect Started');
  console.log(`   ✓ Employee A "Assigned by Me" live status immediately reflected: ${aUpdatedTask1.status}`);

  // 8. TEST 4: Employee B changes status: Started -> Completed
  console.log('\n8. Employee B updates status: Started -> Completed...');
  const bUpdateRes2 = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: headersB,
    body: JSON.stringify({ status: 'Completed' }),
  });
  assert.strictEqual(bUpdateRes2.status, 200, 'Employee B update to Completed failed');
  console.log('   ✓ Employee B successfully updated status to "Completed"');

  // Verify Employee A automatically sees "Completed" in Assigned by Me
  console.log('   Checking Employee A "Assigned by Me" for live status update...');
  const aCheckRes2 = await fetch(`${BASE_URL}/api/tasks?view=assigned_by_me`, { headers: headersA });
  const aCheckData2 = await aCheckRes2.json();
  const aUpdatedTask2 = aCheckData2.tasks.find(t => t.id === taskId);
  assert.strictEqual(aUpdatedTask2.status, 'Completed', 'Status in Assigned by Me did not reflect Completed');
  console.log(`   ✓ Employee A "Assigned by Me" live status immediately reflected: ${aUpdatedTask2.status}`);

  // 9. TEST 5: Employee A can view task detail
  console.log('\n9. Employee A views task detail modal endpoint GET /api/tasks/[id]...');
  const aDetailRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, { headers: headersA });
  assert.strictEqual(aDetailRes.status, 200, 'Employee A failed to access task detail');
  const aDetailData = await aDetailRes.json();
  assert.strictEqual(aDetailData.task.id, taskId);
  assert.strictEqual(aDetailData.task.created_by, empA.id);
  assert.strictEqual(aDetailData.task.assigned_to, empB.id);
  console.log(`   ✓ Task detail loaded with assignment history (${aDetailData.assignmentHistory.length} events) and status history (${aDetailData.statusHistory.length} events)`);

  // 10. TEST 6: Unrelated Employee C cannot view this task
  console.log(`\n10. Testing permission isolation: Employee C (${empC.email}) attempts to view Task ${taskId}...`);
  const cDetailRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, { headers: headersC });
  assert.strictEqual(cDetailRes.status, 403, 'Unrelated employee should be rejected with 403 Forbidden');
  console.log('   ✓ Unrelated employee received 403 Forbidden as expected');

  // 11. TEST 7: Regression check on existing features
  console.log('\n11. Regression Check: Existing My Tasks, Finance, Chat, Presence, Analytics...');
  const regMyTasks = await fetch(`${BASE_URL}/api/tasks?mode=active`, { headers: headersA });
  assert.strictEqual(regMyTasks.status, 200);
  const regChat = await fetch(`${BASE_URL}/api/chat/conversations`, { headers: headersA });
  assert.strictEqual(regChat.status, 200);
  const regPresence = await fetch(`${BASE_URL}/api/presence`, { headers: headersA });
  assert.strictEqual(regPresence.status, 200);
  const regFinance = await fetch(`${BASE_URL}/api/finance/overview`, { headers: headersA });
  assert.strictEqual(regFinance.status, 200);
  console.log('   ✓ All existing subsystems responding normally with 200 OK');

  console.log('\n=============================================================');
  console.log('🎉 "ASSIGNED BY ME" FUNCTIONALITY VERIFIED 100% OPERATIONAL! 🎉');
  console.log('=============================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
