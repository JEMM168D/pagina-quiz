import React, { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Upload, Download, FileText, CheckCircle2, XCircle } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function QuizResults({ 
  questions, 
  answers, 
  onRetry, 
  onReset 
}) {
  const [aiFeedback, setAiFeedback] = useState('')
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)

  const correctAnswersCount = answers.filter(a => a.isCorrect).length
  const totalQuestions = questions.length
  const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0

  // Trigger confetti for high scores
  useEffect(() => {
    if (scorePercentage >= 80) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    }
  }, [scorePercentage])

  // Get AI Feedback for incorrect answers
  useEffect(() => {
    const incorrectAnswersList = questions.filter((q, idx) => {
      const answerRecord = answers.find(a => a.questionIndex === idx)
      return !answerRecord || !answerRecord.isCorrect
    })

    if (incorrectAnswersList.length > 0) {
      fetchFeedback(incorrectAnswersList)
    } else {
      setAiFeedback("¡Felicidades! Has completado el cuestionario de manera perfecta. No tienes errores que analizar. ¡Sigue así!")
    }
  }, [questions, answers])

  const fetchFeedback = async (incorrects) => {
    setIsLoadingFeedback(true)
    try {
      const response = await fetch('/.netlify/functions/analyze-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incorrectAnswers: incorrects }),
      })
      const data = await response.json()
      if (response.ok && data.feedback) {
        setAiFeedback(data.feedback)
      } else {
        setAiFeedback("No se pudo generar el análisis detallado en este momento. ¡Sigue repasando el material de estudio!")
      }
    } catch (err) {
      console.error("Error fetching AI feedback:", err)
      setAiFeedback("Hubo un problema de conexión al generar el análisis de errores.")
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  // Calculate stats by topic
  const topicStats = {}
  questions.forEach((q, idx) => {
    const topic = q.topic || 'General'
    const answerRecord = answers.find(a => a.questionIndex === idx)
    const isCorrect = answerRecord ? answerRecord.isCorrect : false

    if (!topicStats[topic]) {
      topicStats[topic] = { total: 0, correct: 0 }
    }
    topicStats[topic].total += 1
    if (isCorrect) {
      topicStats[topic].correct += 1
    }
  })

  // Export questions to TXT file
  const exportQuizToTxt = () => {
    let content = `=== CUESTIONARIO GENERADO CON QUIZAI ===\n\n`
    questions.forEach((q, idx) => {
      content += `Pregunta ${idx + 1}: ${q.question}\n`
      q.options.forEach((opt, oIdx) => {
        content += `${String.fromCharCode(65 + oIdx)}) ${opt}\n`
      })
      content += `Respuesta Correcta: ${q.answer}\n`
      if (q.explanation) {
        content += `Explicación: ${q.explanation}\n`
      }
      content += `\n---------------------------------------\n\n`
    })

    const element = document.createElement("a")
    const file = new Blob([content], {type: 'text/plain'})
    element.href = URL.createObjectURL(file)
    element.download = "cuestionario_quizai.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Circular progress helper
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-extrabold text-text-dark mb-2">Resultados Finales</h2>
        <p className="text-text-secondary text-base">Aquí tienes tu informe de rendimiento detallado.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: General Score & Chart */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-soft border border-surface-border flex flex-col items-center justify-center text-center">
          <h3 className="font-display text-lg font-bold text-text-dark mb-6">Puntuación General</h3>
          
          {/* Circular SVG Chart */}
          <div className="relative w-44 h-44 flex items-center justify-center mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r={radius}
                className="stroke-surface-low fill-none"
                strokeWidth="12"
              />
              <circle
                cx="88"
                cy="88"
                r={radius}
                className="stroke-primary fill-none transition-all duration-1000 ease-out"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-display text-4xl font-extrabold text-text-dark">{scorePercentage}%</span>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider mt-1">Aciertos</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-text-primary text-base font-medium">
              Acertaste <strong className="text-primary text-lg">{correctAnswersCount}</strong> de <strong className="text-text-dark text-lg">{totalQuestions}</strong> preguntas.
            </p>
            <p className="text-xs text-text-secondary">
              {scorePercentage >= 80 ? '🏆 ¡Excelente trabajo! Dominas este material.' : scorePercentage >= 50 ? '👍 Buen intento. Revisa el análisis para mejorar.' : '📖 Te recomendamos volver a repasar el documento.'}
            </p>
          </div>
        </div>

        {/* Right: Analytics & AI Feedback */}
        <div className="lg:col-span-7 space-y-6">
          {/* Topic Breakdown */}
          <div className="bg-white rounded-3xl p-6 shadow-soft border border-surface-border">
            <h3 className="font-display text-lg font-bold text-text-dark mb-4">Rendimiento por Temas</h3>
            <div className="space-y-4">
              {Object.entries(topicStats).map(([topic, stats]) => {
                const topicPct = Math.round((stats.correct / stats.total) * 100)
                return (
                  <div key={topic} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-text-primary capitalize">{topic}</span>
                      <span className="text-text-secondary">{stats.correct}/{stats.total} ({topicPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-surface-low rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${topicPct >= 80 ? 'bg-primary' : topicPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${topicPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Feedback */}
          <div className="bg-white rounded-3xl p-6 shadow-soft border border-surface-border space-y-3">
            <h3 className="font-display text-lg font-bold text-text-dark flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-primary" />
              Análisis de Errores con IA
            </h3>
            
            {isLoadingFeedback ? (
              <div className="py-6 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="text-xs text-text-secondary italic">Analizando errores con Gemini...</p>
              </div>
            ) : (
              <p className="text-sm text-text-primary leading-relaxed bg-surface-low p-4 rounded-2xl italic border-l-4 border-primary">
                {aiFeedback}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button
          onClick={onRetry}
          className="px-6 py-4 bg-primary text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-primary-dark transition-all active:scale-[0.98] shadow-soft"
        >
          <RefreshCw className="w-4 h-4" />
          Hacer otro quiz (mismo documento)
        </button>
        <button
          onClick={onReset}
          className="px-6 py-4 bg-white text-primary border-2 border-primary hover:bg-primary/5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Upload className="w-4 h-4" />
          Analizar nuevo documento
        </button>
        <button
          onClick={exportQuizToTxt}
          className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-text-primary rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          Exportar Cuestionario (.txt)
        </button>
      </div>
    </div>
  )
}
