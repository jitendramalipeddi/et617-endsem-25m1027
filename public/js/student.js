// ==========================================================
// Student Sabha: Student Collaborative Workspace Controller
// ==========================================================

const studentWaitingOverlay = document.getElementById('studentWaitingOverlay');
const studentWaitingBaselineRule = document.getElementById('studentWaitingBaselineRule');
const preSessionProposalForm = document.getElementById('preSessionProposalForm');
const preProposedClauseInput = document.getElementById('preProposedClauseInput');
const preProposalJustificationInput = document.getElementById('preProposalJustificationInput');

const studentPeersStatus = document.getElementById('studentPeersStatus');
const studentSessionStatusPill = document.getElementById('studentSessionStatusPill');
const studentChatStream = document.getElementById('studentChatStream');
const studentChatForm = document.getElementById('studentChatForm');
const studentMessageInput = document.getElementById('studentMessageInput');
const btnStudentSendMsg = document.getElementById('btnStudentSendMsg');
const charCountDisplay = document.getElementById('charCountDisplay');

const studentConstitutionTitle = document.getElementById('studentConstitutionTitle');
const studentConstitutionSubtitle = document.getElementById('studentConstitutionSubtitle');
const studentCurrentRuleDisplay = document.getElementById('studentCurrentRuleDisplay');
const studentProposalsContainer = document.getElementById('studentProposalsContainer');

// Active Session Proposal Modal Elements
const btnOpenProposalModal = document.getElementById('btnOpenProposalModal');
const btnCloseProposalModal = document.getElementById('btnCloseProposalModal');
const btnCancelProposal = document.getElementById('btnCancelProposal');
const proposalModal = document.getElementById('proposalModal');
const proposalForm = document.getElementById('proposalForm');
const proposedClauseInput = document.getElementById('proposedClauseInput');
const proposalJustificationInput = document.getElementById('proposalJustificationInput');

// Voting Caution Confirmation Modal (Step 5 in requested workflow)
const votingCautionModal = document.getElementById('votingCautionModal');
const cautionProposalText = document.getElementById('cautionProposalText');
const btnCloseCautionModal = document.getElementById('btnCloseCautionModal');
const btnCancelCautionVote = document.getElementById('btnCancelCautionVote');
const btnConfirmCautionVote = document.getElementById('btnConfirmCautionVote');

let pendingApprovalProposalId = null;

function initStudentWorkspace() {
  updateStudentSessionState(AppState.isSessionStarted);
  syncActiveTopicUI();

  // Render initial messages
  if (AppState.messages && AppState.messages.length > 0) {
    studentChatStream.innerHTML = '';
    AppState.messages.forEach(appendStudentChatMessage);
  }

  // Render initial proposals
  if (AppState.proposals) {
    renderStudentProposals(AppState.proposals);
  }

  if (AppState.metrics) {
    updateStudentPeersStatus(AppState.metrics);
  }

  setupStudentEventListeners();
}

function syncActiveTopicUI() {
  const topic = AppState.activeTopic;
  if (!topic) return;

  if (studentWaitingBaselineRule) {
    studentWaitingBaselineRule.textContent = `"${topic.originalRule}"`;
  }
  if (studentCurrentRuleDisplay) {
    studentCurrentRuleDisplay.textContent = `"${topic.currentRule}"`;
  }
  if (studentConstitutionTitle) {
    studentConstitutionTitle.textContent = topic.title || 'Classroom Constitution';
  }
  if (studentConstitutionSubtitle) {
    studentConstitutionSubtitle.textContent = topic.shortTitle || 'Classroom Deliberation';
  }
}

