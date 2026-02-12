import React, { useState } from 'react';
import { Upload, ScanText, FileText, Loader2, Sparkles, Copy, CheckCircle, AlertCircle, X, Trash2, Paperclip } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const DataExtractorTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [instruction, setInstruction] = useState('');
  const [extractedData, setExtractedData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleExtract = async () => {
    if (files.length === 0 || !instruction.trim()) return;
    setIsLoading(true);
    setError(null);
    setExtractedData('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [];
      for (const file of files) {
        const b64 = await fileToBase64(file);
        parts.push({ inlineData: { data: b64, mimeType: file.type } });
      }
      parts.push({ text: `INSTRUÇÃO: ${instruction}` });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts }]
      });
      setExtractedData(response.text || "Sem dados.");
    } catch (err) {
      setError("Erro ao processar extração.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all placeholder-slate-600";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <div className="w-full md:w-[450px] bg-slate-900 border-r border-slate-800 p-8 flex flex-col gap-6 shadow-2xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-sky-600 rounded-lg text-white"><ScanText size={24} /></div>
          <div><h2 className="font-bold uppercase tracking-tight text-white">Extrator Inteligente</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Extração de Múltiplos Arquivos</p></div>
        </div>

        <div className="space-y-4">
          <label 
            onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files) setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])}}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-sky-500 bg-sky-900/20' : 'border-slate-800 bg-slate-950 hover:bg-slate-900'}`}
          >
            <Upload size={24} className="text-sky-500 mb-2" />
            <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Arraste múltiplos arquivos</p>
            <input type="file" multiple className="hidden" accept="application/pdf,image/*" onChange={(e) => {if(e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])}} />
          </label>

          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px]">
                  <span className="text-slate-400 truncate w-48">{f.name}</span>
                  <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500"><X size={14}/></button>
                </div>
              ))}
            </div>
          )}

          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="O que deseja extrair?" className={`${inputClass} h-32 resize-none`} />
          <button onClick={handleExtract} disabled={isLoading || files.length === 0} className="w-full bg-sky-600 hover:bg-sky-500 text-white py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-sky-900/40 transition-all">
            {isLoading ? <Loader2 className="animate-spin" size={16}/> : <ScanText size={16}/>} Iniciar Extração
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-950 p-10 overflow-y-auto custom-scrollbar flex flex-col items-center">
        {extractedData && (
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-10 text-slate-300 shadow-2xl animate-in slide-in-from-bottom">
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
                <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Resultado do Processamento</span>
                <button onClick={() => {navigator.clipboard.writeText(extractedData); setCopied(true); setTimeout(()=>setCopied(false), 2000)}} className="text-[10px] font-bold bg-slate-800 px-4 py-2 rounded-lg">{copied ? 'Copiado!' : 'Copiar Dados'}</button>
             </div>
             <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{extractedData}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataExtractorTool;