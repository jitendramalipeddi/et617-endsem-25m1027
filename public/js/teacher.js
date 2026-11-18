// ==========================================================
// Student Sabha: Teacher Dashboard Controller (Teacher-in-the-Loop)
// Production UI with Progressive Disclosure & Accordions
// ==========================================================

const btnPrimarySessionAction = document.getElementById('btnPrimarySessionAction');
const sessionActionLabel = document.getElementById('sessionActionLabel');
const btnResetSession = document.getElementById('btnResetSession');
const sessionTimer = document.getElementById('sessionTimer');
const teacherConnectedCount = document.getElementById('teacherConnectedCount');
const teacherTopTopicLabel = document.getElementById('teacherTopTopicLabel');

// Topic Selector Banner references
const teacherTopicSelectionBanner = document.getElementById('teacherTopicSelectionBanner');
const teacherPreSessionProposalsList = document.getElementById('teacherPreSessionProposalsList');
const teacherCuratedTopicsList = document.getElementById('teacherCuratedTopicsList');
const teacherActiveArticleTitle = document.getElementById('teacherActiveArticleTitle');

// Tab references
const tabButtons = document.querySelectorAll('.tab-btn');
const tabDiscussion = document.getElementById('tabDiscussion');
const tabConstitution = document.getElementById('tabConstitution');
const feedMessageCountText = document.getElementById('feedMessageCountText');

// Accordion references
const metricBalancePill = document.getElementById('metricBalancePill');
const teacherTotalWords = document.getElementById('teacherTotalWords');
const teacherTotalMsgs = document.getElementById('teacherTotalMsgs');
const teacherGiniSkew = document.getElementById('teacherGiniSkew');
const studentParticipationList = document.getElementById('studentParticipationList');

const aiQueuePill = document.getElementById('aiQueuePill');
const aiPromptsQueue = document.getElementById('aiPromptsQueue');
const offTopicSection = document.getElementById('offTopicSection');
const offTopicFlagsList = document.getElementById('offTopicFlagsList');

const rosterCountPill = document.getElementById('rosterCountPill');
const connectedStudentsList = document.getElementById('connectedStudentsList');

const teacherChatFeed = document.getElementById('teacherChatFeed');
const teacherCurrentRule = document.getElementById('teacherCurrentRule');
const teacherProposalsList = document.getElementById('teacherProposalsList');

const teacherDirectMessageForm = document.getElementById('teacherDirectMessageForm');
const teacherDirectInput = document.getElementById('teacherDirectInput');

let teacherTimerInterval = null;

// Track expanded accordions (Rule: maximum 2 expanded at once to prevent overflow)
let openAccordions = ['accInclusivity'];

function initTeacherDashboard() {
  updateTeacherSessionState(AppState.isSessionStarted);
  setupTabs();
  setupAccordionRules();
  setupTeacherEventListeners();
  renderTopicSelector();

  if (AppState.metrics) {
    renderTeacherMetrics(AppState.metrics);
    renderTeacherRoster(AppState.metrics);
  }
  if (AppState.messages && AppState.messages.length > 0) {
    teacherChatFeed.innerHTML = '';
    AppState.messages.forEach(appendTeacherChatMessage);
    updateFeedCount();
  }
  if (AppState.activeTopic) {
    teacherCurrentRule.textContent = `"${AppState.activeTopic.currentRule}"`;
    if (teacherActiveArticleTitle) teacherActiveArticleTitle.textContent = AppState.activeTopic.title;
    if (teacherTopTopicLabel) teacherTopTopicLabel.textContent = AppState.activeTopic.shortTitle;
  }
  if (AppState.proposals) {
    renderTeacherProposals(AppState.proposals);
  }
}

