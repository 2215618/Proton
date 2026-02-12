'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Visit } from '@/types';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchVisits = async () => {
        // Mock join in real app
        const { data } = await supabase.from('visits').select('*');
        if(data) setVisits(data);
    }
    fetchVisits();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
            <h1 className="text-xl font-bold">Agenda de Visitas</h1>
            <Button>+ Agendar Visita</Button>
        </header>
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-white p-6 overflow-y-auto">
                <div className="grid grid-cols-5 divide-x divide-slate-200 border border-slate-200 rounded-lg h-[600px]">
                    {['Lun', 'Mar', 'Mie', 'Jue', 'Vie'].map((day, i) => (
                        <div key={day} className="relative">
                            <div className="text-center py-2 bg-slate-50 border-b border-slate-200 font-bold text-slate-600">{day}</div>
                            <div className="p-2 space-y-2">
                                {/* Mock placement of visits */}
                                {visits.map((v) => (
                                    <div key={v.id} className="bg-primary/10 border-l-4 border-primary p-2 text-xs rounded cursor-pointer hover:shadow-md">
                                        <div className="font-bold text-primary">{new Date(v.scheduled_for).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        <div className="truncate">Lead ID: {v.lead_id.substring(0,4)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-80 bg-white border-l border-slate-200 p-4">
                 <h2 className="font-bold mb-4">Próximas</h2>
                 {/* List view items */}
            </div>
        </div>
    </div>
  );
}
