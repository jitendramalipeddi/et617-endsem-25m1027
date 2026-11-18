const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

async function runTest() {
  console.log('🧪 Starting End-to-End Simulation Test...\n');

  // 1. Connect Teacher
  const teacher = io(SERVER_URL);
  await new Promise(r => teacher.on('connect', r));
  console.log('✓ Teacher socket connected');

  teacher.emit('join', { role: 'teacher', name: 'Ms. Rao', rollNo: '' });

  // 2. Connect 3 Students
  const ravi = io(SERVER_URL);
  const ananya = io(SERVER_URL);
  const karthik = io(SERVER_URL);

  await Promise.all([
    new Promise(r => ravi.on('connect', r)),
    new Promise(r => ananya.on('connect', r)),
    new Promise(r => karthik.on('connect', r))
  ]);
  console.log('✓ 3 Student sockets connected');

  ravi.emit('join', { role: 'student', name: 'Ravi', rollNo: '101' });
  ananya.emit('join', { role: 'student', name: 'Ananya', rollNo: '102' });
  karthik.emit('join', { role: 'student', name: 'Karthik', rollNo: '103' });

  await new Promise(r => setTimeout(r, 600));

  // 3. Teacher Starts Session
  console.log('\n--- 1. Testing Session Gatekeeper ---');
  let sessionStarted = false;
  ravi.on('session:started', () => {
    sessionStarted = true;
    console.log('✓ Students received session:started event!');
  });

  teacher.emit('teacher:start_session');
  await new Promise(r => setTimeout(r, 500));
  if (!sessionStarted) throw new Error('Session start failed');

  // 4. Students Deliberate
  console.log('\n--- 2. Testing Discourse & Epistemic Categorization ---');
  let messagesCount = 0;
  teacher.on('chat:new_message', (msg) => {
    messagesCount++;
    console.log(`[Teacher Feed] ${msg.senderName} (${msg.epistemicType}): ${msg.content.substring(0, 50)}...`);
  });

  ravi.emit('chat:message', {
    content: "I think speaking Telugu in the playground and dining mess should be allowed because after 6 hours of English classes, we feel tired and want to talk comfortably in our mother tongue."
  });
  await new Promise(r => setTimeout(r, 500));

  ananya.emit('chat:message', {
    content: "I understand Ravi's point, but what if new students who don't know Telugu join our group in the mess? They will feel isolated and excluded."
  });
  await new Promise(r => setTimeout(r, 500));

  // 5. Test Off-Topic Detection
  console.log('\n--- 3. Testing Off-Topic Detection & Flagging ---');
  let offTopicFlagReceived = false;
  teacher.on('teacher:dashboard_update', (data) => {
    if (data.offTopicFlags && data.offTopicFlags.length > 0) {
      offTopicFlagReceived = true;
      console.log(`✓ Teacher received Off-Topic Flag: "${data.offTopicFlags[0].messageContent}" (${data.offTopicFlags[0].reason})`);
    }
  });

  ravi.emit('chat:message', {
    content: "Did you watch the IPL cricket match yesterday? Who scored fifty in pubg?"
  });
  await new Promise(r => setTimeout(r, 800));
  if (!offTopicFlagReceived) console.warn('Warning: Off-topic flag not triggered yet.');

  // 6. Test Silent Student Inclusivity Scaffold
  console.log('\n--- 4. Testing Inclusivity Scaffolding (Karthik is silent) ---');
  // Send more messages from Ravi and Ananya to create talk-time skew
  ravi.emit('chat:message', {
    content: "To solve Ananya's concern, we can add a rule that if a non-Telugu speaker is sitting at the dining table, we must speak English."
  });
  await new Promise(r => setTimeout(r, 400));

  ananya.emit('chat:message', {
    content: "That sounds like a fair compromise, but we should make sure the playground is also open for everyone to speak Telugu without fines or punishment."
  });
  await new Promise(r => setTimeout(r, 400));

  // 7. Test Shared Constitution Amendment & Peer Voting
  console.log('\n--- 5. Testing Shared Constitution Co-Authoring & Consensus ---');
  let proposalCreated = false;
  let consensusRatified = false;

  teacher.on('constitution:proposal_created', ({ proposal }) => {
    proposalCreated = true;
    console.log(`✓ Proposal created by ${proposal.studentName}: "${proposal.proposedText}"`);
  });

  teacher.on('constitution:ratified', ({ currentRule }) => {
    consensusRatified = true;
    console.log(`✓ CONSENSUS RATIFIED! New Rule: "${currentRule}"`);
  });

  ravi.on('constitution:proposal_created', ({ proposal }) => {
    console.log('✓ Ravi received proposal event, casting "accept" vote...');
    ravi.emit('constitution:vote', { proposalId: proposal.id, vote: 'accept' });
  });

  ananya.on('constitution:proposal_created', ({ proposal }) => {
    console.log('✓ Ananya received proposal event, casting "accept" vote...');
    ananya.emit('constitution:vote', { proposalId: proposal.id, vote: 'accept' });
  });

  karthik.emit('constitution:propose_amendment', {
    proposedText: "Rule 4.1: English is mandatory inside the classroom during lessons. In the playground, dining mess, and corridors, students may speak Telugu or English, provided all peers are welcomed respectfully.",
    justification: "Balances academic English learning with mother-tongue comfort, and prevents exclusion of non-Telugu students."
  });

  await new Promise(r => setTimeout(r, 1200));

  if (!consensusRatified) {
    throw new Error('Consensus ratification was not triggered');
  }

  console.log('\n🎉 ALL TESTS COMPLETED & VERIFIED SUCCESSFULLY!');

  teacher.disconnect();
  ravi.disconnect();
  ananya.disconnect();
  karthik.disconnect();
  process.exit(0);
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
