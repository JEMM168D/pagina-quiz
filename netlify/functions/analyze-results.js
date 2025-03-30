// netlify/functions/analyze-results.js

exports.handler = async (event, context) => {
    // 1. Verificar POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
    }

    // 2. Obtener lista de respuestas incorrectas
    let incorrectAnswers;
    try {
        const body = JSON.parse(event.body);
        incorrectAnswers = body.incorrectAnswers; // Esperamos un array de objetos pregunta
        if (!Array.isArray(incorrectAnswers)) {
            throw new Error('Falta o es inválido el campo incorrectAnswers (debe ser un array).');
        }
        console.log(`Recibidas ${incorrectAnswers.length} respuestas incorrectas para analizar.`);
        // Si no hubo errores, no hay nada que analizar
        if (incorrectAnswers.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ feedback: "¡Felicidades! No tuviste errores." }) };
        }
    } catch (error) {
        console.error("Error parseando cuerpo en analyze-results:", error);
        return { statusCode: 400, body: JSON.stringify({ error: `Cuerpo inválido: ${error.message}` }) };
    }

    // 3. Obtener API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { return { statusCode: 500, body: JSON.stringify({ error: 'Error config (key)' }) }; }

    try {
        // 4. Preparar prompt para Gemini
        const modelName = 'gemini-2.0-flash';
        const AI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // Creamos un resumen de los errores para el prompt
        const errorsSummary = incorrectAnswers.map(q => ({
            pregunta: q.question,
            tema: q.topic || "No especificado", // Usar el tema si existe
            respuesta_correcta: q.answer
        }));

        const prompt = `Un usuario realizó un quiz basado en un documento y respondió incorrectamente a las siguientes preguntas. Cada pregunta puede tener asociado un tema principal. Analiza estos errores y genera un párrafo corto y amigable (2-4 frases) como feedback para el usuario, mencionando los 1-3 temas o conceptos generales en los que parece necesitar más repaso, basándote en los temas asociados a las preguntas falladas. No seas demasiado técnico, enfócate en ser útil para el estudio. Si no hay temas claros o solo falló una pregunta, da un consejo más general.

Errores del usuario (formato JSON):
${JSON.stringify(errorsSummary, null, 2)}

Genera únicamente el párrafo de feedback.`;

        console.log("Enviando solicitud a Gemini para análisis de errores...");
        // 5. Llamar a Gemini
        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 512 }, // Feedback corto
                safetySettings: [ /* ... tus safety settings ... */ ]
            }),
        });

        console.log(`Respuesta de Gemini (feedback) recibida: ${response.status}`);
        const aiResponse = await response.json();

        if (!response.ok) { /* ... manejo error API ... */ throw new Error(`Error API Gemini (feedback): ${aiResponse?.error?.message || response.status}`); }

        // 6. Extraer y devolver feedback
        let feedbackText = "No se pudo generar feedback específico, pero ¡sigue estudiando!"; // Default
        if (aiResponse.candidates && aiResponse.candidates[0]?.content?.parts?.[0]?.text) {
            feedbackText = aiResponse.candidates[0].content.parts[0].text.trim();
            console.log("Feedback generado:", feedbackText);
        } else {
            console.warn("La respuesta de Gemini para feedback no tenía la estructura esperada.");
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback: feedbackText }),
        };

    } catch (error) {
        console.error('Error en analyze-results:', error);
        return { statusCode: 500, body: JSON.stringify({ error: `Error al generar feedback: ${error.message}` }) };
    }
};
