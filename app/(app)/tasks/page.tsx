'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Task } from '@/types';
import { Button } from '@/components/ui/button';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchTasks = async () => {
        const { data } = await supabase.from('tasks').select('*');
        if(data) setTasks(data);
    }
    fetchTasks();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden">
       <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
           <h1 className="text-xl font-bold">Mis Tareas</h1>
       </header>
       <div className="flex-1 p-8 overflow-y-auto space-y-6">
           <div className="bg-white p-4 rounded-lg shadow-sm flex gap-2">
               <input type="text" placeholder="¿Qué hay que hacer?" className="flex-1 border-none focus:ring-0" />
               <Button>Añadir Tarea</Button>
           </div>
           
           {['Overdue', 'Today', 'Upcoming'].map(section => (
               <div key={section} className="space-y-3">
                   <h3 className={`text-sm font-bold uppercase tracking-wider ${section === 'Overdue' ? 'text-danger' : 'text-slate-500'}`}>{section}</h3>
                   {/* Filter tasks based on dates here */}
                   {tasks.map(task => (
                       <div key={task.id} className="bg-white p-4 rounded-lg border border-slate-200 flex items-center gap-4 hover:shadow-sm">
                           <input type="checkbox" className="rounded text-primary focus:ring-primary" />
                           <div className="flex-1">
                               <p className="font-medium text-slate-900">{task.title}</p>
                               <p className="text-xs text-slate-500">Linked to: {task.related_type} #{task.related_id?.substring(0,4)}</p>
                           </div>
                           <span className="text-xs text-slate-400">{task.due_date}</span>
                       </div>
                   ))}
               </div>
           ))}
       </div>
    </div>
  );
}