function updateStudentSessionState(isStarted) {
  if (isStarted) {
    studentWaitingOverlay.classList.add('hidden');
    studentMessageInput.removeAttribute('disabled');
    if (btnStudentSendMsg) btnStudentSendMsg.removeAttribute('disabled');
    if (studentSessionStatusPill) {
      studentSessionStatusPill.textContent = 'Live Session';
      studentSessionStatusPill.className = 'status-pill-subtle';
    }
    syncActiveTopicUI();
    if (AppState.proposals) {
      renderStudentProposals(AppState.proposals);
    }
    updateMotionNotice();
    studentMessageInput.focus();
  } else {
    // If session was active and now paused
    if (AppState.sessionStartTime) {
      studentWaitingOverlay.classList.add('hidden');
      studentMessageInput.setAttribute('disabled', 'true');
      if (btnStudentSendMsg) btnStudentSendMsg.setAttribute('disabled', 'true');
      if (studentSessionStatusPill) {
        studentSessionStatusPill.textContent = 'Session Paused by Teacher';
        studentSessionStatusPill.className = 'status-pill-subtle badge-status-warning';
      }
    } else {
      studentWaitingOverlay.classList.remove('hidden');
      studentMessageInput.setAttribute('disabled', 'true');
      if (btnStudentSendMsg) btnStudentSendMsg.setAttribute('disabled', 'true');
    }
  }
}

function updateMotionNotice() {
  const notice = document.getElementById('studentActiveMotionNotice');
  const title = document.getElementById('chatMotionTitle');
  if (!notice || !title) return;

  if (AppState.activeTopic) {
    title.textContent = `${AppState.activeTopic.shortTitle || 'Constitution'} Amendment`;
    notice.classList.remove('hidden');
  }
}

window.focusOnVoting = function() {
  if (window.switchStudentMobileTab) {
    window.switchStudentMobileTab('constitution');
  }
  const target = document.getElementById('studentProposalsContainer');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('highlight-glow');
    setTimeout(() => target.classList.remove('highlight-glow'), 2000);
  }
};

window.switchStudentMobileTab = function(tab) {
  const chatCol = document.querySelector('.workspace-column.chat-column');
  const constCol = document.querySelector('.workspace-column.constitution-column');
  const btnChat = document.getElementById('tabChatBtn');
  const btnConst = document.getElementById('tabConstBtn');

  if (tab === 'chat') {
    chatCol?.classList.add('active-tab');
    constCol?.classList.remove('active-tab');
    btnChat?.classList.add('active');
    btnConst?.classList.remove('active');
  } else {
    constCol?.classList.add('active-tab');
    chatCol?.classList.remove('active-tab');
    btnConst?.classList.add('active');
    btnChat?.classList.remove('active');
  }
};

function updateStudentPeersStatus(metrics) {
  if (!metrics || !metrics.students) return;
  const peers = metrics.students.map(s => {
    const isMe = s.id === AppState.currentUser?.id;
    return `${escapeHtml(s.name)}${isMe ? ' (You)' : ''}`;
  });
  studentPeersStatus.textContent = `Connected Peers (${peers.length}): ${peers.join(', ')}`;
}

function setupStudentEventListeners() {
  // Pre-Session Proposal Form Submit (Step 1 in requested workflow)
  if (preSessionProposalForm) {
    preSessionProposalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const proposedText = preProposedClauseInput.value.trim();
      const justification = preProposalJustificationInput.value.trim();

      if (!proposedText || !justification) {
        showToast('Please provide both the proposed clause and your justification.', 'warning');
        return;
      }

      socket.emit('constitution:propose_amendment', {
        proposedText,
        justification
      });

      preSessionProposalForm.reset();
    });
  }

  // Active Chat form submit
  studentChatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendStudentMessage();
  });

  // Enter to send (Shift+Enter for newline)
  studentMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendStudentMessage();
    }
  });

  // Live word counter
  studentMessageInput.addEventListener('input', () => {
    const text = studentMessageInput.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    charCountDisplay.textContent = `${words} ${words === 1 ? 'word' : 'words'} · ${text.length} chars`;
  });

  // Epistemic Sentence Starters
  document.querySelectorAll('.scaffold-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const starter = pill.getAttribute('data-starter');
      const current = studentMessageInput.value;
      if (!current.trim()) {
        studentMessageInput.value = starter + ' ';
      } else {
        studentMessageInput.value = current + ' ' + starter + ' ';
      }
      studentMessageInput.focus();
      studentMessageInput.selectionStart = studentMessageInput.selectionEnd = studentMessageInput.value.length;
      studentMessageInput.dispatchEvent(new Event('input'));
    });
  });

  // Proposal Modal Open / Close
  btnOpenProposalModal.addEventListener('click', () => {
    proposalModal.classList.remove('hidden');
    proposedClauseInput.focus();
  });

  const closeModal = () => {
    proposalModal.classList.add('hidden');
  };

  btnCloseProposalModal.addEventListener('click', closeModal);
  btnCancelProposal.addEventListener('click', closeModal);

  // Proposal Submission during active session
  proposalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const proposedText = proposedClauseInput.value.trim();
    const justification = proposalJustificationInput.value.trim();

    if (!proposedText || !justification) {
      showToast('Please provide both the proposed clause and your justification.', 'warning');
      return;
    }

    socket.emit('constitution:propose_amendment', {
      proposedText,
      justification
    });

    closeModal();
    proposalForm.reset();
    showToast('Your amendment proposal has been shared with the class for voting!', 'success');
  });

  // Caution Voting Modal Event Handlers (Step 5 in requested workflow)
  const closeCautionModal = () => {
    votingCautionModal.classList.add('hidden');
    pendingApprovalProposalId = null;
  };

  btnCloseCautionModal.addEventListener('click', closeCautionModal);
  btnCancelCautionVote.addEventListener('click', closeCautionModal);

  btnConfirmCautionVote.addEventListener('click', () => {
    if (!pendingApprovalProposalId) return;

    socket.emit('constitution:vote', {
      proposalId: pendingApprovalProposalId,
      vote: 'accept',
      reason: ''
    });

    showToast('Your approval vote has been confirmed and registered!', 'success');
    closeCautionModal();
  });
}

function sendStudentMessage() {
  if (!AppState.isSessionStarted) {
    showToast('Discussion is currently paused by the teacher.', 'warning');
    return;
  }

  const content = studentMessageInput.value.trim();
  if (!content) return;

  socket.emit('chat:message', { content });
  studentMessageInput.value = '';
  charCountDisplay.textContent = '0 words';
}

// -------------------------------------------------------------
// Message Rendering in Student Chat
// -------------------------------------------------------------
function appendStudentChatMessage(msg) {
  const empty = studentChatStream.querySelector('.empty-state');
  if (empty) empty.remove();

  const isMe = msg.senderId === AppState.currentUser?.id;
  const bubble = document.createElement('div');

  let bubbleClass = '';
  let badgeLabel = 'Peer';

  if (isMe) {
    bubbleClass = 'my-bubble';
    badgeLabel = 'You';
  } else if (msg.senderRole === 'teacher') {
    bubbleClass = 'teacher-bubble';
    badgeLabel = 'Teacher Intervention';
  } else if (msg.senderRole === 'ai') {
    bubbleClass = 'ai-bubble';
    badgeLabel = 'AI Facilitator';
  } else if (msg.senderRole === 'system') {
    bubbleClass = 'system-bubble';
    badgeLabel = 'Student Sabha · Desk';
  }

  bubble.className = `chat-bubble ${bubbleClass}`;

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Epistemic Tag
  let epistemicBadge = '';
  if (msg.epistemicType === 'warrant') {
    epistemicBadge = `<span class="epistemic-tag epistemic-warrant">Explanation / Warrant</span>`;
  } else if (msg.epistemicType === 'proposal') {
    epistemicBadge = `<span class="epistemic-tag epistemic-proposal">Constitutional Proposal</span>`;
  } else if (msg.epistemicType === 'counter-claim') {
    epistemicBadge = `<span class="epistemic-tag epistemic-counter">Counter-Claim</span>`;
  } else if (msg.epistemicType === 'agreement') {
    epistemicBadge = `<span class="epistemic-tag epistemic-agreement">Agreement</span>`;
  }

  // Quote / Reply Action Button for Transactivity
  let replyBtn = '';
  if (!isMe && msg.senderRole === 'student') {
    replyBtn = `<button class="btn-ghost" style="padding: 0.1rem 0.4rem; font-size: 0.7rem;" onclick="quotePeerReply('${escapeHtml(msg.senderName)}')">Reply @${escapeHtml(msg.senderName)}</button>`;
  }

  bubble.innerHTML = `
    <div class="bubble-header">
      <div class="bubble-sender">
        <span>${escapeHtml(msg.senderName)}</span>
        <span class="text-subtle" style="font-size: 0.72rem;">· ${badgeLabel}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        ${replyBtn}
        <span class="bubble-time">${timeStr}</span>
      </div>
    </div>
    <div class="bubble-content">${escapeHtml(msg.content)}</div>
    ${epistemicBadge}
  `;

  studentChatStream.appendChild(bubble);
  studentChatStream.scrollTop = studentChatStream.scrollHeight;
}

window.quotePeerReply = function(peerName) {
  studentMessageInput.value = `@${peerName}, building on your point, I think `;
  studentMessageInput.focus();
  studentMessageInput.selectionStart = studentMessageInput.selectionEnd = studentMessageInput.value.length;
};

// -------------------------------------------------------------
// Shared Artefact: Proposals & Voting with Caution Gate
// -------------------------------------------------------------
function renderStudentProposals(proposals) {
  if (!proposals || proposals.length === 0) {
    studentProposalsContainer.innerHTML = `
      <div class="empty-state">
        <p>No amendments currently under deliberation.</p>
        <p class="text-subtle" style="font-size: 0.8rem; margin-top: 0.35rem;">Click <strong>"+ Propose Amendment"</strong> above to suggest a new clause to the class!</p>
      </div>
    `;
    return;
  }

  // Calculate peer student count and consensus target
  const participantsList = AppState.metrics?.participants ? Object.values(AppState.metrics.participants) : [];
  const studentCount = participantsList.filter(p => p.role === 'student').length || 3;
  const targetThreshold = studentCount <= 2 ? studentCount : Math.ceil(studentCount * 0.66);

  let html = '';
  proposals.forEach(p => {
    const isAccepted = p.status === 'accepted';
    const votes = Object.values(p.votes || {});
    const accepts = votes.filter(v => v.vote === 'accept').length;
    const revises = votes.filter(v => v.vote === 'revise').length;
    const totalVotes = votes.length;

    const myVoteObj = p.votes ? p.votes[AppState.currentUser?.id] : null;
    const myVote = myVoteObj?.vote;
    const proposerName = p.studentName || p.authorName || 'Class Deliberation Motion';
    const rollDisplay = p.rollNo ? `Roll: ${p.rollNo}` : 'Deliberation Motion';
    const justificationText = p.justification || p.rationale || 'Proposed for peer deliberation.';
    const progressPct = Math.min(100, Math.round((accepts / Math.max(1, studentCount)) * 100));

    let voteActionHtml = '';
    if (isAccepted) {
      voteActionHtml = `
        <div class="ratification-banner">
          <div class="ratification-icon">🎉</div>
          <div>
            <div class="ratification-title">Consensus Supermajority Achieved!</div>
            <div class="ratification-desc">This amendment received overwhelming student support and has been formally ratified into the Classroom Constitution!</div>
          </div>
        </div>
      `;
    } else {
      voteActionHtml = `
        <div class="consensus-voting-panel">
          <div class="consensus-prompt-row">
            <span class="consensus-question">🗳️ Cast Your Consensus Vote:</span>
            <span class="consensus-target-pill">${accepts} / ${targetThreshold} required for ratification</span>
          </div>

          <div class="consensus-action-buttons">
            <button class="btn btn-emerald-primary btn-consensus ${myVote === 'accept' ? 'active-voted' : ''}" onclick="initiateVoteApproval('${p.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>${myVote === 'accept' ? '✓ You Gave Consensus (Supported)' : 'Give Consensus (Support)'}</span>
            </button>
            <button class="btn btn-amber-subtle btn-consensus ${myVote === 'revise' ? 'active-voted' : ''}" onclick="voteRevise('${p.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>${myVote === 'revise' ? '⚠ You Requested Revision' : 'Suggest Revision'}</span>
            </button>
          </div>

          <div class="consensus-progress-track">
            <div class="consensus-progress-bar" style="width: ${progressPct}%"></div>
          </div>

          <div class="consensus-meta-status">
            <span>Status: <strong>${accepts}</strong> supported, <strong>${revises}</strong> requested revision (${totalVotes} of ${studentCount} peers voted)</span>
          </div>
        </div>
      `;
    }

    html += `
      <div class="proposal-item-card ${isAccepted ? 'proposal-accepted' : 'proposal-active-motion'}">
        <div class="proposal-item-header">
          <span class="proposal-proposer">Proposed by <strong>${escapeHtml(proposerName)}</strong> [${escapeHtml(rollDisplay)}]</span>
          <span class="role-pill ${isAccepted ? 'teacher' : 'student'}">${isAccepted ? '✓ RATIFIED' : '🗳️ ACTIVE MOTION'}</span>
        </div>
        <div class="proposal-text-quote">"${escapeHtml(p.proposedText)}"</div>
        <div class="proposal-justification-box">
          <strong>Decision Justification:</strong> ${escapeHtml(justificationText)}
        </div>
        ${voteActionHtml}
      </div>
    `;
  });

  studentProposalsContainer.innerHTML = html;
}

