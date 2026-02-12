
import React, { useState, useMemo, useEffect } from 'react';
import { Person, PromotoriaDef } from '../types';
import { Search, Gavel, User, Mail, MessageCircle, Truck, Printer, Copy, CheckCircle, Trash2, Edit3, X, MapPin, BadgeCheck, FileStack, Plus, PlusCircle, LayoutList, BellRing, Send, Save, ArrowLeft, FileText, Loader2, FileSpreadsheet, Download, Sparkles, Clipboard, Building2, CalendarDays, HelpCircle, Archive, Upload, FileSignature, Image as ImageIcon, Files } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { PDFDocument } from 'pdf-lib';

interface ArchivingNotificationToolProps {
  promotorias: PromotoriaDef[];
  onOpenHelp?: () => void;
}

const MOCK_PARTES: Person[] = [];

const ArchivingNotificationTool: React.FC<ArchivingNotificationToolProps> = ({ promotorias, onOpenHelp }) => {
  // --- States Globais ---
  const [processoAtivo, setProcessoAtivo] = useState('');
  const [dipoInfo, setDipoInfo] = useState('1ª RAJ – Capital - Juiz das Garantias');
  const [partes, setPartes] = useState<Person[]>(MOCK_PARTES);
  
  // --- Promoção State ---
  const [promotionText, setPromotionText] = useState('');
  const [isPromotionLoading, setIsPromotionLoading] = useState(false);
  const [promoFiles, setPromoFiles] = useState<File[]>([]);
  const [isDraggingPromo, setIsDraggingPromo] = useState(false);
  
  // --- Merge State ---
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [isDraggingMerge, setIsDraggingMerge] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // --- State de Seleção e Edição ---
  const [selectedParteId, setSelectedParteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // --- Form State ---
  const [formData, setFormData] = useState<Partial<Person>>({});
  const [aiInput, setAiInput] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null); // Base64 da imagem colada
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'DADOS' | 'PROMOCAO' | 'INTIMACAO' | 'CERTIDAO' | 'MERGE'>('DADOS');
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'CORREIOS'>('CORREIOS');
  const [copied, setCopied] = useState(false);
  const [docView, setDocView] = useState<'CERTIDAO' | 'PROMOCAO'>('CERTIDAO');

  const selectedParte = useMemo(() => partes.find(p => p.id === selectedParteId) || null, [partes, selectedParteId]);

  useEffect(() => {
    if (isCreating) {
      setFormData({ tipoParte: 'Vítima', nacionalidade: 'Brasileira', statusIntimacao: 'Não Iniciado' });
      setAiInput('');
      setPastedImage(null);
    } else if (selectedParte) {
      setFormData({ ...selectedParte });
      setAiInput('');
      setPastedImage(null);
    } else {
      setFormData({});
    }
  }, [selectedParteId, isCreating, selectedParte]);

  const maskCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
  };

  const handleInputChange = (field: keyof Person, value: string) => {
    let formatted = value;
    if (field === 'cep') formatted = maskCEP(value);
    if (['nome', 'endereco', 'bairro', 'cidade', 'complemento', 'mae', 'pai'].includes(field)) {
        formatted = formatted.toUpperCase();
    }
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  // --- Handler para COLAR IMAGEM ---
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setPastedImage(event.target.result as string);
                }
            };
            if (blob) reader.readAsDataURL(blob);
            return; // Parar após encontrar a primeira imagem
        }
    }
  };

  // --- IA: Extração de Dados da Pessoa (Texto ou Imagem) ---
  const handleSmartExtraction = async () => {
    if (!aiInput.trim() && !pastedImage) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const parts: any[] = [];
      
      if (pastedImage) {
          parts.push({
              inlineData: {
                  mimeType: "image/png", // Assumindo PNG do clipboard, ou extrair do prefixo data:image/xxx
                  data: pastedImage.split(',')[1]
              }
          });
          parts.push({ text: "Extraia os dados desta imagem (B.O., Documento ou Qualificação). Retorne JSON." });
      } else {
          parts.push({ text: `Analise o texto jurídico abaixo e extraia NOME, ENDEREÇO, NÚMERO, COMPLEMENTO, BAIRRO, CIDADE, UF, CEP, EMAIL e TELEFONE. Padronize em CAIXA ALTA. Texto: "${aiInput}"` });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING },
              endereco: { type: Type.STRING },
              numero: { type: Type.STRING },
              complemento: { type: Type.STRING },
              bairro: { type: Type.STRING },
              cidade: { type: Type.STRING },
              uf: { type: Type.STRING },
              cep: { type: Type.STRING },
              email: { type: Type.STRING },
              telefone: { type: Type.STRING },
              folha: { type: Type.STRING },
              tipoParte: { type: Type.STRING, enum: ['Vítima', 'Investigado', 'Representante da Vítima'] }
            }
          }
        }
      });
      const extracted = JSON.parse(response.text || "{}");
      setFormData({ ...formData, ...extracted, cep: extracted.cep ? maskCEP(extracted.cep) : formData.cep });
      setPastedImage(null); // Limpar imagem após extração
      setAiInput(''); // Limpar texto
    } catch (error) {
      alert("Erro na extração.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Drag and Drop Handlers Promo ---
  const handleDragOverPromo = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPromo(true);
  };

  const handleDragLeavePromo = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPromo(false);
  };

  const handleDropPromo = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPromo(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setPromoFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  // --- Drag and Drop Handlers Merge ---
  const handleDragOverMerge = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMerge(true);
  };

  const handleDragLeaveMerge = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMerge(false);
  };

  const handleDropMerge = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMerge(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setMergeFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  // --- Logic Merge PDF ---
  const handleMergePDFs = async () => {
    if (mergeFiles.length < 2) return alert("Selecione pelo menos 2 arquivos para unir.");
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of mergeFiles) {
        const fileBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const cleanProcessNumber = processoAtivo ? processoAtivo.replace(/[^0-9\-\.]/g, '') : 'Sem_Numero';
      link.download = `Documentos_Unificados_${cleanProcessNumber}.pdf`;
      link.click();
    } catch (e) {
      console.error(e);
      alert("Erro ao unir PDFs. Certifique-se de que todos os arquivos são PDFs válidos.");
    } finally {
      setIsMerging(false);
    }
  };

  // --- IA: Formatação de Promoção de Arquivamento ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleFormatPromotion = async () => {
    if (promoFiles.length === 0) return;
    setIsPromotionLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [];
      for (const file of promoFiles) {
        const base64 = await fileToBase64(file);
        parts.push({ inlineData: { data: base64, mimeType: file.type } });
      }
      parts.push({ text: "Extraia o texto desta promoção de arquivamento. REMOVA margens de assinatura lateral, cabeçalhos repetidos e números de página. Una frases quebradas para que o texto fique fluído e limpo. Retorne apenas o texto jurídico formatado. IMPORTANTE: NÃO coloque o texto entre aspas." });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts }]
      });
      
      let text = response.text || "";
      // Remove aspas no início e fim se houver
      text = text.trim();
      if (text.startsWith('"') && text.endsWith('"')) {
          text = text.slice(1, -1);
      }
      
      setPromotionText(text);
      setActiveTab('INTIMACAO');
    } catch (error) {
      alert("Erro ao formatar promoção.");
    } finally {
      setIsPromotionLoading(false);
    }
  };

  const handleSaveParte = () => {
    if (!formData.nome) return alert("Nome obrigatório.");
    const newParte = { ...formData, id: formData.id || crypto.randomUUID(), statusIntimacao: formData.statusIntimacao || 'Não Iniciado' } as Person;
    if (isCreating) { setPartes(prev => [...prev, newParte]); setIsCreating(false); setSelectedParteId(newParte.id); }
    else { setPartes(prev => prev.map(p => p.id === newParte.id ? newParte : p)); setIsEditing(false); }
    setActiveTab('PROMOCAO');
  };

  // --- SMT Correios CSV Generator ---
  const handleDownloadSMT = () => {
    if (!selectedParte) return;

    // Helper para separar Logradouro e Tipo
    const splitAddress = (fullAddress: string) => {
        const types = ['RUA', 'AVENIDA', 'AV', 'ALAMEDA', 'TRAVESSA', 'PRACA', 'PRAÇA', 'RODOVIA', 'ESTRADA', 'LARGO', 'VIADUTO', 'VIA', 'ROD', 'EST'];
        const parts = fullAddress.trim().split(' ');
        let type = '';
        let name = fullAddress;
        
        if (parts.length > 1) {
            const firstWord = parts[0].toUpperCase().replace('.', '');
            if (types.includes(firstWord)) {
                type = firstWord;
                name = parts.slice(1).join(' ');
            }
        }
        return { type, name };
    };

    const addr = splitAddress(selectedParte.endereco || '');
    const cepClean = (selectedParte.cep || '').replace(/\D/g, '');
    
    const fields = [
        '', // 0
        selectedParte.nome?.toUpperCase() || '', // 1
        '', '', '', '', // 2-5
        cepClean, // 6
        addr.type, // 7
        addr.name, // 8
        selectedParte.bairro?.toUpperCase() || '', // 9
        selectedParte.cidade?.toUpperCase() || '', // 10
        selectedParte.uf?.toUpperCase() || '', // 11
        'N', // 12
        selectedParte.complemento?.toUpperCase() || '', // 13
        selectedParte.numero || '', // 14
        `PROCESSO:${processoAtivo}`, // 15
        '' // 16 (trailing semicolon)
    ];

    const csvLine = fields.join(';');
    const blob = new Blob([csvLine], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SMT_${selectedParte.nome.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Geração de PDF (via Print do Navegador com Nome do Arquivo Customizado) ---
  const handleDownloadPDF = () => {
    const originalTitle = document.title;
    const cleanProcessNumber = processoAtivo ? processoAtivo.replace(/[^0-9\-\.]/g, '') : 'Sem_Numero';
    // Define o título da página temporariamente para sugerir o nome do arquivo no "Salvar como PDF"
    document.title = `Certidão de Arquivamento ${cleanProcessNumber}`;
    window.print();
    // Restaura o título original após a impressão
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const whatsappTemplate = useMemo(() => {
    if (!selectedParte) return '';
    return `Prezado(a) Sr(a). *${selectedParte.nome}*,\n\nAqui é do Ministério Público de São Paulo. Informamos que houve uma manifestação pelo arquivamento do processo nº *${processoAtivo || '____________________'}*. Para mais informações, favor contatar-nos.`;
  }, [selectedParte, processoAtivo]);

  const emailTemplate = useMemo(() => {
    if (!selectedParte) return '';
    return `Prezado(a) Sr(a). ${selectedParte.nome},\n\nO Ministério Público do Estado de São Paulo comunica que, nos autos do processo nº ${processoAtivo || '____________________'}, foi apresentada promoção de arquivamento. De acordo com o Art. 28 do Código de Processo Penal, V. Sa. está sendo notificado(a) desta decisão.\n\nAtenciosamente,\nMinistério Público de São Paulo`;
  }, [selectedParte, processoAtivo]);

  const certidaoTemplate = useMemo(() => {
    if (!selectedParte) return '';
    const fullAddress = `${selectedParte.endereco || ''}, ${selectedParte.numero || 'S/N'} - ${selectedParte.complemento ? selectedParte.complemento + ' - ' : ''}${selectedParte.bairro || ''} - ${selectedParte.cidade || ''}-${selectedParte.uf || ''}`.toUpperCase();
    const date = new Date().toLocaleDateString('pt-BR');
    
    // Texto Jurídico Formal - Ajustado para o modelo
    let textoCertifico = '';
    
    const nomeParte = selectedParte.nome.toUpperCase();
    const tipoParte = selectedParte.tipoParte ? `(${selectedParte.tipoParte})` : '';
    const folhaRef = selectedParte.folha ? `(fl.${selectedParte.folha})` : '(fl.___)';
    
    if (channel === 'EMAIL') { 
        textoCertifico = `Certifico e dou fé que, no dia ${date}, comuniquei a <b>${nomeParte}</b> ${tipoParte}, através de notificação eletrônica enviada ao e-mail ${selectedParte.email || '____________________'} ${folhaRef}, com comprovante de envio em anexo, referente ao arquivamento do inquérito policial nº ${processoAtivo || '____________________'}.`; 
    }
    else if (channel === 'WHATSAPP') { 
        textoCertifico = `Certifico e dou fé que, no dia ${date}, comuniquei a <b>${nomeParte}</b> ${tipoParte}, através do aplicativo de mensagens WhatsApp no telefone ${selectedParte.telefone || '____________________'} ${folhaRef}, com comprovante de envio em anexo, referente ao arquivamento do inquérito policial nº ${processoAtivo || '____________________'}.`; 
    }
    else { 
        // Padrão Correios / Carta
        textoCertifico = `Certifico e dou fé que, no dia ${date}, procedi com a comunicação a <b>${nomeParte}</b> ${tipoParte}, através de Carta de Notificação de Arquivamento enviada ao endereço <b>${fullAddress}</b> ${folhaRef}, com comprovante de postagem eletrônica em anexo, referente ao arquivamento do inquérito policial nº ${processoAtivo || '____________________'}.`; 
    }

    return `
      <!-- Início da Folha A4 -->
      <div class="a4-page">

          <!-- Cabeçalho -->
          <div class="header">
              <div class="header-logo">
                  <div class="mpsp-logo">
                      <span style="color:black">MP</span><span style="color:#c00000">SP</span>
                  </div>
                  <div class="mpsp-text">
                      MINISTÉRIO PÚBLICO<br>DO ESTADO DE SÃO PAULO
                  </div>
              </div>
              <div class="promotoria-text">
                  4ª PROMOTORIA DE JUSTIÇA<br>CRIMINAL DA CAPITAL
              </div>
          </div>

          <!-- Conteúdo Principal -->
          <div class="content">
              <h3 class="title">
                  CERTIDÃO DE OFICIAL DE PROMOTORIA
              </h3>

              <div class="info-box">
                  <p style="margin: 5px 0;"><b>Autos:</b> ${processoAtivo || '____________________'}</p>
                  <p style="margin: 5px 0;"><b>Foro:</b> ${dipoInfo}</p>
              </div>

              <p class="cert-text">
                  ${textoCertifico}
              </p>

              <div class="cert-text">
                  <p>
                  Para  Constar  eu    Alex  Santana  Mendes  (Assinatura  Eletrônica), Oficial  de  Promotoria  I,  de  matrícula  12078,  realizei  a  digitação  e  a  emissão  desta certidão
                  </p>
              </div>
          </div>

          <!-- Rodapé -->
          <div class="footer">
              Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020<br>
              Telefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br
          </div>

      </div>
    `;
  }, [selectedParte, processoAtivo, dipoInfo, channel]);

  const inputClass = "w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";
  const sidebarInputClass = "w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all placeholder-slate-600";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* CSS para Impressão e Layout A4 na Tela */}
      <style>{`
        /* Configuração de visualização em tela para simular papel */
        .a4-page {
            width: 210mm;
            min-height: 297mm;
            padding: 5mm 25mm; /* Margins: Top/Bottom 2cm, Sides 2.5cm */
            background: white;
            display: flex;
            flex-direction: column;
            margin: auto;
            color: black;
            font-family: 'Arial', sans-serif;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
            box-sizing: border-box;
        }

        /* Header Styling */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #b91c1c;
            padding-bottom: 15px;
            margin-bottom: 40px;
        }

        .header-logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .mpsp-logo {
            font-weight: 900;
            font-size: 36px;
            line-height: 1;
            letter-spacing: -2px;
        }

        .mpsp-text {
            border-left: 1px solid #999;
            padding-left: 15px;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 500;
            line-height: 1.3;
            color: #333;
        }

        .promotoria-text {
            text-align: left;
            font-weight: 500;
            font-size: 11px;
            border-left: 3px solid #b91c1c;
            padding-left: 15px;
            line-height: 1.3;
            color: #333;
        }

        /* Content Styling */
        .content {
            flex: 1;
            color: #000;
        }

        h3.title {
            text-align: center;
            font-weight: 700;
            margin-bottom: 40px;
            text-transform: uppercase;
            font-size: 15px;
        }

        .info-box {
            margin-bottom: 40px;
            font-size: 14px;
            line-height: 1.6;
            color: #000;
        }

        .cert-text {
            text-align: justify;
            text-indent: 4em;
            margin-bottom: 10px;
            font-size: 15px; /* Slightly larger for readability */
            line-height: 1.8; /* Better line spacing */
        }

        /* Footer Styling */
        .footer {
            margin-top: auto;
            border-top: 2px solid #b91c1c;
            padding-top: 12px;
            text-align: center;
            font-size: 10px;
            color: #333;
            line-height: 1.5;
        }

        /* Configuração de Impressão */
        @media print {
            @page { margin: 0; size: A4; }
            html, body { 
                background: white !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                color: black !important; 
                width: 210mm;
                height: 297mm;
            }
            
            body * { visibility: hidden; }
            
            .printable-content, .printable-content * { 
                visibility: visible; 
            }
            
            .printable-content {
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: white !important;
                color: black !important;
                display: flex;
                justify-content: center;
                align-items: start;
            }
            
            .a4-page {
                box-shadow: none;
                width: 100%; 
                height: 100%;
                padding: 5mm 25mm !important;
                margin: 0;
                color: black !important;
            }
            
            .no-print { display: none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <div className="w-[380px] bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-20 no-print">
        <div className="p-6 bg-slate-950 border-b border-slate-800 space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-600 rounded-lg text-white"><LayoutList size={20}/></div>
                  <div><h2 className="font-bold text-slate-100 uppercase tracking-tight">Arquivamentos</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Controle Unificado</p></div>
              </div>
           </div>
           <div className="space-y-2">
              <div className="relative group"><Gavel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="Processo" value={processoAtivo} onChange={(e) => setProcessoAtivo(e.target.value)} className={`${sidebarInputClass} pl-9 font-bold`}/></div>
              <div className="relative group"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="DIPO / Vara" value={dipoInfo} onChange={(e) => setDipoInfo(e.target.value)} className={`${sidebarInputClass} pl-9`}/></div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
           <div className="flex items-center justify-between px-2 mb-2"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Partes ({partes.length})</span><button onClick={() => {setSelectedParteId(null); setIsCreating(true); setIsEditing(true); setActiveTab('DADOS');}} className="text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"><PlusCircle size={14}/> Nova</button></div>
           {partes.map(p => (
             <button key={p.id} onClick={() => { setSelectedParteId(p.id); setIsCreating(false); setIsEditing(false); setActiveTab('DADOS'); }} className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden group ${selectedParteId === p.id ? 'bg-slate-800 border-rose-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                <div className={`absolute left-0 top-0 w-1 h-full ${p.statusIntimacao === 'Concluído' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <div className="flex justify-between items-start mb-1"><span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{p.tipoParte}</span><span className="text-[9px] font-mono text-slate-500">Fls. {p.folha}</span></div>
                <h4 className={`font-bold text-sm truncate uppercase ${selectedParteId === p.id ? 'text-rose-400' : 'text-slate-300'}`}>{p.nome}</h4>
             </button>
           ))}
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {!isCreating && !selectedParteId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 animate-in zoom-in duration-500">
             <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-slate-800"><BellRing size={32} className="text-slate-700" /></div>
             <h3 className="text-xl font-bold text-slate-400 uppercase tracking-tight">Fluxo de Arquivamento</h3>
             <p className="text-sm mt-2">Selecione uma parte na barra lateral.</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-900 border-b border-slate-800 px-8 pt-6 flex gap-4 overflow-x-auto no-print sticky top-0 z-10 custom-scrollbar">
               {[
                 { id: 'DADOS', label: '1. Dados da Parte', icon: <User size={16}/> },
                 { id: 'PROMOCAO', label: '2. Promoção', icon: <Archive size={16}/> },
                 { id: 'INTIMACAO', label: '3. Intimação', icon: <Send size={16}/> },
                 { id: 'CERTIDAO', label: '4. Documentos', icon: <FileSignature size={16}/> },
                 { id: 'MERGE', label: '5. Unir Docs', icon: <Files size={16}/> },
               ].map((tab: any) => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest transition-all relative shrink-0 ${activeTab === tab.id ? 'text-rose-500' : 'text-slate-500 hover:text-slate-300'}`}>
                    {tab.icon} {tab.label}{activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500 rounded-t-full"></div>}
                 </button>
               ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-950">
              <div className="max-w-5xl mx-auto">
                
                {/* --- ABA 1: DADOS --- */}
                {activeTab === 'DADOS' && (
                  <div className="animate-in slide-in-from-bottom-4 space-y-6">
                     <div className="bg-amber-950/20 border border-amber-900/40 p-6 rounded-2xl mb-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-3"><Sparkles className="text-amber-500" size={18}/><h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Extração Inteligente (Texto ou Imagem)</h3></div>
                        <div className="flex gap-2 relative">
                           {pastedImage ? (
                               <div className="w-full h-20 bg-slate-900 border border-amber-500/50 rounded-xl p-3 flex items-center gap-4 relative">
                                   <img src={pastedImage} alt="Pasted" className="h-full rounded-md border border-slate-700"/>
                                   <div className="flex flex-col">
                                       <span className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1"><ImageIcon size={14}/> Imagem Detectada</span>
                                       <span className="text-[10px] text-slate-400">Clique em extrair para processar.</span>
                                   </div>
                                   <button onClick={() => setPastedImage(null)} className="absolute top-2 right-2 text-slate-500 hover:text-red-500"><X size={14}/></button>
                               </div>
                           ) : (
                               <textarea 
                                value={aiInput} 
                                onChange={(e) => setAiInput(e.target.value)} 
                                onPaste={handlePaste}
                                placeholder="Cole aqui o texto ou PRINT (Ctrl+V) com os dados da parte..." 
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 resize-none h-20 outline-none focus:ring-1 focus:ring-amber-500"
                               />
                           )}
                           <button onClick={handleSmartExtraction} disabled={isAiLoading || (!aiInput.trim() && !pastedImage)} className="bg-amber-600 hover:bg-amber-500 text-white px-6 rounded-xl font-bold uppercase text-xs tracking-widest disabled:opacity-50 flex items-center gap-2 min-w-[120px] justify-center">{isAiLoading ? <Loader2 className="animate-spin" size={16}/> : <Clipboard size={16}/>} Extrair</button>
                        </div>
                     </div>
                     <div className="bg-white p-8 rounded-lg shadow-xl border border-slate-200 relative">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            <div className="col-span-2 md:col-span-1"><label className={labelClass}>Nome Completo *</label><input type="text" value={formData.nome || ''} onChange={(e) => handleInputChange('nome', e.target.value)} className={inputClass} placeholder="Nome da Parte"/></div>
                            <div>
                                <label className={labelClass}>Tipo</label>
                                <select value={formData.tipoParte || 'Vítima'} onChange={(e) => setFormData({...formData, tipoParte: e.target.value as any})} className={inputClass}>
                                    <option value="Vítima">Vítima</option>
                                    <option value="Investigado">Investigado</option>
                                    <option value="Representante da Vítima">Representante da Vítima</option>
                                </select>
                            </div>
                            <div className="relative"><label className={labelClass}>CEP</label><input type="text" value={formData.cep || ''} onChange={(e) => handleInputChange('cep', e.target.value)} className={inputClass} placeholder="00000-000"/><button onClick={async () => {const res = await fetch(`https://viacep.com.br/ws/${formData.cep?.replace(/\D/g,'')}/json/`); const d = await res.json(); if(!d.erro) setFormData({...formData, endereco: d.logradouro.toUpperCase(), bairro: d.bairro.toUpperCase(), cidade: d.localidade.toUpperCase(), uf: d.uf.toUpperCase()});}} className="absolute right-3 top-8 text-rose-500"><Search size={18} /></button></div>
                            <div><label className={labelClass}>Endereço</label><input type="text" value={formData.endereco || ''} onChange={(e) => handleInputChange('endereco', e.target.value)} className={inputClass}/></div>
                            <div><label className={labelClass}>Número</label><input type="text" value={formData.numero || ''} onChange={(e) => handleInputChange('numero', e.target.value)} className={inputClass}/></div>
                            <div><label className={labelClass}>Complemento</label><input type="text" value={formData.complemento || ''} onChange={(e) => handleInputChange('complemento', e.target.value)} className={inputClass}/></div>
                            <div><label className={labelClass}>Bairro</label><input type="text" value={formData.bairro || ''} onChange={(e) => handleInputChange('bairro', e.target.value)} className={inputClass}/></div>
                            <div><label className={labelClass}>Cidade</label><input type="text" value={formData.cidade || ''} onChange={(e) => handleInputChange('cidade', e.target.value)} className={inputClass}/></div>
                            <div><label className={labelClass}>Telefone</label><input type="text" value={formData.telefone || ''} onChange={(e) => handleInputChange('telefone', e.target.value)} className={inputClass} placeholder="(11) 99999-9999"/></div>
                            <div><label className={labelClass}>Folha</label><input type="text" value={formData.folha || ''} onChange={(e) => handleInputChange('folha', e.target.value)} className={inputClass}/></div>
                        </div>
                        <div className="flex justify-end mt-8 pt-6 border-t border-slate-100"><button onClick={handleSaveParte} className="px-10 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-xs shadow-lg hover:bg-rose-500 flex items-center gap-2 transition-all transform active:scale-95"><Save size={18} /> Salvar e Continuar</button></div>
                     </div>
                  </div>
                )}

                {/* --- ABA 2: PROMOÇÃO --- */}
                {activeTab === 'PROMOCAO' && (
                  <div className="animate-in slide-in-from-bottom-4 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-6">
                       <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400"><Archive size={32}/></div>
                       <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Promoção de Arquivamento</h3>
                       <p className="text-slate-500 text-sm max-w-md mx-auto">Faça o upload do PDF ou imagem da promoção original para limpar e formatar o texto automaticamente.</p>
                       <label 
                          onDragOver={handleDragOverPromo}
                          onDragLeave={handleDragLeavePromo}
                          onDrop={handleDropPromo}
                          className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDraggingPromo ? 'border-rose-500 bg-rose-900/20' : 'border-slate-800 hover:border-rose-500 bg-slate-950/50'}`}
                       >
                          <Upload className={`mb-2 ${isDraggingPromo ? 'text-rose-500' : 'text-slate-600'}`} />
                          <span className={`text-xs font-bold uppercase ${isDraggingPromo ? 'text-rose-500' : 'text-slate-500'}`}>Arraste a peça original (PDF/IMG)</span>
                          <input type="file" multiple className="hidden" accept="application/pdf,image/*" onChange={(e) => e.target.files && setPromoFiles(Array.from(e.target.files))} />
                       </label>
                       {promoFiles.length > 0 && <p className="text-[10px] text-green-500 font-bold uppercase">{promoFiles.length} arquivo(s) selecionado(s)</p>}
                       <button onClick={handleFormatPromotion} disabled={isPromotionLoading || promoFiles.length === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50">
                          {isPromotionLoading ? <Loader2 className="animate-spin"/> : <Sparkles size={16}/>} Formatar Promoção
                       </button>
                    </div>
                  </div>
                )}

                {/* --- ABA 3: INTIMAÇÃO --- */}
                {activeTab === 'INTIMACAO' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4">
                     <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner w-fit">
                        {[{ id: 'CORREIOS', label: 'Correios', icon: <Truck size={16}/> }, { id: 'WHATSAPP', label: 'WhatsApp', icon: <MessageCircle size={16}/> }, { id: 'EMAIL', label: 'E-mail', icon: <Mail size={16}/> }].map(ch => (
                          <button key={ch.id} onClick={() => setChannel(ch.id as any)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${channel === ch.id ? 'bg-slate-800 text-slate-100 shadow-md ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-400'}`}>
                             {ch.icon} {ch.label}
                          </button>
                        ))}
                     </div>
                     <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Prévia do Texto de Envio</h4>
                        <div className="bg-slate-950 p-6 rounded-2xl text-slate-300 text-sm leading-relaxed border border-slate-800 italic">"{channel === 'WHATSAPP' ? whatsappTemplate : emailTemplate}"</div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => {navigator.clipboard.writeText(channel==='WHATSAPP'?whatsappTemplate:emailTemplate); setCopied(true); setTimeout(()=>setCopied(false),2000)}} className="bg-slate-800 text-white py-3 px-6 rounded-xl font-bold uppercase text-xs flex items-center gap-2 hover:bg-slate-700 transition-all">
                                {copied ? <CheckCircle size={16}/> : <Copy size={16}/>} {copied ? 'Copiado' : 'Copiar Texto'}
                            </button>
                            <button onClick={() => setActiveTab('CERTIDAO')} className="bg-rose-600 text-white py-3 px-10 rounded-xl font-bold uppercase text-xs flex items-center gap-2 hover:bg-rose-500 shadow-lg ml-auto">Próximo: Documentos Finais <ArrowLeft size={16} className="rotate-180"/></button>
                        </div>
                     </div>
                  </div>
                )}

                {/* --- ABA 4: DOCUMENTOS FINAIS --- */}
                {activeTab === 'CERTIDAO' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 h-full flex flex-col">
                     <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner w-fit mb-4">
                        <button onClick={() => setDocView('CERTIDAO')} className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${docView === 'CERTIDAO' ? 'bg-slate-800 text-rose-400' : 'text-slate-500'}`}>Certidão</button>
                        <button onClick={() => setDocView('PROMOCAO')} className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${docView === 'PROMOCAO' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500'}`}>Promoção Limpa</button>
                     </div>
                     <div className="bg-gray-100 p-4 rounded-xl shadow-2xl overflow-auto w-full min-h-[600px] flex justify-center">
                        {docView === 'CERTIDAO' ? (
                            <div className="printable-content" dangerouslySetInnerHTML={{ __html: certidaoTemplate }} />
                        ) : (
                            <div className="p-16 font-serif text-[12pt] text-justify leading-relaxed whitespace-pre-wrap selection:bg-yellow-200 printable-content bg-white w-[210mm] min-h-[297mm] text-black">
                                {promotionText || "Nenhuma promoção formatada ainda."}
                            </div>
                        )}
                     </div>
                     <div className="flex gap-4">
                        <button onClick={handleDownloadSMT} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                           <FileSpreadsheet size={20} /> Baixar CSV SMT
                        </button>
                        <button onClick={() => {navigator.clipboard.writeText(docView==='CERTIDAO'?certidaoTemplate:promotionText); setCopied(true); setTimeout(()=>setCopied(false),2000)}} className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3">
                           {copied ? <CheckCircle size={20} className="text-green-500"/> : <Copy size={20}/>} Copiar {docView==='CERTIDAO'?'HTML':'Texto'}
                        </button>
                        {/* Botão de Download PDF substituindo o botão de Imprimir */}
                        <button onClick={handleDownloadPDF} className="flex-[2] bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                            <Download size={20} /> Baixar PDF (Salvar como PDF)
                        </button>
                     </div>
                  </div>
                )}

                {/* --- ABA 5: UNIR DOCUMENTOS (MERGE) --- */}
                {activeTab === 'MERGE' && (
                  <div className="animate-in slide-in-from-bottom-4 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 text-center">
                       <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400"><Files size={32}/></div>
                       <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Unir Documentos PDF</h3>
                       <p className="text-slate-500 text-sm max-w-md mx-auto">Arraste múltiplos arquivos PDF aqui para combiná-los em um único documento sequencial.</p>
                       
                       <label 
                          onDragOver={handleDragOverMerge}
                          onDragLeave={handleDragLeaveMerge}
                          onDrop={handleDropMerge}
                          className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDraggingMerge ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-800 hover:border-indigo-500 bg-slate-950/50'}`}
                       >
                          <Upload className={`mb-2 ${isDraggingMerge ? 'text-indigo-500' : 'text-slate-600'}`} />
                          <span className={`text-xs font-bold uppercase ${isDraggingMerge ? 'text-indigo-500' : 'text-slate-500'}`}>Arraste os PDFs para unir</span>
                          <input type="file" multiple className="hidden" accept="application/pdf" onChange={(e) => e.target.files && setMergeFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                       </label>

                       {mergeFiles.length > 0 && (
                         <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 max-w-2xl mx-auto w-full">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Arquivos Selecionados ({mergeFiles.length})</span>
                                <button onClick={() => setMergeFiles([])} className="text-[10px] text-red-500 hover:underline">Limpar Tudo</button>
                            </div>
                            <div className="space-y-2">
                                {mergeFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="p-1 bg-indigo-500/10 rounded text-indigo-400 font-mono text-[10px]">{idx + 1}</div>
                                            <span className="text-xs text-slate-300 truncate max-w-[300px]">{file.name}</span>
                                        </div>
                                        <button onClick={() => setMergeFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-500 p-1"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                         </div>
                       )}

                       <button onClick={handleMergePDFs} disabled={isMerging || mergeFiles.length < 2} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl font-bold uppercase text-xs shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95">
                          {isMerging ? <Loader2 className="animate-spin"/> : <Files size={16}/>} Unir e Salvar PDF
                       </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ArchivingNotificationTool;
