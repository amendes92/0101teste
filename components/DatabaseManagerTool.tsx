import React, { useState, useEffect } from 'react';
import { MasterPromotor, MasterCargo, MasterAnalista } from '../types';
import { Database, UserCog, Briefcase, Plus, Pencil, Trash2, X, Loader2, AlertCircle, Users } from 'lucide-react';

type ActiveTable = 'promotors' | 'cargos' | 'analistas';

const INITIAL_PROMOTORS: MasterPromotor[] = [
    { id: 71, nome: 'Leonardo D\'Angelo Vargas Pereira', sexo: 'M', start: 1, end: 31 },
    { id: 78, nome: 'Claudio Henrique Bastos Giannini', sexo: 'M', start: 1, end: 31 },
    { id: 79, nome: 'Margareth Ferraz França', sexo: 'F', start: 1, end: 31 },
    { id: 80, nome: 'Tais Servilha Ferrari', sexo: 'F', start: 1, end: 31 }
];

const DatabaseManagerTool: React.FC = () => {
  const [activeTable, setActiveTable] = useState<ActiveTable>('promotors');
  const [loading, setLoading] = useState(false);
  const [promotors, setPromotors] = useState<MasterPromotor[]>(INITIAL_PROMOTORS);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  }, [activeTable]);

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <div className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-4 shadow-xl z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-600 rounded-lg text-white"><Database size={24} /></div>
          <div><h2 className="font-bold uppercase tracking-tight text-sm text-white">Gerenciador</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base de Dados</p></div>
        </div>

        <nav className="space-y-1">
          {['promotors', 'cargos', 'analistas'].map((table) => (
            <button
              key={table}
              onClick={() => setActiveTable(table as ActiveTable)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTable === table ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-900/50' : 'text-slate-500 hover:bg-slate-800'}`}
            >
              {table === 'promotors' ? <UserCog size={16}/> : table === 'cargos' ? <Briefcase size={16}/> : <Users size={16}/>}
              {table.replace('s', '')}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center bg-slate-950">
        <div className="w-full max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">{activeTable}</h1>
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"><Plus size={14} className="inline mr-1"/> Adicionar</button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
                ) : (
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-950 text-slate-500 font-bold uppercase tracking-widest border-b border-slate-800">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Nome / Descrição</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTable === 'promotors' && promotors.map(p => (
                                <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all group">
                                    <td className="px-6 py-4 text-slate-500 font-mono">{p.id}</td>
                                    <td className="px-6 py-4 text-slate-200 font-bold uppercase">{p.nome}</td>
                                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-all">
                                        <button className="p-2 text-slate-500 hover:text-indigo-400"><Pencil size={14}/></button>
                                        <button className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={14}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagerTool;