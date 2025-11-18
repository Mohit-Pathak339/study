/* app.js - JAC Class 11 Study Planner (pure JS, localStorage, Notifications, link to tanuclasses.in) */

const DEFAULT = {
  subjects: {
    History: [
      "Early Civilizations",
      "Medieval India",
      "Modern India (Beginnings)",
      "World History Overview",
      "Revolutions & Movements"
    ],
    "Political Science": [
      "What is Politics?",
      "Constitution: Basics",
      "Branches of Government",
      "Rights & Duties"
    ],
    English: [
      "Prose: Short Stories",
      "Poetry: Understanding Tone",
      "Writing Skills: Essay",
      "Comprehension & Grammar"
    ],
    Sanskrit: [
      "Grammar Basics",
      "Simple Sentences",
      "Translation Practice",
      "Sanskrit Vyakaran"
    ],
    Sociology: [
      "Introduction to Sociology",
      "Social Institutions",
      "Social Structure & Change",
      "Research Methods"
    ]
  },
  schedule: [], // [{dateISO, subject, chapter, done:false}]
  startDate: null,
  reminder: { enabled: false, time: "18:00" }
};

const STORAGE_KEY = "jac11_planner_v2";

let state = loadState();

const subjectsContainer = document.getElementById("subjectsContainer");
const startDateInput = document.getElementById("startDate");
const reminderTimeInput = document.getElementById("reminderTime");
const enableReminderCheckbox = document.getElementById("enableReminder");
const generateBtn = document.getElementById("generateBtn");
const saveChaptersBtn = document.getElementById("saveChaptersBtn");
const openTanuBtn = document.getElementById("openTanuBtn");

const todayDateEl = document.getElementById("todayDate");
const todayBox = document.getElementById("todayBox");
const markDoneBtn = document.getElementById("markDoneBtn");
const skipBtn = document.getElementById("skipBtn");
const scheduleList = document.getElementById("scheduleList");

let reminderIntervalId = null;

/* ---------- Initialization ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
    const parsed = JSON.parse(raw);
    // ensure subjects exist
    if (!parsed.subjects) parsed.subjects = DEFAULT.subjects;
    if (!Array.isArray(parsed.schedule)) parsed.schedule = [];
    if (!parsed.reminder) parsed.reminder = DEFAULT.reminder;
    return parsed;
  } catch (e) {
    console.error("load error", e);
    return JSON.parse(JSON.stringify(DEFAULT));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- UI render ---------- */
function renderSubjectsEditor() {
  subjectsContainer.innerHTML = "";
  for (const [sub, chapters] of Object.entries(state.subjects)) {
    const div = document.createElement("div");
    div.className = "subject-card";
    div.innerHTML = `
      <h3 contenteditable="false">${escapeHtml(sub)}</h3>
      <textarea data-sub="${escapeHtml(sub)}" placeholder="One chapter per line">${chapters.join("\n")}</textarea>
    `;
    subjectsContainer.appendChild(div);
  }
}

function applySettingsToUI() {
  startDateInput.value = state.startDate || "";
  reminderTimeInput.value = state.reminder.time || "18:00";
  enableReminderCheckbox.checked = !!state.reminder.enabled;
}

