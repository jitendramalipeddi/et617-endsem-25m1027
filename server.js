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
// Curated Constitutional Topics for Teacher Selection
// -------------------------------------------------------------
const CURATED_TOPICS = [
  {
    id: 'topic_language_policy',
    title: 'Article IV: Language of Communication in School',
    shortTitle: 'Article IV: Language Policy',
    scenario: 'Reviewing the rule on English-only communication. The current rule mandates English across all school premises (classroom, mess, playground, bus). Deliberate and draft an amendment to balance English learning in the classroom with linguistic freedom and emotional well-being outside the classroom for bilingual learners (e.g. Telugu speakers at home).',
    originalRule: 'Rule 4.1: All students must speak exclusively in English at all times across all school premises, including classrooms, corridors, sports field, mess, and bus.',
    currentRule: 'Rule 4.1: All students must speak exclusively in English at all times across all school premises, including classrooms, corridors, sports field, mess, and bus.',
    suggestedAmendment: 'Rule 4.1: English is mandatory inside the classroom during lessons. In the playground, dining mess, and corridors, students may speak their home languages (such as Telugu) or English, with respect and inclusion for all peers.',
    suggestedJustification: 'Allows multilingual learners to relax and express themselves comfortably outside class, while preserving focused English practice during lessons.',
    keywords: [
      'english', 'telugu', 'language', 'medium', 'mother tongue', 'home language',
      'classroom', 'class', 'mess', 'dining', 'canteen', 'playground', 'ground',
      'sports', 'corridor', 'bus', 'rule', 'rules', 'constitution', 'right', 'duty',
      'rights', 'duties', 'speak', 'speaking', 'talk', 'learn', 'practice', 'exclude',
      'exclusion', 'include', 'inclusion', 'fair', 'comfort', 'relax', 'friend',
      'punish', 'fine', 'scared', 'hesitant', 'communicate', 'freedom', 'amendment',
      'modify', 'change', 'agree', 'disagree', 'outside', 'inside', 'teacher', 'student'
    ]
  },
  {
    id: 'topic_digital_devices',
    title: 'Article II: Digital Learning Devices & Mobile Phones',
    shortTitle: 'Article II: Digital Devices',
    scenario: 'Reviewing the strict ban on digital devices on school grounds. Deliberate whether students should have the right to use tablets or phones for collaborative learning, online research, and language translation during group projects.',
    originalRule: 'Rule 2.1: Mobile phones and digital devices are strictly prohibited on school grounds at all times and will be confiscated if seen.',
    currentRule: 'Rule 2.1: Mobile phones and digital devices are strictly prohibited on school grounds at all times and will be confiscated if seen.',
    suggestedAmendment: 'Rule 2.1: Personal digital devices may be used during designated collaborative project periods for educational research and language translation, provided they are silenced during direct instruction.',
    suggestedJustification: 'Leverages modern technology for collaborative peer inquiry while preventing classroom distractions.',
    keywords: [
      'device', 'phone', 'tablet', 'digital', 'screen', 'research', 'translation',
      'distraction', 'learning', 'technology', 'access', 'rule', 'rules', 'constitution',
      'internet', 'class', 'project', 'collaborate', 'focus', 'fair', 'amendment', 'allow'
    ]
  },
  {
    id: 'topic_restorative_justice',
    title: 'Article V: Conflict Resolution & Restorative Circles',
    shortTitle: 'Article V: Conflict Resolution',
    scenario: 'Reviewing punitive detention policies for minor peer infractions. Deliberate whether peer mediation circles should replace automatic detention to foster mutual understanding and restorative justice.',
    originalRule: 'Rule 5.1: Any peer disagreement or rule infraction results in immediate detention and loss of break privileges.',
    currentRule: 'Rule 5.1: Any peer disagreement or rule infraction results in immediate detention and loss of break privileges.',
    suggestedAmendment: 'Rule 5.1: Minor peer disputes shall first be resolved through student-led mediation circles to restore mutual understanding before administrative penalties are applied.',
    suggestedJustification: 'Builds empathy, accountability, and problem-solving skills rather than resentment from punitive detentions.',
    keywords: [
      'conflict', 'dispute', 'mediation', 'peer', 'restorative', 'justice', 'detention',
      'punishment', 'empathy', 'respect', 'rule', 'rules', 'constitution', 'circle',
      'listen', 'fair', 'solve', 'peace', 'understand', 'amendment', 'accountability'
    ]
  }
];

