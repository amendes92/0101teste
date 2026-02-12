
import React, { useState } from 'react';
import { Person } from '../types';
import { Plus, Trash2, Users, UserPlus, X, Sparkles, Loader2, ClipboardType } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface SidebarFormProps {
  onAddPerson: (person: Person) => void;
  people: Person[];
  onRemovePerson: (id: string) => void;
}

const SidebarForm: React.FC<SidebarFormProps> = ({ onAddPerson, people, onRemovePerson }) => {
  const initialFormState = {
    folha: '',
    nome: '',
    dataNascimento: '',
    rg: '',
    cpf: '',
    mae: '',
    pai: '',
    nacionalidade: 'Brasileiro'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const validateCPF = (cpf: string) => {
    const strCPF = cpf.replace(/[^\d]+/g, '');
    if (strCPF === '') return true;
    if (strCPF.length !== 11) return false;
    if (["00000000000", "11111111111", "22222222222", "33333333333", "44444444444", "55555555555", "66666666666", "77777777777", "88888888888", "99999999999"].includes(strCPF)) return false;
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(10, 11))) return false;
    return true;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  const formatRG = (value: string) => {
    const raw = value.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 9);
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return raw.replace(/^(\d{2})(\d+)/, '$1.$2');
    if (raw.length <= 8) return raw.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    return raw.replace(/^(\d{2})(\d{3})(\d{3})([0-9X])/, '$1.$2.$3-$4');
  };

  const formatDateInput = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    // Aplica a máscara DD/MM/AAAA
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return numbers.replace(/(\d{2})(\d+)/, '$1/$2');
    return numbers.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    
    if (name === 'cpf') newValue = formatCPF(value);
    else if (name === 'rg') newValue = formatRG(value);
    else if (name === 'dataNascimento') newValue = formatDateInput(value);
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleClear = () => {
    setFormData(initialFormState);
    setAiInput('');
  };

  const handleAdd = () => {
    if (!formData.nome.trim()) return alert("O nome da parte é obrigatório.");
    const newPerson: Person = { id: crypto.randomUUID(), ...formData };
    onAddPerson(newPerson);
    handleClear();
  };

  const handleAiParse = async () => {
    if (!aiInput.trim()) return;
    setIsParsing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Extraia os dados desta pessoa para uma pesquisa de antecedentes (NI). Texto: "${aiInput}"...`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING },
              folha: { type: Type.STRING },
              nacionalidade: { type: Type.STRING },
              cpf: { type: Type.STRING },
              rg: { type: Type.STRING },
              pai: { type: Type.STRING },
              mae: { type: Type.STRING },
              dataNascimento: { type: Type.STRING }
            },
            required: ["nome"]
          }
        }
      });
      const extracted = JSON.parse(response.text || "{}");
      setFormData(prev => ({ 
        ...prev, 
        ...extracted, 
        cpf: extracted.cpf ? formatCPF(extracted.cpf) : prev.cpf, 
        rg: extracted.rg ? formatRG(extracted.rg) : prev.rg,
        dataNascimento: extracted.dataNascimento ? formatDateInput(extracted.dataNascimento) : prev.dataNascimento
      }));
      setIsAiMode(false);
      setAiInput('');
    } catch (error) { alert("Erro ao processar."); } finally { setIsParsing(false); }
  };

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-500 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full md:w-[380px] bg-slate-900 flex flex-col h-full border-r border-slate-800 shadow-2xl relative z-10">
      <div className="bg-slate-950 p-6 text-white overflow-hidden relative border-b border-slate-800">
        <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-amber-600 rounded-lg"><Users size={20} className="text-slate-950" /></div>
            <div>
                <h2 className="font-bold text-lg leading-tight uppercase tracking-tight">Pesquisa NI</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Cadastro de Partes</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nova Parte</span>
            </div>
            <button onClick={() => setIsAiMode(!isAiMode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${isAiMode ? 'bg-amber-600 border-amber-700 text-white' : 'bg-slate-800 border-slate-700 text-amber-500 hover:bg-slate-700'}`}>
              <Sparkles size={12} /> {isAiMode ? 'Fechar IA' : 'Modo IA'}
            </button>
          </div>

          {isAiMode ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
              <div className="p-4 bg-amber-950/20 rounded-2xl border border-amber-900/30">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2"><ClipboardType size={12} /> Cole o texto aqui</p>
                <textarea value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Denúncia ou BO..." className="w-full h-32 bg-slate-900 border border-amber-900/40 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                <button onClick={handleAiParse} disabled={isParsing || !aiInput.trim()} className="w-full mt-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all">
                  {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Extrair
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1"><label className={labelClass}>Fls.</label><input type="text" name="folha" value={formData.folha} onChange={handleChange} className={inputClass} placeholder="00" /></div>
                <div className="col-span-3"><label className={labelClass}>Nome Completo *</label><input type="text" name="nome" value={formData.nome} onChange={handleChange} className={inputClass} placeholder="Nome..." /></div>
              </div>
              
              {/* Campo de Data alterado para texto para permitir colar */}
              <div>
                <label className={labelClass}>Nascimento</label>
                <input 
                  type="text" 
                  name="dataNascimento" 
                  value={formData.dataNascimento} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>RG</label><input type="text" name="rg" value={formData.rg} onChange={handleChange} maxLength={12} className={inputClass} placeholder="00.000.000-X" /></div>
                <div><label className={labelClass}>CPF</label><input type="text" name="cpf" value={formData.cpf} onChange={handleChange} maxLength={14} className={inputClass} placeholder="000.000.000-00" /></div>
              </div>
              <div><label className={labelClass}>Mãe</label><input type="text" name="mae" value={formData.mae} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>Pai</label><input type="text" name="pai" value={formData.pai} onChange={handleChange} className={inputClass} /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleClear} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-3 rounded-xl font-bold text-xs uppercase transition-all border border-slate-700">Limpar</button>
                <button onClick={handleAdd} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-lg shadow-amber-900/40">Adicionar</button>
              </div>
            </div>
          )}
        </div>

        {people.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-950/30 p-6">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 block">Partes ({people.length})</span>
            <div className="space-y-2">
              {people.map(person => (
                <div key={person.id} className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex items-center justify-between shadow-sm">
                   <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-200 truncate">{person.nome}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Fls. {person.folha || 'N/A'}</p>
                   </div>
                   <button onClick={() => onRemovePerson(person.id)} className="p-2 text-slate-500 hover:text-red-500 rounded-lg"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarForm;
