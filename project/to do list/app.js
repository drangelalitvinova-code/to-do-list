(() => {
  const STORAGE_KEY = "den-za-dnem-tasks-v1";
  const PRIORITIES = {
    urgent: { label: "Срочно", order: 0 },
    secondary: { label: "Второстепенно", order: 1 },
    later: { label: "Отложено на потом", order: 2 },
  };
  const $ = (selector) => document.querySelector(selector);
  const els = {
    dateWeekday: $("#date-weekday"), dateFull: $("#date-full"), taskForm: $("#task-form"),
    taskInput: $("#task-input"), taskPriority: $("#task-priority"), taskList: $("#task-list"),
    emptyState: $("#empty-state"), emptyTitle: $("#empty-title"), emptyCopy: $("#empty-copy"),
    filter: $("#task-filter"), percent: $("#progress-percent"), ring: $("#progress-ring"),
    count: $("#progress-count"), bar: $("#progress-bar"), message: $("#progress-message"),
    urgent: $("#urgent-count"), done: $("#done-count"), total: $("#task-total"),
    clear: $("#clear-completed"), toast: $("#toast"),
  };
  let selectedDate = dateKey(new Date());
  let tasks = loadTasks();
  let toastTimer;

  function dateKey(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function loadTasks() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(stored) ? stored.filter((task) => task && task.id && task.title && PRIORITIES[task.priority]) : [];
    } catch {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      showToast("Не получилось сохранить. Проверь свободное место в браузере.");
    }
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }

  function updateDate() {
    const date = new Date(`${selectedDate}T12:00:00`);
    els.dateWeekday.textContent = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date);
    els.dateFull.textContent = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function setDayOffset(offset) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + offset);
    selectedDate = dateKey(date);
    render();
  }

  function taskElement(task) {
    const row = document.createElement("article");
    row.className = `task-item${task.done ? " is-complete" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `${task.done ? "Вернуть" : "Отметить выполненной"}: ${task.title}`);
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveTasks();
      render();
    });

    const title = document.createElement("span");
    title.className = "task-name";
    title.textContent = task.title;

    const badge = document.createElement("span");
    badge.className = `priority-pill ${task.priority}`;
    const dot = document.createElement("i");
    dot.className = `priority-dot ${task.priority}-dot`;
    badge.append(dot, document.createTextNode(PRIORITIES[task.priority].label));

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const edit = document.createElement("button");
    edit.className = "task-action";
    edit.type = "button";
    edit.textContent = "✎";
    edit.title = "Изменить задачу";
    edit.setAttribute("aria-label", `Изменить задачу: ${task.title}`);
    edit.addEventListener("click", () => editTask(task));
    const remove = document.createElement("button");
    remove.className = "task-action";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Удалить задачу";
    remove.setAttribute("aria-label", `Удалить задачу: ${task.title}`);
    remove.addEventListener("click", () => {
      tasks = tasks.filter((item) => item.id !== task.id);
      saveTasks();
      render();
      showToast("Задача удалена");
    });
    actions.append(edit, remove);
    row.append(checkbox, title, badge, actions);
    return row;
  }

  function editTask(task) {
    const title = window.prompt("Измени название задачи", task.title);
    if (title === null) return;
    const trimmed = title.trim();
    if (!trimmed) return showToast("Название задачи не может быть пустым");
    task.title = trimmed.slice(0, 120);
    const priority = window.prompt("Приоритет: 1 — Срочно, 2 — Второстепенно, 3 — Отложено на потом", String(["urgent", "secondary", "later"].indexOf(task.priority) + 1));
    if (priority !== null) {
      const priorities = { "1": "urgent", "2": "secondary", "3": "later" };
      if (priorities[priority.trim()]) task.priority = priorities[priority.trim()];
    }
    saveTasks();
    render();
  }

  function render() {
    updateDate();
    const todaysTasks = tasks.filter((task) => task.date === selectedDate);
    const visibleTasks = todaysTasks.filter((task) => els.filter.value === "all" || (els.filter.value === "active" ? !task.done : task.done));
    visibleTasks.sort((a, b) => Number(a.done) - Number(b.done) || PRIORITIES[a.priority].order - PRIORITIES[b.priority].order || a.createdAt - b.createdAt);
    els.taskList.replaceChildren(...visibleTasks.map(taskElement));
    els.total.textContent = String(todaysTasks.length);

    const done = todaysTasks.filter((task) => task.done).length;
    const percent = todaysTasks.length ? Math.round(done / todaysTasks.length * 100) : 0;
    els.percent.textContent = `${percent}%`;
    els.ring.style.setProperty("--progress", `${percent * 3.6}deg`);
    els.count.textContent = `${done} из ${todaysTasks.length}`;
    els.done.textContent = String(done);
    els.urgent.textContent = String(todaysTasks.filter((task) => task.priority === "urgent" && !task.done).length);
    els.bar.style.width = `${percent}%`;
    els.message.textContent = !todaysTasks.length ? "Любой большой результат начинается с одного шага." : percent === 100 ? "Все задачи позади. Ты отлично справилась!" : percent > 0 ? "Хороший темп. Продолжай в своём ритме." : "Начни с одной задачи - дальше станет легче.";

    const isFilteredEmpty = todaysTasks.length > 0 && visibleTasks.length === 0;
    els.emptyState.hidden = visibleTasks.length > 0;
    els.emptyTitle.textContent = isFilteredEmpty ? "Здесь пока пусто" : todaysTasks.length ? "Все задачи в этом списке готовы" : "В списке пока тихо";
    els.emptyCopy.textContent = isFilteredEmpty ? "Попробуй выбрать другой фильтр." : todaysTasks.length ? "Можно выдохнуть или добавить ещё одну задачу." : "Добавь первую задачу - и освободи место для ясных мыслей.";
    els.clear.disabled = done === 0;
    els.clear.style.opacity = done === 0 ? ".45" : "1";
  }

  els.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = els.taskInput.value.trim();
    if (!title) return;
    tasks.push({
      id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: title.slice(0, 120),
      priority: els.taskPriority.value,
      date: selectedDate,
      done: false,
      createdAt: Date.now(),
    });
    els.taskInput.value = "";
    els.filter.value = "all";
    saveTasks();
    render();
    els.taskInput.focus();
  });

  $("#prev-day").addEventListener("click", () => setDayOffset(-1));
  $("#next-day").addEventListener("click", () => setDayOffset(1));
  $("#today-button").addEventListener("click", () => {
    selectedDate = dateKey(new Date());
    render();
  });
  els.filter.addEventListener("change", render);
  els.clear.addEventListener("click", () => {
    const before = tasks.length;
    tasks = tasks.filter((task) => task.date !== selectedDate || !task.done);
    if (tasks.length !== before) {
      saveTasks();
      render();
      showToast("Выполненные задачи убраны");
    }
  });

  render();
})();