// -------------------------------------------------------------
// State Store for Collaborative Session
// -------------------------------------------------------------
const sessionState = {
  isStarted: false,
  startTime: null,
  pauseTime: null,
  activeTopic: CURATED_TOPICS[0], // Default featured topic (Language Policy)
  curatedTopics: CURATED_TOPICS,
  preSessionProposals: [],        // Proposals submitted by students before teacher starts session
  proposals: [],                  // Active proposals under deliberation
  participants: {},               // socket.id -> participant
  messages: [],
  pendingAIPrompts: [],
  offTopicFlags: [],
  autoApproveAI: false
};

// General off-topic distractor keywords
const GENERAL_OFF_TOPIC_KEYWORDS = [
  'cricket', 'ipl', 'match', 'pubg', 'freefire', 'minecraft', 'roblox', 'fifa',
  'movie', 'cinema', 'actor', 'hero', 'song', 'instagram', 'reels', 'tiktok',
  'youtube video', 'netflix', 'bunk', 'homework copy', 'biryani party', 'food order',
  'cheat', 'game score', 'playstation', 'xbox'
];

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
// Topic-Scoped NLP & Discourse Analytics Engine
// -------------------------------------------------------------
function analyzeDiscourse(content, senderName, participants, activeTopic) {
  const text = content.toLowerCase();
  const topicKeywords = (activeTopic && activeTopic.keywords) ? activeTopic.keywords : CURATED_TOPICS[0].keywords;

  // 1. Check Off-Topic Drift strictly against the active topic
  let hasOffTopicWord = GENERAL_OFF_TOPIC_KEYWORDS.some(kw => text.includes(kw));
  let hasTopicWord = topicKeywords.some(kw => text.includes(kw));
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

    const inactiveSeconds = (now - s.lastActiveTime) / 1000;
    if (s.messageCount === 0 || inactiveSeconds > 60) {
      s.status = 'silent';
    } else if (inactiveSeconds > 30 || s.wordCount < (totalWords / totalStudents) * 0.4) {
      s.status = 'hesitant';
    } else {
      s.status = 'active';
    }
  });

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
// Pluggable LLM Hook (Gemini API Integration)
// -------------------------------------------------------------
async function callGeminiForScaffold(activeTopic, studentName, recentMessages, triggerType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const transcript = recentMessages.slice(-5).map(m => `${m.senderName}: "${m.content}"`).join('\n');
    const prompt = `You are a supportive, democratic classroom AI facilitator in "Student Sabha".
Active Deliberation Article: "${activeTopic.title}"
Scenario: "${activeTopic.scenario}"
Current Constitutional Rule: "${activeTopic.currentRule}"

Trigger: The student "${studentName}" is ${triggerType === 'silent' ? 'currently silent or slow to speak' : 'dominating talk-time'}.
Recent Class Messages:
${transcript || '(Discussion beginning)'}

Task: Formulate a single concise, polite, open-ended scaffold question (maximum 2 sentences) addressed to @${studentName}.
- If silent: warmly invite their viewpoint on fairness and peer comfort regarding the active constitutional rule.
- If dominant: praise their arguments and nudge them to invite critique or counter-arguments from their quieter peers.
Do NOT give the answer. Output ONLY the question text.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 120, temperature: 0.7 }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
    }
  } catch (err) {
    console.warn('Gemini API call failed, using built-in heuristic:', err.message);
  }
  return null;
}

// -------------------------------------------------------------
// Scaffolding Generator (Strictly Scoped to Active Topic)
// -------------------------------------------------------------
  async function evaluateInclusivityAndGenerateAIPrompts() {
    if (!sessionState.isStarted) return;

    const students = Object.values(sessionState.participants).filter(p => p.role === 'student');
    if (students.length < 2) return;

    const metrics = calculateInclusivityMetrics();
    const now = Date.now();
    const topic = sessionState.activeTopic;

    // 1. Silent Student Detection
    const silentStudents = metrics.students.filter(s => s.status === 'silent' && s.lastActiveSecondsAgo >= 45);
    for (const s of silentStudents) {
      const existing = sessionState.pendingAIPrompts.find(
        p => p.targetStudentName === s.name && (now - p.timestamp < 60000) && p.status === 'pending'
      );
      if (!existing) {
          let promptText = await callGeminiForScaffold(topic, s.name, sessionState.messages, 'silent');

          if (!promptText) {
            promptText = `@${s.name}, we would love to hear your perspective on ${topic.shortTitle}! What amendment to this rule would feel fairest to you and your peers?`;
            if (topic.id === 'topic_language_policy') {
              promptText = `@${s.name}, we would love to hear your thoughts! Do you feel speaking home languages like Telugu should be allowed during lunchtime in the mess or sports in the playground? What rule would feel fairest to you?`;
            }
          }

          const promptId = 'ai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const promptObj = {
            id: promptId,
            type: 'inclusivity_silent',
            targetStudentName: s.name,
            targetStudentId: s.id,
            suggestedPrompt: promptText,
            rationale: `Silent learner scaffold: ${s.name} has contributed ${s.wordCount} words. Prompt connects to the dilemma in ${topic.shortTitle}.`,
            timestamp: now,
            status: 'pending'
          };
          sessionState.pendingAIPrompts.push(promptObj);
          broadcastTeacherUpdate();
        }
      }

      // 2. Dominance Student Pacing
      if (metrics.totalMessages >= 4 && metrics.giniSkew > 0.45) {
        const dominant = metrics.students.find(s => s.wordShare >= 65 && s.wordCount >= 30);
        const quiet = metrics.students.find(s => s.wordShare <= 15);
        if (dominant && quiet) {
          const existing = sessionState.pendingAIPrompts.find(
            p => p.type === 'dominance_pacing' && (now - p.timestamp < 90000) && p.status === 'pending'
          );
          if (!existing) {
            let promptText = await callGeminiForScaffold(topic, dominant.name, sessionState.messages, 'dominant');

            if (!promptText) {
              promptText = `Great points, @${dominant.name}! To build group consensus on ${topic.shortTitle}, could you ask @${quiet.name} what potential concerns or edge cases they see with your proposal?`;
            }

            const promptId = 'ai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            const promptObj = {
              id: promptId,
              type: 'dominance_pacing',
              targetStudentName: dominant.name,
              suggestedPrompt: promptText,
              rationale: `Dominance pacing: ${dominant.name} holds ${dominant.wordShare}% of conversation. Encourages transactive inquiry.`,
              timestamp: now,
              status: 'pending'
            };
            sessionState.pendingAIPrompts.push(promptObj);
            broadcastTeacherUpdate();
          }
        }
      }
    }

    // Periodic check
    setInterval(() => {
      evaluateInclusivityAndGenerateAIPrompts();
      broadcastMetricsUpdate();
    }, 10000);

    function broadcastMetricsUpdate() {
      const metrics = calculateInclusivityMetrics();
      io.emit('metrics:update', metrics);
    }

    function broadcastTeacherUpdate() {
      const metrics = calculateInclusivityMetrics();
      io.to('teachers').emit('teacher:dashboard_update', {
        metrics,
        activeTopic: sessionState.activeTopic,
        curatedTopics: sessionState.curatedTopics,
        preSessionProposals: sessionState.preSessionProposals,
        proposals: sessionState.proposals,
        pendingAIPrompts: sessionState.pendingAIPrompts.filter(p => p.status === 'pending'),
        offTopicFlags: sessionState.offTopicFlags,
        sessionStarted: sessionState.isStarted
      });
    }

    // -------------------------------------------------------------
    // Socket.IO Real-Time Handlers
    // -------------------------------------------------------------
    io.on('connection', (socket) => {
      // Join Session (With Secret Passcode Validation for Teacher)
      socket.on('join', ({ role, name, rollNo, passcode }) => {
        const cleanRole = role === 'teacher' ? 'teacher' : 'student';
        const cleanName = (name || '').trim() || (cleanRole === 'teacher' ? 'Teacher' : 'Student');
        const cleanRoll = (rollNo || '').trim();

        // Teacher secret code check
        if (cleanRole === 'teacher') {
          const cleanPass = (passcode || '').trim();
          if (cleanPass !== 'teacher') {
            socket.emit('auth:error', { message: 'Invalid teacher secret code. Please enter "teacher" to access the Teacher Portal.' });
            return;
          }
        }

        sessionState.participants[socket.id] = {
          id: socket.id,
          role: cleanRole,
          name: cleanName,
          rollNo: cleanRoll,
          joinedAt: Date.now(),
          lastActiveTime: Date.now(),
          wordCount: 0,
          charCount: 0,
          messageCount: 0,
          status: 'active'
        };

        if (cleanRole === 'teacher') {
          socket.join('teachers');
        } else {
          socket.join('students');
        }

        // Send full initial state to connecting client
        socket.emit('init', {
          user: sessionState.participants[socket.id],
          isStarted: sessionState.isStarted,
          activeTopic: sessionState.activeTopic,
          curatedTopics: sessionState.curatedTopics,
          preSessionProposals: sessionState.preSessionProposals,
          proposals: sessionState.proposals,
          messages: sessionState.messages,
          metrics: calculateInclusivityMetrics()
        });

        // Notify others
        io.emit('participant:joined', {
          participant: sessionState.participants[socket.id],
          metrics: calculateInclusivityMetrics()
        });

        broadcastTeacherUpdate();
      });

      // Student Submits Proposed Amendment (Can occur before OR after session starts!)
      socket.on('constitution:propose_amendment', ({ proposedText, justification }) => {
        const sender = sessionState.participants[socket.id];
        if (!sender) return;

        const cleanText = (proposedText || '').trim();
        const cleanJustification = (justification || '').trim();

        if (!cleanText || !cleanJustification) {
          socket.emit('error:notice', { message: 'Both the proposed clause text and decision justification are required.' });
          return;
        }

        // Pre-session submission (Step 1 in requested workflow)
        if (!sessionState.isStarted) {
          const prePropObj = {
            id: 'prop_pre_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            proposedBy: socket.id,
            studentName: sender.name,
            rollNo: sender.rollNo,
            proposedText: cleanText,
            justification: cleanJustification,
            timestamp: Date.now(),
            status: 'pre_session_review',
            votes: {
              [socket.id]: { vote: 'accept', studentName: sender.name }
            }
          };

          sessionState.preSessionProposals.push(prePropObj);

          // Notify the submitting student
          socket.emit('student:pre_session_proposal_submitted', {
            proposal: prePropObj,
            message: 'Your amendment proposal has been submitted to your teacher for review! The teacher will select it to open for group deliberation.'
          });

          // Notify teachers in real time
          io.to('teachers').emit('teacher:new_pre_session_proposal', {
            proposal: prePropObj,
            preSessionProposals: sessionState.preSessionProposals
          });

          broadcastTeacherUpdate();
          return;
        }

        // Active session submission
        const words = (cleanText + ' ' + cleanJustification).split(/\s+/).filter(w => w.length > 0).length;
        sender.wordCount += words;
        sender.messageCount += 1;
        sender.lastActiveTime = Date.now();

        const proposalObj = {
          id: 'prop_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          proposedBy: socket.id,
          studentName: sender.name,
          rollNo: sender.rollNo,
          proposedText: cleanText,
          justification: cleanJustification,
          timestamp: Date.now(),
          status: 'open',
          votes: {
            [socket.id]: { vote: 'accept', studentName: sender.name }
          }
        };

        sessionState.proposals.push(proposalObj);

        const proposalChatMsg = {
          id: 'sys_' + Date.now(),
          senderId: 'system',
          senderName: 'Student Sabha · Constitution Desk',
          senderRole: 'system',
          content: `📜 ${sender.name} proposed an amendment to ${sessionState.activeTopic.shortTitle}!\n"${cleanText}"\nJustification: ${cleanJustification}`,
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

      // Student Sends Chat Message
      socket.on('chat:message', ({ content }) => {
        const sender = sessionState.participants[socket.id];
        if (!sender) return;

        if (!sessionState.isStarted && sender.role === 'student') {
          socket.emit('error:notice', { message: 'Discussion has not been opened by the teacher yet.' });
          return;
        }

        const trimmedContent = (content || '').trim();
        if (!trimmedContent) return;

        const words = trimmedContent.split(/\s+/).filter(w => w.length > 0).length;
        sender.wordCount += words;
        sender.charCount += trimmedContent.length;
        sender.messageCount += 1;
        sender.lastActiveTime = Date.now();
        sender.status = 'active';

        // Discourse analysis scoped to the active topic
        const analysis = analyzeDiscourse(trimmedContent, sender.name, sessionState.participants, sessionState.activeTopic);

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

        // Off-topic drift alert scoped to active topic
        if (analysis.isOffTopic) {
          const flagId = 'flag_' + Date.now();
          const flagObj = {
            id: flagId,
            studentName: sender.name,
            studentRoll: sender.rollNo,
            messageContent: trimmedContent,
            reason: `Discussion drifted off-topic away from ${sessionState.activeTopic.shortTitle}.`,
            timestamp: Date.now()
          };
          sessionState.offTopicFlags.push(flagObj);

          const redirectPromptId = 'ai_redirect_' + Date.now();
          const redirectPrompt = {
            id: redirectPromptId,
            type: 'off_topic_redirect',
            targetStudentName: sender.name,
            suggestedPrompt: `Gentle reminder to the class: Let's keep our focus on ${sessionState.activeTopic.shortTitle}. How can our proposed amendment best balance peer rights and classroom goals?`,
            rationale: `Off-topic intervention: ${sender.name} posted a message unrelated to ${sessionState.activeTopic.shortTitle}.`,
            timestamp: Date.now(),
            status: 'pending'
          };
          sessionState.pendingAIPrompts.push(redirectPrompt);
          broadcastTeacherUpdate();
        }

        evaluateInclusivityAndGenerateAIPrompts();
        broadcastMetricsUpdate();
        broadcastTeacherUpdate();
      });

      // Student Votes on Proposed Amendment
      socket.on('constitution:vote', ({ proposalId, vote, reason }) => {
        const sender = sessionState.participants[socket.id];
        if (!sender) return;

        if (!sessionState.isStarted) {
          socket.emit('error:notice', { message: 'Voting is disabled while session is paused.' });
          return;
        }

        const proposal = sessionState.proposals.find(p => p.id === proposalId);
        if (!proposal || proposal.status !== 'open') return;

        proposal.votes[socket.id] = {
          vote: vote === 'accept' ? 'accept' : 'revise',
          studentName: sender.name,
          reason: (reason || '').trim()
        };

        sender.lastActiveTime = Date.now();

        const students = Object.values(sessionState.participants).filter(p => p.role === 'student');
        const totalStudents = students.length;
        const voteEntries = Object.values(proposal.votes);
        const acceptCount = voteEntries.filter(v => v.vote === 'accept').length;

        // Consensus rule: Unanimous if <= 2 students; 2/3rds supermajority (>= 66%) if >= 3 students
        let consensusReached = false;
        if (totalStudents <= 2 && acceptCount >= totalStudents) {
          consensusReached = true;
        } else if (totalStudents >= 3 && acceptCount >= Math.ceil(totalStudents * 0.66)) {
          consensusReached = true;
        }

        if (consensusReached) {
          proposal.status = 'accepted';
          sessionState.activeTopic.currentRule = proposal.proposedText;

          const ratificationMsg = {
            id: 'sys_ratified_' + Date.now(),
            senderId: 'system',
            senderName: 'Student Sabha · Constitution Desk',
            senderRole: 'system',
            content: `🎉 CONSENSUS REACHED! ${sessionState.activeTopic.shortTitle} has been formally ratified by the class:\n"${proposal.proposedText}"`,
            timestamp: Date.now(),
            epistemicType: 'agreement'
          };
          sessionState.messages.push(ratificationMsg);

          io.emit('constitution:ratified', {
            proposalId: proposal.id,
            currentRule: sessionState.activeTopic.currentRule,
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
      // Teacher Topic Selection & Session Controls
      // -------------------------------------------------------------
      socket.on('teacher:launch_topic', ({ topicId, preSessionProposalId }) => {
        let chosenTopic = null;

        if (preSessionProposalId) {
          const p = sessionState.preSessionProposals.find(item => item.id === preSessionProposalId);
          if (p) {
            chosenTopic = {
              id: 'topic_student_' + p.id,
              title: `Student Amendment by ${p.studentName}`,
              shortTitle: `Amendment (${p.studentName})`,
              scenario: `Deliberating on the amendment proposed by ${p.studentName}: "${p.proposedText}"`,
              originalRule: sessionState.activeTopic.originalRule,
              currentRule: sessionState.activeTopic.currentRule,
              keywords: sessionState.activeTopic.keywords
            };

            const activeProp = {
              ...p,
              status: 'open',
              timestamp: Date.now()
            };
            sessionState.proposals = [activeProp];
          }
        } else if (topicId) {
          const cur = CURATED_TOPICS.find(t => t.id === topicId);
          if (cur) {
            chosenTopic = { ...cur };
            sessionState.proposals = []; // Start fresh with no placeholder proposals; students propose their own!
          }
        }

        if (!chosenTopic) chosenTopic = CURATED_TOPICS[0];

        sessionState.activeTopic = chosenTopic;
        sessionState.isStarted = true;
        sessionState.startTime = Date.now();

        const startMsg = {
          id: 'sys_start_' + Date.now(),
          senderId: 'teacher',
          senderName: 'Teacher',
          senderRole: 'teacher',
          content: `📢 Discussion is now officially open on: "${chosenTopic.title}"!\nReview the amendment proposal on the right, share your arguments, and vote to reach consensus.`,
          timestamp: Date.now(),
          epistemicType: 'inquiry'
        };
        sessionState.messages.push(startMsg);

        io.emit('session:started', {
          isStarted: true,
          startTime: sessionState.startTime,
          activeTopic: sessionState.activeTopic,
          proposals: sessionState.proposals,
          startMessage: startMsg
        });

        broadcastTeacherUpdate();
      });

      socket.on('teacher:start_session', () => {
        // If not started with launch_topic, starts with current activeTopic
        sessionState.isStarted = true;
        sessionState.startTime = sessionState.startTime || Date.now();

        const startMsg = {
          id: 'sys_start_' + Date.now(),
          senderId: 'teacher',
          senderName: 'Teacher',
          senderRole: 'teacher',
          content: `📢 Discussion is now officially open on "${sessionState.activeTopic.shortTitle}"!`,
          timestamp: Date.now(),
          epistemicType: 'inquiry'
        };
        sessionState.messages.push(startMsg);

        io.emit('session:started', {
          isStarted: true,
          startTime: sessionState.startTime,
          activeTopic: sessionState.activeTopic,
          proposals: sessionState.proposals,
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
        sessionState.preSessionProposals = [];
        sessionState.proposals = [];
        sessionState.pendingAIPrompts = [];
        sessionState.offTopicFlags = [];
        sessionState.activeTopic = { ...CURATED_TOPICS[0] };

        Object.values(sessionState.participants).forEach(p => {
          p.wordCount = 0;
          p.charCount = 0;
          p.messageCount = 0;
          p.status = 'active';
          p.lastActiveTime = Date.now();
        });

        io.emit('session:reset', {
          activeTopic: sessionState.activeTopic,
          curatedTopics: sessionState.curatedTopics,
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

        sessionState.pendingAIPrompts.splice(promptIndex, 1);
        broadcastTeacherUpdate();
      });

      socket.on('teacher:reject_ai_prompt', ({ promptId }) => {
        const promptIndex = sessionState.pendingAIPrompts.findIndex(p => p.id === promptId);
        if (promptIndex !== -1) {
          sessionState.pendingAIPrompts.splice(promptIndex, 1);
          broadcastTeacherUpdate();
        }
      });

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

      socket.on('teacher:dismiss_flag', ({ flagId }) => {
        sessionState.offTopicFlags = sessionState.offTopicFlags.filter(f => f.id !== flagId);
        broadcastTeacherUpdate();
      });

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
      console.log(`🏛️  Student Sabha Server running on:`);
      console.log(`   ➜ Localhost:      http://localhost:${PORT}`);
      localIps.forEach(ip => {
        console.log(`   ➜ Local Network:  http://${ip}:${PORT}`);
      });
      console.log(`=============================================================\n`);
    });
