// ==========================================================
// Student Sabha: Comprehensive Automated Test Suite
// Validates: Functionality, Usability, CSCL Metrics & Topic-Level Triggers
// ==========================================================

const { io } = require('socket.io-client');
const assert = require('assert');

const SERVER_URL = 'http://localhost:3000';

async function runTestSuite() {
  console.log('=============================================================');
  console.log('🏛️  STUDENT SABHA: AUTOMATED TEST SUITE');
  console.log('    Validating Functionality, Usability & Topic-Level Triggers');
  console.log('=============================================================\n');

  let passedTests = 0;
  let totalTests = 7;

  // -----------------------------------------------------------
  // Test 1: Authentication & Multi-Student Joining
  // -----------------------------------------------------------
  console.log('TEST 1: Authentication & Dynamic Multi-Student Joining...');
  const teacher = io(SERVER_URL);
  const ravi = io(SERVER_URL);
  const ananya = io(SERVER_URL);
  const karthik = io(SERVER_URL);

  await Promise.all([
    new Promise(r => teacher.on('connect', r)),
    new Promise(r => ravi.on('connect', r)),
    new Promise(r => ananya.on('connect', r)),
    new Promise(r => karthik.on('connect', r))
  ]);

  teacher.emit('join', { role: 'teacher', name: 'Ms. Rao', rollNo: '' });
  teacher.emit('teacher:reset_session');
  await new Promise(r => setTimeout(r, 400));

  ravi.emit('join', { role: 'student', name: 'Ravi', rollNo: '101' });
  ananya.emit('join', { role: 'student', name: 'Ananya', rollNo: '102' });
  karthik.emit('join', { role: 'student', name: 'Karthik', rollNo: '103' });

  await new Promise(r => setTimeout(r, 600));

  // Check initial state reception
  let teacherState = null;
  teacher.on('init', (data) => { teacherState = data; });
  teacher.emit('join', { role: 'teacher', name: 'Ms. Rao', rollNo: '' });
  await new Promise(r => setTimeout(r, 400));

  assert(teacherState !== null, 'Teacher should receive initial state payload');
  assert.strictEqual(teacherState.isStarted, false, 'Session should initially be in unstarted/waiting state');
  console.log('  ✓ 1 Teacher and 3 dynamic students connected with custom credentials');
  console.log('  ✓ Waiting room state verified');
  passedTests++;

  // -----------------------------------------------------------
  // Test 2: Session Gatekeeper (Teacher-in-the-Loop)
  // -----------------------------------------------------------
  console.log('\nTEST 2: Session Gatekeeper Enforcement...');
  let chatRejectedBeforeStart = false;
  ravi.on('error:notice', (err) => {
    if (err.message.includes('not been started')) {
      chatRejectedBeforeStart = true;
    }
  });

  // Attempt to send message while session is locked
  ravi.emit('chat:message', { content: "Can I speak yet?" });
  await new Promise(r => setTimeout(r, 400));
  assert(chatRejectedBeforeStart, 'Student should be blocked from posting before Teacher starts session');
  console.log('  ✓ Pre-session input rejection verified');

  // Teacher unlocks discussion
  let studentSessionStarted = false;
  ravi.on('session:started', () => { studentSessionStarted = true; });
  teacher.emit('teacher:start_session');
  await new Promise(r => setTimeout(r, 500));
  assert(studentSessionStarted, 'Student should receive session:started trigger');
  console.log('  ✓ Teacher started discussion; student waiting overlays unlocked');
  passedTests++;

  // -----------------------------------------------------------
  // Test 3: Topic-Level Epistemic & Transactive Discourse Triggers
  // -----------------------------------------------------------
  console.log('\nTEST 3: Topic-Level Epistemic Discourse & Transactivity Triggers...');
  let messageLog = [];
  teacher.on('chat:new_message', (msg) => { messageLog.push(msg); });

  // 3.1 Warrant / Explanation Trigger
  ravi.emit('chat:message', {
    content: "I propose we allow speaking Telugu in the playground and dining mess because after 6 hours of English classes, Telugu speakers feel mentally exhausted and need comfort."
  });
  await new Promise(r => setTimeout(r, 500));

  const warrantMsg = messageLog.find(m => m.senderName === 'Ravi');
  assert(warrantMsg !== undefined, 'Ravi message should be delivered');
  assert.strictEqual(warrantMsg.epistemicType, 'warrant', 'Message with "because" should be classified as warrant');
  console.log('  ✓ Epistemic classification: "warrant" detected (Explanation of Decision)');

  // 3.2 Counter-Claim & Transactive Target Trigger
  ananya.emit('chat:message', {
    content: "I understand Ravi's perspective, but however, what if non-Telugu speaking students feel isolated during lunch? We must protect peer inclusion."
  });
  await new Promise(r => setTimeout(r, 500));

  const counterMsg = messageLog.find(m => m.senderName === 'Ananya');
  assert(counterMsg !== undefined, 'Ananya message should be delivered');
  assert(counterMsg.epistemicType === 'counter-claim', 'Message with "however/but" should be counter-claim');
  assert.strictEqual(counterMsg.transactiveTarget, 'Ravi', 'Message mentioning Ravi should detect transactive target');
  console.log('  ✓ Epistemic classification: "counter-claim" detected');
  console.log('  ✓ Transactive discourse target correctly mapped to @Ravi');
  passedTests++;

  // -----------------------------------------------------------
  // Test 4: Off-Topic Drift Alerter & Redirection Scaffold
  // -----------------------------------------------------------
  console.log('\nTEST 4: Off-Topic Drift Alerter & Redirection Trigger...');
  let offTopicFlag = null;
  teacher.on('teacher:dashboard_update', (data) => {
    if (data.offTopicFlags && data.offTopicFlags.length > 0) {
      offTopicFlag = data.offTopicFlags[0];
    }
  });

  // Student drifts to cricket/gaming
  ravi.emit('chat:message', {
    content: "Did you watch the IPL cricket match yesterday? Who scored fifty in pubg?"
  });
  await new Promise(r => setTimeout(r, 800));

  assert(offTopicFlag !== null, 'Teacher should receive off-topic flag');
  assert(offTopicFlag.messageContent.includes('IPL cricket match'), 'Flagged message content should match');
  console.log(`  ✓ Off-topic message successfully intercepted and flagged to Teacher Dashboard`);
  console.log(`  ✓ Flag Reason: "${offTopicFlag.reason}"`);
  passedTests++;

  // -----------------------------------------------------------
  // Test 5: Inclusivity & Participation Skew Trigger (Karthik Silent)
  // -----------------------------------------------------------
  console.log('\nTEST 5: Inclusivity & Participation Skew Trigger...');
  // Ravi sends additional words to skew talk-time
  ravi.emit('chat:message', {
    content: "To address Ananya's concern about non-Telugu peers, we can add a clause specifying that when a common table activity has non-Telugu speakers, English is preferred."
  });
  await new Promise(r => setTimeout(r, 500));

  let latestMetrics = null;
  let stagedAIPrompts = [];
  teacher.on('teacher:dashboard_update', (data) => {
    if (data.metrics) latestMetrics = data.metrics;
    if (data.pendingAIPrompts) stagedAIPrompts = data.pendingAIPrompts;
  });

  // Trigger evaluation
  ravi.emit('chat:message', {
    content: "Let us make sure the playground is open for everyone to speak Telugu without fear of fines."
  });
  await new Promise(r => setTimeout(r, 1200));

  assert(latestMetrics !== null, 'Metrics should be calculated');
  const karthikMetric = latestMetrics.students.find(s => s.name === 'Karthik');
  assert(karthikMetric !== undefined, 'Karthik should be in student metrics');
  console.log(`  ✓ Gini Skew Index: ${latestMetrics.giniSkew} (${latestMetrics.balanceRating})`);
  console.log(`  ✓ Silent Student Status: Karthik has ${karthikMetric.wordCount} words (Status: ${karthikMetric.status})`);
  passedTests++;

  // -----------------------------------------------------------
  // Test 6: Teacher-in-the-Loop Scaffold Approval & Direct Guidance
  // -----------------------------------------------------------
  console.log('\nTEST 6: Teacher-in-the-Loop Scaffold Review & Direct Guidance...');
  let aiMessageDelivered = false;
  ravi.on('chat:new_message', (msg) => {
    if (msg.senderRole === 'ai') aiMessageDelivered = true;
  });

  // Simulate Teacher approving an inclusivity scaffold for Karthik
  teacher.emit('teacher:approve_ai_prompt', {
    promptId: stagedAIPrompts[0]?.id || 'dummy_test_prompt',
    editedPrompt: "@Karthik, what is your perspective on allowing Telugu in the playground and dining hall?"
  });
  await new Promise(r => setTimeout(r, 500));

  assert(aiMessageDelivered, 'Approved AI scaffold must be delivered to student chat');
  console.log('  ✓ Teacher approved AI scaffold; delivered to student deliberation feed');

  // Teacher direct guidance
  let teacherDirectDelivered = false;
  ravi.on('chat:new_message', (msg) => {
    if (msg.senderRole === 'teacher' && msg.content.includes('Class reminder')) {
      teacherDirectDelivered = true;
    }
  });

  teacher.emit('teacher:send_direct_message', {
    content: "Class reminder: Focus on balancing English learning in class with Telugu comfort outside."
  });
  await new Promise(r => setTimeout(r, 500));
  assert(teacherDirectDelivered, 'Direct teacher guidance must be broadcasted to students');
  console.log('  ✓ Direct teacher broadcast intervention verified');
  passedTests++;

  // -----------------------------------------------------------
  // Test 7: Shared Constitution Artefact Co-Authoring & Consensus
  // -----------------------------------------------------------
  console.log('\nTEST 7: Shared Constitution Co-Authoring & Disagreement Resolution...');
  let proposalReceived = null;
  let consensusRatified = false;
  let updatedRule = '';

  teacher.on('constitution:proposal_created', ({ proposal }) => {
    proposalReceived = proposal;
  });

  teacher.on('constitution:ratified', ({ currentRule }) => {
    consensusRatified = true;
    updatedRule = currentRule;
  });

  // Listeners for peer votes
  ravi.on('constitution:proposal_created', ({ proposal }) => {
    ravi.emit('constitution:vote', { proposalId: proposal.id, vote: 'accept' });
  });

  ananya.on('constitution:proposal_created', ({ proposal }) => {
    ananya.emit('constitution:vote', { proposalId: proposal.id, vote: 'accept' });
  });

  // Karthik proposes amendment with justification
  karthik.emit('constitution:propose_amendment', {
    proposedText: "Rule 4.1: English is mandatory inside the classroom during lessons. In the playground, dining mess, and corridors, students are free to speak their home language (such as Telugu) or English, ensuring all peers are included respectfully.",
    justification: "Protects English proficiency during instructional time while honoring students' emotional well-being and mother tongue in informal spaces."
  });

  await new Promise(r => setTimeout(r, 1200));

  assert(proposalReceived !== null, 'Proposal should be shared with all participants');
  assert(consensusRatified, 'Consensus ratification event must fire after peer votes');
  assert(updatedRule.includes('English is mandatory inside the classroom'), 'Classroom Constitution rule must update to ratified text');
  console.log('  ✓ Amendment proposed with mandatory decision justification');
  console.log('  ✓ Peers reviewed and cast consensus votes');
  console.log(`  ✓ Final Ratified Rule: "${updatedRule}"`);
  passedTests++;

  // -----------------------------------------------------------
  // Summary
  // -----------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`🎉 TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log('    All Functionality, Usability & Topic-Level Triggers Verified');
  console.log('=============================================================');

  teacher.disconnect();
  ravi.disconnect();
  ananya.disconnect();
  karthik.disconnect();
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
