// ==========================================
// CONFIGURATION - EDIT THESE VALUES TO UPDATE
// ==========================================
// 1. n8n Webhook URL: Paste your live n8n webhook URL here (e.g. https://your-n8n.com/webhook/trial-booking)
const WEBHOOK_URL = "https://wiley-broader-tell-chassis.trycloudflare.com/webhook/trial-booking";

// 2. WhatsApp Number: Format without '+' or dashes, with country code (e.g. 923004879545)
const WHATSAPP_NUMBER = "923004879545";

// 3. Phone Number for direct calls: Pakistani local format (e.g. 03004879545)
const PHONE_NUMBER = "03004879545";

// ==========================================
// APPLICATION LOGIC
// ==========================================

// State
let currentTab = 'schedule';
let selectedCourseFilter = 'All';
let deferredInstallPrompt = null;

// DOM Elements
const screenSchedule = document.getElementById('screen-schedule');
const screenNotices = document.getElementById('screen-notices');
const screenTrial = document.getElementById('screen-trial');
const currentScreenTitle = document.getElementById('current-screen-title');

const tabNavSchedule = document.getElementById('tab-nav-schedule');
const tabNavNotices = document.getElementById('tab-nav-notices');
const tabNavTrial = document.getElementById('tab-nav-trial');

const filterChipsList = document.getElementById('filter-chips-list');
const scheduleCardsList = document.getElementById('schedule-cards-list');
const scheduleEmptyState = document.getElementById('schedule-empty-state');

const noticesCardsList = document.getElementById('notices-cards-list');
const noticesEmptyState = document.getElementById('notices-empty-state');

const trialForm = document.getElementById('trial-form');
const trialSuccessPanel = document.getElementById('trial-success-panel');
const btnSubmitTrial = document.getElementById('btn-submit-trial');
const submissionErrorAlert = document.getElementById('submission-error-alert');
const btnResetForm = document.getElementById('btn-reset-form');

const offlineBanner = document.getElementById('offline-banner');
const installBanner = document.getElementById('install-banner');
const btnPwaInstall = document.getElementById('btn-pwa-install');
const btnPwaDismiss = document.getElementById('btn-pwa-dismiss');

const quickCallBtn = document.getElementById('quick-call-btn');
const quickWhatsappBtn = document.getElementById('quick-whatsapp-btn');
const errorWhatsappLink = document.getElementById('error-whatsapp-link');

// SVGs for dynamic cards
const SVG_CLOCK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
const SVG_CALENDAR = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
// Blank default avatar silhouette (similar to WhatsApp profile icon)
const SVG_DEFAULT_AVATAR = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupContactLinks();
  initRouter();
  initSchedule();
  initNotices();
  initTrialForm();
  initOfflineListener();
  initPwaInstall();
  registerServiceWorker();
});

// Configure Call & WhatsApp links based on top config
function setupContactLinks() {
  if (quickCallBtn) {
    quickCallBtn.href = `tel:${PHONE_NUMBER}`;
  }
  if (quickWhatsappBtn) {
    const defaultMsg = encodeURIComponent("Hello, I have a question about the class schedule at Microsoft Institute Khairpur Mirs.");
    quickWhatsappBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${defaultMsg}`;
  }
  if (errorWhatsappLink) {
    const errorMsg = encodeURIComponent("Hello, I tried to book a free trial class on the app and need assistance.");
    errorWhatsappLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${errorMsg}`;
  }
}

// ------------------------------------------
// ROUTING & NAVIGATION (HASH-BASED)
// ------------------------------------------
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  // Initial route
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash === 'notices') {
    switchTab('notices');
  } else if (hash === 'trial') {
    switchTab('trial');
  } else {
    switchTab('schedule');
  }
}

