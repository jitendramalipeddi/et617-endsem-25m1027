const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// -------------------------------------------------------------
// State Store for Collaborative Session
// -------------------------------------------------------------
const sessionState = {
  isStarted: false,
  startTime: null,
  pauseTime: null,
  topic: {
    title: "Drafting Classroom Constitution: Article IV - Language of Communication",
    scenario: "Reviewing the rule on English-only communication. The current rule mandates English across all school premises (classroom, mess, playground, bus). Deliberate and draft an amendment to balance English learning in the classroom with linguistic freedom and emotional well-being outside the classroom for bilingual learners (e.g. Telugu speakers at home).",
    originalRule: "Rule 4.1: All students must speak exclusively in English at all times across all school premises, including classrooms, corridors, sports field, mess, and bus.",
    currentRule: "Rule 4.1: All students must speak exclusively in English at all times across all school premises, including classrooms, corridors, sports field, mess, and bus."
  },
  // Map socket.id -> participant
  participants: {},
  messages: [],
  proposals: [],
  pendingAIPrompts: [],
  offTopicFlags: [],
  autoApproveAI: false // Strict Teacher-in-the-Loop by default
};

// Helper: Get local network IP addresses for multi-device testing
function getLocalNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// -------------------------------------------------------------
// NLP & Epistemic Discourse Analytics Engine
// -------------------------------------------------------------
const RELEVANT_TOPIC_KEYWORDS = [
  'english', 'telugu', 'language', 'medium', 'mother tongue', 'home language',
  'classroom', 'class', 'mess', 'dining', 'canteen', 'playground', 'ground',
  'sports', 'corridor', 'bus', 'rule', 'rules', 'constitution', 'right', 'duty',
  'rights', 'duties', 'speak', 'speaking', 'talk', 'learn', 'practice', 'exclude',
  'exclusion', 'include', 'inclusion', 'fair', 'comfort', 'relax', 'friend',
  'punish', 'fine', 'scared', 'hesitant', 'communicate', 'freedom', 'amendment',
  'modify', 'change', 'agree', 'disagree', 'outside', 'inside', 'teacher', 'student'
];

const OFF_TOPIC_KEYWORDS = [
  'cricket', 'ipl', 'match', 'pubg', 'freefire', 'minecraft', 'roblox', 'fifa',
  'movie', 'cinema', 'actor', 'hero', 'song', 'instagram', 'reels', 'tiktok',
  'youtube video', 'netflix', 'bunk', 'homework copy', 'biryani party', 'food order',
  'cheat', 'game score', 'playstation', 'xbox'
];

function analyzeDiscourse(content, senderName, participants) {
  const text = content.toLowerCase();

  // 1. Check Off-Topic Drift
  let hasOffTopicWord = OFF_TOPIC_KEYWORDS.some(kw => text.includes(kw));
  let hasTopicWord = RELEVANT_TOPIC_KEYWORDS.some(kw => text.includes(kw));
  let isOffTopic = hasOffTopicWord && !hasTopicWord;

  // 2. Classify Epistemic Type
  let epistemicType = 'statement';
  if (text.includes('because') || text.includes('since') || text.includes('reason') || text.includes('so that') || text.includes('in order to')) {
    epistemicType = 'warrant'; // Explanation / Rationale
  } else if (text.includes('propose') || text.includes('suggest') || text.includes('amend') || text.includes('rule should') || text.includes('modify')) {
    epistemicType = 'proposal'; // Actionable Constitutional Proposal
  } else if (text.includes('however') || text.includes('but') || text.includes('disagree') || text.includes('drawback') || text.includes('problem') || text.includes('what if') || text.includes('on the other hand')) {
    epistemicType = 'counter-claim'; // Critical Rebuttal / Constructive Disagreement
  } else if (text.includes('agree') || text.includes('support') || text.includes('fair point') || text.includes('good idea') || text.includes('compromise') || text.includes('balance')) {
    epistemicType = 'agreement'; // Consensus Building
  } else if (text.includes('?') || text.includes('why') || text.includes('how') || text.includes('what do you think')) {
    epistemicType = 'inquiry'; // Questioning / Scaffolding peer
  }

  // 3. Detect Transactive Reference (referencing peer name)
  let transactiveTarget = null;
  for (const p of Object.values(participants)) {
    if (p.role === 'student' && p.name && p.name.toLowerCase() !== senderName.toLowerCase()) {
      if (text.includes(p.name.toLowerCase())) {
        transactiveTarget = p.name;
        break;
      }
    }
  }

  return { isOffTopic, epistemicType, transactiveTarget };
}

