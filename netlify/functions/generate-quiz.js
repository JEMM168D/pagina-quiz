// netlify/functions/generate-quiz.js

// Importar las dependencias instaladas por Netlify gracias a package.json
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

exports.handler = async (event, context) => {
    // 1. Verificar método POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido. Usa POST.' }) };
    }

    // 2. Obtener datos del cuerpo (Base64 data URL y tipo/nombre de archivo)
    let base64DataUrl, fileType, fileName;
    try {
        const body = JSON.parse(event.body);
        base64DataUrl = body.fileDataUrl; // Esperamos la URL de datos Base64
        fileType = body.fileType;        // Ej: 'application/pdf', 'text/plain', etc.
        fileName = body.fileName;        // Ej: 'documento.pdf'

        if (!base64DataUrl || !fileType || !fileName) {
            throw new Error('Faltan datos del archivo (fileDataUrl, fileType, fileName).');
        }
        console.log(`Archivo recibido: ${fileName}, Tipo: ${fileType}`);

    } catch (error) {
        console.error("Error al parsear el cuerpo de la solicitud:", error);
        return { statusCode: 400, body: JSON.stringify({ error: `Cuerpo de solicitud inválido: ${error.message}` }) };
    }

    // 3. Obtener la clave API de Google Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Error: La variable de entorno GEMINI_API_KEY no está configurada.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Error de configuración del servidor (falta clave API Gemini).' }) };
    }

    let extractedText = '';
    try {
        // 4. Extraer el texto según el tipo de archivo

        // Extraer solo la parte Base64 de la Data URL (quita el prefijo 'data:...;base64,')
        const base64String = base64DataUrl.split(',')[1];
        if (!base64String) {
            throw new Error("Formato de Data URL inválido.");
        }
        // Convertir Base64 a un Buffer binario
        const fileBuffer = Buffer.from(base64String, 'base64');
        console.log(`Buffer creado, tamaño: ${fileBuffer.length} bytes`);

        if (fileType === 'application/pdf') {
            console.log("Procesando PDF...");
            const data = await pdfParse(fileBuffer);
            extractedText = data.text;
            console.log("Texto extraído de PDF.");
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
            // application/vnd.openxmlformats-officedocument.wordprocessingml.document es el MIME type de .docx
            console.log("Procesando DOCX...");
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = result.value;
            console.log("Texto extraído de DOCX.");
        } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            console.log("Procesando TXT...");
            // Para texto plano, simplemente decodificamos el buffer como UTF-8
            extractedText = fileBuffer.toString('utf8');
            console.log("Texto extraído de TXT.");
        } else {
            console.warn(`Tipo de archivo no soportado directamente: ${fileType}`);
            // Podríamos intentar leerlo como texto plano como último recurso
             try {
                 extractedText = fileBuffer.toString('utf8');
                 console.log("Intentando leer como texto plano (tipo no soportado).");
                 if (!extractedText.trim()) throw new Error('Contenido vacío o no textual');
             } catch (fallbackError) {
                throw new Error(`Tipo de archivo no soportado: ${fileType}. Solo se admiten .txt, .pdf y .docx.`);
             }
        }

        if (!extractedText || extractedText.trim().length === 0) {
            console.warn("No se pudo extraer texto o el documento estaba vacío.");
            // Devolvemos un error amigable en lugar de enviar texto vacío a la IA
            return {
                statusCode: 400, // Bad Request
                body: JSON.stringify({ error: 'No se pudo extraer contenido textual del documento o estaba vacío.' })
            };
        }

        console.log(`Texto extraído (primeros 100 chars): ${extractedText.substring(0, 100)}`);

        // 5. Preparar y llamar a la API de Gemini con el texto extraído
        const modelName = 'gemini-1.5-flash-latest'; // O el modelo que estés usando
        const AI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const prompt = `A partir del siguiente texto, genera OBLIGATORIAMENTE un array JSON válido que contenga alrededor de 10 objetos de preguntas de opción múltiple (4 opciones cada una). Cada objeto en el array debe tener estrictamente las siguientes claves y tipos: "question" (string), "options" (array de 4 strings diferentes entre sí) y "answer" (string, que debe ser idéntico a una de las strings en el array "options"). No incluyas ninguna explicación, texto introductorio, comillas de bloque de código (\`\`\`) ni nada más antes o después del array JSON puro. El JSON debe empezar con '[' y terminar con ']'. Asegúrate de que todas las comillas y comas sean correctas para un JSON válido.\n\nTexto:\n---\n${extractedText}\n---\n\nGenera únicamente el array JSON.`;

        console.log(`Enviando solicitud a Gemini API (${modelName})...`);
        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
                safetySettings: [ /* ... tus safety settings ... */ ]
            }),
        });

        console.log(`Respuesta de Gemini API recibida con estado: ${response.status}`);
        const aiResponse = await response.json();

        if (!response.ok) {
            console.error(`Error de la API de Gemini (${response.status}):`, JSON.stringify(aiResponse, null, 2));
            const errorMessage = aiResponse?.error?.message || `Error ${response.status}`;
            throw new Error(`La API de Gemini devolvió un error: ${errorMessage}`);
        }

        // 6. Procesar la respuesta de Gemini
        console.log("Respuesta JSON completa de Gemini recibida.");
        let generatedQuestions = [];
        if (aiResponse.candidates && aiResponse.candidates[0]?.content?.parts?.[0]?.text) {
             try {
                const jsonString = aiResponse.candidates[0].content.parts[0].text;
                const cleanedJsonString = jsonString.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
                generatedQuestions = JSON.parse(cleanedJsonString);
             } catch (parseError) { /* ... manejo de error de parseo ... */ throw new Error("Gemini no devolvió un JSON de preguntas válido."); }
        } else { /* ... manejo de estructura inesperada ... */ throw new Error("La respuesta de Gemini no contenía texto de preguntas esperado."); }

        if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) { throw new Error('La IA generó una respuesta vacía o no válida.'); }

        console.log(`Se generaron y parsearon ${generatedQuestions.length} preguntas.`);

        // 7. Devolver las preguntas al frontend
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: generatedQuestions }),
        };

    } catch (error) {
        console.error('Error durante la extracción de texto o llamada a Gemini:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Error al procesar el archivo o generar el quiz: ${error.message}` }),
        };
    }
};
