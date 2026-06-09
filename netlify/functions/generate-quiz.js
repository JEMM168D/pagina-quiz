const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

exports.handler = async (event, context) => {
    // 1. Verify POST and retrieve data
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
    }

    let base64DataUrl, fileType, fileName, numQuestions, difficulty, quizMode;
    try {
        const body = JSON.parse(event.body);
        base64DataUrl = body.fileDataUrl;
        fileType = body.fileType;
        fileName = body.fileName;
        numQuestions = body.numQuestions || 10;
        difficulty = body.difficulty || 'Medium';
        quizMode = body.quizMode || 'Multiple Choice';

        if (!base64DataUrl || !fileType || !fileName) {
            throw new Error('Faltan datos obligatorios (archivo, tipo o nombre).');
        }
        console.log(`Archivo recibido: ${fileName}, Tipo: ${fileType}, Preguntas: ${numQuestions}, Dificultad: ${difficulty}, Modo: ${quizMode}`);
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ error: `Cuerpo inválido: ${error.message}` }) };
    }

    // 2. Retrieve Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Error de configuración: GEMINI_API_KEY no encontrada.' }) };
    }

    let extractedText = '';
    try {
        // 3. Extract Text from File
        const base64String = base64DataUrl.split(',')[1];
        if (!base64String) throw new Error("Data URL inválido.");
        const fileBuffer = Buffer.from(base64String, 'base64');
        console.log(`Buffer creado, tamaño: ${fileBuffer.length} bytes`);

        if (fileType === 'application/pdf') {
            extractedText = (await pdfParse(fileBuffer)).text;
        } else if (fileType.includes('wordprocessingml') || fileName.endsWith('.docx')) {
            extractedText = (await mammoth.extractRawText({ buffer: fileBuffer })).value;
        } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            extractedText = fileBuffer.toString('utf8');
        } else {
            throw new Error(`Tipo de archivo no soportado: ${fileType}`);
        }

        if (!extractedText || extractedText.trim().length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No se pudo extraer contenido textual o estaba vacío.' }) };
        }
        console.log(`Texto extraído con éxito. Longitud del texto: ${extractedText.length} caracteres.`);

        // 4. Configure Gemini API with gemini-3.1-flash-lite
        const modelName = 'gemini-3.1-flash-lite';
        const AI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // Build the customization prompt instructions
        let formatInstructions = '';
        if (quizMode === 'True / False') {
            formatInstructions = `Cada pregunta debe ser del formato Verdadero / Falso. El array "options" debe contener obligatoriamente dos elementos: ["Verdadero", "Falso"]. El campo "answer" debe ser exactamente "Verdadero" o "Falso".`;
        } else {
            formatInstructions = `Cada pregunta debe tener formato de opción múltiple. El array "options" debe contener exactamente 4 opciones de respuesta distintas. El campo "answer" debe ser el texto exacto de la opción correcta (debe coincidir con una de las 4 opciones).`;
        }

        const difficultyLabel = difficulty === 'Easy' ? 'Fácil (conceptos básicos y directos)' : difficulty === 'Hard' ? 'Difícil (análisis crítico, detalles y razonamiento profundo)' : 'Medio (comprensión estándar)';

        const prompt = `A partir del siguiente texto, realiza estas tareas:
1. Identifica los temas principales tratados en el texto.
2. Genera OBLIGATORIAMENTE un array JSON válido que contenga exactamente ${numQuestions} objetos de preguntas basadas en el contenido. Si el texto es muy corto, puedes generar menos preguntas (mínimo 3) pero asegúrate de que sean de buena calidad.

El nivel de dificultad general de las preguntas debe ser: ${difficultyLabel}.
${formatInstructions}

Cada objeto en el array JSON debe tener estrictamente las siguientes claves y tipos:
 - "question" (string): El texto de la pregunta.
 - "options" (array de strings): Las opciones de respuesta.
 - "answer" (string): El texto exacto de la opción correcta.
 - "topic" (string): Una etiqueta breve (1-3 palabras) que represente el tema principal de esa pregunta.
 - "explanation" (string): Una breve explicación (1-2 frases) de por qué esa respuesta es correcta y por qué las otras son incorrectas, basándote en el texto.

IMPORTANTE: La respuesta final debe ser únicamente el array JSON puro. No incluyas explicaciones de texto antes o después del JSON, ni comentarios, ni comillas de bloque de código (\`\`\`json o \`\`\`). El JSON debe empezar estrictamente con '[' y terminar con ']'.

Texto:
---
${extractedText}
---

Genera únicamente el array JSON con las preguntas y explicaciones.`;

        console.log(`Enviando solicitud a Gemini API (${modelName}) para generar ${numQuestions} preguntas...`);
        
        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                    temperature: 0.5, 
                    maxOutputTokens: 4096, 
                    responseMimeType: "application/json" 
                }
            }),
        });

        console.log(`Respuesta de Gemini API recibida con estado: ${response.status}`);
        const aiResponse = await response.json();

        if (!response.ok) {
            throw new Error(`Error API Gemini: ${aiResponse?.error?.message || response.status}`);
        }

        // 5. Process & Parse Response
        let generatedQuestions = [];
        if (aiResponse.candidates && aiResponse.candidates[0]?.content?.parts?.[0]?.text) {
            try {
                const jsonString = aiResponse.candidates[0].content.parts[0].text;
                const cleanedJsonString = jsonString.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
                generatedQuestions = JSON.parse(cleanedJsonString);
            } catch (parseError) {
                console.error("Error al parsear el JSON de la IA:", parseError);
                throw new Error("Gemini no devolvió un JSON estructurado válido.");
            }
        } else {
            throw new Error("Respuesta Gemini OK pero estructura inesperada.");
        }

        if (!Array.isArray(generatedQuestions)) {
            throw new Error('La IA generó una respuesta no válida (no es un array).');
        }

        console.log(`Se generaron y procesaron ${generatedQuestions.length} preguntas.`);

        // 6. Return response
        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTION'
            },
            body: JSON.stringify({ questions: generatedQuestions }),
        };

    } catch (error) {
        console.error('Error en generate-quiz:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: `Error al procesar/generar el quiz: ${error.message}` }) 
        };
    }
};
