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

    if (files.length === 0) {
        alert('Por favor, selecciona un archivo .txt primero.');
        return;
    }

    const file = files[0];
    console.log(`Archivo seleccionado: ${file.name}, Tipo: ${file.type}`);

    // Solo aceptamos .txt por ahora, ya que el frontend lee texto plano
    if (file.type === 'text/plain') {
        const reader = new FileReader();

        reader.onload = (e) => {
            fileContent = e.target.result;
            console.log("Archivo .txt leído.");
            uploadSection.style.display = 'none';
            loadingMessage.style.display = 'block'; // Mostrar carga INMEDIATAMENTE
            quizSection.style.display = 'none';
            resultSection.style.display = 'none';
            questionArea.style.display = 'none';

            // --- LLAMADA REAL a la Función Serverless ---
            analyzeDocumentWithAI(fileContent);
        };

        reader.onerror = (e) => {
            console.error("Error leyendo el archivo:", e);
            alert('Error al leer el archivo.');
            loadingMessage.style.display = 'none'; // Ocultar carga si falla la lectura
            uploadSection.style.display = 'block'; // Mostrar subida de nuevo
        };

        reader.readAsText(file);

    } else {
        alert(`Por favor, sube un archivo de texto plano (.txt).`);
        documentUploadInput.value = ''; // Limpia el input
    }
});

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
async function analyzeDocumentWithAI(textContent) {
    console.log("Iniciando llamada a la función serverless para analizar el documento...");
    loadingMessage.style.display = 'block'; // Asegurarse que se muestra el mensaje de carga

    const functionUrl = '/.netlify/functions/generate-quiz';

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentText: textContent }),
        });

        const data = await response.json(); // Parseamos siempre para leer errores o éxito

        if (!response.ok) {
            console.error(`Error desde la función serverless (${response.status}):`, data.error || 'Error desconocido');
            throw new Error(data.error || `Error del servidor: ${response.status}`);
        }

        console.log("Preguntas recibidas desde la función serverless:", data.questions);

        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            questions = data.questions; // Guardamos las preguntas reales

            loadingMessage.style.display = 'none';
            quizSection.style.display = 'block';
            questionArea.style.display = 'none';
            resultSection.style.display = 'none';

            numQuestionsInput.max = questions.length;
             if (parseInt(numQuestionsInput.value) > questions.length || parseInt(numQuestionsInput.value) <= 0) {
                numQuestionsInput.value = Math.min(10, questions.length); // Default 10 o máx disponible
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
        alert(`Hubo un problema al generar el cuestionario: ${error.message}\nInténtalo de nuevo o revisa el documento.`);
        // Resetear UI
        loadingMessage.style.display = 'none';
        uploadSection.style.display = 'block';
        quizSection.style.display = 'none';
        resultSection.style.display = 'none';
        questionArea.style.display = 'none';
        documentUploadInput.value = '';
        fileContent = null;
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