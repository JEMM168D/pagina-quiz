import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import QuizPlayer from './components/QuizPlayer'
import QuizResults from './components/QuizResults'
import { Menu, GraduationCap } from 'lucide-react'

export default function App() {
  const [activeView, setActiveView] = useState('dashboard') // 'dashboard', 'quiz', 'results'
  const [isGenerating, setIsGenerating] = useState(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [history, setHistory] = useState([])
  const [activeQuizId, setActiveQuizId] = useState(null)
  
  // Quiz parameters for retry
  const [currentFileName, setCurrentFileName] = useState('')
  const [gameMode, setGameMode] = useState('Practice') // 'Practice' or 'Exam'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('quiz_history')
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (err) {
        console.error("Error parsing history from localStorage", err)
      }
    }
  }, [])

  // Generate quiz action
  const handleGenerate = ({ file, numQuestions, difficulty, quizMode, gameMode: selectedGameMode }) => {
    setIsGenerating(true)
    setGameMode(selectedGameMode)
    setCurrentFileName(file.name)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const fileDataUrl = e.target.result
      
      // Infer MIME type
      let typeToSend = file.type
      if (!typeToSend && file.name.endsWith('.docx')) {
        typeToSend = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      } else if (!typeToSend) {
        typeToSend = 'application/octet-stream'
      }

      try {
        const response = await fetch('/.netlify/functions/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileDataUrl,
            fileType: typeToSend,
            fileName: file.name,
            numQuestions,
            difficulty,
            quizMode
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || `Error del servidor: ${response.status}`)
        }

        const generatedQuestions = data.questions || []
        if (generatedQuestions.length === 0) {
          throw new Error("No se pudieron generar preguntas para este documento.")
        }

        // Save generated quiz
        setQuestions(generatedQuestions)
        setAnswers([])
        
        // Add to history
        const newQuizItem = {
          id: Date.now().toString(),
          fileName: file.name,
          questions: generatedQuestions,
          gameMode: selectedGameMode,
          answers: [],
          score: 0,
          date: new Date().toLocaleDateString()
        }

        const updatedHistory = [newQuizItem, ...history]
        setHistory(updatedHistory)
        localStorage.setItem('quiz_history', JSON.stringify(updatedHistory))
        setActiveQuizId(newQuizItem.id)
        
        // Switch view
        setActiveView('quiz')
      } catch (err) {
        console.error("Error generating quiz:", err)
        alert(`Error al generar el cuestionario: ${err.message}`)
      } finally {
        setIsGenerating(false)
      }
    }

    reader.onerror = () => {
      alert("Error al leer el archivo localmente.")
      setIsGenerating(false)
    }

    reader.readAsDataURL(file)
  }

  // Quiz Finished
  const handleFinished = (quizAnswers) => {
    setAnswers(quizAnswers)
    setActiveView('results')

    // Update history item with answers
    if (activeQuizId) {
      const correctCount = quizAnswers.filter(a => a.isCorrect).length
      const updatedHistory = history.map(item => {
        if (item.id === activeQuizId) {
          return {
            ...item,
            answers: quizAnswers,
            score: correctCount
          }
        }
        return item
      })
      setHistory(updatedHistory)
      localStorage.setItem('quiz_history', JSON.stringify(updatedHistory))
    }
  }

  // Navigation from History Selection
  const handleSelectHistory = (historyItem) => {
    setQuestions(historyItem.questions)
    setActiveQuizId(historyItem.id)
    setCurrentFileName(historyItem.fileName)
    setGameMode(historyItem.gameMode)

    if (historyItem.answers && historyItem.answers.length > 0) {
      setAnswers(historyItem.answers)
      setActiveView('results')
    } else {
      setAnswers([])
      setActiveView('quiz')
    }
  }

  // Reset or clear history
  const handleClearHistory = () => {
    if (window.confirm("¿Estás seguro de que deseas borrar todo el historial?")) {
      localStorage.removeItem('quiz_history')
      setHistory([])
      setActiveQuizId(null)
      setActiveView('dashboard')
    }
  }

  const handleRetry = () => {
    setAnswers([])
    setActiveView('quiz')
  }

  const handleReset = () => {
    setQuestions([])
    setAnswers([])
    setActiveQuizId(null)
    setCurrentFileName('')
    setActiveView('dashboard')
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Navigation */}
      <Sidebar 
        history={history} 
        activeQuizId={activeQuizId}
        onSelectHistory={handleSelectHistory}
        onClearHistory={handleClearHistory}
        onNewQuiz={handleReset}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-[280px]">
        {/* Mobile Header Bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-surface-border sticky top-0 z-30 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg text-primary-dark">QuizAI</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-low text-text-primary"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* View Switcher */}
        <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">
          {activeView === 'dashboard' && (
            <Dashboard 
              onGenerate={handleGenerate} 
              isGenerating={isGenerating} 
            />
          )}

          {activeView === 'quiz' && (
            <QuizPlayer 
              questions={questions} 
              gameMode={gameMode}
              onFinished={handleFinished}
              onCancel={handleReset}
            />
          )}

          {activeView === 'results' && (
            <QuizResults 
              questions={questions}
              answers={answers}
              onRetry={handleRetry}
              onReset={handleReset}
            />
          )}
        </main>
      </div>
    </div>
  )
}
