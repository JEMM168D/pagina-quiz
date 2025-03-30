// script.js (Completo y Actualizado - v3: Aleatorio, Temas, Feedback IA)

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
let questions = []; // Preguntas originales de la IA {question, options, answer, topic}
let currentQuestionIndex = 0;
let score = 0;
let selectedQuizQuestions = []; // Las preguntas seleccionadas para ESTE quiz
let incorrectAnswers = []; // Guarda las preguntas falladas en este quiz {question, options, answer, topic}

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
    console.log("--- Botón Analizar clickeado ---");
    const files = documentUploadInput.files;

    if (files.length === 0) {
        alert('Por favor, selecciona un archivo .txt, .pdf o .docx primero.');
        console.log("Validación: No se seleccionó archivo.");
        return;
    }

    const file = files[0];
    console.log("Archivo seleccionado:", file);
    console.log(`Nombre: ${file.name}, Tipo MIME reportado: ${file.type}, Tamaño: ${file.size}`);

    // Validar tamaño (opcional pero recomendado, ej: 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
    console.log("Validando tamaño...");
    if (file.size > maxSizeInBytes) {
        alert(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB). El límite es 10 MB.`);
        documentUploadInput.value = '';
        console.log("Validación: Archivo demasiado grande.");
        return;
    }

    // Tipos de archivo permitidos (puedes ajustar)
    const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    const isDocxByName = file.name.toLowerCase().endsWith('.docx'); // Verificar extensión explícitamente

    console.log(`Validando tipo: MIME=${file.type}, Es DOCX por nombre=${isDocxByName}`);

    // Validar tipo de archivo de forma más robusta que 'accept'
    if (!allowedTypes.includes(file.type) && !isDocxByName) {
         alert(`Tipo de archivo no permitido (${file.type || 'desconocido'}). Sube .txt, .pdf o .docx.`);
         documentUploadInput.value = '';
         console.log("Validación: Tipo de archivo no permitido.");
         return;
    }

    console.log("Validación pasada. Iniciando FileReader...");

    const reader = new FileReader();

    reader.onload = (e) => {
        console.log("--- reader.onload EJECUTADO ---");
        const fileDataUrl = e.target.result;
        console.log("Archivo leído como Data URL (primeros 100 chars):", fileDataUrl.substring(0,100));

        uploadSection.style.display = 'none';
        loadingMessage.style.display = 'block';
        quizSection.style.display = 'none';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';

        // Determinar el tipo MIME a enviar
        let typeToSend = file.type;
        if (!typeToSend && isDocxByName) {
            typeToSend = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            console.log("Tipo MIME vacío, infiriendo DOCX por nombre de archivo.");
        } else if (!typeToSend) {
            typeToSend = 'application/octet-stream';
             console.warn("Tipo MIME vacío y no es DOCX, usando genérico.");
        }

        console.log(`Llamando a analyzeDocumentWithAI con tipo: ${typeToSend}`);
        analyzeDocumentWithAI(fileDataUrl, typeToSend, file.name);
    };

    reader.onerror = (e) => {
        console.error("--- reader.onerror EJECUTADO ---", e);
        alert('Error al leer el archivo localmente.');
        loadingMessage.style.display = 'none';
        uploadSection.style.display = 'block';
        documentUploadInput.value = '';
    };

    console.log("Llamando a reader.readAsDataURL...");
    reader.readAsDataURL(file);
});

// 2. Event Listener para el botón "Empezar Quiz"
startButton.addEventListener('click', () => {
    const totalAvailableQuestions = questions.length;
    const requestedQuestions = parseInt(numQuestionsInput.value);

    console.log(`Botón 'Empezar Quiz'. Solicitadas: ${requestedQuestions}, Disponibles: ${totalAvailableQuestions}`);

    // Validar número solicitado (permitir hasta 30 o el máximo disponible)
    const maxAllowed = Math.min(30, totalAvailableQuestions);
     if (isNaN(requestedQuestions) || requestedQuestions <= 0 || requestedQuestions > maxAllowed) {
        alert(`Por favor, introduce un número válido de preguntas (entre 1 y ${maxAllowed}).`);
        return;
    }

    // Reiniciamos estado del quiz específico
    currentQuestionIndex = 0;
    score = 0;
    incorrectAnswers = []; // Limpiar errores del quiz anterior

    // --- Selección aleatoria ---
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
    selectedQuizQuestions = shuffledQuestions.slice(0, requestedQuestions);
    // --- Fin Selección aleatoria ---

    console.log(`Iniciando quiz con ${selectedQuizQuestions.length} preguntas aleatorias.`);

    quizSection.style.display = 'none';
    resultSection.style.display = 'none';
    questionArea.innerHTML = '';
    questionArea.style.display = 'block';
    displayQuestion();
});

// --- Helper Functions ---

// Función para llamar a la función de generación de preguntas
async function analyzeDocumentWithAI(fileDataUrl, fileType, fileName) {
    console.log(`--- analyzeDocumentWithAI INICIADO para ${fileName} (Tipo: ${fileType}) ---`);
    loadingMessage.style.display = 'block';
    const functionUrl = '/.netlify/functions/generate-quiz';
    console.log("Preparando para llamar a fetch:", functionUrl);

    try {
        console.log("Enviando fetch a generate-quiz...");
        const response = await fetch(functionUrl, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 fileDataUrl: fileDataUrl,
                 fileType: fileType,
                 fileName: fileName
             }),
        });
        console.log("Fetch a generate-quiz completado. Estado:", response.status);
        const data = await response.json();
        console.log("Respuesta JSON parseada de generate-quiz:", data);

        if (!response.ok) throw new Error(data.error || `Error del servidor: ${response.status}`);

        // Guardar preguntas (puede ser array vacío si IA no generó nada)
        questions = (data.questions && Array.isArray(data.questions)) ? data.questions : [];
        console.log(`${questions.length} preguntas recibidas y guardadas.`);

        if (questions.length === 0) {
             alert("La IA no pudo generar preguntas para este documento. Intenta con otro o revisa el contenido.");
             loadingMessage.style.display = 'none';
             uploadSection.style.display = 'block';
             quizSection.style.display = 'none';
             resultSection.style.display = 'none';
             questionArea.style.display = 'none';
             documentUploadInput.value = '';
             return; // Detener ejecución
        }

        loadingMessage.style.display = 'none';
        quizSection.style.display = 'block';
        questionArea.style.display = 'none';
        resultSection.style.display = 'none';

        // Ajustar el input de número de preguntas
        const maxSelectable = Math.min(30, questions.length); // Límite de 30 o las disponibles
        numQuestionsInput.max = maxSelectable; // Establecer el máximo permitido
        numQuestionsInput.value = Math.min(15, maxSelectable); // Valor por defecto (10 o menos)
        const label = document.querySelector('label[for="numQuestions"]');
        if(label) label.textContent = `Número de preguntas (1-${maxSelectable}):`;

        console.log(`Configuración del quiz mostrada. Máximo ${maxSelectable} preguntas seleccionables.`);

    } catch (error) {
        console.error("--- ERROR en analyzeDocumentWithAI o fetch a generate-quiz ---");
        console.error(error);
        alert(`Hubo un problema al generar el cuestionario: ${error.message}\nInténtalo de nuevo o revisa el documento.`);
        // Resetear UI
        loadingMessage.style.display = 'none';
        uploadSection.style.display = 'block';
        quizSection.style.display = 'none';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';
        documentUploadInput.value = '';
        questions = []; // Asegurar que se limpia si falla
    }
}

// Función para mostrar la pregunta actual
function displayQuestion() {
    if (currentQuestionIndex >= selectedQuizQuestions.length) {
        showResults(); // Llamar a la función async
        return;
    }
    const currentQ = selectedQuizQuestions[currentQuestionIndex];
    questionArea.innerHTML = '';
    const questionCard = document.createElement('div');
    questionCard.classList.add('question-card');
    const questionText = document.createElement('p');
    questionText.classList.add('question-text');
    questionText.innerHTML = `<strong>Pregunta ${currentQuestionIndex + 1}/${selectedQuizQuestions.length}:</strong> ${currentQ.question}`;
    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('options-container');
    const shuffledOptions = [...currentQ.options].sort(() => Math.random() - 0.5);
    shuffledOptions.forEach((option, index) => {
        const optionButton = document.createElement('button');
        optionButton.classList.add('option-button');
        optionButton.dataset.optionValue = option;
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
    const currentQ = selectedQuizQuestions[currentQuestionIndex]; // Obtener la pregunta actual
    const correctAnswer = currentQ.answer;

    console.log(`Pregunta ${currentQuestionIndex + 1}: Seleccionada: "${selectedAnswer}", Correcta: "${correctAnswer}"`);

    const allOptions = questionArea.querySelectorAll('.option-button');
    allOptions.forEach(button => {
        button.disabled = true;
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
        // Guardar la pregunta incorrecta (incluyendo su tema si existe)
        incorrectAnswers.push(currentQ);
        console.log("Pregunta incorrecta guardada:", currentQ);
    }

    setTimeout(() => {
        currentQuestionIndex++;
        displayQuestion();
    }, 1500);
}

// Función para mostrar los resultados finales y obtener feedback IA
async function showResults() { // Convertida a async
    console.log("Mostrando resultados finales. Preparando para análisis de errores.");
    questionArea.style.display = 'none';
    resultSection.innerHTML = '';
    resultSection.style.display = 'block';

    const totalQuestions = selectedQuizQuestions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // --- Crear elementos de resultado (título, puntuación) ---
    const resultTitle = document.createElement('h2');
    resultTitle.textContent = 'Resultados Finales';
    const scoreText = document.createElement('p');
    scoreText.innerHTML = `Has acertado <strong>${score}</strong> de <strong>${totalQuestions}</strong> preguntas.`;
    const percentageText = document.createElement('p');
    percentageText.innerHTML = `Porcentaje de aciertos: <strong>${percentage}%</strong>`;

    // Placeholder para el feedback mientras se genera
    const feedbackPara = document.createElement('p');
    feedbackPara.id = 'aiFeedbackParagraph';
    const feedbackEmphasis = document.createElement('em');
    // Mensaje inicial mientras se llama a la IA (si hay errores)
    feedbackEmphasis.textContent = incorrectAnswers.length > 0 ? "Generando análisis de errores con IA..." : "¡Felicidades! Ningún error.";
    feedbackPara.appendChild(feedbackEmphasis);

    // --- Crear botones ---
    const tryAgainButton = document.createElement('button');
    tryAgainButton.id = 'tryAgainButton';
    tryAgainButton.textContent = 'Hacer otro quiz (mismo documento)';
    tryAgainButton.style.marginRight = '10px';
    tryAgainButton.addEventListener('click', () => {
        console.log("Botón 'Hacer otro quiz' clickeado.");
        resultSection.style.display = 'none';
        quizSection.style.display = 'block';
        const maxSelectable = Math.min(30, questions.length); // Recalcular max por si acaso
        numQuestionsInput.max = maxSelectable;
        numQuestionsInput.value = Math.min(15, maxSelectable);
        const label = document.querySelector('label[for="numQuestions"]');
        if(label) label.textContent = `Número de preguntas (1-${maxSelectable}):`;
    });

    const restartButton = document.createElement('button');
    restartButton.id = 'restartButton';
    restartButton.textContent = 'Analizar un documento nuevo';
    restartButton.addEventListener('click', () => {
        console.log("Botón 'Analizar un documento nuevo' clickeado.");
        questions = [];
        selectedQuizQuestions = [];
        incorrectAnswers = [];
        documentUploadInput.value = '';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';
        quizSection.style.display = 'none';
        uploadSection.style.display = 'block';
        numQuestionsInput.value = 15;
        const label = document.querySelector('label[for="numQuestions"]');
         if(label) label.textContent = `Número de preguntas:`; // Resetear etiqueta
    });

    // --- Añadir elementos iniciales ---
    resultSection.appendChild(resultTitle);
    resultSection.appendChild(scoreText);
    resultSection.appendChild(percentageText);
    resultSection.appendChild(feedbackPara);
    resultSection.appendChild(tryAgainButton);
    resultSection.appendChild(restartButton);

    // --- Llamar a la función para obtener feedback IA SI HUBO ERRORES ---
    if (incorrectAnswers.length > 0) {
        try {
            console.log("Llamando a la función analyze-results con:", incorrectAnswers);
            const feedbackResponse = await fetch('/.netlify/functions/analyze-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incorrectAnswers: incorrectAnswers }), // Enviar array de errores
            });
            const feedbackData = await feedbackResponse.json();
             console.log("Respuesta de analyze-results recibida:", feedbackData);

            if (!feedbackResponse.ok) {
                 throw new Error(feedbackData.error || `Error ${feedbackResponse.status} obteniendo feedback`);
            }

            console.log("Feedback generado por IA:", feedbackData.feedback);
            // Actualizar el párrafo de feedback con la respuesta de la IA
            const feedbackElement = document.getElementById('aiFeedbackParagraph');
            if(feedbackElement) {
                feedbackElement.querySelector('em').textContent = feedbackData.feedback;
            }

        } catch (error) {
            console.error("--- ERROR al obtener feedback de la IA ---");
            console.error(error);
            // Mostrar un mensaje de error genérico si falla la llamada de feedback
            const feedbackElement = document.getElementById('aiFeedbackParagraph');
             if(feedbackElement) {
                 feedbackElement.querySelector('em').textContent = "No se pudo generar el análisis de errores detallado. ¡Pero sigue estudiando los temas que fallaste!";
                 feedbackElement.style.color = 'darkorange'; // Opcional: marcar como advertencia
             }
        }
    }
}

// --- Fin del código ---
