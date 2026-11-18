// ==========================================================
// LexiCollab: Teacher Dashboard Controller (Teacher-in-the-Loop)
// ==========================================================

const btnStartSession = document.getElementById('btnStartSession');
const btnPauseSession = document.getElementById('btnPauseSession');
const btnResetSession = document.getElementById('btnResetSession');
const sessionStatusBadge = document.getElementById('sessionStatusBadge');
const sessionStatusText = document.getElementById('sessionStatusText');
const sessionTimer = document.getElementById('sessionTimer');

const metricStudentCount = document.getElementById('metricStudentCount');
const metricMessageCount = document.getElementById('metricMessageCount');
const metricWordCount = document.getElementById('metricWordCount');
const metricBalanceRating = document.getElementById('metricBalanceRating');

const studentParticipationList = document.getElementById('studentParticipationList');
const teacherChatFeed = document.getElementById('teacherChatFeed');
const aiPromptsQueue = document.getElementById('aiPromptsQueue');
const offTopicFlagsList = document.getElementById('offTopicFlagsList');
const teacherCurrentRule = document.getElementById('teacherCurrentRule');
const teacherProposalsList = document.getElementById('teacherProposalsList');
const teacherDirectMessageForm = document.getElementById('teacherDirectMessageForm');
const teacherDirectInput = document.getElementById('teacherDirectInput');

let teacherTimerInterval = null;

function initTeacherDashboard() {
  updateTeacherSessionState(AppState.isSessionStarted);

  // Render initial data if exists
  if (AppState.metrics) {
    renderTeacherMetrics(AppState.metrics);
  }
  if (AppState.messages && AppState.messages.length > 0) {
    teacherChatFeed.innerHTML = '';
    AppState.messages.forEach(appendTeacherChatMessage);
  }
  if (AppState.topic) {
    teacherCurrentRule.textContent = `"${AppState.topic.currentRule}"`;
  }
  if (AppState.proposals) {
    renderTeacherProposals(AppState.proposals);
  }

  setupTeacherEventListeners();
}

function setupTeacherEventListeners() {
  btnStartSession.addEventListener('click', () => {
    socket.emit('teacher:start_session');
  });

  btnPauseSession.addEventListener('click', () => {
    socket.emit('teacher:pause_session');
  });

  btnResetSession.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the session? All chat messages and amendment proposals will be cleared.')) {
      socket.emit('teacher:reset_session');
    }
  });

  teacherDirectMessageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = teacherDirectInput.value.trim();
    if (!content) return;

    socket.emit('teacher:send_direct_message', { content });
    teacherDirectInput.value = '';
    showToast('Teacher intervention broadcasted to student chat.', 'success');
  });
}

function updateTeacherSessionState(isStarted) {
  if (isStarted) {
    sessionStatusBadge.className = 'status-pill status-live';
    sessionStatusText.textContent = 'Live Discussion in Progress';
    btnStartSession.classList.add('hidden');
    btnPauseSession.classList.remove('hidden');

    if (!teacherTimerInterval) {
      const start = AppState.sessionStartTime || Date.now();
      teacherTimerInterval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - start) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        sessionTimer.textContent = `${mins}:${secs}`;
      }, 1000);
    }
  } else {
    sessionStatusBadge.className = 'status-pill status-waiting';
    sessionStatusText.textContent = 'Session Paused / Waiting to Start';
    btnStartSession.classList.remove('hidden');
    btnPauseSession.classList.add('hidden');

    if (teacherTimerInterval) {
      clearInterval(teacherTimerInterval);
      teacherTimerInterval = null;
    }
  }
}

