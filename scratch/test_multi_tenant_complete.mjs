// Comprehensive multi-tenant simulation test
const BASE_URL = 'http://localhost:3005';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }
  return {
    status: res.status,
    headers: res.headers,
    cookies: res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean),
    data: json,
  };
}

function extractCookie(cookieHeaders, name) {
  for (const c of cookieHeaders) {
    const parts = c.split(';');
    for (const part of parts) {
      const [k, v] = part.trim().split('=');
      if (k === name) return v;
    }
  }
  return null;
}

function buildCookieHeader(cookiesObj) {
  return Object.entries(cookiesObj)
    .filter(([_, v]) => v != null)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function run() {
  console.log('🚀 STARTING MULTI-TENANT COMPLETE VERIFICATION SUITE\n');

  // 1. Existing Revent Admin Login
  console.log('--- TEST 1: Existing Revent Admin Login ---');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@company.com', password: 'Admin_Revent#2026' }),
  });
  if (adminLogin.status !== 200 || !adminLogin.data.user) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
  }
  const adminToken = extractCookie(adminLogin.cookies, 'revent_auth_token');
  const adminActiveOrg = extractCookie(adminLogin.cookies, 'veya_active_org_id');
  console.log(`✅ Admin logged in. Active Org Cookie: ${adminActiveOrg}, User: ${adminLogin.data.user.name}`);

  const reventHeaders = {
    Cookie: buildCookieHeader({
      revent_auth_token: adminToken,
      veya_active_org_id: adminActiveOrg,
    }),
  };

  const reventTasks = await request('/api/tasks', { headers: reventHeaders });
  console.log(`✅ Revent tasks retrieved: ${reventTasks.data.tasks?.length} tasks. (All belong to Revent tenant id 1)`);
  if (!reventTasks.data.tasks || reventTasks.data.tasks.length === 0) {
    throw new Error('Revent tasks missing!');
  }
  const sampleReventTaskId = reventTasks.data.tasks[0].id;

  // 2. Onboard Tenant 1: "Acme Digital" (Owner: Rahul Sharma)
  console.log('\n--- TEST 2: Onboard Tenant 1: Acme Digital ---');
  const acmeOnboard = await request('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify({
      organisationName: 'Acme Digital',
      workspaceSlug: 'acme-digital-' + Date.now(),
      fullName: 'Rahul Sharma',
      email: 'rahul.acme@example.com',
      password: 'password123',
    }),
  });
  if (acmeOnboard.status !== 200 || !acmeOnboard.data.organisation) {
    throw new Error(`Acme onboarding failed: ${JSON.stringify(acmeOnboard.data)}`);
  }
  const acmeOrgId = acmeOnboard.data.organisation.id;
  const rahulToken = extractCookie(acmeOnboard.cookies, 'revent_auth_token');
  const rahulCookieOrg = extractCookie(acmeOnboard.cookies, 'veya_active_org_id');
  console.log(`✅ Acme Digital created (Org ID: ${acmeOrgId}). Rahul logged in. Cookie Org: ${rahulCookieOrg}`);

  const rahulHeaders = {
    Cookie: buildCookieHeader({
      revent_auth_token: rahulToken,
      veya_active_org_id: acmeOrgId.toString(),
    }),
  };

  // Rahul creates a task in Acme
  const acmeTaskRes = await request('/api/tasks', {
    method: 'POST',
    headers: rahulHeaders,
    body: JSON.stringify({
      task_name: 'Acme Secret Roadmap 2027',
      assigned_to: acmeOnboard.data.user.id,
      priority: 'Urgent',
      department: 'Product',
      due_date: '2027-01-01',
    }),
  });
  if (acmeTaskRes.status !== 200 && acmeTaskRes.status !== 201) {
    throw new Error(`Acme task creation failed: ${JSON.stringify(acmeTaskRes.data)}`);
  }
  const acmeTaskId = acmeTaskRes.data.task.id;
  console.log(`✅ Rahul created task in Acme: ID ${acmeTaskId} - "${acmeTaskRes.data.task.task_name}"`);

  // Verify Rahul sees ONLY Acme tasks (0 Revent tasks)
  const rahulTasks = await request('/api/tasks', { headers: rahulHeaders });
  console.log(`✅ Rahul's visible task count in Acme: ${rahulTasks.data.tasks.length}`);
  if (rahulTasks.data.tasks.some(t => t.id === sampleReventTaskId)) {
    throw new Error('LEAK: Rahul can see Revent task!');
  }

  // 3. Onboard Tenant 2: "Beta Consulting" (Owner: Amit Patel)
  console.log('\n--- TEST 3: Onboard Tenant 2: Beta Consulting ---');
  const betaOnboard = await request('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify({
      organisationName: 'Beta Consulting',
      workspaceSlug: 'beta-consulting-' + Date.now(),
      fullName: 'Amit Patel',
      email: 'amit.beta@example.com',
      password: 'password123',
    }),
  });
  if (betaOnboard.status !== 200 || !betaOnboard.data.organisation) {
    throw new Error(`Beta onboarding failed: ${JSON.stringify(betaOnboard.data)}`);
  }
  const betaOrgId = betaOnboard.data.organisation.id;
  const amitToken = extractCookie(betaOnboard.cookies, 'revent_auth_token');
  console.log(`✅ Beta Consulting created (Org ID: ${betaOrgId}). Amit logged in.`);

  const amitHeaders = {
    Cookie: buildCookieHeader({
      revent_auth_token: amitToken,
      veya_active_org_id: betaOrgId.toString(),
    }),
  };

  // Amit creates a task in Beta
  const betaTaskRes = await request('/api/tasks', {
    method: 'POST',
    headers: amitHeaders,
    body: JSON.stringify({
      task_name: 'Beta Confidential Client Audit',
      assigned_to: betaOnboard.data.user.id,
      priority: 'Urgent',
      department: 'Finance',
      due_date: '2026-12-31',
    }),
  });
  const betaTaskId = betaTaskRes.data.task.id;
  console.log(`✅ Amit created task in Beta: ID ${betaTaskId} - "${betaTaskRes.data.task.task_name}"`);

  // 4. CROSS-TENANT ATTACK TESTS
  console.log('\n--- TEST 4: Cross-Tenant Attack / Data Isolation Verification ---');
  // Attempt 1: Amit tries to GET Rahul's task in Acme
  const hackTaskGet = await request(`/api/tasks/${acmeTaskId}`, { headers: amitHeaders });
  console.log(`🔒 Amit GET Acme task ${acmeTaskId} -> Status: ${hackTaskGet.status} (${hackTaskGet.data.error})`);
  if (hackTaskGet.status !== 403) {
    throw new Error(`SECURITY VULNERABILITY: Amit accessed Acme task! Status: ${hackTaskGet.status}`);
  }

  // Attempt 2: Amit tries to PATCH/DELETE Rahul's task in Acme
  const hackTaskPatch = await request(`/api/tasks/${acmeTaskId}`, {
    method: 'PATCH',
    headers: amitHeaders,
    body: JSON.stringify({ title: 'HACKED BY AMIT' }),
  });
  console.log(`🔒 Amit PATCH Acme task ${acmeTaskId} -> Status: ${hackTaskPatch.status} (${hackTaskPatch.data.error})`);
  if (hackTaskPatch.status !== 403) {
    throw new Error(`SECURITY VULNERABILITY: Amit modified Acme task! Status: ${hackTaskPatch.status}`);
  }

  // Attempt 3: Rahul tries to GET Revent task
  const hackReventTaskGet = await request(`/api/tasks/${sampleReventTaskId}`, { headers: rahulHeaders });
  console.log(`🔒 Rahul GET Revent task ${sampleReventTaskId} -> Status: ${hackReventTaskGet.status} (${hackReventTaskGet.data.error})`);
  if (hackReventTaskGet.status !== 403) {
    throw new Error(`SECURITY VULNERABILITY: Rahul accessed Revent task! Status: ${hackReventTaskGet.status}`);
  }

  // Attempt 4: Employee directory isolation
  const rahulTeam = await request('/api/employees', { headers: rahulHeaders });
  console.log(`🔒 Rahul's team list in Acme contains ${rahulTeam.data.employees.length} member(s). Names: ${rahulTeam.data.employees.map(e => e.name).join(', ')}`);
  if (rahulTeam.data.employees.some(e => e.email === 'admin@company.com' || e.email === 'amit.beta@example.com')) {
    throw new Error('SECURITY VULNERABILITY: Cross-tenant employees leaked!');
  }

  // 5. INVITATION & USER MEMBERSHIP SYSTEM
  console.log('\n--- TEST 5: Invitation & Multi-Organization Membership Flow ---');
  // Rahul invites Priya to Acme Digital
  const inviteRes = await request('/api/invitations', {
    method: 'POST',
    headers: rahulHeaders,
    body: JSON.stringify({ email: 'priya.dev@example.com', role: 'member' }),
  });
  if ((inviteRes.status !== 200 && inviteRes.status !== 201) || !inviteRes.data.invitation) {
    throw new Error(`Failed to generate invite: ${JSON.stringify(inviteRes.data)}`);
  }
  const token = inviteRes.data.invitation.token;
  console.log(`✅ Rahul invited Priya. Invite Token: ${token.substring(0, 10)}... URL: ${inviteRes.data.inviteUrl}`);

  // Priya inspects invitation token
  const inspectInvite = await request(`/api/invitations/${token}`);
  console.log(`✅ Priya verified token. Valid: ${inspectInvite.data.valid}, Org: ${inspectInvite.data.organisationName}`);
  if (!inspectInvite.data.valid) throw new Error('Token verification failed');

  // Priya accepts invitation
  const acceptInvite = await request(`/api/invitations/${token}`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Priya Patel',
      password: 'password123',
    }),
  });
  if (acceptInvite.status !== 200 || !acceptInvite.data.user) {
    throw new Error(`Priya accept invite failed: ${JSON.stringify(acceptInvite.data)}`);
  }
  const priyaToken = extractCookie(acceptInvite.cookies, 'revent_auth_token');
  console.log(`✅ Priya accepted invitation and joined ${acceptInvite.data.organisation.name}.`);

  const priyaHeaders = {
    Cookie: buildCookieHeader({
      revent_auth_token: priyaToken,
      veya_active_org_id: acmeOrgId.toString(),
    }),
  };

  // Rahul assigns a task to Priya in Acme
  const priyaTaskRes = await request('/api/tasks', {
    method: 'POST',
    headers: rahulHeaders,
    body: JSON.stringify({
      task_name: 'Priya Onboarding Checklist',
      assigned_to: acceptInvite.data.user.id,
      priority: 'Urgent',
      department: 'Engineering',
      due_date: '2026-10-01',
    }),
  });
  const priyaAssignedTaskId = priyaTaskRes.data.task.id;

  // Priya can see her assigned Acme task, but NOT Beta tasks
  const priyaTasks = await request('/api/tasks', { headers: priyaHeaders });
  console.log(`✅ Priya in Acme sees ${priyaTasks.data.tasks.length} task(s). First task: "${priyaTasks.data.tasks[0]?.task_name}"`);
  if (!priyaTasks.data.tasks.some(t => t.id === priyaAssignedTaskId)) {
    throw new Error('Priya cannot see her assigned Acme task!');
  }
  if (priyaTasks.data.tasks.some(t => t.id === betaTaskId)) {
    throw new Error('LEAK: Priya can see Beta task!');
  }

  // 6. MULTI-WORKSPACE USER & WORKSPACE SWITCHER
  console.log('\n--- TEST 6: One User in Multiple Workspaces & Switching ---');
  // Amit invites Rahul (rahul.acme@example.com) to join Beta Consulting as admin
  const inviteRahulRes = await request('/api/invitations', {
    method: 'POST',
    headers: amitHeaders,
    body: JSON.stringify({ email: 'rahul.acme@example.com', role: 'admin' }),
  });
  const rahulBetaToken = inviteRahulRes.data.invitation.token;
  console.log(`✅ Amit invited Rahul to Beta Consulting.`);

  // Rahul accepts invitation to Beta Consulting (Rahul already exists in users)
  const rahulAcceptBeta = await request(`/api/invitations/${rahulBetaToken}`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rahul Sharma',
    }),
  });
  console.log(`✅ Rahul accepted Beta Consulting invite. New Active Org: ${rahulAcceptBeta.data.organisation.name}`);

  // Check Rahul's /api/auth/me to see both workspaces
  const rahulMeRes = await request('/api/auth/me', {
    headers: {
      Cookie: buildCookieHeader({
        revent_auth_token: rahulToken,
        veya_active_org_id: betaOrgId.toString(),
      }),
    },
  });
  console.log(`✅ Rahul memberships: ${rahulMeRes.data.allOrgs.map(o => `${o.name} (${o.role})`).join(', ')}`);
  if (rahulMeRes.data.allOrgs.length < 2) {
    throw new Error('Rahul should have at least 2 organization memberships!');
  }

  // While in Beta Consulting, Rahul sees Beta task
  const rahulInBetaTasks = await request('/api/tasks', {
    headers: {
      Cookie: buildCookieHeader({
        revent_auth_token: rahulToken,
        veya_active_org_id: betaOrgId.toString(),
      }),
    },
  });
  console.log(`✅ Rahul active in Beta Consulting sees: "${rahulInBetaTasks.data.tasks[0]?.task_name}"`);
  if (!rahulInBetaTasks.data.tasks.some(t => t.id === betaTaskId)) {
    throw new Error('Rahul in Beta cannot see Beta task!');
  }

  // Rahul switches active workspace back to Acme Digital via /api/workspaces/switch
  const switchBackRes = await request('/api/workspaces/switch', {
    method: 'POST',
    headers: {
      Cookie: buildCookieHeader({
        revent_auth_token: rahulToken,
        veya_active_org_id: betaOrgId.toString(),
      }),
    },
    body: JSON.stringify({ organisationId: acmeOrgId }),
  });
  const switchedCookieOrg = extractCookie(switchBackRes.cookies, 'veya_active_org_id');
  console.log(`✅ Rahul switched workspace back to Acme. New Cookie Org: ${switchedCookieOrg}`);

  const rahulBackInAcmeTasks = await request('/api/tasks', {
    headers: {
      Cookie: buildCookieHeader({
        revent_auth_token: rahulToken,
        veya_active_org_id: acmeOrgId.toString(),
      }),
    },
  });
  console.log(`✅ Rahul back in Acme sees: "${rahulBackInAcmeTasks.data.tasks[0]?.task_name}"`);
  if (!rahulBackInAcmeTasks.data.tasks.some(t => t.id === acmeTaskId)) {
    throw new Error('Rahul back in Acme cannot see Acme task!');
  }

  // Attempt to switch to an unauthorized organization (e.g. Revent tenant 1)
  const unauthorizedSwitch = await request('/api/workspaces/switch', {
    method: 'POST',
    headers: {
      Cookie: buildCookieHeader({
        revent_auth_token: rahulToken,
        veya_active_org_id: acmeOrgId.toString(),
      }),
    },
    body: JSON.stringify({ organisationId: 1 }), // Revent org ID
  });
  console.log(`🔒 Rahul unauthorized switch to Revent Org 1 -> Status: ${unauthorizedSwitch.status} (${unauthorizedSwitch.data.error})`);
  if (unauthorizedSwitch.status !== 403) {
    throw new Error('SECURITY VULNERABILITY: User was able to switch to unauthorized org!');
  }

  console.log('\n🎉 ALL MULTI-TENANT VERIFICATION TESTS PASSED 100% SUCCESFULLY!\n');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
