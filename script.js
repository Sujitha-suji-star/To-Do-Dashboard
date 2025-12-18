// Show live clock
function updateClock() {
  const now = new Date();
  document.getElementById("currentTime").textContent =
    "Current Time: " + now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// Central store for tasks
const tasks = {};
let taskCounter = 0;
function nextTaskId() {
  taskCounter += 1;
  return "task-" + taskCounter;
}

function addTask() {
  const taskInput = document.getElementById("taskInput");
  const sectionSelect = document.getElementById("sectionSelect");
  const deadlineInput = document.getElementById("deadlineInput");
  const rawText = taskInput.value.trim();
  if (!rawText) return;

  const taskId = nextTaskId();

  // Parse deadline
  let deadline = null;
  if (deadlineInput.value) {
    const parts = deadlineInput.value.split(/[T:-]/);
    if (parts.length >= 5) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const hh = parseInt(parts[3], 10);
      const mm = parseInt(parts[4], 10);
      deadline = new Date(y, m, d, hh, mm, 0, 0);
    }
  }

  tasks[taskId] = {
    text: rawText,
    deadline: deadline,
    completed: false,
    handled: false
  };

  // Add to All Tasks
  renderTaskCopy("#all ul", taskId);

  // Add to chosen section
  let sectionId = sectionSelect.value;
  let targetUl;
  if (["early", "morning", "afternoon", "evening", "night"].includes(sectionId)) {
    targetUl = document.getElementById(sectionId);
  } else {
    targetUl = document.querySelector(`#${sectionId} ul`);
  }
  if (targetUl) renderTaskCopy(`#${sectionId}`, taskId);

  // Upcoming deadlines
  if (deadline) {
    const diff = deadline - new Date();
    if (diff > 0 && diff <= 24 * 60 * 60 * 1000) {
      renderTaskCopy("#upcoming ul", taskId);
    }
  }

  taskInput.value = "";
  deadlineInput.value = "";
  updateEmptyStates();
  checkDeadlines();
}

function renderTaskCopy(selector, taskId) {
  const t = tasks[taskId];
  const ul = document.querySelector(selector + " ul") || document.querySelector(selector);
  if (!ul) return;

  const li = document.createElement("li");
  li.dataset.taskId = taskId;

  const span = document.createElement("span");
  span.textContent = composeDisplayText(t);

  const finishBtn = document.createElement("button");
  finishBtn.textContent = "✅";
  finishBtn.onclick = () => {
    t.completed = true;
    const copies = document.querySelectorAll(`li[data-task-id="${taskId}"] span`);
    copies.forEach(s => (s.style.textDecoration = "line-through"));
  };

  li.ondblclick = () => {
    if (!t.completed) return;
    if (!li.querySelector(".delete-btn")) {
      const del = document.createElement("button");
      del.textContent = "❌";
      del.className = "delete-btn";
      del.onclick = () => deleteTaskById(taskId);
      li.appendChild(del);
    }
  };

  li.appendChild(span);
  li.appendChild(finishBtn);
  ul.appendChild(li);
}

function composeDisplayText(t) {
  return t.text + (t.deadline ? " (Deadline: " + t.deadline.toLocaleString() + ")" : "");
}

function deleteTaskById(taskId) {
  const nodes = document.querySelectorAll(`li[data-task-id="${taskId}"]`);
  nodes.forEach(n => n.remove());
  delete tasks[taskId];
  updateEmptyStates();
}

function updateDeadlineForTask(taskId, newDeadlineStr) {
  const parts = newDeadlineStr.split(/[T:-]/);
  if (parts.length < 5) return;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const hh = parseInt(parts[3], 10);
  const mm = parseInt(parts[4], 10);
  const nd = new Date(y, m, d, hh, mm, 0, 0);

  const t = tasks[taskId];
  if (!t) return;
  t.deadline = nd;
  t.handled = false;

  const spans = document.querySelectorAll(`li[data-task-id="${taskId}"] span`);
  spans.forEach(s => (s.textContent = composeDisplayText(t)));

  const in24h = nd - new Date() > 0 && nd - new Date() <= 24 * 60 * 60 * 1000;
  const hasUpcomingCopy = document.querySelector(`#upcoming ul li[data-task-id="${taskId}"]`);
  if (in24h && !hasUpcomingCopy) {
    renderTaskCopy("#upcoming ul", taskId);
  } else if (!in24h && hasUpcomingCopy) {
    hasUpcomingCopy.remove();
  }

  updateEmptyStates();
  checkDeadlines();
}

setInterval(checkDeadlines, 30 * 1000);

function checkDeadlines() {
  const now = new Date();
  Object.entries(tasks).forEach(([taskId, t]) => {
    if (!t.deadline || t.handled) return;
    if (now >= t.deadline) {
      t.handled = true;
      if (t.completed) {
        if (confirm("Deadline passed and task is complete. Delete this task?")) {
          deleteTaskById(taskId);
        }
      } else {
        const action = prompt("Deadline passed. Type:\n- delete\n- change\n- keep");
        if (!action) return;
        const val = action.trim().toLowerCase();
        if (val === "delete") {
          deleteTaskById(taskId);
        } else if (val === "change") {
          const newVal = prompt("Enter new deadline (YYYY-MM-DDTHH:MM):");
          if (newVal) {
            t.handled = false;
            updateDeadlineForTask(taskId, newVal);
          }
        }
      }
    }
  });
}

function showSection(sectionId) {
  const sections = document.querySelectorAll(".task-section");
  sections.forEach(sec => (sec.style.display = "none"));
  const target = document.getElementById(sectionId);
  target.style.display = "block";
  updateEmptyStates();
}

function updateEmptyStates() {
  const sections = document.querySelectorAll(".task-section");
  sections.forEach(section => {
    let msg = section.querySelector(".empty-msg");
    if (!msg) {
      msg = document.createElement("div");
      msg.className = "empty-msg";
      msg.style.color = "#888";
      msg.style.fontStyle = "italic";
      msg.style.marginTop = "10px";
      section.appendChild(msg);
    }
    const uls = section.querySelectorAll("ul");
    const hasItems = Array.from(uls).some(ul => ul.children.length > 0);
    msg.textContent = hasItems ? "" : "No tasks here ✨";
  });
}

// Show All by default
showSection("all");