function renderSchedule() {
  scheduleList.innerHTML = "";
  if (!state.schedule || state.schedule.length === 0) {
    scheduleList.innerHTML = `<div class="note">No schedule yet. Click 'Generate Schedule' to create a daily plan.</div>`;
    todayBox.innerText = "No schedule yet. Generate schedule to see today's chapter.";
    todayDateEl.innerText = "";
    return;
  }

  // today's item
  const todayISO = new Date().toISOString().slice(0,10);
  todayDateEl.innerText = todayISO;

  const todayItem = state.schedule.find(s => s.dateISO === todayISO) || null;
  if (todayItem) {
    todayBox.innerHTML = `<strong>${escapeHtml(todayItem.subject)}</strong> — ${escapeHtml(todayItem.chapter)}<div class="meta">Scheduled for ${todayItem.dateISO} ${todayItem.done ? " (Done)" : ""}</div>`;
    if (todayItem.done) {
      markDoneBtn.disabled = true;
      markDoneBtn.innerText = "Already Completed";
    } else {
      markDoneBtn.disabled = false;
      markDoneBtn.innerText = "Mark Complete";
    }
  } else {
    // If nothing exactly for today, show next upcoming
    const upcoming = state.schedule.find(s => s.dateISO >= todayISO);
    if (upcoming) {
      todayBox.innerHTML = `<strong>Next:</strong> ${escapeHtml(upcoming.subject)} — ${escapeHtml(upcoming.chapter)} <div class="meta">On ${upcoming.dateISO}</div>`;
      markDoneBtn.disabled = true;
      markDoneBtn.innerText = "No task for today";
    } else {
      todayBox.innerText = "All scheduled chapters are completed or schedule hasn't covered today's date.";
      markDoneBtn.disabled = true;
      markDoneBtn.innerText = "No task";
    }
  }

  // full list
  state.schedule.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "schedule-item" + (item.done ? " done" : "");
    row.innerHTML = `
      <div>
        <div><strong>${escapeHtml(item.subject)}</strong> — ${escapeHtml(item.chapter)}</div>
        <div class="meta">${item.dateISO}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn small" data-idx="${idx}" data-action="toggle">${item.done ? "Undo" : "Done"}</button>
        <button class="btn ghost small" data-idx="${idx}" data-action="goto">Go</button>
      </div>
    `;
    scheduleList.appendChild(row);
  });

  // attach listeners for schedule buttons
  scheduleList.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const idx = Number(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === "toggle") {
        state.schedule[idx].done = !state.schedule[idx].done;
        saveState(); renderSchedule();
      } else if (action === "goto") {
        // set today's date to that date (simulate)
        alert(`Set your calendar or view the chapter scheduled on ${state.schedule[idx].dateISO}.\nToday's task area will show next upcoming.`);
        // no change to date; just focusing
      }
    });
  });
}