function switchTab(tabName) {
  currentTab = tabName;

  // Deactivate all screens and tabs
  screenSchedule.classList.remove('active');
  screenNotices.classList.remove('active');
  screenTrial.classList.remove('active');

  tabNavSchedule.classList.remove('active');
  tabNavNotices.classList.remove('active');
  tabNavTrial.classList.remove('active');

  tabNavSchedule.removeAttribute('aria-current');
  tabNavNotices.removeAttribute('aria-current');
  tabNavTrial.removeAttribute('aria-current');

  if (tabName === 'schedule') {
    screenSchedule.classList.add('active');
    tabNavSchedule.classList.add('active');
    tabNavSchedule.setAttribute('aria-current', 'page');
    currentScreenTitle.textContent = "Class Schedule";
  } else if (tabName === 'notices') {
    screenNotices.classList.add('active');
    tabNavNotices.classList.add('active');
    tabNavNotices.setAttribute('aria-current', 'page');
    currentScreenTitle.textContent = "Notices & Announcements";
  } else if (tabName === 'trial') {
    screenTrial.classList.add('active');
    tabNavTrial.classList.add('active');
    tabNavTrial.setAttribute('aria-current', 'page');
    currentScreenTitle.textContent = "Book Free Trial";
  }
}

// ------------------------------------------
// SCREEN 1: SCHEDULE
// ------------------------------------------
function initSchedule() {
  renderFilterChips();
  renderScheduleCards();
}

