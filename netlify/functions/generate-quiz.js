// netlify/functions/generate-quiz.js

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

exports.handler = async (event, context) => {
    // 1. Verificar POST y obtener datos (sin cambios)
    if (event.httpMethod !== 'POST') { /* ... */ }
    let base64DataUrl, fileType, fileName;
    try {
        const body = JSON.parse(event.body);
        base64DataUrl = body.fileDataUrl; fileType = body.fileType; fileName = body.fileName;
        if (!base64DataUrl || !fileType || !fileName) throw new Error('Faltan datos');
        console.log(`Archivo recibido: ${fileName}, Tipo: ${fileType}`);
    } catch (error) { /* ... manejo de error ... */ return { statusCode: 400, body: JSON.stringify({ error: `Cuerpo inválido: ${error.message}` }) }; }

    // 2. Obtener API Key (sin cambios)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { /* ... manejo de error ... */ return { statusCode: 500, body: JSON.stringify({ error: 'Error config (key)' }) }; }

    let extractedText = '';
    try {
        // 3. Extraer Texto (sin cambios en la lógica de extracción)
        const base64String = base64DataUrl.split(',')[1];
        if (!base64String) throw new Error("Data URL inválido.");
        const fileBuffer = Buffer.from(base64String, 'base64');
        console.log(`Buffer creado, tamaño: ${fileBuffer.length} bytes`);

        if (fileType === 'application/pdf') { /* ... pdfParse ... */ extractedText = (await pdfParse(fileBuffer)).text; }
        else if (fileType.includes('wordprocessingml') || fileName.endsWith('.docx')) { /* ... mammoth ... */ extractedText = (await mammoth.extractRawText({ buffer: fileBuffer })).value; }
        else if (fileType === 'text/plain' || fileName.endsWith('.txt')) { /* ... toString ... */ extractedText = fileBuffer.toString('utf8'); }
        else { throw new Error(`Tipo de archivo no soportado: ${fileType}`); }

        if (!extractedText || extractedText.trim().length === 0) return { statusCode: 400, body: JSON.stringify({ error: 'No se pudo extraer contenido textual o estaba vacío.' }) };
        console.log(`Texto extraído (primeros 100 chars): ${extractedText.substring(0, 100)}`);

        // 4. Preparar y llamar a Gemini (PROMPT MODIFICADO)
        const modelName = 'gemini-2.0-flash';
        const AI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // --- PROMPT MODIFICADO ---
        const maxQuestionsToGenerate = 50; // Pedimos un número alto para tener variedad
        const prompt = `A partir del siguiente texto, realiza estas dos tareas:
1. Identifica los 3-5 temas principales tratados en el texto.
2. Genera OBLIGATORIAMENTE un array JSON válido que contenga hasta ${maxQuestionsToGenerate} objetos de preguntas de opción múltiple (4 opciones distintas cada una) basadas en el contenido. Si el texto es corto, genera menos preguntas pero asegúrate de que sean de buena calidad.
Cada objeto en el array JSON debe tener estrictamente las siguientes claves y tipos:
 - "question" (string): El texto de la pregunta.
 - "options" (array de 4 strings): Las opciones de respuesta.
 - "answer" (string): El texto exacto de la opción correcta (debe ser una de las 4 opciones).
 - "topic" (string): Una etiqueta breve (1-3 palabras) que represente el tema principal de esa pregunta, basado en los temas identificados en el paso 1 o en el contenido específico de la pregunta. Intenta usar los mismos nombres de tema de forma consistente.

IMPORTANTE: La respuesta final debe ser únicamente el array JSON puro. No incluyas los temas identificados fuera del JSON, ni explicaciones, texto introductorio, comentarios, ni comillas de bloque de código (\`\`\`) antes o después del array JSON. El JSON debe empezar con '[' y terminar con ']'.

Texto:
---
${extractedText}
---

Genera únicamente el array JSON con las preguntas, opciones, respuesta y tema.`;
        // --- FIN PROMPT MODIFICADO ---

        console.log(`Enviando solicitud a Gemini API (${modelName}) para generar hasta ${maxQuestionsToGenerate} preguntas...`);
        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // Aumentar un poco maxOutputTokens si pedimos muchas preguntas
                generationConfig: { temperature: 0.6, maxOutputTokens: 3072 }, // Ajusta si es necesario
                safetySettings: [ /* ... tus safety settings ... */ ]
            }),
        });

        console.log(`Respuesta de Gemini API recibida con estado: ${response.status}`);
        const aiResponse = await response.json();

        if (!response.ok) { /* ... manejo de error API ... */ throw new Error(`Error API Gemini: ${aiResponse?.error?.message || response.status}`); }

        // 5. Procesar Respuesta (Extracción y Validación)
        console.log("Respuesta JSON completa de Gemini recibida.");
        let generatedQuestions = [];
        if (aiResponse.candidates && aiResponse.candidates[0]?.content?.parts?.[0]?.text) {
            try {
                const jsonString = aiResponse.candidates[0].content.parts[0].text;
                const cleanedJsonString = jsonString.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
                generatedQuestions = JSON.parse(cleanedJsonString);
                // Validación adicional: verificar si los objetos tienen las claves esperadas
                if (generatedQuestions.length > 0) {
                    const firstQ = generatedQuestions[0];
                    if (!firstQ.question || !Array.isArray(firstQ.options) || !firstQ.answer || !firstQ.topic) {
                         console.warn("Advertencia: Las preguntas recibidas no tienen la estructura completa esperada (question, options, answer, topic).", firstQ);
                         // Podrías decidir lanzar un error aquí o continuar sin la funcionalidad de temas.
                         // Por ahora, continuaremos, pero el feedback por tema podría fallar.
                    }
                }
            } catch (parseError) { /* ... manejo error parseo ... */ throw new Error("Gemini no devolvió un JSON válido."); }
        } else { /* ... manejo estructura inesperada ... */ throw new Error("Respuesta Gemini OK pero estructura inesperada."); }

        if (!Array.isArray(generatedQuestions)) { throw new Error('La IA generó una respuesta no válida (no es array).'); }
        // No lanzamos error si está vacío, puede que el doc fuera corto
        if (generatedQuestions.length === 0) { console.warn("La IA no generó ninguna pregunta (quizás el documento era muy corto o irrelevante)."); }


        console.log(`Se generaron y parsearon ${generatedQuestions.length} preguntas.`);

        // 6. Devolver preguntas
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: generatedQuestions }), // Devolvemos el array, puede estar vacío
        };

    } catch (error) {
        console.error('Error en generate-quiz:', error);
        return { statusCode: 500, body: JSON.stringify({ error: `Error al procesar/generar: ${error.message}` }) };
    }
};
