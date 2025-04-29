// Evitar escrituras excesivas en localStorage
function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Selección y cacheo de elementos DOM
const themeSelector = document.getElementById('theme');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task');
const dueDateInput = document.getElementById('due-date');
const priorityInput = document.getElementById('priority');
const imgSrc = document.getElementById('imgSrc');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const taskCounter = document.getElementById('task-counter');

// Estado y stacks para undo/redo
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 50;
let currentFilter = 'all';
const today = new Date().toISOString().split('T')[0];

// Drag & Drop
let draggedId = null;
let dragOverId = null;

// Guardar tareas en localStorage (optimizado con debounce)
const saveTasks = debounce(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
});

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
    today.setHours(0, 0, 0, 0);
    return !isNaN(date) && date >= today;
}

// Animación de eliminación
function deleteTaskWithAnimation(taskId) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    if (!taskElement) return;
    taskElement.classList.add('fade-out');
    taskElement.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderTasks(currentFilter);
    }, { once: true });
}

// Función para importar CSV
function importFromCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const csvData = e.target.result;
        const rows = csvData.split('\n').slice(1); // Saltar encabezado
        
        const importedTasks = rows.map(row => {
            const [id, textoRaw, fecha, prioridad, completadaRaw, imgSrc] = row.split(',');
            
            // Limpiar y validar datos
            const texto = textoRaw.replace(/^"|"$/g, '').trim();
            const completada = completadaRaw.replace(/^"|"$/g, '').trim() === 'Sí';
            
            if (!isValidDate(fecha) || !['alta', 'media', 'baja'].includes(prioridad.toLowerCase())) {
                return null;
            }

            return {
                id: parseInt(id),
                texto: texto,
                fecha: fecha,
                prioridad: prioridad.toLowerCase(),
                completada: completada,
                imgSrc: imgSrc || 'https://picsum.photos/150'
            };
        }).filter(task => task !== null);

        saveStateForUndo();
        tasks = [...tasks, ...importedTasks];
        saveTasks();
        renderTasks(currentFilter);
        alert(`Se importaron ${importedTasks.length} tareas correctamente`);
    };
    
    reader.readAsText(file);
}


// Exportar tareas a CSV
function exportToCSV() {
    const csvContent = [
        ['ID', 'Tarea', 'Fecha', 'Prioridad', 'Completada', 'Imagen'],
        ...tasks.map(task => [
            task.id,
            `"${task.texto.replace(/"/g, '""')}"`,
            task.fecha,
            task.prioridad,
            task.completada ? 'Sí' : 'No',
            task.imgSrc
        ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tareas_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// Notificaciones para tareas próximas a vencer
function checkDueTasks() {
    if (!("Notification" in window)) return;
    tasks.forEach(task => {
        if (!task.completada) {
            const dueDate = new Date(task.fecha);
            const now = new Date();
            const timeDiff = dueDate - now;
            if (timeDiff > 0 && timeDiff <= 86400000) { // 24h
                setTimeout(() => {
                    if (Notification.permission === "granted") {
                        new Notification('Tarea próxima a vencer', {
                            body: `La tarea "${task.texto}" vence hoy`,
                            icon: 'https://picsum.photos/150'
                        });
                    }
                }, Math.max(0, timeDiff - 600000)); // 10 min antes
            }
        }
    });
}

// Renderizado eficiente de tareas
function renderTasks(filtro = 'all') {
    currentFilter = filtro;
    taskList.innerHTML = '';
    let filteredTasks = tasks;
    if (filtro === 'completed') filteredTasks = tasks.filter(t => t.completada);
    if (filtro === 'pending') filteredTasks = tasks.filter(t => !t.completada);

    const fragment = document.createDocumentFragment();

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
            dateInput.setAttribute('min', today);
            dateInput.required = true;
            const srcImg = document.createElement('input');
            srcImg.type = 'text';
            srcImg.value = task.imgSrc;
            const prioritySelect = document.createElement('select');
            ['alta', 'media', 'baja'].forEach(level => {
                const opt = document.createElement('option');
                opt.value = level;
                opt.textContent = level.charAt(0).toUpperCase() + level.slice(1);
                if (task.prioridad === level) opt.selected = true;
                prioritySelect.appendChild(opt);
            });
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
                task.prioridad = prioritySelect.value;
                task.imgSrc = srcImg.value;
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
            editForm.append(textInput, dateInput,srcImg, prioritySelect, buttonContainer);
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                saveBtn.click();
            });
            li.appendChild(editForm);
            fragment.appendChild(li);
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
        img.src = task.imgSrc;
        img.alt = 'Imagen de tarea';

        // Botón Editar
        const editButton = document.createElement('button');
        editButton.classList.add('edit-btn');
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => {
            task.editing = true;
            renderTasks(currentFilter);
        });

        // Botón Eliminar (con animación)
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-btn');
        deleteButton.textContent = 'Eliminar';
        deleteButton.addEventListener('click', () => {
            saveStateForUndo();
            deleteTaskWithAnimation(task.id);
        });

        // Estructura visual
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        taskContent.append(checkbox, taskText, dueDate, priorityTag);

        li.append(taskContent, img, editButton, deleteButton);
        fragment.appendChild(li);
    });

    taskList.appendChild(fragment);

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
        completada: false,
        imgSrc: imgSrc.value || 'https://picsum.photos/150',
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

// Tema (persistente)
function changeTheme(event) {
    const selectedTheme = event.target.value;
    document.body.className = selectedTheme;
    localStorage.setItem('theme', selectedTheme);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Tema
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
    themeSelector.value = savedTheme;
    themeSelector.addEventListener('change', changeTheme);

    // Fecha mínima hoy
    dueDateInput.setAttribute('min', today);

    // Eventos
    taskForm.addEventListener('submit', addTask);
    filterButtons.forEach(button => button.addEventListener('click', setFilter));

    // Notificaciones
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
    checkDueTasks();

    document.getElementById('importFile').addEventListener('change', importFromCSV);

    renderTasks();
});