function renderFilterChips() {
  if (!filterChipsList) return;
  filterChipsList.innerHTML = '';

  const allCategories = ['All', ...(typeof COURSES !== 'undefined' ? COURSES : [])];

  allCategories.forEach((course) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip-btn ${course === selectedCourseFilter ? 'active' : ''}`;
    chip.textContent = course;
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', course === selectedCourseFilter ? 'true' : 'false');

    chip.addEventListener('click', () => {
      selectedCourseFilter = course;
      // Update chips UI
      const allChips = filterChipsList.querySelectorAll('.chip-btn');
      allChips.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');

      renderScheduleCards();
    });

    filterChipsList.appendChild(chip);
  });
}

function renderScheduleCards() {
  if (!scheduleCardsList) return;
  scheduleCardsList.innerHTML = '';

  const scheduleData = typeof SCHEDULE !== 'undefined' ? SCHEDULE : [];

  const filtered = selectedCourseFilter === 'All'
    ? scheduleData
    : scheduleData.filter((item) => item.course === selectedCourseFilter);

  if (filtered.length === 0) {
    if (scheduleEmptyState) scheduleEmptyState.style.display = 'flex';
    return;
  }

  if (scheduleEmptyState) scheduleEmptyState.style.display = 'none';

  filtered.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'schedule-card';

    card.innerHTML = `
      <div class="card-course-badge">${escapeHtml(item.course)}</div>
      <div class="card-timing-info">
        <div class="card-row">
          ${SVG_CALENDAR}
          <span><strong>Day:</strong> ${escapeHtml(item.day)}</span>
        </div>
        <div class="card-row">
          ${SVG_CLOCK}
          <span><strong>Time:</strong> ${escapeHtml(item.time)}</span>
        </div>
      </div>
      <div class="card-teacher-footer">
        <div class="teacher-avatar" aria-hidden="true">
          ${SVG_DEFAULT_AVATAR}
        </div>
        <span class="teacher-name">${escapeHtml(item.teacher)}</span>
      </div>
    `;

    scheduleCardsList.appendChild(card);
  });
}

// ------------------------------------------
// SCREEN 2: NOTICES
// ------------------------------------------
function initNotices() {
  if (!noticesCardsList) return;
  noticesCardsList.innerHTML = '';

  const noticesData = typeof ANNOUNCEMENTS !== 'undefined' ? ANNOUNCEMENTS : [];

  if (noticesData.length === 0) {
    if (noticesEmptyState) noticesEmptyState.style.display = 'flex';
    return;
  }

  if (noticesEmptyState) noticesEmptyState.style.display = 'none';

  // Sort newest first based on date
  const sorted = [...noticesData].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach((notice, index) => {
    const card = document.createElement('article');
    card.className = 'notice-card';

    // Format date nicely (e.g. October 1, 2026)
    const formattedDate = formatDateString(notice.date);
    const isNewest = index === 0;

    card.innerHTML = `
      <div class="notice-header">
        <div class="notice-title-wrap">
          ${isNewest ? '<span class="notice-badge">New</span>' : ''}
          <h3 class="notice-title">${escapeHtml(notice.title)}</h3>
        </div>
      </div>
      <div class="notice-date">
        ${SVG_CALENDAR}
        <time datetime="${escapeHtml(notice.date)}">${formattedDate}</time>
      </div>
      <p class="notice-body">${escapeHtml(notice.text)}</p>
    `;

    noticesCardsList.appendChild(card);
  });
}

function formatDateString(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// ------------------------------------------
// SCREEN 3: FREE TRIAL FORM & VALIDATION
// ------------------------------------------
function initTrialForm() {
  // Populate course dropdown from COURSES in data.js
  const courseSelect = document.getElementById('course');
  if (courseSelect && typeof COURSES !== 'undefined') {
    courseSelect.innerHTML = '<option value="" disabled selected>Select a course</option>';
    COURSES.forEach((course) => {
      const option = document.createElement('option');
      option.value = course;
      option.textContent = course;
      courseSelect.appendChild(option);
    });
  }

  // Real-time blur validation on inputs
  const fields = ['parentName', 'phone', 'email', 'studentName', 'course', 'preferredTime'];
  fields.forEach((fieldId) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.addEventListener('blur', () => {
        validateField(fieldId);
      });
      el.addEventListener('input', () => {
        const group = document.getElementById(`group-${fieldId}`);
        if (group && group.classList.contains('has-error')) {
          validateField(fieldId);
        }
      });
    }
  });

  // Form submission
  if (trialForm) {
    trialForm.addEventListener('submit', handleTrialSubmit);
  }

  // Reset button on success panel
  if (btnResetForm) {
    btnResetForm.addEventListener('click', () => {
      trialForm.reset();
      clearAllValidationErrors();
      submissionErrorAlert.classList.remove('visible');
      trialSuccessPanel.classList.remove('visible');
      trialForm.style.display = 'flex';
    });
  }
}

function validateField(fieldId) {
  const el = document.getElementById(fieldId);
  const group = document.getElementById(`group-${fieldId}`);
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (!el || !group || !errorEl) return true;

  let isValid = true;
  let errorMessage = '';
  const val = el.value.trim();

  switch (fieldId) {
    case 'parentName':
      if (!val) {
        isValid = false;
        errorMessage = 'Please enter the parent’s name.';
      } else if (val.length < 3) {
        isValid = false;
        errorMessage = 'Parent name must be at least 3 characters.';
      }
      break;

    case 'phone':
      if (!val) {
        isValid = false;
        errorMessage = 'Please enter a contact phone number.';
      } else {
        // Accept Pakistani mobile numbers: 03XX-XXXXXXX or 03XXXXXXXXX (dashes/spaces allowed)
        const digitsOnly = val.replace(/[\s-]/g, '');
        const pkPhoneRegex = /^03\d{9}$/;
        if (!pkPhoneRegex.test(digitsOnly)) {
          isValid = false;
          errorMessage = 'Enter a valid Pakistani mobile number (e.g. 0300-1234567).';
        }
      }
      break;

    case 'email':
      // Optional: validate format only if filled
      if (val.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address.';
        }
      }
      break;

    case 'studentName':
      if (!val) {
        isValid = false;
        errorMessage = 'Please enter the student’s name.';
      } else if (val.length < 3) {
        isValid = false;
        errorMessage = 'Student name must be at least 3 characters.';
      }
      break;

    case 'course':
      if (!val) {
        isValid = false;
        errorMessage = 'Please select a course.';
      }
      break;

    case 'preferredTime':
      if (!val) {
        isValid = false;
        errorMessage = 'Please select a preferred timing.';
      }
      break;
  }

  if (!isValid) {
    group.classList.add('has-error');
    errorEl.textContent = errorMessage;
  } else {
    group.classList.remove('has-error');
    errorEl.textContent = '';
  }

  return isValid;
}

function clearAllValidationErrors() {
  const groups = document.querySelectorAll('.form-group');
  groups.forEach((g) => g.classList.remove('has-error'));
  const errorEls = document.querySelectorAll('.form-error');
  errorEls.forEach((e) => (e.textContent = ''));
}

async function handleTrialSubmit(event) {
  event.preventDefault();

  // Hide any previous submission failure alert
  if (submissionErrorAlert) {
    submissionErrorAlert.classList.remove('visible');
  }

  // Check honeypot field
  const honeypot = document.getElementById('website_hp');
  if (honeypot && honeypot.value) {
    // Silently block spam bots
    console.warn('Bot submission blocked.');
    return;
  }

  // Validate all fields
  const fields = ['parentName', 'phone', 'email', 'studentName', 'course', 'preferredTime'];
  let isFormValid = true;
  let firstInvalidField = null;

  fields.forEach((fieldId) => {
    const valid = validateField(fieldId);
    if (!valid) {
      isFormValid = false;
      if (!firstInvalidField) {
        firstInvalidField = document.getElementById(fieldId);
      }
    }
  });

  if (!isFormValid) {
    if (firstInvalidField) {
      firstInvalidField.focus();
    }
    return;
  }

  // Prepare submission data with exact required keys:
  // parentName, phone, email, studentName, course, preferredTime
  const parentName = document.getElementById('parentName').value.trim();
  const rawPhone = document.getElementById('phone').value.trim();
  const phone = rawPhone.replace(/[\s-]/g, ''); // Strip spaces and dashes
  const rawEmail = document.getElementById('email').value.trim();
  const email = rawEmail.length > 0 ? rawEmail : ''; // Send empty string if blank
  const studentName = document.getElementById('studentName').value.trim();
  const course = document.getElementById('course').value;
  const preferredTime = document.getElementById('preferredTime').value;

  const payload = {
    parentName,
    phone,
    email,
    studentName,
    course,
    preferredTime
  };

  // Check if placeholder webhook is still present
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE_N8N")) {
    console.warn("Notice: n8n webhook URL is not configured. Edit WEBHOOK_URL at top of app.js. Showing friendly contact fallback.");
    if (submissionErrorAlert) {
      submissionErrorAlert.classList.add('visible');
    }
    return;
  }

  // Disable button and show sending state
  btnSubmitTrial.disabled = true;
  const originalBtnHtml = btnSubmitTrial.innerHTML;
  btnSubmitTrial.innerHTML = '<span>Sending...</span>';

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // On success: hide form, show success confirmation panel
      trialForm.style.display = 'none';
      trialSuccessPanel.classList.add('visible');
      trialForm.reset();
      clearAllValidationErrors();
    } else {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Trial booking submission failed:', error);
    if (submissionErrorAlert) {
      submissionErrorAlert.classList.add('visible');
    }
  } finally {
    btnSubmitTrial.disabled = false;
    btnSubmitTrial.innerHTML = originalBtnHtml;
  }
}

// ------------------------------------------
// OFFLINE HANDLING
// ------------------------------------------
function initOfflineListener() {
  function updateOnlineStatus() {
    if (!navigator.onLine) {
      if (offlineBanner) offlineBanner.style.display = 'flex';
    } else {
      if (offlineBanner) offlineBanner.style.display = 'none';
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  // Initial check
  updateOnlineStatus();
}

// ------------------------------------------
// PWA INSTALL BANNER
// ------------------------------------------
function initPwaInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the default mini-infobar or prompt
    event.preventDefault();
    deferredInstallPrompt = event;

    // Show custom install banner
    if (installBanner) {
      installBanner.style.display = 'flex';
    }
  });

  if (btnPwaInstall) {
    btnPwaInstall.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      deferredInstallPrompt = null;
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    });
  }

  if (btnPwaDismiss) {
    btnPwaDismiss.addEventListener('click', () => {
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('App installed successfully');
    deferredInstallPrompt = null;
    if (installBanner) {
      installBanner.style.display = 'none';
    }
  });
}

// ------------------------------------------
// SERVICE WORKER REGISTRATION
// ------------------------------------------
function registerServiceWorker() {
  // Register only when protocol is https: or localhost
  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]';

  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || isLocalhost)) {
    try {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            console.log('ServiceWorker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('ServiceWorker registration failed:', err);
          });
      });
    } catch (e) {
      console.warn('ServiceWorker registration error handled safely:', e);
    }
  }
}

// Helper: Escape HTML to avoid XSS
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
