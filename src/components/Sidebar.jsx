import React from 'react'
import { Plus, BookOpen, Settings, HelpCircle, History, Trash2, X, GraduationCap } from 'lucide-react'

export default function Sidebar({ 
  history, 
  activeQuizId, 
  onSelectHistory, 
  onClearHistory, 
  onNewQuiz, 
  isOpen, 
  onClose 
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-text-dark/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 w-[280px] bg-white border-r border-surface-border z-50 
        flex flex-col py-6 transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="px-6 mb-8 flex justify-between items-center">
          <div className="flex items-center gap-2" onClick={onNewQuiz} role="button">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-soft">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-primary-dark">QuizAI</h1>
              <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider opacity-60">Premium Generator</p>
            </div>
          </div>
          <button 
            className="p-1 rounded-lg hover:bg-surface-low text-text-secondary lg:hidden"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button */}
        <div className="px-4 mb-6">
          <button 
            onClick={() => {
              onNewQuiz();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold active:scale-[0.98] hover:bg-primary-dark transition-all shadow-soft"
          >
            <Plus className="w-5 h-5" />
            Nuevo Quiz
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          <button 
            onClick={() => {
              onNewQuiz();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-primary bg-primary/5 font-semibold border-l-4 border-primary text-left"
          >
            <BookOpen className="w-5 h-5" />
            Dashboard
          </button>

          {/* History List */}
          <div className="pt-6 pb-2 px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold opacity-60">Historial</p>
              {history.length > 0 && (
                <button 
                  onClick={onClearHistory}
                  title="Limpiar historial"
                  className="p-1 rounded hover:bg-red-50 text-text-secondary hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-text-secondary italic px-2 py-1">No hay quizzes guardados</p>
            ) : (
              <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectHistory(item);
                      onClose();
                    }}
                    className={`
                      w-full flex items-center gap-3 py-2 px-3 rounded-lg text-left text-sm transition-colors group
                      ${activeQuizId === item.id 
                        ? 'bg-primary/5 text-primary font-medium' 
                        : 'text-text-secondary hover:bg-surface-low hover:text-text-primary'
                      }
                    `}
                  >
                    <History className="w-4 h-4 text-text-secondary group-hover:text-primary shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="truncate flex-1">{item.fileName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer Settings */}
        <div className="px-6 pt-4 border-t border-surface-border space-y-3">
          <div className="flex items-center gap-3 text-text-secondary text-sm">
            <Settings className="w-4 h-4" />
            <span>Ajustes v1.1</span>
          </div>
          <div className="text-xs text-text-secondary">
            Desarrollado con Gemini 3.1
          </div>
        </div>
      </aside>
    </>
  )
}
