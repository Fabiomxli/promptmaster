import React, { useState, useEffect } from 'react';
import { 
  Music, 
  Mic2, 
  Wind, 
  Guitar, 
  FileText, 
  Zap, 
  Copy, 
  Check, 
  Loader2, 
  AudioLines,
  Maximize2,
  History,
  Trash2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { optimizeSunoPromptStream, SunoInputs, OptimizedPrompts } from './services/geminiService';

interface HistoryItem {
  id: string;
  timestamp: number;
  inputs: SunoInputs;
  results: OptimizedPrompts;
}

export default function App() {
  const [inputs, setInputs] = useState<SunoInputs>({
    lyrics: '',
    globalStyle: '',
    vocalProcessing: '',
    atmospherics: '',
    instrumental: ''
  });

  const [results, setResults] = useState<OptimizedPrompts | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('suno_master_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading history", e);
      }
    }
  }, []);

  const handleInputChange = (field: keyof SunoInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleOptimize = async () => {
    if (!inputs.lyrics || !inputs.globalStyle) {
      alert("Por favor, ingresa al menos la letra y el estilo global.");
      return;
    }

    setLoading(true);
    setErrorHeader(null);
    setResults(null);
    setStreamingText('');
    
    let accumulatedText = '';
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setErrorHeader("La solicitud ha excedido el tiempo de espera. Intenta de nuevo.");
      }
    }, 90000); // 90 second hard timeout
    
    try {
      const generator = optimizeSunoPromptStream(inputs);
      
      for await (const chunk of generator) {
        accumulatedText += chunk;
        setStreamingText(accumulatedText);
      }

      // Parse the custom format
      const styleMatch = accumulatedText.match(/---STYLE---([\s\S]*?)---SCRIPT---/);
      const scriptMatch = accumulatedText.match(/---SCRIPT---([\s\S]*)/);

      const finalResults: OptimizedPrompts = {
        stylePrompt: styleMatch ? styleMatch[1].trim() : "Style prompt could not be parsed.",
        scriptPrompt: scriptMatch ? scriptMatch[1].trim() : accumulatedText.trim()
      };

      setResults(finalResults);
      
      // Save to history
      const newItem: HistoryItem = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        timestamp: Date.now(),
        inputs: { ...inputs },
        results: finalResults
      };
      
      const updatedHistory = [newItem, ...history].slice(0, 50); // Keep last 50
      setHistory(updatedHistory);
      localStorage.setItem('suno_master_history', JSON.stringify(updatedHistory));
      clearTimeout(timeoutId);
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(error);
      const message = error instanceof Error ? error.message : "Error desconocido al procesar el prompt.";
      setErrorHeader(message);
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setInputs(item.inputs);
    setResults(item.results);
    setShowHistory(false);
    setErrorHeader(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('suno_master_history', JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    if (confirm("¿Estás seguro de que quieres borrar todo el historial?")) {
      setHistory([]);
      localStorage.removeItem('suno_master_history');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-studio-bg lg:p-8 p-4">
      <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-studio-accent p-2 rounded-lg">
            <AudioLines className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
              Suno <span className="text-studio-accent">v5.5</span> Master
            </h1>
            <p className="text-studio-text-dim text-xs font-bold uppercase tracking-widest">
              Prompt Inflation Console
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${showHistory ? 'bg-studio-accent text-black' : 'text-studio-text-dim hover:bg-studio-panel'}`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Historial ({history.length})</span>
          </button>
          
          <div className="hidden md:flex gap-4 text-[10px] items-center font-mono border-l border-studio-border pl-4">
            <span className="text-studio-text-dim/50 uppercase">BUFFER: 5000ch</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pb-12">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-studio-panel border border-studio-border rounded-xl p-6 shadow-2xl min-h-[600px]"
            >
              <div className="flex items-center justify-between mb-8 border-b border-studio-border pb-4">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-studio-accent" />
                  <h2 className="text-xl font-black uppercase italic">Archivo de Producciones</h2>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={clearAllHistory}
                    className="text-[10px] uppercase font-black text-red-500 hover:text-red-400 flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3 h-3" /> Borrar Todo
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Clock className="w-16 h-16 text-studio-border mb-4" />
                  <p className="text-studio-text-dim font-bold uppercase tracking-widest text-sm">El historial está vacío</p>
                  <p className="text-xs text-studio-text-dim/50 mt-2">Genera tu primera canción para verla aquí.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map((item) => (
                    <motion.div 
                      layout
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="group bg-studio-bg border border-studio-border p-4 rounded-xl cursor-pointer hover:border-studio-accent transition-all relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Music className="w-3 h-3 text-studio-accent" />
                          <span className="text-[10px] font-mono text-studio-text-dim/50 italic">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => deleteHistoryItem(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <h3 className="font-bold text-sm text-white mb-2 line-clamp-1 truncate uppercase tracking-tight">
                        {item.inputs.globalStyle || "Sin Estilo"}
                      </h3>
                      <p className="text-xs text-studio-text-dim line-clamp-2 leading-relaxed italic opacity-70">
                        {item.inputs.lyrics.substring(0, 100)}...
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-studio-accent opacity-0 group-hover:opacity-100 transition-all">
                        <ExternalLink className="w-3 h-3" /> Cargar en Consola
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Rack: Inputs */}
              <section className="space-y-6 bg-studio-panel border border-studio-border p-6 rounded-xl shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Maximize2 className="w-40 h-40 text-white" />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-studio-accent" />
                  <h2 className="text-sm font-black uppercase tracking-widest">Input Racks</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="studio-label">
                      <Music className="w-4 h-4" /> Global Style & Mastering
                    </label>
                    <input 
                      value={inputs.globalStyle}
                      onChange={(e) => handleInputChange('globalStyle', e.target.value)}
                      placeholder="Ej: Trap oscuro, Bajos pesados, estilo profesional..."
                      className="studio-input w-full"
                    />
                    <div className="mt-1 text-[10px] text-studio-text-dim text-right font-mono">
                      {inputs.globalStyle.length} chars
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="studio-label">
                        <Mic2 className="w-4 h-4" /> Vocal Processing
                      </label>
                      <textarea 
                        value={inputs.vocalProcessing}
                        onChange={(e) => handleInputChange('vocalProcessing', e.target.value)}
                        placeholder="Ej: Voz con mucho eco, robótica, susurrada..."
                        className="studio-input w-full h-24 lg:h-32 resize-none"
                      />
                    </div>
                    <div>
                      <label className="studio-label">
                        <Wind className="w-4 h-4" /> Atmospherics
                      </label>
                      <textarea 
                        value={inputs.atmospherics}
                        onChange={(e) => handleInputChange('atmospherics', e.target.value)}
                        placeholder="Ej: Lluvia de fondo, sonidos de calle, espacio..."
                        className="studio-input w-full h-24 lg:h-32 resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="studio-label">
                      <Guitar className="w-4 h-4" /> Instrumental & Performance
                    </label>
                    <textarea 
                      value={inputs.instrumental}
                      onChange={(e) => handleInputChange('instrumental', e.target.value)}
                      placeholder="Ej: Solo de guitarra al inicio, batería agresiva..."
                      className="studio-input w-full h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="studio-label">
                      <FileText className="w-4 h-4" /> Lyrics (Base Script)
                    </label>
                    <textarea 
                      value={inputs.lyrics}
                      onChange={(e) => handleInputChange('lyrics', e.target.value)}
                      placeholder="Pega tu letra aquí..."
                      className="studio-input w-full h-48 lg:h-64 resize-none font-mono text-sm"
                    />
                    <div className="mt-1 text-[10px] text-studio-text-dim text-right font-mono">
                      {inputs.lyrics.length} / 5000 chars
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleOptimize}
                  disabled={loading}
                  className="studio-button w-full mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Optimizing Frequencies...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      Generate Optimized Prompt
                    </>
                  )}
                </button>
              </section>

              {/* Right Rack: Output */}
              <section className="space-y-6">
                <AnimatePresence mode="wait">
                  {errorHeader ? (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/30 p-8 rounded-xl flex flex-col items-center justify-center text-center h-full"
                    >
                      <Zap className="w-12 h-12 text-red-500 mb-4" />
                      <h3 className="text-red-500 font-bold uppercase text-sm tracking-widest">Error de Generación</h3>
                      <p className="text-xs text-red-100/70 mt-4 max-w-xs leading-relaxed">
                        {errorHeader}
                      </p>
                      <button 
                        onClick={handleOptimize}
                        className="mt-6 text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-400 underline underline-offset-4"
                      >
                        Reintentar Procesamiento
                      </button>
                    </motion.div>
                  ) : loading && streamingText ? (
                    <motion.div 
                      key="streaming"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-studio-panel border border-studio-accent/30 p-8 rounded-xl shadow-xl flex flex-col h-full space-y-4"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2.5 h-2.5 bg-studio-accent rounded-full animate-ping" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-studio-accent">AI Thinking - Stream de Audio</h3>
                      </div>
                      <div className="bg-black/60 p-6 rounded-lg border border-studio-border text-[10px] font-mono text-studio-text-dim/80 leading-relaxed flex-1 overflow-y-auto whitespace-pre-wrap scrollbar-hide">
                        {streamingText}
                      </div>
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="w-full bg-studio-border h-1 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="bg-studio-accent h-full w-1/3"
                          />
                        </div>
                        <span className="text-[10px] text-studio-accent font-bold animate-pulse uppercase tracking-[0.3em]">Procesando Masterización Técnica...</span>
                      </div>
                      <button 
                        onClick={() => {
                          setLoading(false);
                          setStreamingText('');
                          setErrorHeader("Operación cancelada por el usuario.");
                        }}
                        className="text-[9px] uppercase font-black text-red-500/60 hover:text-red-500 tracking-tighter"
                      >
                        [ CANCELAR PROCESO ]
                      </button>
                    </motion.div>
                  ) : !results ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-studio-panel/50 border border-studio-border border-dashed p-12 rounded-xl flex flex-col items-center justify-center text-center h-full"
                    >
                      <AudioLines className="w-16 h-16 text-studio-border mb-4 animate-pulse" />
                      <h3 className="text-studio-text-dim font-bold uppercase text-sm tracking-widest">Awaiting Input Data</h3>
                      <p className="text-xs text-studio-text-dim/60 mt-2 max-w-xs">
                        Fill in the racks on the left to generate the professional 5000-character script.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="results"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      {/* Style Prompt Output */}
                      <div className="bg-studio-panel border border-studio-border p-6 rounded-xl shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Music className="w-4 h-4 text-studio-accent" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Optimized Style Box</h3>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(results.stylePrompt, 'style')}
                            className="text-studio-text-dim hover:text-studio-accent transition-colors flex items-center gap-1 text-[10px]"
                          >
                            {copiedField === 'style' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedField === 'style' ? 'Copied' : 'Copy Style'}
                          </button>
                        </div>
                        <div className="bg-black/40 p-4 rounded border border-studio-border text-xs font-mono text-studio-accent leading-relaxed max-h-40 overflow-y-auto">
                          {results.stylePrompt}
                        </div>
                        <div className="mt-2 text-[10px] text-studio-text-dim/50 font-mono text-right">
                          {results.stylePrompt.length} / 1000 characters
                        </div>
                      </div>

                      {/* Script Prompt Output */}
                      <div className="bg-studio-panel border border-studio-border p-6 rounded-xl shadow-xl flex-1 flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-studio-accent" />
                            <h3 className="text-xs font-black uppercase tracking-widest">5000-Character Script</h3>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(results.scriptPrompt, 'script')}
                            className="text-studio-text-dim hover:text-studio-accent transition-colors flex items-center gap-1 text-[10px]"
                          >
                            {copiedField === 'script' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedField === 'script' ? 'Copied' : 'Copy Script'}
                          </button>
                        </div>
                        <div className="bg-black/40 p-4 rounded border border-studio-border text-[11px] font-mono whitespace-pre-wrap leading-relaxed flex-1 overflow-y-auto max-h-[600px] text-white/90">
                          {results.scriptPrompt}
                        </div>
                        <div className="mt-2 flex justify-between items-center text-[10px] text-studio-text-dim/50 font-mono">
                          <div className="flex gap-2">
                            <span className="bg-green-500/10 text-green-500 px-1 rounded">MASTERED</span>
                            <span className="bg-studio-accent/10 text-studio-accent px-1 rounded">V5.5 COMPATIBLE</span>
                          </div>
                          <div>{results.scriptPrompt.length} / 5000 characters</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Status Bar */}
      <footer className="max-w-7xl mx-auto border-t border-studio-border pt-6 text-[10px] text-studio-text-dim flex justify-between">
        <div>&copy; 2026 SUNO MASTER OPTIMIZER • ADVANCED PROMPT ENGINE</div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> GENERATIVE ENGINE READY</span>
          <span>LATENCY: 12ms</span>
        </div>
      </footer>
    </div>
  );
}