window.renderStudentProposals = renderStudentProposals;

// Caution Trigger while Approving (Step 5 in requested workflow)
window.initiateVoteApproval = function(proposalId) {
  if (!AppState.isSessionStarted) {
    showToast('Voting is disabled while discussion is paused by the teacher.', 'warning');
    return;
  }

  const p = AppState.proposals.find(item => item.id === proposalId);
  if (!p) return;

  pendingApprovalProposalId = proposalId;
  cautionProposalText.textContent = `"${p.proposedText}"`;
  votingCautionModal.classList.remove('hidden');
};

window.voteRevise = function(proposalId) {
  if (!AppState.isSessionStarted) {
    showToast('Voting is disabled while discussion is paused by the teacher.', 'warning');
    return;
  }

  socket.emit('constitution:vote', {
    proposalId,
    vote: 'revise',
    reason: ''
  });
  showToast('You requested revisions on this amendment.', 'info');
};

// -------------------------------------------------------------
// Socket Event Listeners for Student
// -------------------------------------------------------------
socket.on('student:pre_session_proposal_submitted', (data) => {
  showToast(data.message, 'success', 6000);
});

socket.on('chat:new_message', (msg) => {
  if (AppState.currentUser?.role !== 'student') return;
  AppState.messages.push(msg);
  appendStudentChatMessage(msg);
});

socket.on('constitution:proposal_created', ({ proposal }) => {
  if (AppState.currentUser?.role !== 'student') return;
  AppState.proposals.push(proposal);
  renderStudentProposals(AppState.proposals);
  showToast(`📜 ${proposal.studentName} proposed an amendment! Review and cast your vote on the right panel.`, 'info');
});

socket.on('constitution:vote_updated', ({ proposalId, votes, voterName, vote }) => {
  if (AppState.currentUser?.role !== 'student') return;
  const p = AppState.proposals.find(item => item.id === proposalId);
  if (p) {
    p.votes = votes;
    renderStudentProposals(AppState.proposals);
  }
  showToast(`${voterName} voted: ${vote === 'accept' ? 'Support' : 'Suggest Revision'}`, 'info', 2000);
});

socket.on('constitution:ratified', ({ currentRule, proposalId }) => {
  if (AppState.currentUser?.role !== 'student') return;
  if (AppState.activeTopic) {
    AppState.activeTopic.currentRule = currentRule;
  }
  studentCurrentRuleDisplay.textContent = `"${currentRule}"`;
  
  const p = AppState.proposals.find(item => item.id === proposalId);
  if (p) p.status = 'accepted';
  renderStudentProposals(AppState.proposals);

  showToast('🎉 CONGRATULATIONS! Group consensus reached: amendment has been formally ratified into the Classroom Constitution!', 'success', 6000);
});