// -------------------------------------------------------------
// Inclusivity Metrics & Participation Monitor Rendering
// -------------------------------------------------------------
function renderTeacherMetrics(metrics) {
  if (!metrics) return;

  metricStudentCount.textContent = metrics.totalStudents;
  metricMessageCount.textContent = metrics.totalMessages;
  metricWordCount.textContent = metrics.totalWords;

  // Balance status with color
  metricBalanceRating.textContent = metrics.balanceRating;
  if (metrics.giniSkew > 0.5) {
    metricBalanceRating.style.color = 'var(--danger)';
  } else if (metrics.giniSkew > 0.3) {
    metricBalanceRating.style.color = 'var(--warning)';
  } else {
    metricBalanceRating.style.color = '#38bdf8';
  }

  // Render individual student cards
  if (metrics.students.length === 0) {
    studentParticipationList.innerHTML = '<div class="empty-state">No students have joined yet. Waiting for students to connect...</div>';
    return;
  }

  let html = '';
  metrics.students.forEach(s => {
    let statusClass = 'active';
    let statusLabel = '🟢 Active';
    let cardClass = 'status-active-card';

    if (s.status === 'silent') {
      statusClass = 'silent';
      statusLabel = '🔴 Silent / Inactive';
      cardClass = 'status-silent-card';
    } else if (s.status === 'hesitant') {
      statusClass = 'hesitant';
      statusLabel = '🟡 Low Activity';
      cardClass = 'status-hesitant-card';
    }

    html += `
      <div class="student-monitor-card ${cardClass}">
        <div class="student-card-top">
          <div>
            <span class="student-card-name">${escapeHtml(s.name)}</span>
            <span class="student-card-roll">[Roll: ${escapeHtml(s.rollNo || 'N/A')}]</span>
          </div>
          <span class="status-tag ${statusClass}">${statusLabel}</span>
        </div>
        <div class="student-stats-row">
          <span>Words: <strong>${s.wordCount}</strong> (${s.wordShare}%)</span>
          <span>Messages: <strong>${s.messageCount}</strong></span>
          <span>Idle: <strong>${s.lastActiveSecondsAgo}s ago</strong></span>
        </div>
        <div class="progress-bar-wrap" title="Share of conversation: ${s.wordShare}%">
          <div class="progress-bar-fill" style="width: ${Math.max(s.wordShare, 4)}%"></div>
        </div>
      </div>
    `;
  });

  studentParticipationList.innerHTML = html;
}

// -------------------------------------------------------------
// Live Class Discourse Feed (Teacher View)
// -------------------------------------------------------------
function appendTeacherChatMessage(msg) {
  // Clear empty state if present
  const empty = teacherChatFeed.querySelector('.empty-state');
  if (empty) empty.remove();

  const bubble = document.createElement('div');
  let roleClass = '';
  let badgeLabel = 'Student';

  if (msg.senderRole === 'teacher') {
    roleClass = 'teacher-bubble';
    badgeLabel = 'Teacher Intervention';
  } else if (msg.senderRole === 'ai') {
    roleClass = 'ai-bubble';
    badgeLabel = 'AI Facilitator (Approved)';
  } else if (msg.senderRole === 'system') {
    roleClass = 'system-bubble';
    badgeLabel = 'Constitution Desk';
  } else {
    badgeLabel = `Student [Roll ${msg.senderRoll || 'N/A'}]`;
  }

  if (msg.isOffTopic) {
    roleClass += ' offtopic-bubble';
  }

  bubble.className = `chat-bubble ${roleClass}`;

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Epistemic Tag
  let epistemicBadge = '';
  if (msg.isOffTopic) {
    epistemicBadge = `<span class="epistemic-tag epistemic-offtopic">⚠️ Off-Topic Drift</span>`;
  } else if (msg.epistemicType === 'warrant') {
    epistemicBadge = `<span class="epistemic-tag epistemic-warrant">💡 Explanation / Warrant</span>`;
  } else if (msg.epistemicType === 'proposal') {
    epistemicBadge = `<span class="epistemic-tag epistemic-proposal">📜 Constitutional Proposal</span>`;
  } else if (msg.epistemicType === 'counter-claim') {
    epistemicBadge = `<span class="epistemic-tag epistemic-counter">⚖️ Counter-Claim / Disagreement</span>`;
  } else if (msg.epistemicType === 'agreement') {
    epistemicBadge = `<span class="epistemic-tag epistemic-agreement">🤝 Consensus Building</span>`;
  } else if (msg.epistemicType === 'inquiry') {
    epistemicBadge = `<span class="epistemic-tag epistemic-inquiry">❓ Epistemic Inquiry</span>`;
  }

  // Transactive Marker
  let transactiveTag = '';
  if (msg.transactiveTarget) {
    transactiveTag = `<span class="badge badge-accent" style="font-size: 0.65rem;">Directs to @${escapeHtml(msg.transactiveTarget)}</span>`;
  }

  bubble.innerHTML = `
    <div class="bubble-header">
      <div class="bubble-sender">
        <span>${escapeHtml(msg.senderName)}</span>
        <span class="badge badge-primary" style="font-size: 0.65rem;">${badgeLabel}</span>
        ${transactiveTag}
      </div>
      <span class="bubble-time">${timeStr}</span>
    </div>
    <div class="bubble-content">${escapeHtml(msg.content)}</div>
    ${epistemicBadge}
  `;

  teacherChatFeed.appendChild(bubble);
  teacherChatFeed.scrollTop = teacherChatFeed.scrollHeight;
}

