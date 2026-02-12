'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lead } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function GoldListPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchGold = async () => {
        const { data } = await supabase.from('leads').select('*').eq('stage', 'Calificado').order('budget_max', { ascending: false });
        if(data) setLeads(data);
    }
    fetchGold();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden">
       <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
           <div className="flex items-center gap-2">
               <span className="material-icons text-warning">star</span>
               <h1 className="text-xl font-bold">Gold List <span className="text-sm font-normal text-slate-500 ml-2">Top 1% Prospects</span></h1>
           </div>
       </header>
       <div className="p-8 overflow-y-auto">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="min-w-full divide-y divide-slate-200">
                   <thead className="bg-slate-50">
                       <tr>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lead</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Budget</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Zona</th>
                           <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acción</th>
                       </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-slate-200">
                       {leads.map(lead => (
                           <tr key={lead.id} className="hover:bg-blue-50/50 transition-colors">
                               <td className="px-6 py-4 whitespace-nowrap">
                                   <div className="flex items-center">
                                       <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">{lead.name.substring(0,2)}</div>
                                       <div className="ml-4">
                                           <div className="text-sm font-medium text-slate-900">{lead.name}</div>
                                           <div className="text-xs text-slate-500">{lead.email}</div>
                                       </div>
                                   </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                   <div className="flex items-center">
                                       <span className="text-sm font-bold text-slate-700 mr-2">94</span>
                                       <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                           <div className="h-full bg-success w-[94%]"></div>
                                       </div>
                                   </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-semibold">
                                   {formatCurrency(lead.budget_max || 0)}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                   <span className="bg-slate-100 px-2 py-1 rounded">{lead.location}</span>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                   <button className="text-primary hover:text-primary-hover font-medium">Sugerir Propiedades</button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
       </div>
    </div>
  );
}