// -------------------------------------------------------------
// Topic Selection & Pre-Session Proposal Review
// -------------------------------------------------------------
function renderTopicSelector() {
  if (!teacherTopicSelectionBanner) return;

  if (AppState.isSessionStarted) {
    teacherTopicSelectionBanner.classList.add('hidden');
    return;
  }

  teacherTopicSelectionBanner.classList.remove('hidden');

  // 1. Render Pre-Session Student Proposals
  const studentProposals = AppState.preSessionProposals || [];
  if (studentProposals.length === 0) {
    teacherPreSessionProposalsList.innerHTML = '<div class="empty-substate">No student proposals submitted yet. Students can propose amendments in their waiting room.</div>';
  } else {
    let html = '';
    studentProposals.forEach(p => {
      html += `
        <div class="topic-select-card">
          <div>
            <div class="flex-between">
              <span class="topic-card-title">${escapeHtml(p.studentName)} [Roll: ${escapeHtml(p.rollNo || 'N/A')}]</span>
              <span class="role-pill student" style="font-size: 0.65rem;">Student Proposal</span>
            </div>
            <div class="topic-card-desc" style="font-style: italic; margin-top: 0.35rem;">"${escapeHtml(p.proposedText)}"</div>
            <div style="font-size: 0.76rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
              <strong>Rationale:</strong> ${escapeHtml(p.justification)}
            </div>
          </div>
          <button type="button" class="btn-launch-topic" onclick="launchDeliberationOnProposal('${p.id}')">
            <span>▶ Open for Group Deliberation</span>
          </button>
        </div>
      `;
    });
    teacherPreSessionProposalsList.innerHTML = html;
  }

  // 2. Render Curated Constitutional Topics
  const curated = AppState.curatedTopics || [];
  if (curated.length === 0) {
    teacherCuratedTopicsList.innerHTML = '<div class="empty-substate">Loading curated articles...</div>';
  } else {
    let html = '';
    curated.forEach(t => {
      const isSelected = AppState.activeTopic?.id === t.id;
      html += `
        <div class="topic-select-card ${isSelected ? 'active-selected' : ''}">
          <div>
            <div class="flex-between">
              <span class="topic-card-title">${escapeHtml(t.title)}</span>
              ${isSelected ? '<span class="role-pill teacher" style="font-size: 0.65rem;">Default Task</span>' : ''}
            </div>
            <p class="topic-card-desc">${escapeHtml(t.scenario)}</p>
            <div class="topic-card-desc" style="font-size: 0.74rem; background: var(--bg-subtle); padding: 0.4rem; border-radius: 4px; border-left: 2px solid var(--teacher-primary);">
              <strong>Baseline Rule:</strong> ${escapeHtml(t.originalRule)}
            </div>
          </div>
          <button type="button" class="btn-launch-topic" onclick="launchDeliberationOnTopic('${t.id}')">
            <span>▶ Start Deliberation on this Article</span>
          </button>
        </div>
      `;
    });
    teacherCuratedTopicsList.innerHTML = html;
  }
}

window.launchDeliberationOnTopic = function(topicId) {
  socket.emit('teacher:launch_topic', { topicId });
  showToast('Launching class deliberation on chosen constitutional article...', 'info');
};

window.launchDeliberationOnProposal = function(preSessionProposalId) {
  socket.emit('teacher:launch_topic', { preSessionProposalId });
  showToast('Launching class deliberation on student amendment proposal...', 'info');
};

// -------------------------------------------------------------
// Tab Switching (65% Workspace Left Column)
// -------------------------------------------------------------
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      if (targetTab === 'tabDiscussion') {
        tabDiscussion.classList.remove('hidden');
        tabDiscussion.classList.add('active');
        tabConstitution.classList.add('hidden');
        tabConstitution.classList.remove('active');
      } else {
        tabConstitution.classList.remove('hidden');
        tabConstitution.classList.add('active');
        tabDiscussion.classList.add('hidden');
        tabDiscussion.classList.remove('active');
      }
    });
  });
}

function updateFeedCount() {
  const count = AppState.messages.length;
  feedMessageCountText.textContent = `${count} ${count === 1 ? 'message' : 'messages'}`;
}

// -------------------------------------------------------------
// Accordions Controller (Max 2 Open at Any Time)
// -------------------------------------------------------------
function setupAccordionRules() {
  // Ensure DOM matches openAccordions
  const allAccordionIds = ['accInclusivity', 'accAiScaffolds', 'accDirectInterventions', 'accRoster'];
  allAccordionIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (openAccordions.includes(id)) {
      el.classList.add('expanded');
    } else {
      el.classList.remove('expanded');
    }
  });
}

