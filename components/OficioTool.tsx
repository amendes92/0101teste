import React, { useState, useMemo } from 'react';
import { PromotoriaDef } from '../types';
import { Mail, Copy, CheckCircle, FileText, Send, AlertTriangle, Sparkles, Loader2, Bot, Upload, X, Paperclip, Trash2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

type OficioTemplate = 'GERAL_DP' | 'INQUERITO_APARTADO' | 'URGENCIA_IC' | 'CORREGEDORIA' | 'PEDIDO_COPIAS_JUIZO' | 'GAESP_ABUSO' | 'GERACAO_IA';

interface OficioToolProps {
  promotorias: PromotoriaDef[];
}

const OficioTool: React.FC<OficioToolProps> = ({ promotorias }) => {
  const [cargo, setCargo] = useState('');
  const [processo, setProcesso] = useState('');
  const [numeroOficio, setNumeroOficio] = useState('');
  const [template, setTemplate] = useState<OficioTemplate>('GERAL_DP');
  
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [orgaoNome, setOrgaoNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [emailOrgao, setEmailOrgao] = useState('');
  const [textoLivre, setTextoLivre] = useState('');
  const [identificacaoObjeto, setIdentificacaoObjeto] = useState('');
  const [reuNome, setReuNome] = useState('');

  const [iaInstrucao, setIaInstrucao] = useState('');
  const [iaContexto, setIaContexto] = useState('');
  const [iaFiles, setIaFiles] = useState<File[]>([]);
  const [iaBody, setIaBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [copied, setCopied] = useState(false);

  const selectedPromotoria = useMemo(() => 
    promotorias.find(p => p.label === cargo), [cargo, promotorias]);

  const promotorName = useMemo(() => {
    if (!selectedPromotoria || selectedPromotoria.schedule.length === 0) return "";
    return selectedPromotoria.schedule[0].name;
  }, [selectedPromotoria]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerateIA = async () => {
    if (!iaInstrucao.trim()) {
        alert("Por favor, forneça uma instrução para a IA.");
        return;
    }

    setIsGenerating(true);
    setIaBody('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const parts: any[] = [];

        for (const file of iaFiles) {
            const base64Data = await fileToBase64(file);
            parts.push({
                inlineData: {
                    mimeType: file.type,
                    data: base64Data
                }
            });
        }

        if (iaFiles.length > 0) {
            parts.push({ text: "CONTEXTO (Documentos Anexos): Utilize as informações dos documentos acima como base factual prioritária." });
        }

        if (iaContexto.trim()) {
            parts.push({ text: `CONTEXTO ADICIONAL (Texto): "${iaContexto}"` });
        }

        const promptInstruction = `
        Você é um Assistente Jurídico Sênior do Ministério Público de São Paulo.
        Sua tarefa é redigir o CORPO DE TEXTO de um ofício formal.
        
        NÃO inclua cabeçalho nem rodapé de assinatura.
        
        DADOS DO DESTINATÁRIO:
        - Órgão: ${orgaoNome}
        - Responsável: ${destinatarioNome}

        SUA MISSÃO (INSTRUÇÃO DO PROMOTOR):
        "${iaInstrucao}"

        REGRAS:
        1. Vocativo adequado.
        2. Linguagem formal e IMPESSOAL.
        3. Formatação HTML básica (<p>, <b>).
        4. Fecho protocolar.
        `;

        parts.push({ text: promptInstruction });

        const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts }]
        });

        setIaBody(result.text || "Erro ao gerar texto.");
    } catch (error) {
        console.error(error);
        setIaBody("Ocorreu um erro ao gerar o ofício.");
    } finally {
        setIsGenerating(false);
    }
  };

  const processFiles = (newFiles: File[]) => {
    const totalSize = [...iaFiles, ...newFiles].reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 25 * 1024 * 1024) {
        alert("O limite total de arquivos é 25MB.");
        return;
    }
    setIaFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const removeFile = (idx: number) => {
    setIaFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const generatedContent = useMemo(() => {
    const header = `
      <div style="margin-bottom: 20px;">
        <p><b>Ofício nº ${numeroOficio || '____'}/${new Date().getFullYear().toString().slice(-2)} - 4ª PJCrim</b><br>
        <b>Autos nº: ${processo || '________________'}</b><br>
        (Favor mencionar as referências acima)</p>
      </div>
      <p style="text-align: right;">São Paulo, data infra.</p>
    `;

    const footerAssinatura = `
      <div style="text-align: center; margin-top: 60px; margin-bottom: 40px;">
        <b>${(promotorName || '________________').toUpperCase()}</b><br>
        ${cargo || 'Promotor(a) de Justiça'}
      </div>
      <div style="font-size: 11px; color: #444; border-top: 1px solid #eee; pt-2;">
        <b>Ao: ${orgaoNome || '________________'}</b><br>
        ${destinatarioNome ? `A/C ${destinatarioNome}<br>` : ''}
        ${endereco || 'Endereço não informado'}<br>
        E-mail: ${emailOrgao || '________________'}
      </div>
    `;

    let body = "";
    if (template === 'GERACAO_IA') {
        body = iaBody || "<p style='color:#666'><i>Aguardando geração com IA...</i></p>";
    } else {
        body = `<p><b>EXCELENTÍSSIMO SENHOR...</b></p><br><p>Conteúdo do modelo ${template} será inserido aqui.</p>`;
    }

    return `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 14px; color: #000; line-height: 1.5; text-align: justify;">
        ${header}
        ${body}
        ${footerAssinatura}
      </div>
    `;
  }, [numeroOficio, processo, promotorName, cargo, template, orgaoNome, destinatarioNome, endereco, emailOrgao, iaBody]);

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-500 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <div className="w-[420px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-4 shadow-xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-600 rounded-lg text-white"><FileText size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-slate-100">Gerador de Ofícios</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Modelos Padronizados</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
                onClick={() => setTemplate('GERACAO_IA')}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all mb-2 ${template === 'GERACAO_IA' ? 'bg-violet-600 border-violet-700 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-violet-500 hover:bg-slate-800'}`}
          >
             <Bot size={18}/> Geração Inteligente (IA)
          </button>
          
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'GERAL_DP', label: 'Geral (Delegacia/DP)' },
              { id: 'URGENCIA_IC', label: 'Urgência Laudo (IC)' },
              { id: 'INQUERITO_APARTADO', label: 'Inquérito Apartado' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id as OficioTemplate)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-left text-xs font-bold transition-all ${template === t.id ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={numeroOficio} onChange={(e) => setNumeroOficio(e.target.value)} placeholder="Nº Ofício" className={inputClass} />
            <input type="text" value={processo} onChange={(e) => setProcesso(e.target.value)} placeholder="Processo nº" className={inputClass} />
          </div>

          <select value={cargo} onChange={(e) => setCargo(e.target.value)} className={inputClass}>
            <option value="">Selecione o Cargo...</option>
            {promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>

          <div className="p-4 bg-slate-950 rounded-2xl space-y-3 border border-slate-800">
             <span className={labelClass}>Destinatário</span>
             <input type="text" placeholder="Órgão" value={orgaoNome} onChange={(e) => setOrgaoNome(e.target.value)} className={inputClass} />
             <input type="text" placeholder="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
          </div>

          {template === 'GERACAO_IA' && (
             <div className="space-y-4 animate-in fade-in bg-violet-950/20 p-4 rounded-2xl border border-violet-900/30">
                <label 
                  onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files))}}
                  className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-violet-500 bg-violet-900/20' : 'border-slate-800 hover:bg-slate-900'}`}
                >
                  <Upload size={18} className="text-violet-500 mb-1" />
                  <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Anexar Contexto (Múltiplos)</span>
                  <input type="file" multiple className="hidden" accept="application/pdf,image/*" onChange={handleFileSelect} />
                </label>

                {iaFiles.length > 0 && (
                  <div className="space-y-1">
                    {iaFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg text-[10px]">
                        <span className="text-slate-300 truncate w-32">{f.name}</span>
                        <button onClick={() => removeFile(i)} className="text-red-500"><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea value={iaInstrucao} onChange={(e) => setIaInstrucao(e.target.value)} placeholder="O que escrever?" className={`${inputClass} h-24 resize-none`} />
                <button onClick={handleGenerateIA} disabled={isGenerating} className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                   {isGenerating ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Gerar com IA
                </button>
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-950 p-10 overflow-y-auto flex flex-col items-center custom-scrollbar">
        <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-16 min-h-[850px] relative">
          <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
          <button onClick={() => {navigator.clipboard.writeText(generatedContent); setCopied(true); setTimeout(()=>setCopied(false), 2000)}} className={`absolute top-6 right-6 px-6 py-2.5 rounded-lg shadow-md flex items-center gap-2 font-bold transition-all ${copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />} {copied ? 'Copiado!' : 'Copiar Ofício'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OficioTool;