exports.handler = async (event, context) => {
    // 1. Verify POST and retrieve incorrectAnswers
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
    }
    
    let incorrectAnswers;
    try {
        const body = JSON.parse(event.body);
        incorrectAnswers = body.incorrectAnswers;
        if (!Array.isArray(incorrectAnswers)) throw new Error('Falta o es inválido el parámetro incorrectAnswers.');
        console.log(`Recibidas ${incorrectAnswers.length} respuestas incorrectas para analizar.`);
        if (incorrectAnswers.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ feedback: "¡Felicidades! No tuviste errores." }) };
        }
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ error: `Cuerpo inválido: ${error.message}` }) };
    }

    // 2. Retrieve Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Error de configuración: GEMINI_API_KEY no encontrada.' }) };
    }

    try {
        // 3. Configure Gemini API with gemini-3.1-flash-lite
        const modelName = 'gemini-3.1-flash-lite';
        const AI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // Create summary of errors
        const errorsSummary = incorrectAnswers.map(q => ({
            pregunta: q.question,
            tema: q.topic || "No especificado",
            respuesta_correcta: q.answer
        }));

        // Prompt mentioning topics
        const prompt = `Un usuario realizó un cuestionario basado en un documento de estudio y respondió incorrectamente a las siguientes preguntas. Cada pregunta tiene asociado un tema principal. Analiza estos errores y genera un párrafo corto y amigable (2-4 frases) como retroalimentación para el usuario, mencionando los 1-3 temas o conceptos generales en los que parece necesitar más repaso y estudio, basándote en los temas asociados a las preguntas falladas. Si no hay temas claros, dale un consejo de estudio general amigable.
        
Evita dar las respuestas directas a las preguntas nuevamente, en cambio enfócate en el área temática general que debe estudiar.

Errores del usuario (formato JSON):
${JSON.stringify(errorsSummary, null, 2)}

Genera únicamente el párrafo de retroalimentación amigable.`;

        console.log(`Enviando solicitud a Gemini API (${modelName}) para análisis de errores...`);
        
        const response = await fetch(AI_API_ENDPOINT, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 contents: [{ parts: [{ text: prompt }] }],
                 generationConfig: { temperature: 0.6, maxOutputTokens: 512 }
             }),
        });

        console.log(`Respuesta de Gemini API (feedback) recibida con estado: ${response.status}`);
        const aiResponse = await response.json();
        
        if (!response.ok) {
            throw new Error(`Error API Gemini (feedback): ${aiResponse?.error?.message || response.status}`);
        }

        // 5. Extract and return feedback
        let feedbackText = "No se pudo generar retroalimentación específica en este momento, ¡pero sigue estudiando y esforzándote!";
        if (aiResponse.candidates && aiResponse.candidates[0]?.content?.parts?.[0]?.text) {
            feedbackText = aiResponse.candidates[0].content.parts[0].text.trim();
            console.log("Feedback generado por la IA:", feedbackText);
        } else {
            console.warn("La respuesta de Gemini para feedback no tenía la estructura esperada.");
        }

        return { 
            statusCode: 200, 
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTION'
            }, 
            body: JSON.stringify({ feedback: feedbackText }) 
        };

    } catch (error) {
        console.error('Error en analyze-results:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: `Error al generar retroalimentación: ${error.message}` }) 
        };
    }
};
