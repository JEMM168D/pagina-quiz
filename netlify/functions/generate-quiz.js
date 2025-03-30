// netlify/functions/generate-quiz.js

exports.handler = async (event, context) => {
    // 1. Verificar método POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método no permitido. Usa POST.' }),
        };
    }

    // 2. Obtener texto del documento
    let documentText;
    try {
        const body = JSON.parse(event.body);
        documentText = body.documentText;
        if (!documentText || typeof documentText !== 'string' || documentText.trim() === '') {
            throw new Error('El campo documentText está vacío o no es válido.');
        }
        console.log("Texto del documento recibido (primeros 100 chars):", documentText.substring(0, 100));
    } catch (error) {
        console.error("Error al parsear el cuerpo de la solicitud:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Cuerpo de solicitud inválido o falta documentText.' }),
        };
    }

    // 3. Obtener la clave API de Google Gemini desde variables de entorno (SE CONFIGURA EN NETLIFY)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Error: La variable de entorno GEMINI_API_KEY no está configurada.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error de configuración del servidor (falta clave API Gemini).' }),
        };
    }

    // 4. Preparar la llamada a la API de Google Gemini
    const modelName = 'gemini-1.5-flash-latest'; // Puedes cambiar a 'gemini-pro' u otro compatible
    const AI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // Prompt detallado para Gemini
    const prompt = `A partir del siguiente texto, genera OBLIGATORIAMENTE un array JSON válido que contenga alrededor de 10 objetos de preguntas de opción múltiple (4 opciones cada una). Cada objeto en el array debe tener estrictamente las siguientes claves y tipos: "question" (string), "options" (array de 4 strings diferentes entre sí) y "answer" (string, que debe ser idéntico a una de las strings en el array "options"). No incluyas ninguna explicación, texto introductorio, comillas de bloque de código (\`\`\`) ni nada más antes o después del array JSON puro. El JSON debe empezar con '[' y terminar con ']'. Asegúrate de que todas las comillas y comas sean correctas para un JSON válido.

Aquí está el texto:
---
${documentText}
---

Genera únicamente el array JSON.`;

    try {
        console.log(`Enviando solicitud a Gemini API (${modelName})...`);
        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 2048,
                },
                 safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                ]
            }),
        });

        console.log(`Respuesta de Gemini API recibida con estado: ${response.status}`);
        const aiResponse = await response.json();

        if (!response.ok) {
             console.error(`Error de la API de Gemini (${response.status}):`, JSON.stringify(aiResponse, null, 2));
             const errorMessage = aiResponse?.error?.message || `Error ${response.status}`;
            throw new Error(`La API de Gemini devolvió un error: ${errorMessage}`);
        }

        // 5. Procesar la respuesta exitosa de Gemini
        console.log("Respuesta JSON completa de Gemini recibida.");
        let generatedQuestions = [];
        if (aiResponse.candidates && aiResponse.candidates[0]?.content?.parts?.[0]?.text) {
            try {
                const jsonString = aiResponse.candidates[0].content.parts[0].text;
                console.log("Raw JSON string recibido de Gemini:", jsonString);
                const cleanedJsonString = jsonString.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
                generatedQuestions = JSON.parse(cleanedJsonString);
            } catch (parseError) {
                console.error("Error al parsear el string JSON de la respuesta de Gemini:", parseError);
                console.error("String recibido:", aiResponse.candidates[0].content.parts[0].text);
                throw new Error("Gemini no devolvió un JSON de preguntas válido.");
            }
        } else {
             console.error("Respuesta de Gemini OK pero no tiene la estructura esperada:", JSON.stringify(aiResponse, null, 2));
             const finishReason = aiResponse?.candidates?.[0]?.finishReason;
             let extraInfo = finishReason && finishReason !== 'STOP' ? ` Razón finalización: ${finishReason}.` : '';
            throw new Error(`La respuesta de Gemini no contenía texto de preguntas esperado.${extraInfo}`);
        }

        if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
            throw new Error('La IA generó una respuesta vacía o no válida.');
        }

        console.log(`Se generaron y parsearon ${generatedQuestions.length} preguntas.`);

        // 6. Devolver las preguntas al frontend
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: generatedQuestions }),
        };

    } catch (error) {
        console.error('Error durante la ejecución de la función o llamada a Gemini:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Error al generar el quiz: ${error.message}` }),
        };
    }
};