// -------------------------------------------------------------
// Participation & Inclusivity Computation
// -------------------------------------------------------------
function calculateInclusivityMetrics() {
  const students = Object.values(sessionState.participants).filter(p => p.role === 'student');
  const totalStudents = students.length;
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      totalWords: 0,
      totalMessages: 0,
      giniSkew: 0,
      balanceRating: 'Waiting for Students',
      students: []
    };
  }

  const now = Date.now();
  let totalWords = 0;
  let totalMessages = 0;

  students.forEach(s => {
    totalWords += s.wordCount;
    totalMessages += s.messageCount;

    // Determine student engagement status
    const inactiveSeconds = (now - s.lastActiveTime) / 1000;
    if (s.messageCount === 0 || inactiveSeconds > 60) {
      s.status = 'silent';
    } else if (inactiveSeconds > 30 || s.wordCount < (totalWords / totalStudents) * 0.4) {
      s.status = 'hesitant';
    } else {
      s.status = 'active';
    }
  });

  // Calculate percentage of words per student and Gini coefficient (Inequality Index)
  const studentMetrics = students.map(s => {
    const wordShare = totalWords > 0 ? Math.round((s.wordCount / totalWords) * 100) : Math.round(100 / totalStudents);
    return {
      id: s.id,
      name: s.name,
      rollNo: s.rollNo,
      wordCount: s.wordCount,
      charCount: s.charCount,
      messageCount: s.messageCount,
      wordShare,
      status: s.status,
      lastActiveSecondsAgo: Math.round((now - s.lastActiveTime) / 1000)
    };
  });

  // Gini coefficient calculation for word distribution
  let giniSkew = 0;
  if (totalStudents > 1 && totalWords > 0) {
    let diffSum = 0;
    for (let i = 0; i < totalStudents; i++) {
      for (let j = 0; j < totalStudents; j++) {
        diffSum += Math.abs(studentMetrics[i].wordCount - studentMetrics[j].wordCount);
      }
    }
    giniSkew = Number((diffSum / (2 * totalStudents * totalWords)).toFixed(2));
  }

  let balanceRating = 'Equitable Collaboration';
  if (totalMessages < 3) {
    balanceRating = 'Session Starting';
  } else if (giniSkew > 0.5) {
    balanceRating = 'Severe Dominance / Unequal Participation';
  } else if (giniSkew > 0.3) {
    balanceRating = 'Moderately Skewed Participation';
  }

  return {
    totalStudents,
    totalWords,
    totalMessages,
    giniSkew,
    balanceRating,
    students: studentMetrics
  };
}

