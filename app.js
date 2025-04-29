// Obtener los elementos del DOM
const themeSelector = document.getElementById('theme');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task');
const dueDateInput = document.getElementById('due-date');
const priorityInput = document.getElementById('priority');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');

// Inicializar tareas desde localStorage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// Función para guardar tareas en localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Función para renderizar las tareas
function renderTasks(filtro = 'all') {
    taskList.innerHTML = ''; // Limpiar lista antes de volver a renderizar
    const filteredTasks = tasks.filter(task => {
        if (filtro === 'all') return true;
        if (filtro === 'completed') return task.completada === true;
        if (filtro === 'pending') return task.completada === false;
    });

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.classList.add('task-item');
        li.setAttribute('data-id', task.id);
        li.setAttribute('draggable', true);

        const img = document.createElement('img');
        img.src = "https://picsum.photos/150";
        img.alt = 'Imagen de tarea';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completada;
        checkbox.addEventListener('change', () => toggleCompletion(task.id));

        const taskText = document.createElement('span');
        taskText.textContent = task.texto;

        const dueDate = document.createElement('span');
        dueDate.textContent = ` ${task.fecha}`;

        const priorityTag = document.createElement('span');
      
        if (task.completada){
            priorityTag.textContent = 'completada';
            priorityTag.classList.add('priority', 'completada');
        } else {
            priorityTag.textContent = task.prioridad;
            priorityTag.classList.add('priority', task.prioridad);
        }

        const editButton = document.createElement('button');
        editButton.classList.add('edit-btn');
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => editTask(task.id));

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-btn');
        deleteButton.textContent = 'Eliminar';
        deleteButton.addEventListener('click', () => deleteTask(task.id));

        
        li.appendChild(checkbox);
        li.appendChild(taskText);
        li.appendChild(dueDate);
        li.appendChild(priorityTag);
        li.appendChild(img);
        li.appendChild(editButton);
        li.appendChild(deleteButton);

        taskList.appendChild(li);
    });
}

// Función para agregar una nueva tarea
function addTask(event) {
    event.preventDefault();

    // Validar que el campo de texto no esté vacío
    if (taskInput.value.trim() === '') {
        alert('Por favor, ingresa una tarea.');
        return;
    }

    const newTask = {
        id: Date.now(),  // Usamos el timestamp como id único
        texto: taskInput.value.trim(),
        fecha: dueDateInput.value,
        prioridad: priorityInput.value,
        completada: false
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    taskForm.reset(); // Limpiar el formulario después de agregar la tarea
}

// Función para marcar tarea como completada
function toggleCompletion(taskId) {
    const task = tasks.find(task => task.id === taskId);
    task.completada = !task.completada;
    saveTasks();
    renderTasks();
}

// Función para eliminar una tarea
function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks();
    renderTasks();
}

// Función para editar una tarea 
function editTask(taskId) {
    const task = tasks.find(task => task.id === taskId);
    const newText = prompt('Edita tu tarea:', task.texto);
    if (newText !== null && newText.trim() !== '') {
        task.texto = newText.trim();
        saveTasks();
        renderTasks();
    }
}

// Función para filtrar tareas (Todas, Completadas, Pendientes)
function setFilter(event) {
    const filtro = event.target.dataset.filter;
    renderTasks(filtro);
}

// Agregar event listener para el formulario
taskForm.addEventListener('submit', addTask);

// Agregar event listeners para los botones de filtro
filterButtons.forEach(button => {
    button.addEventListener('click', setFilter);
});

// Función para cambiar el tema
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

// Establecer el tema inicial
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.classList.add(savedTheme);
themeSelector.value = savedTheme;
themeSelector.addEventListener('change', changeTheme);

// Renderizar tareas al cargar la página
renderTasks();
