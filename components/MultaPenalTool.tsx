
import React, { useState } from 'react';
import { Upload, Gavel, Copy, CheckCircle, Loader2, AlertCircle, Trash2, Paperclip, MapPin, User, FileText, Fingerprint } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface ExtractedData {
  numeroProcesso: string;
  nomeParte: string;
  cpf: string;
  cep: string;
  endereco: string;
  numero: string;
  estaPreso: string;
}

const MultaPenalTool: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [];

      for (const file of files) {
          const base64 = await fileToBase64(file);
          parts.push({ inlineData: { data: base64, mimeType: file.type } });
      }

      parts.push({ text: "Analise estas certidões de multa penal e extraia os dados consolidados. Retorne JSON válido conforme schema." });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              numeroProcesso: { type: Type.STRING },
              nomeParte: { type: Type.STRING },
              cpf: { type: Type.STRING },
              cep: { type: Type.STRING },
              endereco: { type: Type.STRING },
              numero: { type: Type.STRING },
              estaPreso: { type: Type.STRING }
            },
            required: ["numeroProcesso", "nomeParte", "cpf"]
          }
        }
      });

      setData(JSON.parse(response.text || "{}"));
    } catch (err) {
      setError("Falha ao processar os documentos.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const labelClass = "block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 ml-1";

  const DataField = ({ label, value, id, icon: Icon }: { label: string, value: string, id: string, icon?: any }) => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between group hover:border-purple-300 transition-all">
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon size={12} className="text-purple-500" />}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-sm font-bold text-slate-800 truncate select-all">{value || '-'}</p>
        </div>
        <button 
            onClick={() => copyToClipboard(value, id)}
            className={`p-2 rounded-lg transition-all ml-2 ${copiedField === id ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 text-slate-400 hover:text-purple-600 hover:border-purple-300'}`}
            title="Copiar"
        >
            {copiedField === id ? <CheckCircle size={16} /> : <Copy size={16} />}
        </button>
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <div className="w-[420px] bg-slate-900 border-r border-slate-800 p-8 flex flex-col gap-6 shadow-xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg text-white"><Gavel size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-slate-100">Multa Penal</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Extração Multi-Documento</p>
          </div>
        </div>

        <div className="space-y-6">
          <label 
              onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files) setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])}}
              className={`w-full h-40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-slate-800 hover:bg-slate-800'}`}
          >
              <Upload size={24} className="text-purple-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Arraste múltiplos arquivos</span>
              <input type="file" multiple className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
          </label>

          {files.length > 0 && (
              <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Arquivos ({files.length})</span>
                    <button onClick={() => setFiles([])} className="text-[9px] font-bold text-red-500 hover:underline">LIMPAR</button>
                  </div>
                  {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-xl text-[10px]">
                          <span className="text-slate-400 truncate w-40">{f.name}</span>
                          <button onClick={() => removeFile(i)} className="text-slate-600 hover:text-red-500"><Trash2 size={12}/></button>
                      </div>
                  ))}
                  <button onClick={handleExtract} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 mt-2">
                      {loading ? <Loader2 className="animate-spin" size={14}/> : <Gavel size={14}/>} Iniciar Extração
                  </button>
              </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-950 p-12 overflow-y-auto flex flex-col items-center justify-center custom-scrollbar relative">
        {!data && !loading && (
          <div className="text-center space-y-4 max-w-sm animate-in fade-in zoom-in duration-700">
             <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-slate-800">
                <Gavel size={40} className="text-purple-500" />
             </div>
             <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Extração de Multa</h3>
             <p className="text-slate-500 text-sm">Carregue uma ou mais certidões de multa penal para extrair os dados de devedor consolidados.</p>
          </div>
        )}
        
        {loading && <Loader2 className="animate-spin text-purple-500" size={48} />}
        
        {data && (
           <div className="w-full max-w-4xl bg-white p-10 rounded-sm shadow-2xl animate-in slide-in-from-bottom border-t-8 border-purple-600">
              <div className="flex items-center justify-between mb-8 border-b pb-4 border-slate-100">
                  <div>
                      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Dados Extraídos</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Certidão de Multa Penal</p>
                  </div>
                  <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${data.estaPreso?.toLowerCase().includes('sim') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {data.estaPreso?.toLowerCase().includes('sim') ? 'Réu Preso' : 'Réu Solto'}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                      <DataField id="proc" label="Número do Processo" value={data.numeroProcesso} icon={FileText} />
                  </div>
                  <div className="md:col-span-2">
                      <DataField id="nome" label="Nome do Sentenciado" value={data.nomeParte} icon={User} />
                  </div>
                  <DataField id="cpf" label="CPF" value={data.cpf} icon={Fingerprint} />
                  <DataField id="cep" label="CEP" value={data.cep} icon={MapPin} />
                  
                  <div className="md:col-span-2">
                      <DataField id="end_completo" label="Endereço Completo" value={`${data.endereco}, ${data.numero} ${data.cep ? '- CEP: ' + data.cep : ''}`} icon={MapPin} />
                  </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                  <button onClick={() => setData(null)} className="text-xs font-bold text-slate-400 hover:text-purple-600 uppercase tracking-widest transition-colors">
                      Nova Extração
                  </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default MultaPenalTool;