// -------------------------------------------------------------
// Teacher-in-the-Loop AI Scaffolding Suggestions Queue
// -------------------------------------------------------------
function renderAIPromptsQueue(prompts) {
  if (!prompts || prompts.length === 0) {
    aiPromptsQueue.innerHTML = '<div class="empty-state">No pending AI prompts. The AI facilitator is actively monitoring discourse balance.</div>';
    return;
  }

  let html = '';
  prompts.forEach(p => {
    let typeBadge = 'Inclusivity Nudge';
    if (p.type === 'dominance_pacing') typeBadge = 'Dominance Pacing';
    if (p.type === 'off_topic_redirect') typeBadge = 'Off-Topic Redirect';

    html += `
      <div class="ai-card" id="aiCard_${p.id}">
        <div class="ai-card-title">
          <span class="ai-card-badge">🤖 Suggested: ${typeBadge}</span>
          <span class="badge badge-accent">Awaiting Approval</span>
        </div>
        <div class="ai-rationale">
          <strong>Pedagogical Rationale:</strong> ${escapeHtml(p.rationale)}
        </div>
        <div class="ai-prompt-box" id="promptText_${p.id}">
          "${escapeHtml(p.suggestedPrompt)}"
        </div>
        <textarea class="ai-prompt-editor hidden" id="promptEditor_${p.id}" rows="3">${escapeHtml(p.suggestedPrompt)}</textarea>
        <div class="ai-card-actions">
          <button class="btn btn-success btn-sm" onclick="approveAIPrompt('${p.id}')">
            ✓ Approve &amp; Send to Class
          </button>
          <button class="btn btn-outline btn-sm" onclick="toggleEditAIPrompt('${p.id}')" id="btnEditPrompt_${p.id}">
            ✎ Edit
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="rejectAIPrompt('${p.id}')">
            ✕ Reject
          </button>
        </div>
      </div>
    `;
  });

  aiPromptsQueue.innerHTML = html;
}

window.approveAIPrompt = function(promptId) {
  const editor = document.getElementById(`promptEditor_${promptId}`);
  let editedPrompt = null;
  if (editor && !editor.classList.contains('hidden')) {
    editedPrompt = editor.value.trim();
  }

  socket.emit('teacher:approve_ai_prompt', {
    promptId,
    editedPrompt
  });
  showToast('Approved AI prompt posted to student discussion.', 'success');
};

window.toggleEditAIPrompt = function(promptId) {
  const textDiv = document.getElementById(`promptText_${promptId}`);
  const editor = document.getElementById(`promptEditor_${promptId}`);
  const btn = document.getElementById(`btnEditPrompt_${promptId}`);

  if (editor.classList.contains('hidden')) {
    editor.classList.remove('hidden');
    textDiv.classList.add('hidden');
    btn.textContent = 'Hide Edit';
    editor.focus();
  } else {
    editor.classList.add('hidden');
    textDiv.classList.remove('hidden');
    btn.textContent = '✎ Edit';
  }
};

window.rejectAIPrompt = function(promptId) {
  socket.emit('teacher:reject_ai_prompt', { promptId });
  showToast('AI prompt dismissed / overridden.', 'info');
};