window.toggleAccordion = function(accId) {
  const targetEl = document.getElementById(accId);
  if (!targetEl) return;

  const isCurrentlyOpen = openAccordions.includes(accId);

  if (isCurrentlyOpen) {
    // Cannot close if it's the only one open
    if (openAccordions.length > 1) {
      openAccordions = openAccordions.filter(id => id !== accId);
      targetEl.classList.remove('expanded');
    }
  } else {
    // Open the new one. If already 2 open, close the oldest one.
    if (openAccordions.length >= 2) {
      const oldestId = openAccordions.shift();
      const oldestEl = document.getElementById(oldestId);
      if (oldestEl) oldestEl.classList.remove('expanded');
    }
    openAccordions.push(accId);
    targetEl.classList.add('expanded');
  }
};

// -------------------------------------------------------------
// Session Controls & Event Listeners
// -------------------------------------------------------------
function setupTeacherEventListeners() {
  btnPrimarySessionAction.addEventListener('click', () => {
    if (!AppState.isSessionStarted) {
      socket.emit('teacher:start_session');
    } else {
      socket.emit('teacher:pause_session');
    }
  });

  btnResetSession.addEventListener('click', () => {
    if (confirm('Reset session? All messages, voting records, and proposals will be cleared.')) {
      socket.emit('teacher:reset_session');
    }
  });

  // Preset Nudge Buttons
  document.querySelectorAll('.btn-nudge').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-nudge');
      teacherDirectInput.value = text;
      teacherDirectInput.focus();
    });
  });

  // Direct Teacher Broadcast Form
  teacherDirectMessageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = teacherDirectInput.value.trim();
    if (!content) return;

    socket.emit('teacher:send_direct_message', { content });
    teacherDirectInput.value = '';
    showToast('Guidance broadcasted to student discussion.', 'success');
  });
}

function updateTeacherSessionState(isStarted) {
  if (isStarted) {
    if (teacherTopicSelectionBanner) teacherTopicSelectionBanner.classList.add('hidden');
    sessionActionLabel.textContent = 'Pause Session';
    btnPrimarySessionAction.className = 'btn btn-ghost-subtle btn-sm';
    btnPrimarySessionAction.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
      <span>Pause Session</span>
    `;

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
    if (teacherTopicSelectionBanner) teacherTopicSelectionBanner.classList.remove('hidden');
    renderTopicSelector();
    sessionActionLabel.textContent = 'Start Discussion';
    btnPrimarySessionAction.className = 'btn btn-emerald-primary btn-sm';
    btnPrimarySessionAction.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      <span>Start Discussion</span>
    `;

    if (teacherTimerInterval) {
      clearInterval(teacherTimerInterval);
      teacherTimerInterval = null;
    }
  }
}

// -------------------------------------------------------------
// Inclusivity Metrics Rendering
// -------------------------------------------------------------
function renderTeacherMetrics(metrics) {
  if (!metrics) return;

  teacherTotalWords.textContent = metrics.totalWords;
  teacherTotalMsgs.textContent = metrics.totalMessages;
  teacherGiniSkew.textContent = metrics.giniSkew.toFixed(2);
  teacherConnectedCount.textContent = `${metrics.totalStudents} ${metrics.totalStudents === 1 ? 'Student' : 'Students'} Connected`;

  // Balance status pill
  if (metrics.giniSkew > 0.5) {
    metricBalancePill.className = 'badge-status badge-status-danger';
    metricBalancePill.textContent = 'Severe Skew';
  } else if (metrics.giniSkew > 0.3) {
    metricBalancePill.className = 'badge-status badge-status-warning';
    metricBalancePill.textContent = 'Moderate Skew';
  } else {
    metricBalancePill.className = 'badge-status badge-status-good';
    metricBalancePill.textContent = 'Equitable';
  }

  // Render individual student bars
  if (!metrics.students || metrics.students.length === 0) {
    studentParticipationList.innerHTML = '<div class="empty-substate">Awaiting student participation...</div>';
    return;
  }

  let html = '';
  metrics.students.forEach(s => {
    let borderClass = 'active-border';
    let statusText = 'Active';

    if (s.status === 'silent') {
      borderClass = 'silent-border';
      statusText = 'Silent';
    } else if (s.status === 'hesitant') {
      borderClass = 'hesitant-border';
      statusText = 'Low Output';
    }

    html += `
      <div class="student-metric-item ${borderClass}">
        <div class="metric-item-top">
          <span class="metric-student-name">${escapeHtml(s.name)}</span>
          <span class="metric-student-roll">[ID: ${escapeHtml(s.rollNo || 'N/A')}] · ${statusText}</span>
        </div>
        <div class="metric-item-stats">
          <span>${s.wordCount} words (${s.wordShare}%)</span>
          <span>${s.messageCount} msgs</span>
          <span>${s.lastActiveSecondsAgo}s idle</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${Math.max(s.wordShare, 4)}%"></div>
        </div>
      </div>
    `;
  });

  studentParticipationList.innerHTML = html;
}

