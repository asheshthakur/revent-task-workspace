const BASE_URL = 'http://localhost:3005';

// Credentials from production seed
const USERS = {
  admin: { email: 'admin@company.com', pass: 'Admin_Revent#2026', name: 'Admin' },
  dhananjay: { email: 'dhananjay@company.com', pass: 'Dhananjay_Sec!982', name: 'Dhananjay' },
  baldeep: { email: 'baldeep@company.com', pass: 'Baldeep_Ops#415', name: 'Baldeep' },
  vikram: { email: 'vikram@company.com', pass: 'Vikram_Prod!731', name: 'Vikram' },
  abdul: { email: 'abdul@company.com', pass: 'Abdul_Eng#654', name: 'Abdul' },
  divya: { email: 'divya@company.com', pass: 'Divya_Design!321', name: 'Divya' },
  shubham: { email: 'shubham@company.com', pass: 'Shubham_Grow#849', name: 'Shubham' },
  ashesh: { email: 'ashesh@company.com', pass: 'Ashesh_Arch!592', name: 'Ashesh' },
  prerna: { email: 'prerna@company.com', pass: 'Prerna_QA#183', name: 'Prerna' },
  sahil: { email: 'sahil@company.com', pass: 'Sahil_Back!927', name: 'Sahil' },
  mansi: { email: 'mansi@company.com', pass: 'Mansi_Content#468', name: 'Mansi' },
};

async function login(user) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.pass }),
  });
  const cookie = res.headers.get('set-cookie');
  const data = await res.json();
  if (res.status !== 200) throw new Error(`Login failed for ${user.email}: ${JSON.stringify(data)}`);
  return { cookie, user: data.user };
}

