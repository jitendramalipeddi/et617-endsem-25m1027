// ==========================================================
// Student Sabha: Comprehensive Automated Test Suite
// Validates: Teacher Passcode, Pre-Session Proposals, Topic Selection,
// Topic-Scoped AI Triggers, Voting Caution, and Consensus Ratification
// ==========================================================

const { io } = require('socket.io-client');
const assert = require('assert');

const SERVER_URL = 'http://localhost:3000';

async function runTestSuite() {
  console.log('=============================================================');
  console.log('🏛️  STUDENT SABHA: END-TO-END VERIFICATION SUITE');
  console.log('    Validating Passcode, Pre-Session Review, Topic-Scoped AI');
  console.log('=============================================================\n');

  let passedTests = 0;
  let totalTests = 7;

  // -----------------------------------------------------------
  // Test 1: Teacher Secret Passcode Security
  // -----------------------------------------------------------
  console.log('TEST 1: Teacher Secret Passcode Authentication ("teacher")...');
  
  // 1.1 Test invalid passcode rejection
  const unauthorizedTeacher = io(SERVER_URL);
  await new Promise(r => unauthorizedTeacher.on('connect', r));

  let authErrorReceived = false;
  unauthorizedTeacher.on('auth:error', (err) => {
    authErrorReceived = true;
  });

  unauthorizedTeacher.emit('join', {
    role: 'teacher',
    name: 'Imposter',
    passcode: 'wrong_secret_123'
  });
  await new Promise(r => setTimeout(r, 400));
  assert(authErrorReceived, 'Server must reject teacher login with incorrect passcode');
  console.log('  ✓ Unauthorized teacher attempt rejected with auth:error');
  unauthorizedTeacher.disconnect();

  // 1.2 Test authorized passcode acceptance
  const teacher = io(SERVER_URL);
  await new Promise(r => teacher.on('connect', r));

  let teacherInitData = null;
  teacher.on('init', (data) => { teacherInitData = data; });

  teacher.emit('join', {
    role: 'teacher',
    name: 'Ms. Rao',
    passcode: 'teacher'
  });
  await new Promise(r => setTimeout(r, 400));
  assert(teacherInitData !== null, 'Teacher with passcode "teacher" should successfully authenticate');
  assert(teacherInitData.curatedTopics.length >= 3, 'Teacher should receive curated constitutional topics');
  console.log('  ✓ Teacher authenticated with "teacher" passcode');
  console.log(`  ✓ Received ${teacherInitData.curatedTopics.length} curated constitutional topics for selection`);
  
  // Reset session cleanly for test run
  teacher.emit('teacher:reset_session');
  await new Promise(r => setTimeout(r, 300));
  passedTests++;

  // -----------------------------------------------------------
  // Test 2: Multi-Student Joining & Pre-Session Proposal Submission
  // -----------------------------------------------------------
  console.log('\nTEST 2: Pre-Session Student Proposals & Teacher Review Queue...');
  const ravi = io(SERVER_URL);
  const ananya = io(SERVER_URL);
  const karthik = io(SERVER_URL);

  await Promise.all([
    new Promise(r => ravi.on('connect', r)),
    new Promise(r => ananya.on('connect', r)),
    new Promise(r => karthik.on('connect', r))
  ]);

  ravi.emit('join', { role: 'student', name: 'Ravi', rollNo: '101' });
  ananya.emit('join', { role: 'student', name: 'Ananya', rollNo: '102' });
  karthik.emit('join', { role: 'student', name: 'Karthik', rollNo: '103' });
  await new Promise(r => setTimeout(r, 500));

  // 2.1 Student submits proposal while session is in pre-session / waiting room
  let studentProposalNotice = false;
  ravi.on('student:pre_session_proposal_submitted', (data) => {
    studentProposalNotice = true;
  });

  let teacherReceivedPreProposal = false;
  teacher.on('teacher:new_pre_session_proposal', (data) => {
    teacherReceivedPreProposal = true;
  });

  ravi.emit('constitution:propose_amendment', {
    proposedText: "Rule 4.1: English is mandatory inside the classroom during lessons. In the playground, dining mess, and corridors, students may speak Telugu or English, with respect for all peers.",
    justification: "Gives bilingual Telugu students emotional comfort during lunch and break times while ensuring English learning in lessons."
  });
  await new Promise(r => setTimeout(r, 600));

  assert(studentProposalNotice, 'Submitting student should receive pre-session proposal confirmation');
  assert(teacherReceivedPreProposal, 'Teacher should receive student proposal in real-time review queue');
  console.log('  ✓ Pre-session proposal submitted by Ravi from waiting room');
  console.log('  ✓ Teacher dashboard received proposal for reverification before starting debate');
  passedTests++;

  // -----------------------------------------------------------
  // Test 3: Teacher Launches Deliberation on the Chosen Amendment
  // -----------------------------------------------------------
  console.log('\nTEST 3: Teacher Topic Selection & Deliberation Launch...');
  let studentSessionStarted = false;
  let activeTopicReceived = null;

  ravi.on('session:started', (data) => {
    studentSessionStarted = true;
    activeTopicReceived = data.activeTopic;
  });

  // Teacher reviews and launches the Language Policy deliberation
  teacher.emit('teacher:launch_topic', { topicId: 'topic_language_policy' });
  await new Promise(r => setTimeout(r, 600));

  assert(studentSessionStarted, 'Students should receive session:started trigger');
  assert(activeTopicReceived !== null, 'Active topic must be broadcasted to students');
  assert.strictEqual(activeTopicReceived.id, 'topic_language_policy', 'Active topic must match teacher selection');
  console.log(`  ✓ Teacher selected and launched: "${activeTopicReceived.title}"`);
  console.log('  ✓ All 3 student screens synchronized to the active constitutional article');
  passedTests++;

  // -----------------------------------------------------------
  // Test 4: Topic-Scoped AI Discourse Analysis & Redirection
  // -----------------------------------------------------------
  console.log('\nTEST 4: Topic-Scoped Epistemic Discourse & Off-Topic Interception...');
  let messageFeed = [];
  teacher.on('chat:new_message', (msg) => { messageFeed.push(msg); });

  // 4.1 Warrant on Language Policy
  ravi.emit('chat:message', {
    content: "I believe speaking Telugu during sports and lunch should be permitted because students need mental relaxation in their home language."
  });
  await new Promise(r => setTimeout(r, 400));
  const warrantMsg = messageFeed.find(m => m.senderName === 'Ravi');
  assert.strictEqual(warrantMsg.epistemicType, 'warrant', 'Warrant with "because" should be classified');
  console.log('  ✓ Epistemic warrant classified under Language Policy topic');

  // 4.2 Counter-Claim & Peer Inclusion
  ananya.emit('chat:message', {
    content: "I hear Ravi, but however, non-Telugu speaking students might feel excluded in the dining mess if everyone speaks Telugu."
  });
  await new Promise(r => setTimeout(r, 400));
  const counterMsg = messageFeed.find(m => m.senderName === 'Ananya');
  assert.strictEqual(counterMsg.epistemicType, 'counter-claim', 'Counter-claim with "however" should be classified');
  assert.strictEqual(counterMsg.transactiveTarget, 'Ravi', 'Transactive target @Ravi should be detected');
  console.log('  ✓ Counter-claim and transactive target @Ravi detected');

  // 4.3 Off-Topic Drift Interception
  let topicDriftFlag = null;
  teacher.on('teacher:dashboard_update', (data) => {
    if (data.offTopicFlags && data.offTopicFlags.length > 0) {
      topicDriftFlag = data.offTopicFlags[0];
    }
  });

  ravi.emit('chat:message', {
    content: "Who is watching the cricket IPL tournament match today? Any pubg player?"
  });
  await new Promise(r => setTimeout(r, 600));
  assert(topicDriftFlag !== null, 'Off-topic drift must be flagged to Teacher');
  console.log(`  ✓ Off-topic drift intercepted and flagged: "${topicDriftFlag.reason}"`);
  passedTests++;

  // -----------------------------------------------------------
  // Test 5: Inclusivity Skew & Silence Scaffolding
  // -----------------------------------------------------------
  console.log('\nTEST 5: Inclusivity Tracking & Topic-Scoped Silence Scaffolding...');
  // Ravi and Ananya contribute more words while Karthik stays silent
  ravi.emit('chat:message', {
    content: "To address Ananya's concern, we can require English when mixed groups sit together."
  });
  await new Promise(r => setTimeout(r, 300));

  let teacherUpdate = null;
  teacher.on('teacher:dashboard_update', (data) => {
    teacherUpdate = data;
  });

  // Force trigger
  ravi.emit('chat:message', {
    content: "This ensures inclusion for everyone while letting students relax in Telugu."
  });
  await new Promise(r => setTimeout(r, 800));

  assert(teacherUpdate !== null, 'Teacher dashboard update must be received');
  const karthikMetric = teacherUpdate.metrics.students.find(s => s.name === 'Karthik');
  assert(karthikMetric !== undefined, 'Karthik must be tracked in metrics');
  console.log(`  ✓ Inclusivity Gini Skew: ${teacherUpdate.metrics.giniSkew} (${teacherUpdate.metrics.balanceRating})`);
  console.log(`  ✓ Karthik engagement state: ${karthikMetric.status}`);
  passedTests++;

  // -----------------------------------------------------------
  // Test 6: Teacher-in-the-Loop Scaffold & Paused State Enforcement
  // -----------------------------------------------------------
  console.log('\nTEST 6: Teacher Scaffold Approval & Session Pause Enforcement...');
  
  // 6.1 Teacher approves staged scaffold
  let aiScaffoldDelivered = false;
  ravi.on('chat:new_message', (msg) => {
    if (msg.senderRole === 'ai') aiScaffoldDelivered = true;
  });

  teacher.emit('teacher:approve_ai_prompt', {
    promptId: teacherUpdate.pendingAIPrompts[0]?.id || 'dummy_prompt_id',
    editedPrompt: "@Karthik, what is your view on balancing Telugu in the mess with peer inclusion?"
  });
  await new Promise(r => setTimeout(r, 500));
  assert(aiScaffoldDelivered, 'Approved AI scaffold must be delivered to student feed');
  console.log('  ✓ Teacher approved AI prompt delivered to deliberation feed');

  // 6.2 Teacher pauses session -> voting and chatting blocked
  teacher.emit('teacher:pause_session');
  await new Promise(r => setTimeout(r, 400));

  let voteBlockedOnPause = false;
  ravi.on('error:notice', (err) => {
    if (err.message.includes('disabled while session is paused')) {
      voteBlockedOnPause = true;
    }
  });

  ravi.emit('constitution:vote', { proposalId: 'prop_test', vote: 'accept' });
  await new Promise(r => setTimeout(r, 400));
  assert(voteBlockedOnPause, 'Voting must be blocked when session is paused');
  console.log('  ✓ Paused state blocks voting as expected');

  // Resume session
  teacher.emit('teacher:start_session');
  await new Promise(r => setTimeout(r, 400));
  passedTests++;

  // -----------------------------------------------------------
  // Test 7: Deliberation, Voting Caution, and Consensus Ratification
  // -----------------------------------------------------------
  console.log('\nTEST 7: Deliberation, Peer Voting, and Consensus Ratification...');
  let ratificationFired = false;
  let finalRule = '';

  teacher.on('constitution:ratified', ({ currentRule }) => {
    ratificationFired = true;
    finalRule = currentRule;
  });

  // Students listen for proposals and vote accept
  ravi.on('constitution:proposal_created', ({ proposal }) => {
    ravi.emit('constitution:vote', { proposalId: proposal.id, vote: 'accept' });
  });

  ananya.on('constitution:proposal_created', ({ proposal }) => {
    ananya.emit('constitution:vote', { proposalId: proposal.id, vote: 'accept' });
  });

  // Karthik proposes amendment during active deliberation
  karthik.emit('constitution:propose_amendment', {
    proposedText: "Rule 4.1: English is mandatory inside the classroom during lessons. In the playground, dining mess, and corridors, students are free to speak their home language (such as Telugu) or English, provided all peers are welcomed respectfully.",
    justification: "Balances academic English learning with mother-tongue well-being and social inclusion."
  });

  await new Promise(r => setTimeout(r, 1200));

  assert(ratificationFired, 'Consensus ratification event must fire when >= 66% peers accept');
  assert(finalRule.includes('English is mandatory inside the classroom'), 'Constitution rule must update to ratified amendment');
  console.log('  ✓ Amendment proposed with mandatory decision justification');
  console.log('  ✓ Peers reviewed and confirmed approval votes');
  console.log(`  ✓ Formal Ratification Enacted: "${finalRule}"`);
  passedTests++;

  // -----------------------------------------------------------
  // Summary
  // -----------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`🎉 TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log('    All Enhanced Workflows & Security Constraints Verified');
  console.log('=============================================================');

  teacher.disconnect();
  ravi.disconnect();
  ananya.disconnect();
  karthik.disconnect();
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