// -------------------------------------------------------------
// Connected Roster Rendering
// -------------------------------------------------------------
function renderTeacherRoster(metrics) {
  if (!metrics || !metrics.students) return;

  rosterCountPill.textContent = `${metrics.totalStudents} Enrolled`;

  if (metrics.students.length === 0) {
    connectedStudentsList.innerHTML = '<div class="empty-substate">No students connected yet.</div>';
    return;
  }

  let html = '';
  metrics.students.forEach(s => {
    let dotClass = 'active';
    if (s.status === 'silent') dotClass = 'silent';
    if (s.status === 'hesitant') dotClass = 'hesitant';

    html += `
      <div class="roster-item">
        <div>
          <span class="roster-status-dot ${dotClass}"></span>
          <strong>${escapeHtml(s.name)}</strong>
        </div>
        <span class="text-subtle">Roll ${escapeHtml(s.rollNo || 'N/A')}</span>
      </div>
    `;
  });

  connectedStudentsList.innerHTML = html;
}

// -------------------------------------------------------------
// Live Deliberation Stream (Teacher View)
// -------------------------------------------------------------
function appendTeacherChatMessage(msg) {
  const empty = teacherChatFeed.querySelector('.empty-state');
  if (empty) empty.remove();

  const bubble = document.createElement('div');
  let roleClass = '';
  let badgeLabel = 'Student';

  if (msg.senderRole === 'teacher') {
    roleClass = 'teacher-bubble';
    badgeLabel = 'Instructor Intervention';
  } else if (msg.senderRole === 'ai') {
    roleClass = 'ai-bubble';
    badgeLabel = 'AI Facilitator (Approved)';
  } else if (msg.senderRole === 'system') {
    roleClass = 'system-bubble';
    badgeLabel = 'Student Sabha · Desk';
  } else {
    badgeLabel = `Student · Roll ${msg.senderRoll || 'N/A'}`;
  }

  if (msg.isOffTopic) {
    roleClass += ' offtopic-bubble';
  }

  bubble.className = `chat-bubble ${roleClass}`;

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Epistemic Tag
  let epistemicBadge = '';
  if (msg.isOffTopic) {
    epistemicBadge = `<span class="epistemic-tag epistemic-offtopic">Off-Topic Drift</span>`;
  } else if (msg.epistemicType === 'warrant') {
    epistemicBadge = `<span class="epistemic-tag epistemic-warrant">Explanation / Warrant</span>`;
  } else if (msg.epistemicType === 'proposal') {
    epistemicBadge = `<span class="epistemic-tag epistemic-proposal">Constitutional Proposal</span>`;
  } else if (msg.epistemicType === 'counter-claim') {
    epistemicBadge = `<span class="epistemic-tag epistemic-counter">Counter-Claim / Disagreement</span>`;
  } else if (msg.epistemicType === 'agreement') {
    epistemicBadge = `<span class="epistemic-tag epistemic-agreement">Consensus Building</span>`;
  } else if (msg.epistemicType === 'inquiry') {
    epistemicBadge = `<span class="epistemic-tag epistemic-inquiry">Inquiry Question</span>`;
  }

  let transactiveTag = '';
  if (msg.transactiveTarget) {
    transactiveTag = `<span class="role-pill student" style="font-size: 0.65rem;">Directed to @${escapeHtml(msg.transactiveTarget)}</span>`;
  }

  bubble.innerHTML = `
    <div class="bubble-header">
      <div class="bubble-sender">
        <span>${escapeHtml(msg.senderName)}</span>
        <span class="text-subtle" style="font-size: 0.72rem;">· ${badgeLabel}</span>
        ${transactiveTag}
      </div>
      <span class="bubble-time">${timeStr}</span>
    </div>
    <div class="bubble-content">${escapeHtml(msg.content)}</div>
    ${epistemicBadge}
  `;

  teacherChatFeed.appendChild(bubble);
  teacherChatFeed.scrollTop = teacherChatFeed.scrollHeight;
  updateFeedCount();
}

