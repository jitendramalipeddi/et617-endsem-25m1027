// ==========================================================
// Student Sabha: Client-Side Core State & Navigation Router
// ==========================================================

const socket = io();
window.socket = socket;

// Global App State
const AppState = {
  currentUser: null,       // { id, name, rollNo, role: 'teacher' | 'student' }
  isSessionStarted: false,
  topic: null,
  metrics: null,
  messages: [],
  proposals: [],
  pendingAIPrompts: [],
  offTopicFlags: [],
  sessionTimerInterval: null,
  sessionStartTime: null
};
window.AppState = AppState;

// DOM References
const views = {
  login: document.getElementById('loginView'),
  teacher: document.getElementById('teacherView'),
  student: document.getElementById('studentView')
};

const userBadge = document.getElementById('userBadge');
const userRoleIndicator = document.getElementById('userRoleIndicator');
const userNameIndicator = document.getElementById('userNameIndicator');
const btnLogout = document.getElementById('btnLogout');
const toastContainer = document.getElementById('toastContainer');

// -------------------------------------------------------------
// Toast Notification Utility
// -------------------------------------------------------------
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ';
  if (type === 'success') icon = '✓';
  if (type === 'warning') icon = '⚠';
  if (type === 'error') icon = '✕';

  toast.innerHTML = `<span style="font-weight: bold; margin-right: 4px;">${icon}</span> <span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
window.showToast = showToast;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

// -------------------------------------------------------------
// Navigation & View Routing
// -------------------------------------------------------------
function switchView(viewName) {
  Object.keys(views).forEach(v => {
    if (v === viewName) {
      views[v].classList.remove('hidden');
      views[v].classList.add('active');
    } else {
      views[v].classList.remove('active');
      views[v].classList.add('hidden');
    }
  });

  if (AppState.currentUser) {
    userBadge.classList.remove('hidden');
    userRoleIndicator.textContent = AppState.currentUser.role.toUpperCase();
    userRoleIndicator.className = `role-pill ${AppState.currentUser.role}`;
    userNameIndicator.textContent = AppState.currentUser.name + (AppState.currentUser.rollNo ? ` (${AppState.currentUser.rollNo})` : '');
  } else {
    userBadge.classList.add('hidden');
  }
}
window.switchView = switchView;

// -------------------------------------------------------------
// Login Form Handlers
// -------------------------------------------------------------
document.getElementById('teacherLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('teacherName');
  const name = nameInput.value.trim() || 'Teacher';
  
  socket.emit('join', {
    role: 'teacher',
    name: name,
    rollNo: ''
  });
});

document.getElementById('studentLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('studentName').value.trim();
  const rollNo = document.getElementById('studentRoll').value.trim();

  if (!name || !rollNo) {
    showToast('Please enter both your Name and Roll Number.', 'warning');
    return;
  }

  socket.emit('join', {
    role: 'student',
    name: name,
    rollNo: rollNo
  });
});

// Logout / Return to Login
btnLogout.addEventListener('click', () => {
  window.location.reload();
});

// -------------------------------------------------------------
// Socket Event Listeners (Shared)
// -------------------------------------------------------------
socket.on('init', (data) => {
  AppState.currentUser = data.user;
  AppState.isSessionStarted = data.isStarted;
  AppState.topic = data.topic;
  AppState.messages = data.messages || [];
  AppState.proposals = data.proposals || [];
  AppState.metrics = data.metrics;

  if (data.user.role === 'teacher') {
    switchView('teacher');
    initTeacherDashboard();
  } else {
    switchView('student');
    initStudentWorkspace();
  }

  showToast(`Welcome, ${data.user.name}! Connected to collaborative session.`, 'success');
});

socket.on('session:started', (data) => {
  AppState.isSessionStarted = true;
  AppState.sessionStartTime = data.startTime;

  if (AppState.currentUser?.role === 'student') {
    updateStudentSessionState(true);
    showToast('The discussion has been opened by the teacher! You can now participate.', 'success');
  } else if (AppState.currentUser?.role === 'teacher') {
    updateTeacherSessionState(true);
  }
});

socket.on('session:paused', () => {
  AppState.isSessionStarted = false;
  if (AppState.currentUser?.role === 'student') {
    updateStudentSessionState(false);
    showToast('The teacher has paused the discussion.', 'warning');
  } else if (AppState.currentUser?.role === 'teacher') {
    updateTeacherSessionState(false);
  }
});

socket.on('session:reset', (data) => {
  AppState.isSessionStarted = false;
  AppState.messages = [];
  AppState.proposals = [];
  AppState.topic = data.topic;
  AppState.metrics = data.metrics;

  showToast('Session has been reset by the teacher.', 'info');
  window.location.reload();
});

socket.on('error:notice', (data) => {
  showToast(data.message, 'error');
});

socket.on('participant:joined', (data) => {
  AppState.metrics = data.metrics;
  if (AppState.currentUser?.role === 'teacher') {
    renderTeacherMetrics(data.metrics);
  } else if (AppState.currentUser?.role === 'student') {
    updateStudentPeersStatus(data.metrics);
  }
});

socket.on('participant:left', (data) => {
  AppState.metrics = data.metrics;
  if (AppState.currentUser?.role === 'teacher') {
    renderTeacherMetrics(data.metrics);
  } else if (AppState.currentUser?.role === 'student') {
    updateStudentPeersStatus(data.metrics);
  }
});

socket.on('metrics:update', (metrics) => {
  AppState.metrics = metrics;
  if (AppState.currentUser?.role === 'teacher') {
    renderTeacherMetrics(metrics);
  } else if (AppState.currentUser?.role === 'student') {
    updateStudentPeersStatus(metrics);
  }
});

