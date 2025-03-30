// netlify/functions/analyze-results.js (Restaurado para usar topic)

exports.handler = async (event, context) => {
    // 1. Verificar POST y obtener incorrectAnswers (sin cambios)
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
    let incorrectAnswers;
    try {
        const body = JSON.parse(event.body);
        incorrectAnswers = body.incorrectAnswers;
        if (!Array.isArray(incorrectAnswers)) throw new Error('Falta o es inválido incorrectAnswers.');
        console.log(`Recibidas ${incorrectAnswers.length} respuestas incorrectas para analizar.`);
        if (incorrectAnswers.length === 0) return { statusCode: 200, body: JSON.stringify({ feedback: "¡Felicidades! No tuviste errores." }) };
    } catch (error) { return { statusCode: 400, body: JSON.stringify({ error: `Cuerpo inválido: ${error.message}` }) }; }

    // 2. Obtener API Key (sin cambios)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'Error config (key)' }) };

    try {
        // 3. Preparar prompt para Gemini (USANDO TEMAS)
        const modelName = 'gemini-2.0-flash-lite';
        const AI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // Resumen CON temas
        const errorsSummary = incorrectAnswers.map(q => ({
            pregunta: q.question,
            tema: q.topic || "No especificado", // Usar el tema (importante que generate-quiz lo devuelva)
            respuesta_correcta: q.answer
        }));

        // Prompt MENCIONANDO temas
        const prompt = `Un usuario realizó un quiz basado en un documento y respondió incorrectamente a las siguientes preguntas. Cada pregunta puede tener asociado un tema principal. Analiza estos errores y genera un párrafo corto y amigable (2-4 frases) como feedback para el usuario, mencionando los 1-3 temas o conceptos generales en los que parece necesitar más repaso, basándote en los temas asociados a las preguntas falladas. Si no hay temas claros, da un consejo más general.

Errores del usuario (formato JSON):
${JSON.stringify(errorsSummary, null, 2)}

Genera únicamente el párrafo de feedback.`;

        console.log("Enviando solicitud a Gemini para análisis de errores (con temas)...");
        // 4. Llamar a Gemini (sin cambios)
        const response = await fetch(AI_API_ENDPOINT, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 contents: [{ parts: [{ text: prompt }] }],
                 generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
                 safetySettings: [ /* ... tus safety settings ... */ ]
             }),
        });
        console.log(`Respuesta de Gemini (feedback) recibida: ${response.status}`);
        const aiResponse = await response.json();
        if (!response.ok) { /* ... manejo error API ... */ throw new Error(`Error API Gemini (feedback): ${aiResponse?.error?.message || response.status}`); }

        // 5. Extraer y devolver feedback (sin cambios)
        let feedbackText = "No se pudo generar feedback específico, pero ¡sigue estudiando!";
        if (aiResponse.candidates && aiResponse.candidates[0]?.content?.parts?.[0]?.text) {
            feedbackText = aiResponse.candidates[0].content.parts[0].text.trim();
            console.log("Feedback específico generado:", feedbackText);
        } else { console.warn("La respuesta de Gemini para feedback no tenía la estructura esperada."); }

        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedback: feedbackText }) };

    } catch (error) {
        console.error('Error en analyze-results:', error);
        return { statusCode: 500, body: JSON.stringify({ error: `Error al generar feedback: ${error.message}` }) };
    }
};
