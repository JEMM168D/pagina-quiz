// --- DOM Element References ---
const uploadSection = document.getElementById('upload-section');
const quizSection = document.getElementById('quiz-section');
const loadingMessage = document.getElementById('loading-message');
const resultSection = document.getElementById('result-section');
const questionArea = document.getElementById('question-area');

const documentUploadInput = document.getElementById('documentUpload');
const uploadButton = document.getElementById('uploadButton');
const numQuestionsInput = document.getElementById('numQuestions');
const startButton = document.getElementById('startButton');

// --- State Variables ---
let fileContent = null;
let questions = []; // Almacenará las preguntas generadas por la IA
let currentQuestionIndex = 0;
let score = 0;
let selectedQuizQuestions = []; // Guardará las preguntas seleccionadas para el quiz actual

// --- Initial Page Setup ---
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado. Ocultando secciones iniciales.");
    quizSection.style.display = 'none';
    loadingMessage.style.display = 'none';
    resultSection.style.display = 'none';
    questionArea.style.display = 'none';
});

// --- Event Listeners ---

// 1. Event Listener para el botón "Analizar Documento"
uploadButton.addEventListener('click', () => {
    console.log("Botón 'Analizar Documento' clickeado.");
    const files = documentUploadInput.files;

// Dentro de uploadButton.addEventListener('click', ...)

    const file = files[0];
    console.log(`Archivo seleccionado: ${file.name}, Tipo: ${file.type}, Tamaño: ${file.size}`);

    // Validar tamaño (opcional pero recomendado, ej: 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSizeInBytes) {
        alert(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB). El límite es 10 MB.`);
        documentUploadInput.value = ''; // Limpiar input
        return;
    }

    // Tipos de archivo permitidos (puedes ajustar)
    const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];

    // Validar tipo de archivo de forma más robusta que 'accept'
    // Nota: El navegador podría no reportar siempre el tipo MIME correcto para .docx,
    // por eso la función también revisa la extensión .docx
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.docx')) {
         alert(`Tipo de archivo no permitido (${file.type || 'desconocido'}). Sube .txt, .pdf o .docx.`);
         documentUploadInput.value = ''; // Limpiar input
         return;
    }


    const reader = new FileReader();

    // Qué hacer cuando el archivo se lea como Data URL
    reader.onload = (e) => {
        const fileDataUrl = e.target.result; // Esto es el string Base64 con prefijo 'data:...'
        console.log("Archivo leído como Data URL.");

        // Ocultar subida, mostrar carga
        uploadSection.style.display = 'none';
        loadingMessage.style.display = 'block';
        quizSection.style.display = 'none';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';

        // --- LLAMADA a la Función Serverless con los nuevos datos ---
        analyzeDocumentWithAI(fileDataUrl, file.type, file.name); // Pasar Data URL, tipo y nombre
    };

    // Qué hacer si hay error leyendo el archivo
    reader.onerror = (e) => {
        console.error("Error leyendo el archivo:", e);
        alert('Error al leer el archivo localmente.');
        loadingMessage.style.display = 'none';
        uploadSection.style.display = 'block';
        documentUploadInput.value = ''; // Limpiar input
    };

    // Empezar a leer el archivo como Data URL (Base64)
    reader.readAsDataURL(file);

// Fin del bloque a reemplazar dentro del listener del botón

// 2. Event Listener para el botón "Empezar Quiz"
startButton.addEventListener('click', () => {
    const totalAvailableQuestions = questions.length;
    const requestedQuestions = parseInt(numQuestionsInput.value);

    console.log(`Botón 'Empezar Quiz'. Solicitadas: ${requestedQuestions}, Disponibles: ${totalAvailableQuestions}`);

    if (isNaN(requestedQuestions) || requestedQuestions <= 0 || requestedQuestions > totalAvailableQuestions) {
        alert(`Por favor, introduce un número válido de preguntas (entre 1 y ${totalAvailableQuestions}).`);
        return;
    }

    // Reiniciamos estado del quiz
    currentQuestionIndex = 0;
    score = 0;
    // Seleccionamos las preguntas (aleatorizamos el array original antes de cortar)
    selectedQuizQuestions = questions.sort(() => 0.5 - Math.random()).slice(0, requestedQuestions);

    console.log(`Iniciando quiz con ${selectedQuizQuestions.length} preguntas aleatorias.`);

    // Ocultamos la sección de configuración
    quizSection.style.display = 'none';
    resultSection.style.display = 'none';

    // Mostramos el área de preguntas
    questionArea.innerHTML = ''; // Limpiamos área por si acaso
    questionArea.style.display = 'block'; // Mostramos el contenedor
    displayQuestion(); // Mostramos la primera pregunta
});

// --- Helper Functions ---

// Función para llamar a la Netlify Function
// Modificar la firma y el cuerpo de la función analyzeDocumentWithAI

async function analyzeDocumentWithAI(fileDataUrl, fileType, fileName) { // <-- Nuevos argumentos
    console.log(`Iniciando llamada a la función serverless para ${fileName}...`);
    loadingMessage.style.display = 'block';

    const functionUrl = '/.netlify/functions/generate-quiz';

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Enviar los datos del archivo en el cuerpo JSON
            body: JSON.stringify({
                fileDataUrl: fileDataUrl,
                fileType: fileType,
                fileName: fileName
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`Error desde la función serverless (${response.status}):`, data.error || 'Error desconocido');
            // Mostrar error más específico si viene de la función (ej. "No se pudo extraer texto...")
            throw new Error(data.error || `Error del servidor: ${response.status}`);
        }

        console.log("Preguntas recibidas desde la función serverless:", data.questions);

        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
             questions = data.questions; // Guardamos las preguntas reales

             // ... (resto del código para ocultar carga, mostrar config, etc. se mantiene igual) ...
             loadingMessage.style.display = 'none';
             quizSection.style.display = 'block';
             questionArea.style.display = 'none';
             resultSection.style.display = 'none';

             numQuestionsInput.max = questions.length;
              if (parseInt(numQuestionsInput.value) > questions.length || parseInt(numQuestionsInput.value) <= 0) {
                 numQuestionsInput.value = Math.min(10, questions.length);
              }
              if (questions.length < parseInt(numQuestionsInput.value)){
                  numQuestionsInput.value = questions.length;
              }
             console.log(`Configuración del quiz mostrada. ${questions.length} preguntas disponibles.`);

        } else {
             throw new Error("La respuesta del servidor no contenía un array de preguntas válido.");
        }

    } catch (error) {
        console.error("Error al llamar/procesar función serverless:", error);
        // Mostrar el mensaje de error recibido
        alert(`Hubo un problema al generar el cuestionario: ${error.message}\nInténtalo de nuevo o revisa el documento.`);
        // Resetear UI
        loadingMessage.style.display = 'none';
        uploadSection.style.display = 'block';
        quizSection.style.display = 'none';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';
        documentUploadInput.value = '';
        fileContent = null; // Ya no usamos fileContent, pero lo reseteamos por si acaso
        questions = [];
    }
}

// Función para mostrar la pregunta actual
function displayQuestion() {
    if (currentQuestionIndex >= selectedQuizQuestions.length) {
        showResults();
        return;
    }

    const currentQ = selectedQuizQuestions[currentQuestionIndex];
    questionArea.innerHTML = ''; // Limpiamos área

    const questionCard = document.createElement('div');
    questionCard.classList.add('question-card');

    const questionText = document.createElement('p');
    questionText.classList.add('question-text');
    questionText.innerHTML = `<strong>Pregunta ${currentQuestionIndex + 1}/${selectedQuizQuestions.length}:</strong> ${currentQ.question}`;

    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('options-container');

    // Aleatorizamos el orden de las opciones mostradas
    const shuffledOptions = [...currentQ.options].sort(() => Math.random() - 0.5);

    shuffledOptions.forEach((option, index) => {
        const optionButton = document.createElement('button');
        optionButton.classList.add('option-button');
        optionButton.dataset.optionValue = option; // Guardamos la opción real
        optionButton.textContent = `${String.fromCharCode(65 + index)}) ${option}`;
        optionButton.addEventListener('click', handleAnswer);
        optionsContainer.appendChild(optionButton);
    });

    questionCard.appendChild(questionText);
    questionCard.appendChild(optionsContainer);
    questionArea.appendChild(questionCard);
}

// Función para manejar la respuesta seleccionada
function handleAnswer(event) {
    const selectedButton = event.target;
    const selectedAnswer = selectedButton.dataset.optionValue;
    const correctAnswer = selectedQuizQuestions[currentQuestionIndex].answer;

    console.log(`Pregunta ${currentQuestionIndex + 1}: Seleccionada: "${selectedAnswer}", Correcta: "${correctAnswer}"`);

    const allOptions = questionArea.querySelectorAll('.option-button');
    allOptions.forEach(button => {
        button.disabled = true; // Deshabilitar botones
        // Marcar visualmente correcta e incorrecta
        if (button.dataset.optionValue === correctAnswer) {
            button.classList.add('correct');
        } else if (button === selectedButton) {
            button.classList.add('incorrect');
        }
    });

    if (selectedAnswer === correctAnswer) {
        score++;
        console.log("Respuesta CORRECTA");
    } else {
        console.log("Respuesta INCORRECTA.");
    }

    // Pausa antes de pasar a la siguiente pregunta
    setTimeout(() => {
        currentQuestionIndex++;
        displayQuestion(); // Mostrar siguiente o resultados
    }, 1500); // Espera 1.5 segundos
}

// Función para mostrar los resultados finales
function showResults() {
    console.log("Mostrando resultados finales.");
    questionArea.style.display = 'none';
    resultSection.innerHTML = ''; // Limpiamos resultados anteriores
    resultSection.style.display = 'block'; // Mostramos la sección de resultados

    const totalQuestions = selectedQuizQuestions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // Mensaje de feedback simple basado en porcentaje
    let feedbackMessage = "";
     if (totalQuestions > 0) {
        if (percentage === 100) feedbackMessage = "¡Felicidades! ¡100%! Dominas el contenido.";
        else if (percentage >= 80) feedbackMessage = "¡Excelente desempeño!";
        else if (percentage >= 50) feedbackMessage = "¡Buen trabajo! Sigue repasando.";
        else feedbackMessage = "Necesitas dedicarle más tiempo al estudio. ¡Ánimo!";
     } else {
         feedbackMessage = "No se realizaron preguntas.";
     }

    // Crear contenido de resultados
    const resultTitle = document.createElement('h2');
    resultTitle.textContent = 'Resultados Finales';

    const scoreText = document.createElement('p');
    scoreText.innerHTML = `Has acertado <strong>${score}</strong> de <strong>${totalQuestions}</strong> preguntas.`;

    const percentageText = document.createElement('p');
    percentageText.innerHTML = `Porcentaje de aciertos: <strong>${percentage}%</strong>`;

    const feedbackPara = document.createElement('p');
    const feedbackEmphasis = document.createElement('em');
    feedbackEmphasis.textContent = feedbackMessage;
    feedbackPara.appendChild(feedbackEmphasis);

    const restartButton = document.createElement('button');
    restartButton.id = 'restartButton';
    restartButton.textContent = 'Analizar otro documento';

    restartButton.addEventListener('click', () => {
        console.log("Botón 'Analizar otro documento' clickeado.");
        // Resetear todo
        fileContent = null;
        questions = [];
        selectedQuizQuestions = [];
        documentUploadInput.value = '';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';
        quizSection.style.display = 'none';
        uploadSection.style.display = 'block';
        numQuestionsInput.value = 10;
    });

    // Añadir elementos
    resultSection.appendChild(resultTitle);
    resultSection.appendChild(scoreText);
    resultSection.appendChild(percentageText);
    resultSection.appendChild(feedbackPara);
    resultSection.appendChild(restartButton);
}

// --- Fin del código ---
