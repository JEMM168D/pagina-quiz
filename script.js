// script.js (Completo y con Logs de Diagnóstico Añadidos)

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
let fileContent = null; // Ya no se usa directamente para el contenido, pero se deja por si acaso
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedQuizQuestions = [];

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
    console.log("--- Botón Analizar clickeado ---"); // <--- LOG AÑADIDO
    const files = documentUploadInput.files;

    if (files.length === 0) {
        alert('Por favor, selecciona un archivo .txt, .pdf o .docx primero.');
        console.log("Validación: No se seleccionó archivo."); // <--- LOG AÑADIDO
        return;
    }

    const file = files[0];
    // Loguear información crucial del archivo
    console.log("Archivo seleccionado:", file); // <--- LOG AÑADIDO (Ver objeto completo)
    console.log(`Nombre: ${file.name}, Tipo MIME reportado: ${file.type}, Tamaño: ${file.size}`); // <--- LOG AÑADIDO

    // Validar tamaño (opcional pero recomendado, ej: 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
    console.log("Validando tamaño..."); // <--- LOG AÑADIDO
    if (file.size > maxSizeInBytes) {
        alert(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB). El límite es 10 MB.`);
        documentUploadInput.value = ''; // Limpiar input
        console.log("Validación: Archivo demasiado grande."); // <--- LOG AÑADIDO
        return;
    }

    // Tipos de archivo permitidos (puedes ajustar)
    const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    const isDocxByName = file.name.toLowerCase().endsWith('.docx'); // Verificar extensión explícitamente

    console.log(`Validando tipo: MIME=${file.type}, Es DOCX por nombre=${isDocxByName}`); // <--- LOG AÑADIDO

    // Validar tipo de archivo de forma más robusta que 'accept'
    // Nota: El navegador podría no reportar siempre el tipo MIME correcto para .docx,
    // por eso la función también revisa la extensión .docx
    if (!allowedTypes.includes(file.type) && !isDocxByName) {
         alert(`Tipo de archivo no permitido (${file.type || 'desconocido'}). Sube .txt, .pdf o .docx.`);
         documentUploadInput.value = ''; // Limpiar input
         console.log("Validación: Tipo de archivo no permitido."); // <--- LOG AÑADIDO
         return;
    }

    console.log("Validación pasada. Iniciando FileReader..."); // <--- LOG AÑADIDO

    const reader = new FileReader();

    // Qué hacer cuando el archivo se lea como Data URL
    reader.onload = (e) => {
        console.log("--- reader.onload EJECUTADO ---"); // <--- LOG AÑADIDO
        const fileDataUrl = e.target.result; // Esto es el string Base64 con prefijo 'data:...'
        console.log("Archivo leído como Data URL (primeros 100 chars):", fileDataUrl.substring(0,100)); // <--- LOG AÑADIDO (solo el inicio)

        // Ocultar subida, mostrar carga
        uploadSection.style.display = 'none';
        loadingMessage.style.display = 'block';
        quizSection.style.display = 'none';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';

        // Determinar el tipo MIME a enviar (usa el detectado o infiere para DOCX si falta)
        let typeToSend = file.type;
        if (!typeToSend && isDocxByName) {
            typeToSend = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            console.log("Tipo MIME vacío, infiriendo DOCX por nombre de archivo.");
        } else if (!typeToSend) {
            typeToSend = 'application/octet-stream'; // Tipo genérico si no se detecta
             console.warn("Tipo MIME vacío y no es DOCX, usando genérico.");
        }


        console.log(`Llamando a analyzeDocumentWithAI con tipo: ${typeToSend}`); // <--- LOG AÑADIDO
        // --- LLAMADA a la Función Serverless con los nuevos datos ---
        analyzeDocumentWithAI(fileDataUrl, typeToSend, file.name); // Pasar Data URL, tipo y nombre
    };

    // Qué hacer si hay error leyendo el archivo
    reader.onerror = (e) => {
        console.error("--- reader.onerror EJECUTADO ---", e); // <--- LOG AÑADIDO
        alert('Error al leer el archivo localmente.');
        loadingMessage.style.display = 'none';
        uploadSection.style.display = 'block';
        documentUploadInput.value = ''; // Limpiar input
    };

    // Empezar a leer el archivo como Data URL (Base64)
    console.log("Llamando a reader.readAsDataURL..."); // <--- LOG AÑADIDO
    reader.readAsDataURL(file);
});


// 2. Event Listener para el botón "Empezar Quiz" (Sin cambios en logs)
startButton.addEventListener('click', () => {
    const totalAvailableQuestions = questions.length;
    const requestedQuestions = parseInt(numQuestionsInput.value);
    console.log(`Botón 'Empezar Quiz'. Solicitadas: ${requestedQuestions}, Disponibles: ${totalAvailableQuestions}`);
    if (isNaN(requestedQuestions) || requestedQuestions <= 0 || requestedQuestions > totalAvailableQuestions) {
        alert(`Por favor, introduce un número válido de preguntas (entre 1 y ${totalAvailableQuestions}).`);
        return;
    }
    currentQuestionIndex = 0;
    score = 0;
    selectedQuizQuestions = questions.sort(() => 0.5 - Math.random()).slice(0, requestedQuestions);
    console.log(`Iniciando quiz con ${selectedQuizQuestions.length} preguntas aleatorias.`);
    quizSection.style.display = 'none';
    resultSection.style.display = 'none';
    questionArea.innerHTML = '';
    questionArea.style.display = 'block';
    displayQuestion();
});

// --- Helper Functions ---

// Función para llamar a la Netlify Function (Con Logs Añadidos)
async function analyzeDocumentWithAI(fileDataUrl, fileType, fileName) {
    console.log(`--- analyzeDocumentWithAI INICIADO para ${fileName} (Tipo: ${fileType}) ---`); // <--- LOG AÑADIDO
    loadingMessage.style.display = 'block';

    const functionUrl = '/.netlify/functions/generate-quiz';

    console.log("Preparando para llamar a fetch:", functionUrl); // <--- LOG AÑADIDO

    try {
        console.log("Enviando fetch a la función..."); // <--- LOG AÑADIDO
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileDataUrl: fileDataUrl,
                fileType: fileType,
                fileName: fileName
            }),
        });
        console.log("Fetch completado. Estado respuesta:", response.status); // <--- LOG AÑADIDO

        const data = await response.json();
        console.log("Respuesta JSON parseada:", data); // <--- LOG AÑADIDO (¡Cuidado si es muy grande!)

        if (!response.ok) {
            console.error(`Error desde la función serverless (${response.status}):`, data.error || 'Error desconocido');
            throw new Error(data.error || `Error del servidor: ${response.status}`);
        }

        console.log("Preguntas recibidas desde la función serverless:", data.questions); // <-- Log existente

        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            questions = data.questions;
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
             console.log("La respuesta es OK pero no contiene un array de preguntas válido."); // <--- LOG AÑADIDO
             throw new Error("La respuesta del servidor no contenía un array de preguntas válido.");
        }

    } catch (error) {
        console.error("--- ERROR en analyzeDocumentWithAI o fetch ---"); // <--- LOG AÑADIDO
        console.error(error); // Loguea el objeto error completo
        alert(`Hubo un problema al generar el cuestionario: ${error.message}\nInténtalo de nuevo o revisa el documento.`);
        // Resetear UI
        loadingMessage.style.display = 'none';
        uploadSection.style.display = 'block';
        quizSection.style.display = 'none';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';
        documentUploadInput.value = '';
        questions = [];
    }
}


// Función para mostrar la pregunta actual (Sin cambios en logs)
function displayQuestion() {
    if (currentQuestionIndex >= selectedQuizQuestions.length) {
        showResults();
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

// Función para manejar la respuesta seleccionada (Sin cambios en logs)
function handleAnswer(event) {
    const selectedButton = event.target;
    const selectedAnswer = selectedButton.dataset.optionValue;
    const correctAnswer = selectedQuizQuestions[currentQuestionIndex].answer;
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
    }
    setTimeout(() => {
        currentQuestionIndex++;
        displayQuestion();
    }, 1500);
}

// Función para mostrar los resultados finales (Sin cambios en logs)
function showResults() {
    console.log("Mostrando resultados finales.");
    questionArea.style.display = 'none';
    resultSection.innerHTML = '';
    resultSection.style.display = 'block';
    const totalQuestions = selectedQuizQuestions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    let feedbackMessage = "";
     if (totalQuestions > 0) {
        if (percentage === 100) feedbackMessage = "¡Felicidades! ¡100%! Dominas el contenido.";
        else if (percentage >= 80) feedbackMessage = "¡Excelente desempeño!";
        else if (percentage >= 50) feedbackMessage = "¡Buen trabajo! Sigue repasando.";
        else feedbackMessage = "Necesitas dedicarle más tiempo al estudio. ¡Ánimo!";
     } else {
         feedbackMessage = "No se realizaron preguntas.";
     }
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
        questions = [];
        selectedQuizQuestions = [];
        documentUploadInput.value = '';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';
        quizSection.style.display = 'none';
        uploadSection.style.display = 'block';
        numQuestionsInput.value = 10;
    });
    resultSection.appendChild(resultTitle);
    resultSection.appendChild(scoreText);
    resultSection.appendChild(percentageText);
    resultSection.appendChild(feedbackPara);
    resultSection.appendChild(restartButton);
}

// --- Fin del código ---
