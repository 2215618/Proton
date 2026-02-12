'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lead } from '@/types';
import { Button } from '@/components/ui/button';

const STAGES = ['Nuevo', 'Contactado', 'Calificado', 'Visita', 'Oferta', 'Cierre', 'Perdido'];

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const supabase = createClient();

  const fetchLeads = async () => {
    const { data } = await supabase.from('leads').select('*');
    if (data) setLeads(data);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    const leadId = e.dataTransfer.getData('leadId');
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: stage as any } : l));
    
    // DB Update
    await supabase.from('leads').update({ stage }).eq('id', leadId);
    
    if (stage === 'Visita') {
       alert('¡Lead movido a Visita! (Modal de agendar visita abriría aquí)');
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
         <div className="flex items-center gap-4">
             <div className="bg-primary/10 p-2 rounded-lg text-primary"><span className="material-icons">view_kanban</span></div>
             <h1 className="text-xl font-bold text-slate-900">Pipeline de Leads</h1>
         </div>
         <Button onClick={() => alert('Modal Nuevo Lead')}>+ Nuevo Lead</Button>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-background-light">
        <div className="flex h-full gap-5 min-w-max">
            {STAGES.map(stage => (
                <div 
                    key={stage} 
                    className="w-80 flex flex-col h-full bg-slate-100/50 rounded-xl px-2 py-2"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage)}
                >
                    <div className="flex items-center justify-between mb-3 px-2 pt-1">
                        <h2 className="font-semibold text-slate-700">{stage}</h2>
                        <span className="bg-slate-200 text-xs font-bold px-2 py-0.5 rounded-full text-slate-600">
                            {leads.filter(l => l.stage === stage).length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 px-1">
                        {leads.filter(l => l.stage === stage).map(lead => (
                            <div 
                                key={lead.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, lead.id)}
                                className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md cursor-grab active:cursor-grabbing group border-l-4 border-l-primary"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-sm text-slate-800">{lead.name}</h3>
                                    <button className="text-green-500 hover:bg-green-50 p-1 rounded-full"><span className="material-icons text-sm">chat</span></button>
                                </div>
                                <div className="text-xs text-slate-500 space-y-1">
                                    <div className="flex items-center gap-1"><span className="material-icons text-[14px]">payments</span> ${lead.budget_min} - ${lead.budget_max}</div>
                                    <div className="flex items-center gap-1"><span className="material-icons text-[14px]">location_on</span> {lead.location}</div>
                                </div>
                                {/* Rotting logic example */}
                                {lead.last_contacted_at && new Date(lead.last_contacted_at) < new Date(Date.now() - 48*60*60*1000) && (
                                     <div className="mt-2 text-[10px] text-red-500 font-bold bg-red-50 inline-block px-1 rounded border border-red-100 rotting-pulse">
                                         +48h Inactivo
                                     </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}