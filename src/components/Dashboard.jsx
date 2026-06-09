import React, { useState, useRef } from 'react'
import { UploadCloud, FileText, X, Sparkles, Play, Award } from 'lucide-react'

export default function Dashboard({ onGenerate, isGenerating }) {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [numQuestions, setNumQuestions] = useState(10)
  const [customQuestions, setCustomQuestions] = useState('')
  const [difficulty, setDifficulty] = useState('Medium')
  const [quizMode, setQuizMode] = useState('Multiple Choice')
  const [gameMode, setGameMode] = useState('Practice') // 'Practice' or 'Exam'
  
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selectedFile) => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (selectedFile.size > maxSize) {
      alert("El archivo es demasiado grande (máx 10 MB).")
      return
    }

    const fileExtension = selectedFile.name.split('.').pop().toLowerCase()
    const allowedExtensions = ['txt', 'pdf', 'docx']
    if (!allowedExtensions.includes(fileExtension)) {
      alert("Formato no soportado. Por favor sube .txt, .pdf o .docx.")
      return
    }

    setFile(selectedFile)
  }

  const handleRemoveFile = (e) => {
    e.stopPropagation()
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current.click()
  }

  const handleSubmit = () => {
    if (!file) {
      alert("Por favor selecciona o arrastra un archivo primero.")
      return
    }

    const finalNumQuestions = numQuestions === 'Custom' ? parseInt(customQuestions) : numQuestions
    if (isNaN(finalNumQuestions) || finalNumQuestions <= 0 || finalNumQuestions > 50) {
      alert("Por favor introduce una cantidad de preguntas válida (1 a 50).")
      return
    }

    onGenerate({
      file,
      numQuestions: finalNumQuestions,
      difficulty,
      quizMode,
      gameMode
    })
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="font-display text-3xl font-extrabold text-text-dark mb-2">Crear Nuevo Quiz con IA</h2>
        <p className="text-text-secondary text-base">Sube tu material de estudio y nuestra Inteligencia Artificial generará un cuestionario personalizado en segundos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Uploader */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-soft border border-surface-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-text-dark">Material de Origen</h3>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary bg-surface-low px-2.5 py-1 rounded-full">PDF, TXT, DOCX</span>
          </div>

          {/* Drag & Drop Area */}
          <div 
            onClick={triggerFileSelect}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`
              relative rounded-2xl h-72 border-2 border-dashed flex flex-col items-center justify-center text-center p-6 cursor-pointer transition-all duration-200
              ${dragActive ? 'border-primary bg-primary/[0.04] scale-[0.99]' : 'border-primary/20 bg-primary/[0.01] hover:bg-primary/[0.03] hover:border-primary/40'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".txt,.pdf,.docx"
            />
            
            {file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-semibold text-text-dark text-base truncate max-w-xs sm:max-w-md">{file.name}</p>
                  <p className="text-xs text-text-secondary mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button 
                  onClick={handleRemoveFile}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Quitar Archivo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mx-auto">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-text-dark text-base">Arrastra tus archivos aquí</h4>
                  <p className="text-text-secondary text-sm mt-1">o haz clic para explorar tu ordenador</p>
                </div>
                <p className="text-xs text-text-secondary italic">Límite de tamaño: 10 MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Configurations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Config Card */}
          <div className="bg-white rounded-3xl p-6 shadow-soft border border-surface-border">
            <h3 className="font-display text-lg font-bold text-text-dark mb-6">Configuración</h3>
            
            <div className="space-y-6">
              {/* Number of questions */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Número de Preguntas</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 30, 'Custom'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumQuestions(num)}
                      className={`
                        py-2 text-sm rounded-xl font-bold transition-all
                        ${numQuestions === num 
                          ? 'bg-primary text-white shadow-soft' 
                          : 'bg-surface-low hover:bg-slate-200 text-text-secondary'
                        }
                      `}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                
                {numQuestions === 'Custom' && (
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Cantidad (ej. 15)"
                    value={customQuestions}
                    onChange={(e) => setCustomQuestions(e.target.value)}
                    className="w-full bg-surface-low border border-surface-border rounded-xl px-4 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                  />
                )}
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Dificultad</label>
                <div className="bg-surface-low p-1 rounded-2xl flex gap-1 border border-surface-border">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`
                        flex-1 py-2 text-sm rounded-xl transition-all
                        ${difficulty === diff 
                          ? 'bg-white text-primary shadow-sm font-bold' 
                          : 'text-text-secondary hover:bg-white/50 font-medium'
                        }
                      `}
                    >
                      {diff === 'Easy' ? 'Fácil' : diff === 'Medium' ? 'Medio' : 'Difícil'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode (Multiple choice / TF) */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Tipo de Preguntas</label>
                <select 
                  value={quizMode}
                  onChange={(e) => setQuizMode(e.target.value)}
                  className="w-full bg-surface-low border border-surface-border rounded-xl px-4 py-3 text-sm text-text-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none cursor-pointer"
                >
                  <option value="Multiple Choice">Opción Múltiple (A, B, C, D)</option>
                  <option value="True / False">Verdadero / Falso</option>
                </select>
              </div>

              {/* Game Mode (Practice / Exam) */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Modo de Juego</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGameMode('Practice')}
                    className={`
                      py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all
                      ${gameMode === 'Practice' 
                        ? 'bg-primary/10 text-primary border-2 border-primary' 
                        : 'bg-surface-low border-2 border-transparent text-text-secondary hover:bg-slate-200'
                      }
                    `}
                  >
                    <Sparkles className="w-4 h-4" />
                    Práctica
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode('Exam')}
                    className={`
                      py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all
                      ${gameMode === 'Exam' 
                        ? 'bg-amber-50 text-amber-700 border-2 border-amber-500' 
                        : 'bg-surface-low border-2 border-transparent text-text-secondary hover:bg-slate-200'
                      }
                    `}
                  >
                    <Award className="w-4 h-4" />
                    Examen
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary leading-normal mt-1">
                  {gameMode === 'Practice' 
                    ? '✨ Modo Práctica: Muestra la retroalimentación y la explicación correcta de inmediato.' 
                    : '⏱️ Modo Examen: Tiene temporizador (30s) por pregunta. Los resultados se ven al final.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-white rounded-3xl p-6 shadow-soft border-t-4 border-primary border-x border-b border-surface-border">
            <button
              onClick={handleSubmit}
              disabled={isGenerating}
              className={`
                w-full bg-primary text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-primary-dark transition-all shadow-active-glow
                ${isGenerating ? 'opacity-75 cursor-not-allowed' : ''}
              `}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Generando Quiz...
                </>
              ) : (
                <>
                  Generar Quiz
                  <Play className="w-4 h-4 fill-current" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
