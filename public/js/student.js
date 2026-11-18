// ==========================================================
// LexiCollab: Student Collaborative Workspace Controller
// ==========================================================

const studentWaitingOverlay = document.getElementById('studentWaitingOverlay');
const studentPeersStatus = document.getElementById('studentPeersStatus');
const studentChatStream = document.getElementById('studentChatStream');
const studentChatForm = document.getElementById('studentChatForm');
const studentMessageInput = document.getElementById('studentMessageInput');
const charCountDisplay = document.getElementById('charCountDisplay');
const studentCurrentRuleDisplay = document.getElementById('studentCurrentRuleDisplay');
const studentProposalsContainer = document.getElementById('studentProposalsContainer');

// Modal Elements
const btnOpenProposalModal = document.getElementById('btnOpenProposalModal');
const btnCloseProposalModal = document.getElementById('btnCloseProposalModal');
const btnCancelProposal = document.getElementById('btnCancelProposal');
const proposalModal = document.getElementById('proposalModal');
const proposalForm = document.getElementById('proposalForm');
const proposedClauseInput = document.getElementById('proposedClauseInput');
const proposalJustificationInput = document.getElementById('proposalJustificationInput');

function initStudentWorkspace() {
  updateStudentSessionState(AppState.isSessionStarted);

  if (AppState.topic) {
    studentCurrentRuleDisplay.textContent = `"${AppState.topic.currentRule}"`;
  }

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

function updateStudentSessionState(isStarted) {
  if (isStarted) {
    studentWaitingOverlay.classList.add('hidden');
    studentMessageInput.removeAttribute('disabled');
    studentMessageInput.focus();
  } else {
    studentWaitingOverlay.classList.remove('hidden');
    studentMessageInput.setAttribute('disabled', 'true');
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
  // Chat form submit
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
      // Move cursor to end
      studentMessageInput.selectionStart = studentMessageInput.selectionEnd = studentMessageInput.value.length;
      studentMessageInput.dispatchEvent(new Event('input'));
    });
  });

  // Modal Open / Close
  btnOpenProposalModal.addEventListener('click', () => {
    // Pre-fill a helpful starting amendment template if blank
    if (!proposedClauseInput.value.trim()) {
      proposedClauseInput.value = "Rule 4.1: English is mandatory inside the classroom during instructional hours. In the playground, dining mess, and corridors, students are free to speak their home language (such as Telugu) or English, ensuring no peer is excluded.";
    }
    proposalModal.classList.remove('hidden');
    proposedClauseInput.focus();
  });

  const closeModal = () => {
    proposalModal.classList.add('hidden');
  };

  btnCloseProposalModal.addEventListener('click', closeModal);
  btnCancelProposal.addEventListener('click', closeModal);

  // Proposal Submission
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
}

function sendStudentMessage() {
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
    badgeLabel = 'Constitution Desk';
  }

  bubble.className = `chat-bubble ${bubbleClass}`;

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Epistemic Tag
  let epistemicBadge = '';
  if (msg.epistemicType === 'warrant') {
    epistemicBadge = `<span class="epistemic-tag epistemic-warrant">💡 Explanation / Warrant</span>`;
  } else if (msg.epistemicType === 'proposal') {
    epistemicBadge = `<span class="epistemic-tag epistemic-proposal">📜 Constitutional Proposal</span>`;
  } else if (msg.epistemicType === 'counter-claim') {
    epistemicBadge = `<span class="epistemic-tag epistemic-counter">⚖️ Critical Point</span>`;
  } else if (msg.epistemicType === 'agreement') {
    epistemicBadge = `<span class="epistemic-tag epistemic-agreement">🤝 Agreement</span>`;
  }

  // Quote / Reply Action Button for Transactivity
  let replyBtn = '';
  if (!isMe && msg.senderRole === 'student') {
    replyBtn = `<button class="btn btn-outline btn-sm" style="padding: 0.1rem 0.4rem; font-size: 0.68rem;" onclick="quotePeerReply('${escapeHtml(msg.senderName)}')">Reply @${escapeHtml(msg.senderName)}</button>`;
  }

  bubble.innerHTML = `
    <div class="bubble-header">
      <div class="bubble-sender">
        <span>${escapeHtml(msg.senderName)}</span>
        <span class="badge ${isMe ? 'badge-primary' : (msg.senderRole === 'teacher' ? 'badge-success' : 'badge-accent')}" style="font-size: 0.65rem;">${badgeLabel}</span>
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
// Shared Artefact: Proposals & Voting
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

    // Check how current user voted
    const myVoteObj = p.votes ? p.votes[AppState.currentUser?.id] : null;
    const myVote = myVoteObj?.vote;

    let voteActionHtml = '';
    if (isAccepted) {
      voteActionHtml = `
        <div class="badge badge-success" style="font-size: 0.8rem; padding: 0.35rem 0.8rem;">
          🎉 Amendment Ratified into Classroom Constitution!
        </div>
      `;
    } else {
      voteActionHtml = `
        <div class="voting-action-bar">
          <div class="voting-buttons">
            <button class="btn btn-sm btn-vote-accept ${myVote === 'accept' ? 'active-vote' : ''}" onclick="voteOnProposal('${p.id}', 'accept')">
              ${myVote === 'accept' ? '✓ You Supported' : '✓ Support Amendment'}
            </button>
            <button class="btn btn-sm btn-vote-revise ${myVote === 'revise' ? 'active-vote' : ''}" onclick="voteOnProposal('${p.id}', 'revise')">
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
          <span class="badge ${isAccepted ? 'badge-success' : 'badge-warning'}">${isAccepted ? 'RATIFIED' : 'ACTIVE DELIBERATION'}</span>
        </div>
        <div class="proposal-text-quote">"${escapeHtml(p.proposedText)}"</div>
        <div class="proposal-justification-box">
          <strong>Decision Rationale:</strong> ${escapeHtml(p.justification)}
        </div>
        ${voteActionHtml}
      </div>
    `;
  });

  studentProposalsContainer.innerHTML = html;
}

window.voteOnProposal = function(proposalId, vote) {
  socket.emit('constitution:vote', {
    proposalId,
    vote,
    reason: ''
  });

  showToast(vote === 'accept' ? 'You supported this amendment!' : 'You requested revisions on this amendment.', 'info');
};

// -------------------------------------------------------------
// Socket Event Listeners for Student
// -------------------------------------------------------------
socket.on('chat:new_message', (msg) => {
  if (AppState.currentUser?.role !== 'student') return;
  AppState.messages.push(msg);
  appendStudentChatMessage(msg);
});

socket.on('constitution:proposal_created', ({ proposal }) => {
  if (AppState.currentUser?.role !== 'student') return;
  AppState.proposals.push(proposal);
  renderStudentProposals(AppState.proposals);
  showToast(`📜 ${proposal.studentName} proposed an amendment to Article IV! Review and vote on the right panel.`, 'info');
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
  AppState.topic.currentRule = currentRule;
  studentCurrentRuleDisplay.textContent = `"${currentRule}"`;
  
  const p = AppState.proposals.find(item => item.id === proposalId);
  if (p) p.status = 'accepted';
  renderStudentProposals(AppState.proposals);

  showToast('🎉 CONGRATULATIONS! Group consensus reached: Article IV has been officially updated!', 'success', 6000);
});