// -------------------------------------------------------------
// Inclusivity Trigger & Scaffold Generator
// -------------------------------------------------------------
function evaluateInclusivityAndGenerateAIPrompts() {
  if (!sessionState.isStarted) return;

  const students = Object.values(sessionState.participants).filter(p => p.role === 'student');
  if (students.length < 2) return;

  const metrics = calculateInclusivityMetrics();
  const totalWords = metrics.totalWords;
  const now = Date.now();

  // 1. Silent Student Detection
  const silentStudents = metrics.students.filter(s => s.status === 'silent' && s.lastActiveSecondsAgo >= 45);
  for (const s of silentStudents) {
    // Check if prompt already pending for this student in last 60 seconds
    const existing = sessionState.pendingAIPrompts.find(
      p => p.targetStudentName === s.name && (now - p.timestamp < 60000) && p.status === 'pending'
    );
    if (!existing) {
      const promptId = 'ai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const promptObj = {
        id: promptId,
        type: 'inclusivity_silent',
        targetStudentName: s.name,
        targetStudentId: s.id,
        suggestedPrompt: `@${s.name}, we would love to hear your thoughts! Do you feel speaking home languages like Telugu should be allowed during lunchtime in the mess or sports in the playground? What rule would feel fairest to you?`,
        rationale: `Silent learner prompt: ${s.name} has contributed ${s.wordCount} words (${s.wordShare}%). Prompt invites their lived perspective on the dining/sports context without putting them on the spot.`,
        timestamp: now,
        status: 'pending'
      };
      sessionState.pendingAIPrompts.push(promptObj);
      broadcastTeacherUpdate();
    }
  }

  // 2. Dominant Student Pacing (if 1 student speaks > 65% with > 30 words and >= 3 total messages)
  if (metrics.totalMessages >= 4 && metrics.giniSkew > 0.45) {
    const dominant = metrics.students.find(s => s.wordShare >= 65 && s.wordCount >= 30);
    const quiet = metrics.students.find(s => s.wordShare <= 15);
    if (dominant && quiet) {
      const existing = sessionState.pendingAIPrompts.find(
        p => p.type === 'dominance_pacing' && (now - p.timestamp < 90000) && p.status === 'pending'
      );
      if (!existing) {
        const promptId = 'ai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const promptObj = {
          id: promptId,
          type: 'dominance_pacing',
          targetStudentName: dominant.name,
          suggestedPrompt: `Great points, @${dominant.name}! To build group consensus on Article IV, could you ask @${quiet.name} what potential concerns or edge cases they see with your proposal?`,
          rationale: `Dominance pacing: ${dominant.name} currently holds ${dominant.wordShare}% of total talk-time. This prompt scaffolds them to practice active listening and invite peer critique.`,
          timestamp: now,
          status: 'pending'
        };
        sessionState.pendingAIPrompts.push(promptObj);
        broadcastTeacherUpdate();
      }
    }
  }
}

// Run periodic inclusivity check every 10 seconds
setInterval(() => {
  evaluateInclusivityAndGenerateAIPrompts();
  broadcastMetricsUpdate();
}, 10000);

// Helper to broadcast state to teachers and students
function broadcastSessionState() {
  const metrics = calculateInclusivityMetrics();
  io.emit('session:state', {
    isStarted: sessionState.isStarted,
    startTime: sessionState.startTime,
    topic: sessionState.topic,
    metrics,
    proposals: sessionState.proposals,
    autoApproveAI: sessionState.autoApproveAI
  });
}

function broadcastMetricsUpdate() {
  const metrics = calculateInclusivityMetrics();
  io.emit('metrics:update', metrics);
}

function broadcastTeacherUpdate() {
  const metrics = calculateInclusivityMetrics();
  io.to('teachers').emit('teacher:dashboard_update', {
    metrics,
    pendingAIPrompts: sessionState.pendingAIPrompts.filter(p => p.status === 'pending'),
    offTopicFlags: sessionState.offTopicFlags,
    sessionStarted: sessionState.isStarted
  });
}