async function runAcceptanceTests() {
  console.log('=== RUNNING REVENT TASK WORKSPACE INTERNAL CHAT ACCEPTANCE TESTS ===\n');

  // 1. Log in users: Vikram and Abdul
  console.log('[Step 1] Logging in Vikram and Abdul...');
  const vikramSession = await login(USERS.vikram);
  const abdulSession = await login(USERS.abdul);
  const divyaSession = await login(USERS.divya);
  console.log(`  Vikram ID: ${vikramSession.user.id}, Abdul ID: ${abdulSession.user.id}, Divya ID: ${divyaSession.user.id}`);

  // 2. Vikram starts a 1-on-1 private conversation with Abdul
  console.log('\n[Step 2] Vikram creates a private 1-on-1 conversation with Abdul...');
  const createConvRes = await fetch(`${BASE_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: vikramSession.cookie },
    body: JSON.stringify({ type: 'direct', targetUserId: abdulSession.user.id }),
  });
  const createConvData = await createConvRes.json();
  const convId = createConvData.conversationId;
  console.log(`  Conversation ID created/retrieved: ${convId}`);

  // 3. Vikram sends message to Abdul
  console.log('\n[Step 3] Vikram sends a message: "Hi Abdul, can you review the sprint backlog?"');
  const sendRes = await fetch(`${BASE_URL}/api/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: vikramSession.cookie },
    body: JSON.stringify({ message: 'Hi Abdul, can you review the sprint backlog?' }),
  });
  const sendData = await sendRes.json();
  const vikramMsgId = sendData.message.id;
  console.log(`  Message sent successfully. ID: ${vikramMsgId}`);

  // 4. Abdul reads conversation and checks unread count
  console.log('\n[Step 4] Checking unread message count from Abdul perspective...');
  const abdulConvRes = await fetch(`${BASE_URL}/api/chat/conversations`, {
    headers: { Cookie: abdulSession.cookie },
  });
  const abdulConvs = await abdulConvRes.json();
  const abdulTargetConv = abdulConvs.conversations.find(c => c.id === convId);
  console.log(`  Abdul sees unread count: ${abdulTargetConv?.unread_count} (Expected: 1)`);
  if (abdulTargetConv?.unread_count !== 1) {
    throw new Error('Unread count mismatch for recipient');
  }

  // 5. Abdul replies with quote to Vikram
  console.log('\n[Step 5] Abdul replies to Vikram message...');
  const replyRes = await fetch(`${BASE_URL}/api/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: abdulSession.cookie },
    body: JSON.stringify({
      message: 'Yes, reviewing it now. Looks on track.',
      reply_to_id: vikramMsgId,
    }),
  });
  const replyData = await replyRes.json();
  console.log(`  Reply sent. Reply preview: "${replyData.message.reply_preview}"`);

  // 6. Security Check: Divya attempts to access Vikram-Abdul conversation (Must be 403 Forbidden)
  console.log('\n[Step 6] Security Check: Divya (unauthorized third-party) attempts to fetch messages...');
  const unauthorizedRes = await fetch(`${BASE_URL}/api/chat/conversations/${convId}/messages`, {
    headers: { Cookie: divyaSession.cookie },
  });
  console.log(`  Status received for unauthorized access: ${unauthorizedRes.status} (Expected: 403)`);
  if (unauthorizedRes.status !== 403) {
    throw new Error(`Security breach! Expected 403 Forbidden, got ${unauthorizedRes.status}`);
  }

  // 7. Group Chat Creation: "Product & Outreach Team"
  console.log('\n[Step 7] Creating a group conversation with Vikram, Abdul, and Divya...');
  const groupRes = await fetch(`${BASE_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: vikramSession.cookie },
    body: JSON.stringify({
      type: 'group',
      name: 'Product & Outreach Team',
      avatarEmoji: '🚀',
      memberIds: [abdulSession.user.id, divyaSession.user.id],
    }),
  });
  const groupData = await groupRes.json();
  const groupId = groupData.conversationId;
  console.log(`  Group created. ID: ${groupId}`);

  // Divya now sends a message in the group
  const groupMsgRes = await fetch(`${BASE_URL}/api/chat/conversations/${groupId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: divyaSession.cookie },
    body: JSON.stringify({ message: 'Hello team! Excited to work together.' }),
  });
  const groupMsgData = await groupMsgRes.json();
  console.log(`  Divya posted in group. Message ID: ${groupMsgData.message.id}`);

  // 8. Task-Specific Discussion Integration
  console.log('\n[Step 8] Testing Task-Specific Discussion Integration...');
  // Find or create a task assigned to Abdul
  const tasksRes = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Cookie: vikramSession.cookie },
  });
  const tasksData = await tasksRes.json();
  let testTask = tasksData.tasks?.[0];

  if (!testTask) {
    console.log('  No existing task found, creating a new test task...');
    const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vikramSession.cookie },
      body: JSON.stringify({
        task_name: 'Prepare Competitor Market Analysis',
        assigned_to: abdulSession.user.id,
        priority: 'Urgent',
        due_date: '2026-09-30',
        drive_link: 'https://drive.google.com/test-doc',
      }),
    });
    const taskJson = await createTaskRes.json();
    testTask = taskJson.task;
  }

  console.log(`  Testing discussion on Task ID: ${testTask.id} ("${testTask.task_name}")`);
  const taskDiscussionRes = await fetch(`${BASE_URL}/api/chat/task-conversation/${testTask.id}`, {
    headers: { Cookie: abdulSession.cookie },
  });
  const taskDiscussionData = await taskDiscussionRes.json();
  const taskConvId = taskDiscussionData.conversationId;
  console.log(`  Task discussion initialized. Conversation ID: ${taskConvId}`);

  // Post message in task discussion
  const taskPostRes = await fetch(`${BASE_URL}/api/chat/conversations/${taskConvId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: abdulSession.cookie },
    body: JSON.stringify({ message: 'I have started drafting the competitor matrix.' }),
  });
  const taskPostData = await taskPostRes.json();
  console.log(`  Task discussion message posted. Message: "${taskPostData.message.message}"`);

  // 9. Message Search
  console.log('\n[Step 9] Testing Message Search API...');
  const searchRes = await fetch(`${BASE_URL}/api/chat/search?q=competitor`, {
    headers: { Cookie: abdulSession.cookie },
  });
  const searchData = await searchRes.json();
  console.log(`  Search query "competitor" found ${searchData.results.length} result(s).`);
  if (searchData.results.length === 0) {
    throw new Error('Search failed to find recently posted task message');
  }

  // 10. Message Edit & Soft Delete
  console.log('\n[Step 10] Testing Message Edit and Soft Delete...');
  const editRes = await fetch(`${BASE_URL}/api/chat/messages/${vikramMsgId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: vikramSession.cookie },
    body: JSON.stringify({ message: 'Hi Abdul, can you review the sprint backlog? (urgent)' }),
  });
  const editData = await editRes.json();
  console.log(`  Message edit result: ${editData.success} ("${editData.message}")`);

  const deleteRes = await fetch(`${BASE_URL}/api/chat/messages/${vikramMsgId}`, {
    method: 'DELETE',
    headers: { Cookie: vikramSession.cookie },
  });
  const deleteData = await deleteRes.json();
  console.log(`  Message soft-delete result: ${deleteData.success}`);

  console.log('\n=== ALL CHAT ACCEPTANCE TESTS PASSED SUCCESSFULLY! ===');
}

runAcceptanceTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
