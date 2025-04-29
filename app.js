// Obtener los elementos del DOM
const themeSelector = document.getElementById('theme');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task');
const dueDateInput = document.getElementById('due-date');
const priorityInput = document.getElementById('priority');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const taskCounter = document.getElementById('task-counter');

// Estado y stacks para undo/redo
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 50;

// Drag & Drop
let draggedId = null;
let dragOverId = null;

// Guardar tareas en localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Guardar estado para undo
function saveStateForUndo() {
  undoStack.push(JSON.stringify(tasks));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
}

// Undo/Redo
function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(tasks));
  tasks = JSON.parse(undoStack.pop());
  saveTasks();
  renderTasks(currentFilter);
}
function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(tasks));
  tasks = JSON.parse(redoStack.pop());
  saveTasks();
  renderTasks(currentFilter);
}

// Validación de fecha
function isValidDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0,0,0,0);
  return !isNaN(date) && date >= today;
}

// Renderizar tareas
let currentFilter = 'all';
function renderTasks(filtro = 'all') {
  currentFilter = filtro;
  taskList.innerHTML = '';
  let filteredTasks = tasks;
  if (filtro === 'completed') filteredTasks = tasks.filter(t => t.completada);
  if (filtro === 'pending') filteredTasks = tasks.filter(t => !t.completada);

  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.classList.add('task-item');
    li.setAttribute('data-id', task.id);
    li.draggable = true;

    // Drag & Drop events
    li.addEventListener('dragstart', (e) => {
      draggedId = task.id;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
      draggedId = null;
      li.classList.remove('dragging');
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      dragOverId = task.id;
      li.classList.add('drag-over');
    });
    li.addEventListener('dragleave', () => {
      li.classList.remove('drag-over');
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');
      if (draggedId === null || draggedId === dragOverId) return;
      saveStateForUndo();
      const fromIdx = tasks.findIndex(t => t.id === draggedId);
      const toIdx = tasks.findIndex(t => t.id === dragOverId);
      const [moved] = tasks.splice(fromIdx, 1);
      tasks.splice(toIdx, 0, moved);
      saveTasks();
      renderTasks(currentFilter);
    });

    // Edición inline
    if (task.editing) {
      const editForm = document.createElement('form');
      editForm.className = 'edit-form';

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.value = task.texto;
      textInput.required = true;

      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.value = task.fecha;
      dateInput.required = true;

      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'edit-buttons';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.textContent = 'Guardar';
      saveBtn.addEventListener('click', () => {
        if (textInput.value.trim() === '' || !isValidDate(dateInput.value)) {
          alert('¡Texto vacío o fecha inválida!');
          return;
        }
        saveStateForUndo();
        task.texto = textInput.value.trim();
        task.fecha = dateInput.value;
        delete task.editing;
        saveTasks();
        renderTasks(currentFilter);
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', () => {
        delete task.editing;
        renderTasks(currentFilter);
      });

      buttonContainer.append(saveBtn, cancelBtn);
      editForm.append(textInput, dateInput, buttonContainer);

      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveBtn.click();
      });

      li.appendChild(editForm);
      taskList.appendChild(li);
      return;
    }

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completada;
    checkbox.addEventListener('change', () => {
      saveStateForUndo();
      task.completada = !task.completada;
      saveTasks();
      renderTasks(currentFilter);
    });

    // Texto
    const taskText = document.createElement('span');
    taskText.textContent = task.texto;

    // Fecha
    const dueDate = document.createElement('span');
    dueDate.textContent = ` ${task.fecha}`;

    // Prioridad
    const priorityTag = document.createElement('span');
    if (task.completada) {
      priorityTag.textContent = 'completada';
      priorityTag.classList.add('priority', 'completada');
    } else {
      priorityTag.textContent = task.prioridad;
      priorityTag.classList.add('priority', task.prioridad);
    }

    // Imagen
    const img = document.createElement('img');
    img.src = "https://picsum.photos/150";
    img.alt = 'Imagen de tarea';

    // Botón Editar
    const editButton = document.createElement('button');
    editButton.classList.add('edit-btn');
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => {
      task.editing = true;
      renderTasks(currentFilter);
    });

    // Botón Eliminar
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-btn');
    deleteButton.textContent = 'Eliminar';
    deleteButton.addEventListener('click', () => {
      saveStateForUndo();
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks(currentFilter);
    });

    // Estructura visual
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    taskContent.append(checkbox, taskText, dueDate, priorityTag);

    li.append(taskContent, img, editButton, deleteButton);
    taskList.appendChild(li);
  });

  // Contador de tareas pendientes
  if (taskCounter) {
    const pendientes = tasks.filter(t => !t.completada).length;
    taskCounter.textContent = `Tareas pendientes: ${pendientes}`;
  }
}

// Añadir tarea
function addTask(event) {
  event.preventDefault();
  if (taskInput.value.trim() === '') {
    alert('Por favor, ingresa una tarea.');
    return;
  }
  if (!isValidDate(dueDateInput.value)) {
    alert('Fecha inválida! Debe ser hoy o posterior');
    return;
  }
  saveStateForUndo();
  const newTask = {
    id: Date.now(),
    texto: taskInput.value.trim(),
    fecha: dueDateInput.value,
    prioridad: priorityInput.value,
    completada: false
  };
  tasks.push(newTask);
  saveTasks();
  renderTasks(currentFilter);
  taskForm.reset();
}

// Filtros
function setFilter(event) {
  const filtro = event.target.dataset.filter;
  renderTasks(filtro);
}

// Tema
function changeTheme(event) {
  const selectedTheme = event.target.value;
  if (selectedTheme === 'dark') {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
  } else {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
  }
  localStorage.setItem('theme', selectedTheme);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Tema
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.add(savedTheme);
  themeSelector.value = savedTheme;
  themeSelector.addEventListener('change', changeTheme);

  // Undo/Redo UI
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <button type="button" id="undo-btn" title="Deshacer">↩️</button>
    <button type="button" id="redo-btn" title="Rehacer">↪️</button>
  `;
  document.body.appendChild(controls);
  document.getElementById('undo-btn').onclick = undo;
  document.getElementById('redo-btn').onclick = redo;

  // Eventos
  taskForm.addEventListener('submit', addTask);
  filterButtons.forEach(button => button.addEventListener('click', setFilter));
  renderTasks();
});