// -------------------------------------------------------------
// Socket.IO Real-Time Handlers
// -------------------------------------------------------------
io.on('connection', (socket) => {
  // Join Session
  socket.on('join', ({ role, name, rollNo }) => {
    const cleanName = (name || '').trim() || (role === 'teacher' ? 'Teacher' : 'Student');
    const cleanRoll = (rollNo || '').trim();

    sessionState.participants[socket.id] = {
      id: socket.id,
      role: role === 'teacher' ? 'teacher' : 'student',
      name: cleanName,
      rollNo: cleanRoll,
      joinedAt: Date.now(),
      lastActiveTime: Date.now(),
      wordCount: 0,
      charCount: 0,
      messageCount: 0,
      status: 'active'
    };

    if (role === 'teacher') {
      socket.join('teachers');
    } else {
      socket.join('students');
    }

    // Send full initial state to the connecting client
    socket.emit('init', {
      user: sessionState.participants[socket.id],
      isStarted: sessionState.isStarted,
      topic: sessionState.topic,
      messages: sessionState.messages,
      proposals: sessionState.proposals,
      metrics: calculateInclusivityMetrics()
    });

    // Notify others
    io.emit('participant:joined', {
      participant: sessionState.participants[socket.id],
      metrics: calculateInclusivityMetrics()
    });

    broadcastTeacherUpdate();
  });

  // Student Sends Chat Message
  socket.on('chat:message', ({ content }) => {
    const sender = sessionState.participants[socket.id];
    if (!sender) return;

    if (!sessionState.isStarted && sender.role === 'student') {
      socket.emit('error:notice', { message: 'Discussion has not been started by the teacher yet.' });
      return;
    }

    const trimmedContent = (content || '').trim();
    if (!trimmedContent) return;

    // Update student activity & words
    const words = trimmedContent.split(/\s+/).filter(w => w.length > 0).length;
    sender.wordCount += words;
    sender.charCount += trimmedContent.length;
    sender.messageCount += 1;
    sender.lastActiveTime = Date.now();
    sender.status = 'active';

    // Discourse analysis
    const analysis = analyzeDiscourse(trimmedContent, sender.name, sessionState.participants);

    const messageObj = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: socket.id,
      senderName: sender.name,
      senderRole: sender.role,
      senderRoll: sender.rollNo,
      content: trimmedContent,
      timestamp: Date.now(),
      epistemicType: analysis.epistemicType,
      isOffTopic: analysis.isOffTopic,
      transactiveTarget: analysis.transactiveTarget,
      approvedByTeacher: true
    };

    sessionState.messages.push(messageObj);
    io.emit('chat:new_message', messageObj);

    // If message is Off-Topic, trigger teacher flag and intervention card
    if (analysis.isOffTopic) {
      const flagId = 'flag_' + Date.now();
      const flagObj = {
        id: flagId,
        studentName: sender.name,
        studentRoll: sender.rollNo,
        messageContent: trimmedContent,
        reason: 'Discussion drifted off-topic away from Language Policy.',
        timestamp: Date.now()
      };
      sessionState.offTopicFlags.push(flagObj);

      const redirectPromptId = 'ai_redirect_' + Date.now();
      const redirectPrompt = {
        id: redirectPromptId,
        type: 'off_topic_redirect',
        targetStudentName: sender.name,
        suggestedPrompt: `Gentle reminder to the group: Let's focus our discussion on Article IV (Language of Communication). Should students be permitted to speak Telugu during lunch and outdoor sports? How does this protect everyone's rights?`,
        rationale: `Off-topic intervention: ${sender.name} posted a message unrelated to the constitution. This prompt refocuses discussion on the language policy dilemma.`,
        timestamp: Date.now(),
        status: 'pending'
      };
      sessionState.pendingAIPrompts.push(redirectPrompt);
      broadcastTeacherUpdate();
    }

    // Evaluate balance and generate prompts if needed
    evaluateInclusivityAndGenerateAIPrompts();
    broadcastMetricsUpdate();
    broadcastTeacherUpdate();
  });

  // Student Proposes an Amendment to the Shared Constitution Artefact
  socket.on('constitution:propose_amendment', ({ proposedText, justification }) => {
    const sender = sessionState.participants[socket.id];
    if (!sender) return;

    if (!sessionState.isStarted && sender.role === 'student') {
      socket.emit('error:notice', { message: 'Discussion has not been started yet.' });
      return;
    }

    const cleanText = (proposedText || '').trim();
    const cleanJustification = (justification || '').trim();

    if (!cleanText || !cleanJustification) {
      socket.emit('error:notice', { message: 'Both the proposed text and your justification/rationale are required.' });
      return;
    }

    // Add words from proposal to student's score
    const words = (cleanText + ' ' + cleanJustification).split(/\s+/).filter(w => w.length > 0).length;
    sender.wordCount += words;
    sender.messageCount += 1;
    sender.lastActiveTime = Date.now();

    const proposalObj = {
      id: 'prop_' + Date.now(),
      proposedBy: socket.id,
      studentName: sender.name,
      rollNo: sender.rollNo,
      proposedText: cleanText,
      justification: cleanJustification,
      timestamp: Date.now(),
      status: 'open',
      votes: {
        [socket.id]: { vote: 'accept', studentName: sender.name } // Proposer naturally supports
      }
    };

    sessionState.proposals.push(proposalObj);

    // Also broadcast as a system message in chat
    const proposalChatMsg = {
      id: 'sys_' + Date.now(),
      senderId: 'system',
      senderName: 'Constitution Desk',
      senderRole: 'system',
      content: `📜 ${sender.name} proposed an amendment to Article IV!\n" ${cleanText} "\nJustification: ${cleanJustification}`,
      timestamp: Date.now(),
      epistemicType: 'proposal'
    };
    sessionState.messages.push(proposalChatMsg);

    io.emit('constitution:proposal_created', {
      proposal: proposalObj,
      chatMessage: proposalChatMsg
    });

    broadcastMetricsUpdate();
    broadcastTeacherUpdate();
  });

  // Student Votes on Proposed Amendment
  socket.on('constitution:vote', ({ proposalId, vote, reason }) => {
    const sender = sessionState.participants[socket.id];
    if (!sender) return;

    const proposal = sessionState.proposals.find(p => p.id === proposalId);
    if (!proposal || proposal.status !== 'open') return;

    proposal.votes[socket.id] = {
      vote: vote === 'accept' ? 'accept' : 'revise',
      studentName: sender.name,
      reason: (reason || '').trim()
    };

    sender.lastActiveTime = Date.now();

    // Check consensus threshold
    const students = Object.values(sessionState.participants).filter(p => p.role === 'student');
    const totalStudents = students.length;
    const voteEntries = Object.values(proposal.votes);
    const acceptCount = voteEntries.filter(v => v.vote === 'accept').length;

    // Consensus rule: If at least 2 students (or majority) accept, and at least 60% of joined students voted
    let consensusReached = false;
    if (totalStudents <= 2 && acceptCount >= totalStudents) {
      consensusReached = true;
    } else if (totalStudents >= 3 && acceptCount >= Math.ceil(totalStudents * 0.66)) {
      consensusReached = true;
    }

    if (consensusReached) {
      proposal.status = 'accepted';
      sessionState.topic.currentRule = proposal.proposedText;

      const ratificationMsg = {
        id: 'sys_ratified_' + Date.now(),
        senderId: 'system',
        senderName: 'Constitution Desk',
        senderRole: 'system',
        content: `🎉 CONSENSUS REACHED! Article IV has been formally amended by the class:\n"${proposal.proposedText}"`,
        timestamp: Date.now(),
        epistemicType: 'agreement'
      };
      sessionState.messages.push(ratificationMsg);

      io.emit('constitution:ratified', {
        proposalId: proposal.id,
        currentRule: sessionState.topic.currentRule,
        chatMessage: ratificationMsg
      });
    } else {
      io.emit('constitution:vote_updated', {
        proposalId: proposal.id,
        votes: proposal.votes,
        voterName: sender.name,
        vote: vote
      });
    }

    broadcastMetricsUpdate();
    broadcastTeacherUpdate();
  });

  // -------------------------------------------------------------
  // Teacher-in-the-Loop Actions
  // -------------------------------------------------------------
  socket.on('teacher:start_session', () => {
    sessionState.isStarted = true;
    sessionState.startTime = sessionState.startTime || Date.now();

    const startMsg = {
      id: 'sys_start_' + Date.now(),
      senderId: 'teacher',
      senderName: 'Teacher',
      senderRole: 'teacher',
      content: `📢 Discussion is now officially open! Review Article IV on the right and begin sharing your views. Remember to explain your reasons clearly!`,
      timestamp: Date.now(),
      epistemicType: 'inquiry'
    };
    sessionState.messages.push(startMsg);

    io.emit('session:started', {
      isStarted: true,
      startTime: sessionState.startTime,
      startMessage: startMsg
    });

    broadcastTeacherUpdate();
  });

  socket.on('teacher:pause_session', () => {
    sessionState.isStarted = false;
    io.emit('session:paused', { isStarted: false });
    broadcastTeacherUpdate();
  });

  socket.on('teacher:reset_session', () => {
    sessionState.isStarted = false;
    sessionState.startTime = null;
    sessionState.messages = [];
    sessionState.proposals = [];
    sessionState.pendingAIPrompts = [];
    sessionState.offTopicFlags = [];
    sessionState.topic.currentRule = sessionState.topic.originalRule;

    Object.values(sessionState.participants).forEach(p => {
      p.wordCount = 0;
      p.charCount = 0;
      p.messageCount = 0;
      p.status = 'active';
      p.lastActiveTime = Date.now();
    });

    io.emit('session:reset', {
      topic: sessionState.topic,
      metrics: calculateInclusivityMetrics()
    });

    broadcastTeacherUpdate();
  });

  // Teacher Approves AI Scaffold Prompt
  socket.on('teacher:approve_ai_prompt', ({ promptId, editedPrompt }) => {
    const promptIndex = sessionState.pendingAIPrompts.findIndex(p => p.id === promptId);
    if (promptIndex === -1) return;

    const promptObj = sessionState.pendingAIPrompts[promptIndex];
    promptObj.status = 'approved';

    const finalText = (editedPrompt || promptObj.suggestedPrompt).trim();

    const aiMessage = {
      id: 'ai_msg_' + Date.now(),
      senderId: 'ai_facilitator',
      senderName: 'AI Facilitator (Approved by Teacher)',
      senderRole: 'ai',
      content: finalText,
      timestamp: Date.now(),
      epistemicType: 'inquiry',
      pedagogicalRationale: promptObj.rationale
    };

    sessionState.messages.push(aiMessage);
    io.emit('chat:new_message', aiMessage);

    // Remove from pending
    sessionState.pendingAIPrompts.splice(promptIndex, 1);
    broadcastTeacherUpdate();
  });

  // Teacher Rejects / Overrides AI Scaffold Prompt
  socket.on('teacher:reject_ai_prompt', ({ promptId }) => {
    const promptIndex = sessionState.pendingAIPrompts.findIndex(p => p.id === promptId);
    if (promptIndex !== -1) {
      sessionState.pendingAIPrompts.splice(promptIndex, 1);
      broadcastTeacherUpdate();
    }
  });

  // Teacher Direct Guidance Message (Human-in-the-Loop Broadcast)
  socket.on('teacher:send_direct_message', ({ content }) => {
    const trimmed = (content || '').trim();
    if (!trimmed) return;

    const teacherMsg = {
      id: 'tchr_' + Date.now(),
      senderId: socket.id,
      senderName: 'Teacher (Instructor Intervention)',
      senderRole: 'teacher',
      content: trimmed,
      timestamp: Date.now(),
      epistemicType: 'inquiry'
    };

    sessionState.messages.push(teacherMsg);
    io.emit('chat:new_message', teacherMsg);
  });

  // Teacher Dismisses Off-Topic Flag
  socket.on('teacher:dismiss_flag', ({ flagId }) => {
    sessionState.offTopicFlags = sessionState.offTopicFlags.filter(f => f.id !== flagId);
    broadcastTeacherUpdate();
  });

  // Disconnection
  socket.on('disconnect', () => {
    const departing = sessionState.participants[socket.id];
    delete sessionState.participants[socket.id];

    if (departing) {
      io.emit('participant:left', {
        id: socket.id,
        name: departing.name,
        metrics: calculateInclusivityMetrics()
      });
      broadcastTeacherUpdate();
    }
  });
});

// -------------------------------------------------------------
// Start Server and Display Local & Network URLs
// -------------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalNetworkAddresses();
  console.log(`\n=============================================================`);
  console.log(`🚀 Collaborative Learning Server running on:`);
  console.log(`   ➜ Localhost:      http://localhost:${PORT}`);
  localIps.forEach(ip => {
    console.log(`   ➜ Local Network:  http://${ip}:${PORT} (Access from phones/other devices)`);
  });
  console.log(`=============================================================\n`);
});
