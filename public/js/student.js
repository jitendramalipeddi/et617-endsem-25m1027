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
    const topic = AppState.activeTopic;
    if (!proposedClauseInput.value.trim() && topic?.suggestedAmendment) {
      proposedClauseInput.value = topic.suggestedAmendment;
    }
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
        No amendments have been proposed yet. Discuss with your peers in the chat and click <strong>"+ Propose Amendment"</strong> when ready to draft new wording!
      </div>
    `;
    return;
  }

  let html = '';
  proposals.forEach(p => {
    const isAccepted = p.status === 'accepted';
    const votes = Object.values(p.votes || {});
    const accepts = votes.filter(v => v.vote === 'accept').length;
    const totalVotes = votes.length;

    const myVoteObj = p.votes ? p.votes[AppState.currentUser?.id] : null;
    const myVote = myVoteObj?.vote;

    let voteActionHtml = '';
    if (isAccepted) {
      voteActionHtml = `
        <div class="badge-status badge-status-good" style="font-size: 0.8rem; padding: 0.4rem 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;">
          🎉 Amendment Ratified into Classroom Constitution!
        </div>
      `;
    } else {
      voteActionHtml = `
        <div class="voting-action-bar">
          <div class="voting-buttons">
            <button class="btn btn-sm btn-vote-accept ${myVote === 'accept' ? 'active-vote' : ''}" onclick="initiateVoteApproval('${p.id}')">
              ${myVote === 'accept' ? '✓ You Supported' : '✓ Support Amendment'}
            </button>
            <button class="btn btn-sm btn-vote-revise ${myVote === 'revise' ? 'active-vote' : ''}" onclick="voteRevise('${p.id}')">
              ${myVote === 'revise' ? '⚠ You Requested Revision' : '⚠ Suggest Revision'}
            </button>
          </div>
          <div class="vote-tally-pill">
            <span>Consensus: <strong>${accepts}</strong> support / ${totalVotes} voted</span>
          </div>
        </div>
      `;
    }

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
        ${voteActionHtml}
      </div>
    `;
  });

  studentProposalsContainer.innerHTML = html;
}

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