// -------------------------------------------------------------
// Off-Topic Flags List Rendering
// -------------------------------------------------------------
function renderOffTopicFlags(flags) {
  if (!flags || flags.length === 0) {
    offTopicFlagsList.innerHTML = '<div class="empty-state">No off-topic drift detected. Discussion is currently aligned with task goals.</div>';
    return;
  }

  let html = '';
  flags.forEach(f => {
    html += `
      <div class="flag-item">
        <div class="flag-header">
          <span>⚠️ ${escapeHtml(f.studentName)} (Roll: ${escapeHtml(f.studentRoll || 'N/A')})</span>
          <button class="btn btn-outline-danger btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;" onclick="dismissFlag('${f.id}')">Dismiss</button>
        </div>
        <div class="flag-quote">"${escapeHtml(f.messageContent)}"</div>
        <div style="font-size: 0.72rem; color: #fca5a5;">${escapeHtml(f.reason)}</div>
      </div>
    `;
  });

  offTopicFlagsList.innerHTML = html;
}

window.dismissFlag = function(flagId) {
  socket.emit('teacher:dismiss_flag', { flagId });
};

// -------------------------------------------------------------
// Classroom Constitution State (Teacher View)
// -------------------------------------------------------------
function renderTeacherProposals(proposals) {
  if (!proposals || proposals.length === 0) {
    teacherProposalsList.innerHTML = '<div class="empty-substate">No amendments proposed yet.</div>';
    return;
  }

  let html = '';
  proposals.forEach(p => {
    const votes = Object.values(p.votes || {});
    const accepts = votes.filter(v => v.vote === 'accept').length;
    const totalVotes = votes.length;
    const isAccepted = p.status === 'accepted';

    html += `
      <div class="proposal-item-card ${isAccepted ? 'proposal-accepted' : ''}" style="padding: 0.7rem; margin-bottom: 0.5rem;">
        <div class="proposal-item-header">
          <span class="proposal-proposer">Proposed by ${escapeHtml(p.studentName)} [Roll: ${escapeHtml(p.rollNo || 'N/A')}]</span>
          <span class="badge ${isAccepted ? 'badge-success' : 'badge-warning'}">${isAccepted ? 'RATIFIED BY CLASS' : 'VOTING OPEN'}</span>
        </div>
        <div class="proposal-text-quote" style="font-size: 0.82rem; padding: 0.5rem;">"${escapeHtml(p.proposedText)}"</div>
        <div class="proposal-justification-box" style="font-size: 0.76rem; padding: 0.4rem 0.6rem;">
          <strong>Justification:</strong> ${escapeHtml(p.justification)}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
          <span>Acceptances: <strong>${accepts}</strong> / ${totalVotes} votes cast</span>
          <span>Status: <strong>${p.status.toUpperCase()}</strong></span>
        </div>
      </div>
    `;
  });

  teacherProposalsList.innerHTML = html;
}

// -------------------------------------------------------------
// Socket Event Listeners for Teacher
// -------------------------------------------------------------
socket.on('teacher:dashboard_update', (data) => {
  if (AppState.currentUser?.role !== 'teacher') return;
  if (data.metrics) renderTeacherMetrics(data.metrics);
  if (data.pendingAIPrompts) renderAIPromptsQueue(data.pendingAIPrompts);
  if (data.offTopicFlags) renderOffTopicFlags(data.offTopicFlags);
  if (data.sessionStarted !== undefined) updateTeacherSessionState(data.sessionStarted);
});

socket.on('chat:new_message', (msg) => {
  if (AppState.currentUser?.role !== 'teacher') return;
  AppState.messages.push(msg);
  appendTeacherChatMessage(msg);
});

socket.on('constitution:proposal_created', ({ proposal }) => {
  if (AppState.currentUser?.role !== 'teacher') return;
  AppState.proposals.push(proposal);
  renderTeacherProposals(AppState.proposals);
  showToast(`New amendment proposed by ${proposal.studentName}!`, 'info');
});

socket.on('constitution:vote_updated', ({ proposalId, votes }) => {
  if (AppState.currentUser?.role !== 'teacher') return;
  const p = AppState.proposals.find(item => item.id === proposalId);
  if (p) {
    p.votes = votes;
    renderTeacherProposals(AppState.proposals);
  }
});

socket.on('constitution:ratified', ({ currentRule, proposalId }) => {
  if (AppState.currentUser?.role !== 'teacher') return;
  AppState.topic.currentRule = currentRule;
  teacherCurrentRule.textContent = `"${currentRule}"`;
  const p = AppState.proposals.find(item => item.id === proposalId);
  if (p) p.status = 'accepted';
  renderTeacherProposals(AppState.proposals);
  showToast('Class has reached consensus and ratified an amendment to Article IV!', 'success');
});

