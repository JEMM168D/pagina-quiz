import React, { useState, useEffect, useRef } from 'react'
import { Timer, ArrowRight, HelpCircle, LogOut } from 'lucide-react'

export default function QuizPlayer({ 
  questions, 
  gameMode, 
  onFinished, 
  onCancel 
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [answers, setAnswers] = useState([]) // Array of objects: { questionIndex, selected, correct, isCorrect }
  const [shuffledOptions, setShuffledOptions] = useState([])
  
  const timerRef = useRef(null)

  const currentQ = questions[currentIndex]

  // Shuffle options once per question
  useEffect(() => {
    if (currentQ) {
      const shuffled = [...currentQ.options].sort(() => Math.random() - 0.5)
      setShuffledOptions(shuffled)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setTimeLeft(30)
    }
  }, [currentIndex, currentQ])

  // Timer logic for Exam Mode
  useEffect(() => {
    if (gameMode === 'Exam' && !isAnswered) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIndex, isAnswered, gameMode])

  const handleTimeout = () => {
    // Treat as incorrect / no answer selected
    const answerRecord = {
      questionIndex: currentIndex,
      selected: null,
      correct: currentQ.answer,
      isCorrect: false
    }

    const updatedAnswers = [...answers, answerRecord]
    setAnswers(updatedAnswers)
    setIsAnswered(true)

    // Automatically advance after a brief delay in Exam Mode
    setTimeout(() => {
      advanceQuestion(updatedAnswers)
    }, 1500)
  }

  const handleAnswerSelect = (option) => {
    if (isAnswered) return
    
    if (timerRef.current) clearInterval(timerRef.current)
    
    setSelectedAnswer(option)
    setIsAnswered(true)

    const isCorrect = option === currentQ.answer
    const answerRecord = {
      questionIndex: currentIndex,
      selected: option,
      correct: currentQ.answer,
      isCorrect
    }

    const updatedAnswers = [...answers, answerRecord]
    setAnswers(updatedAnswers)

    // In Exam Mode, advance automatically after 1 second (no immediate red/green feedback or explanation)
    if (gameMode === 'Exam') {
      setTimeout(() => {
        advanceQuestion(updatedAnswers)
      }, 1000)
    }
  }

  const handleNextClick = () => {
    advanceQuestion(answers)
  }

  const advanceQuestion = (currentAnswersList) => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Finished all questions!
      onFinished(currentAnswersList)
    }
  }

  // Visual highlights
  const getButtonClass = (option) => {
    if (!isAnswered) {
      return 'bg-surface-low hover:bg-slate-200 text-text-primary border border-surface-border'
    }

    // Exam Mode styling: just highlight selected option in neutral gray/blue
    if (gameMode === 'Exam') {
      if (selectedAnswer === option) {
        return 'bg-blue-100 text-blue-700 border-2 border-blue-500 font-bold'
      }
      return 'bg-surface-low text-text-secondary opacity-60 border border-transparent'
    }

    // Practice Mode styling: green for correct, red for selected incorrect
    const isCorrectOption = option === currentQ.answer
    const isSelectedOption = option === selectedAnswer

    if (isCorrectOption) {
      return 'bg-green-100 text-green-700 border-2 border-green-500 font-bold'
    }
    if (isSelectedOption && !isCorrectOption) {
      return 'bg-red-100 text-red-700 border-2 border-red-500 font-bold'
    }
    return 'bg-surface-low text-text-secondary opacity-60 border border-transparent'
  }

  const progressPercentage = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-soft border border-surface-border">
        <div>
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Cuestionario</span>
          <h3 className="font-display font-bold text-lg text-text-dark">
            Pregunta {currentIndex + 1} de {questions.length}
          </h3>
        </div>
        
        {/* Timer (only for Exam mode) */}
        {gameMode === 'Exam' && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${timeLeft <= 5 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-amber-50 text-amber-700'}`}>
            <Timer className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        )}

        <button 
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 hover:bg-red-50 text-text-secondary hover:text-red-500 rounded-lg text-xs font-bold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Salir
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-surface-low rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-soft border border-surface-border space-y-6">
        {/* Topic Tag */}
        {currentQ.topic && (
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {currentQ.topic}
          </span>
        )}

        {/* Question Text */}
        <h4 className="font-display text-xl font-bold text-text-dark leading-snug">
          {currentQ.question}
        </h4>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {shuffledOptions.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswerSelect(option)}
              disabled={isAnswered}
              className={`
                w-full text-left px-5 py-4 rounded-2xl transition-all active:scale-[0.99] text-base flex items-center justify-between
                ${getButtonClass(option)}
              `}
            >
              <span>{`${String.fromCharCode(65 + idx)}) ${option}`}</span>
            </button>
          ))}
        </div>

        {/* Feedback / Explanation (Practice Mode) */}
        {gameMode === 'Practice' && isAnswered && (
          <div className="p-5 bg-primary/[0.03] border-l-4 border-primary rounded-xl space-y-2 mt-6 animate-fadeIn">
            <h5 className="font-display font-bold text-primary text-sm flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              Explicación de la Respuesta:
            </h5>
            <p className="text-sm text-text-primary leading-relaxed">
              {currentQ.explanation || `La respuesta correcta es "${currentQ.answer}". ¡Excelente forma de poner a prueba tus conocimientos!`}
            </p>
          </div>
        )}

        {/* Next Button (Practice Mode only, since Exam advances automatically) */}
        {gameMode === 'Practice' && isAnswered && (
          <div className="flex justify-end pt-4">
            <button
              onClick={handleNextClick}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary-dark transition-all active:scale-95 shadow-soft"
            >
              <span>{currentIndex + 1 === questions.length ? 'Ver Resultados' : 'Siguiente Pregunta'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