/* ---------- Utilities ---------- */
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function isoDateAddDays(isoDate, add) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + add);
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), dt = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dt}`;
}

/* ---------- Schedule generation ---------- */
function generateScheduleFromSubjects(startDateISO) {
  // Flatten chapters preserving subject grouping
  const pairs = [];
  for (const [subject, chapters] of Object.entries(state.subjects)) {
    for (const ch of chapters) {
      pairs.push({subject, chapter: ch});
    }
  }
  if (pairs.length === 0) return [];

  // Create schedule: one chapter per day starting startDateISO
  const schedule = [];
  for (let i = 0; i < pairs.length; i++) {
    schedule.push({
      dateISO: isoDateAddDays(startDateISO, i),
      subject: pairs[i].subject,
      chapter: pairs[i].chapter,
      done: false
    });
  }
  return schedule;
}

/* ---------- Reminders (Notification API) ---------- */
async function requestNotificationPermissionIfNeeded() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function startReminderWatcher() {
  stopReminderWatcher();
  if (!state.reminder.enabled) return;
  // run every 30 seconds, check time
  reminderIntervalId = setInterval(() => {
    try {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0,5);
      if (hhmm === state.reminder.time) {
        notifyForToday();
      }
    } catch(e){}
  }, 30000);
}

function stopReminderWatcher() {
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }
}

async function notifyForToday() {
  const granted = await requestNotificationPermissionIfNeeded();
  if (!granted) return;
  const todayISO = new Date().toISOString().slice(0,10);
  const todayItem = state.schedule.find(s=>s.dateISO===todayISO && !s.done);
  const body = todayItem ? `${todayItem.subject} - ${todayItem.chapter}` : `No pending chapter scheduled for today.`;
  const notif = new Notification("JAC Study Reminder", {
    body,
    badge: "",
    silent: false
  });
  notif.onclick = () => {
    window.focus();
    // Optionally open tanuclasses
    // window.open("https://tanuclasses.in/", "_blank");
  };
}

/* ---------- Event handlers ---------- */
generateBtn.addEventListener("click", async ()=>{
  const sd = startDateInput.value;
  if (!sd) return alert("Please choose a start date.");
  state.startDate = sd;
  state.schedule = generateScheduleFromSubjects(sd);
  saveState();
  renderSchedule();
  alert("Schedule generated for " + state.schedule.length + " chapters starting " + sd + ".");
});

saveChaptersBtn.addEventListener("click", ()=>{
  // read all textareas
  const areas = subjectsContainer.querySelectorAll("textarea");
  const newSubjects = {};
  areas.forEach(a=>{
    const name = a.dataset.sub;
    const lines = a.value.split("\n").map(s=>s.trim()).filter(Boolean);
    newSubjects[name] = lines;
  });
  state.subjects = newSubjects;
  saveState();
  alert("Chapters saved. Now press 'Generate Schedule' to create a plan.");
  renderSubjectsEditor();
});

openTanuBtn.addEventListener("click", ()=>{
  window.open("https://tanuclasses.in/", "_blank");
});

markDoneBtn.addEventListener("click", ()=>{
  const todayISO = new Date().toISOString().slice(0,10);
  const idx = state.schedule.findIndex(s=>s.dateISO===todayISO);
  if (idx >= 0) {
    state.schedule[idx].done = true;
    saveState(); renderSchedule();
  } else {
    alert("No chapter scheduled for today to mark done.");
  }
});

skipBtn.addEventListener("click", ()=>{
  // mark today's as done and notifies next day's task
  const todayISO = new Date().toISOString().slice(0,10);
  const idx = state.schedule.findIndex(s=>s.dateISO===todayISO);
  if (idx>=0) state.schedule[idx].done = true;
  // do not change schedule dates; this simply marks it done so next upcoming becomes today's view
  saveState(); renderSchedule();
});

/* schedule list events are set during renderSchedule */

/* reminder settings */
enableReminderCheckbox.addEventListener("change", async (e)=>{
  state.reminder.enabled = enableReminderCheckbox.checked;
  saveState();
  if (state.reminder.enabled) {
    const granted = await requestNotificationPermissionIfNeeded();
    if (!granted) {
      alert("Notification permission denied or unavailable. Reminders will not work.");
      state.reminder.enabled = false;
      enableReminderCheckbox.checked = false;
      saveState();
      return;
    }
    startReminderWatcher();
    alert("Daily reminders enabled at " + state.reminder.time);
  } else {
    stopReminderWatcher();
    alert("Daily reminders disabled.");
  }
});

reminderTimeInput.addEventListener("change", ()=>{
  state.reminder.time = reminderTimeInput.value;
  saveState();
  if (state.reminder.enabled) {
    // restart watcher so it uses new time
    startReminderWatcher();
  }
});

/* ---------- On page load ---------- */
function init() {
  // ensure subjects exist
  if (!state.subjects || Object.keys(state.subjects).length === 0) {
    state.subjects = DEFAULT.subjects;
  }
  renderSubjectsEditor();
  applySettingsToUI();
  renderSchedule();

  // attach change listener for editable subject headings (not editable names for now)
  // set default startDate to today if not set
  if (!state.startDate) {
    const todayISO = new Date().toISOString().slice(0,10);
    startDateInput.value = todayISO;
  } else {
    startDateInput.value = state.startDate;
  }

  // if schedule is present but startDate changed manually, user must regenerate; we don't auto-shift
  // start reminder watcher if enabled
  if (state.reminder.enabled) startReminderWatcher();

  // small interval to check for missed notification (if page loaded at exact time)
  setTimeout(()=>{
    const now = new Date();
    const hhmm = now.toTimeString().slice(0,5);
    if (state.reminder.enabled && hhmm === state.reminder.time) notifyForToday();
  }, 1500);
}

init();

/* ---------- Helper: allow subject names with spaces as data-sub attr ---------- */
(function fixTextareasDataAttr(){
  // after render, ensure data-sub is correct for saving (we used escaped names)
  document.querySelectorAll('textarea[data-sub]').forEach(el=>{
    // decode HTML entities back to normal for data attribute
    el.dataset.sub = el.dataset.sub;
  });
})();