// -------------------------------------------------------------
// Teacher-in-the-Loop AI Scaffold Queue Rendering
// -------------------------------------------------------------
function renderAIPromptsQueue(prompts) {
  const pending = (prompts || []).filter(p => p.status === 'pending');
  aiQueuePill.textContent = `${pending.length} Pending`;

  if (pending.length === 0) {
    aiPromptsQueue.innerHTML = '<div class="empty-substate">No pending scaffolds. Discussion is flowing productively.</div>';
    return;
  }

  let html = '';
  pending.forEach(p => {
    let typeName = 'Inclusivity Scaffold';
    if (p.type === 'dominance_pacing') typeName = 'Dominance Pacing';
    if (p.type === 'off_topic_redirect') typeName = 'Topic Redirection';

    html += `
      <div class="ai-card" id="aiCard_${p.id}">
        <div class="ai-card-top">
          <span class="ai-badge">${typeName}</span>
          <span class="badge-subtle">Review Required</span>
        </div>
        <div class="ai-rationale-box">
          <strong>Rationale:</strong> ${escapeHtml(p.rationale)}
        </div>
        <div class="ai-prompt-content" id="promptText_${p.id}">
          "${escapeHtml(p.suggestedPrompt)}"
        </div>
        <textarea class="form-control hidden mt-2 mb-2" id="promptEditor_${p.id}" rows="3" style="font-size: 0.82rem;">${escapeHtml(p.suggestedPrompt)}</textarea>
        <div class="ai-actions-row">
          <button class="btn btn-approve" onclick="approveAIPrompt('${p.id}')">
            Approve &amp; Send
          </button>
          <button class="btn btn-edit" onclick="toggleEditAIPrompt('${p.id}')" id="btnEditPrompt_${p.id}">
            Edit
          </button>
          <button class="btn btn-reject" onclick="rejectAIPrompt('${p.id}')">
            Dismiss
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

  socket.emit('teacher:approve_ai_prompt', { promptId, editedPrompt });
  showToast('AI prompt approved and posted to deliberation.', 'success');
};

window.toggleEditAIPrompt = function(promptId) {
  const textDiv = document.getElementById(`promptText_${promptId}`);
  const editor = document.getElementById(`promptEditor_${promptId}`);
  const btn = document.getElementById(`btnEditPrompt_${promptId}`);

  if (editor.classList.contains('hidden')) {
    editor.classList.remove('hidden');
    textDiv.classList.add('hidden');
    btn.textContent = 'Cancel';
    editor.focus();
  } else {
    editor.classList.add('hidden');
    textDiv.classList.remove('hidden');
    btn.textContent = 'Edit';
  }
};

window.rejectAIPrompt = function(promptId) {
  socket.emit('teacher:reject_ai_prompt', { promptId });
  showToast('AI scaffold dismissed.', 'info');
};

// -------------------------------------------------------------
// Off-Topic Flags Rendering
// -------------------------------------------------------------
function renderOffTopicFlags(flags) {
  if (!flags || flags.length === 0) {
    offTopicSection.classList.add('hidden');
    offTopicFlagsList.innerHTML = '';
    return;
  }

  offTopicSection.classList.remove('hidden');
  let html = '';
  flags.forEach(f => {
    html += `
      <div class="flag-item" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 0.6rem; margin-bottom: 0.5rem; font-size: 0.8rem;">
        <div style="display: flex; justify-content: space-between; font-weight: 600; color: #dc2626; margin-bottom: 0.2rem;">
          <span>${escapeHtml(f.studentName)} [Roll: ${escapeHtml(f.studentRoll || 'N/A')}]</span>
          <button class="btn btn-ghost-subtle btn-sm" style="padding: 0.1rem 0.35rem; font-size: 0.68rem;" onclick="dismissFlag('${f.id}')">Dismiss</button>
        </div>
        <div style="font-style: italic; color: var(--text-secondary); margin-bottom: 0.25rem;">"${escapeHtml(f.messageContent)}"</div>
        <div style="font-size: 0.72rem; color: #b91c1c;">${escapeHtml(f.reason)}</div>
      </div>
    `;
  });

  offTopicFlagsList.innerHTML = html;
}

window.dismissFlag = function(flagId) {
  socket.emit('teacher:dismiss_flag', { flagId });
};

// -------------------------------------------------------------
// Constitution & Proposals (Teacher View)
// -------------------------------------------------------------
function renderTeacherProposals(proposals) {
  if (!proposals || proposals.length === 0) {
    teacherProposalsList.innerHTML = '<div class="empty-state">No amendments proposed yet.</div>';
    return;
  }

  let html = '';
  proposals.forEach(p => {
    const votes = Object.values(p.votes || {});
    const accepts = votes.filter(v => v.vote === 'accept').length;
    const totalVotes = votes.length;
    const isAccepted = p.status === 'accepted';

    html += `
      <div class="proposal-item-card ${isAccepted ? 'proposal-accepted' : ''}">
        <div class="proposal-item-header">
          <span class="proposal-proposer">Proposed by ${escapeHtml(p.studentName)} [Roll: ${escapeHtml(p.rollNo || 'N/A')}]</span>
          <span class="role-pill ${isAccepted ? 'teacher' : 'student'}">${isAccepted ? 'RATIFIED' : 'ACTIVE DELIBERATION'}</span>
        </div>
        <div class="proposal-text-quote">"${escapeHtml(p.proposedText)}"</div>
        <div class="proposal-justification-box">
          <strong>Decision Justification:</strong> ${escapeHtml(p.justification)}
        </div>
        <div style="font-size: 0.76rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
          <span>Consensus Tally: <strong>${accepts}</strong> support / ${totalVotes} votes cast</span>
          <span>Status: <strong>${p.status.toUpperCase()}</strong></span>
        </div>
      </div>
    `;
  });

  teacherProposalsList.innerHTML = html;
}

// -------------------------------------------------------------
// Socket Listeners for Teacher
// -------------------------------------------------------------
socket.on('teacher:dashboard_update', (data) => {
  if (AppState.currentUser?.role !== 'teacher') return;
  if (data.activeTopic) {
    AppState.activeTopic = data.activeTopic;
    if (teacherTopTopicLabel) teacherTopTopicLabel.textContent = data.activeTopic.shortTitle;
    if (teacherActiveArticleTitle) teacherActiveArticleTitle.textContent = data.activeTopic.title;
    if (teacherCurrentRule) teacherCurrentRule.textContent = `"${data.activeTopic.currentRule}"`;
  }
  if (data.curatedTopics) AppState.curatedTopics = data.curatedTopics;
  if (data.preSessionProposals) {
    AppState.preSessionProposals = data.preSessionProposals;
    renderTopicSelector();
  }
  if (data.metrics) {
    renderTeacherMetrics(data.metrics);
    renderTeacherRoster(data.metrics);
  }
  if (data.pendingAIPrompts) renderAIPromptsQueue(data.pendingAIPrompts);
  if (data.offTopicFlags) renderOffTopicFlags(data.offTopicFlags);
  if (data.sessionStarted !== undefined) updateTeacherSessionState(data.sessionStarted);
  if (data.proposals) {
    AppState.proposals = data.proposals;
    renderTeacherProposals(data.proposals);
  }
});

socket.on('teacher:new_pre_session_proposal', (data) => {
  if (AppState.currentUser?.role !== 'teacher') return;
  AppState.preSessionProposals = data.preSessionProposals;
  renderTopicSelector();
  showToast(`New student proposal submitted by ${data.proposal.studentName} for review!`, 'info');
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
  showToast('Consensus reached! Article IV amendment ratified by the class.', 'success');
});
