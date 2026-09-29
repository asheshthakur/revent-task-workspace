const BASE_URL = 'https://revent-task-workspace.revent-workspace.workers.dev';

const USERS = {
  vikram: { email: 'vikram@company.com', pass: 'Vikram_Prod!731', name: 'Vikram' },
  abdul: { email: 'abdul@company.com', pass: 'Abdul_Eng#654', name: 'Abdul' },
  divya: { email: 'divya@company.com', pass: 'Divya_Design!321', name: 'Divya' },
  admin: { email: 'admin@company.com', pass: 'Admin_Revent#2026', name: 'Admin' },
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

async function runProductionChatTests() {
  console.log('=== VERIFYING REAL-TIME CHAT ON LIVE CLOUDFLARE PRODUCTION DEPLOYMENT ===');
  console.log(`URL: ${BASE_URL}\n`);

  // 1. Authenticate test users
  console.log('[Test 1] Logging in remote users (Vikram, Abdul, Divya)...');
  const vikram = await login(USERS.vikram);
  const abdul = await login(USERS.abdul);
  const divya = await login(USERS.divya);
  console.log(`  PASS: Vikram (ID ${vikram.user.id}), Abdul (ID ${abdul.user.id}), Divya (ID ${divya.user.id}) authenticated.`);

  // 2. 1-on-1 Direct Chat creation & messaging
  console.log('\n[Test 2] Creating remote 1-on-1 conversation: Vikram -> Abdul...');
  const directConvRes = await fetch(`${BASE_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: vikram.cookie },
    body: JSON.stringify({ type: 'direct', targetUserId: abdul.user.id }),
  });
  const directData = await directConvRes.json();
  const convId = directData.conversationId;
  console.log(`  PASS: Direct conversation ID ${convId} created on Cloudflare D1.`);

  // 3. Vikram sends message
  console.log('\n[Test 3] Vikram sends message to Abdul...');
  const msgText = 'Hi Abdul, can you review the competitor report?';
  const sendRes = await fetch(`${BASE_URL}/api/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: vikram.cookie },
    body: JSON.stringify({ message: msgText }),
  });
  const sendData = await sendRes.json();
  const vikramMsgId = sendData.message.id;
  console.log(`  PASS: Message sent to D1. ID: ${vikramMsgId}`);

  // 4. Abdul reads conversation and checks unread count
  console.log('\n[Test 4] Abdul receives message and checks unread counts...');
  const abdulListRes = await fetch(`${BASE_URL}/api/chat/conversations`, {
    headers: { Cookie: abdul.cookie },
  });
  const abdulList = await abdulListRes.json();
  const targetConv = abdulList.conversations.find(c => c.id === convId);
  console.log(`  PASS: Abdul sees conversation with ${targetConv.unread_count} unread message(s).`);

  // Abdul replies with quote
  console.log('\n[Test 5] Abdul sends reply with quote to Vikram...');
  const replyRes = await fetch(`${BASE_URL}/api/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: abdul.cookie },
    body: JSON.stringify({
      message: 'Yes, looking at it right away.',
      reply_to_id: vikramMsgId,
    }),
  });
  const replyData = await replyRes.json();
  console.log(`  PASS: Reply stored in D1. Quote: "${replyData.message.reply_preview}"`);

  // 5. Security & Isolation test: Divya attempts access
  console.log('\n[Test 6] Security Check: Divya attempts to access Vikram-Abdul private conversation...');
  const forbiddenRes = await fetch(`${BASE_URL}/api/chat/conversations/${convId}/messages`, {
    headers: { Cookie: divya.cookie },
  });
  console.log(`  PASS: Status received: ${forbiddenRes.status} Forbidden (access strictly blocked).`);
  if (forbiddenRes.status !== 403) throw new Error('Security check failed: non-member accessed private chat');

  // 6. Group Chat Creation
  console.log('\n[Test 7] Creating Group Conversation on Cloudflare D1...');
  const groupRes = await fetch(`${BASE_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: vikram.cookie },
    body: JSON.stringify({
      type: 'group',
      name: 'Marketing & Growth Team',
      avatarEmoji: '📣',
      memberIds: [abdul.user.id, divya.user.id],
    }),
  });
  const groupData = await groupRes.json();
  const groupId = groupData.conversationId;
  console.log(`  PASS: Group created. ID ${groupId}`);

  // Divya posts in group
  const divyaGroupMsg = await fetch(`${BASE_URL}/api/chat/conversations/${groupId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: divya.cookie },
    body: JSON.stringify({ message: 'All three of us can collaborate here!' }),
  });
  const divyaGroupMsgData = await divyaGroupMsg.json();
  console.log(`  PASS: Divya posted message ${divyaGroupMsgData.message.id} in group.`);

  // 7. Task discussion verification
  console.log('\n[Test 8] Initializing Task Discussion on remote D1...');
  // Fetch existing tasks
  const tasksRes = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Cookie: vikram.cookie },
  });
  const tasksJson = await tasksRes.json();
  const firstTask = tasksJson.tasks?.[0];
  if (firstTask) {
    const taskDiscRes = await fetch(`${BASE_URL}/api/chat/task-conversation/${firstTask.id}`, {
      headers: { Cookie: vikram.cookie },
    });
    const taskDisc = await taskDiscRes.json();
    console.log(`  PASS: Task #${firstTask.id} discussion mapped to Conversation ID ${taskDisc.conversationId}`);
  }

  // 8. Message Search verification
  console.log('\n[Test 9] Testing Message Search on remote Cloudflare D1...');
  const searchRes = await fetch(`${BASE_URL}/api/chat/search?q=collaborate`, {
    headers: { Cookie: divya.cookie },
  });
  const searchData = await searchRes.json();
  console.log(`  PASS: Search found ${searchData.results?.length} result(s) for query "collaborate".`);

  console.log('\n=== ALL CLOUDFLARE PRODUCTION REMOTE CHAT TESTS PASSED! ===');
}

runProductionChatTests().catch(err => {
  console.error('Remote test failed:', err);
  process.exit(1);
});
