'use client';

export default function ChatPage() {
  return (
    <div className="flex h-full bg-white">
        <aside className="w-80 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
                <input type="text" placeholder="Buscar lead..." className="w-full bg-slate-50 border-none rounded-lg text-sm" />
            </div>
            <div className="flex-1 overflow-y-auto">
                {/* List of leads */}
                <div className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer border-l-4 border-l-primary bg-primary/5">
                    <div className="flex justify-between">
                        <span className="font-bold text-sm">Juan Perez</span>
                        <span className="text-xs text-slate-400">10:42 AM</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">Interesado en el loft de Palermo...</p>
                </div>
            </div>
        </aside>
        <main className="flex-1 flex flex-col bg-[#e5ddd5]">
            <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between">
                <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                     <div>
                         <h2 className="font-bold text-slate-800">Juan Perez</h2>
                         <span className="text-xs text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>
                     </div>
                </div>
            </header>
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {/* Chat Bubble */}
                <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-md">
                        <p className="text-sm">Hola, me interesa la propiedad en Palermo.</p>
                        <span className="text-[10px] text-slate-400 block text-right mt-1">10:42 AM</span>
                    </div>
                </div>
                 <div className="flex justify-end">
                    <div className="bg-[#d9fdd3] p-3 rounded-lg rounded-tr-none shadow-sm max-w-md">
                        <p className="text-sm">¡Hola Juan! Claro, es una excelente opción. ¿Buscas para inversión o vivienda?</p>
                        <span className="text-[10px] text-slate-500 block text-right mt-1">10:45 AM</span>
                    </div>
                </div>
                
                {/* Note/Event in stream */}
                <div className="flex justify-center my-4">
                     <div className="bg-yellow-50 text-yellow-800 text-xs px-3 py-1 rounded border border-yellow-200 flex items-center gap-2">
                         <span className="material-icons text-sm">lock</span> Nota Interna: Cliente motivado, presupuesto $180k
                     </div>
                </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2 mb-2">
                     <button className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full text-slate-600">Nota Interna</button>
                     <button className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full text-slate-600">Crear Tarea</button>
                     <button className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full text-slate-600">Agendar Visita</button>
                </div>
                <div className="flex gap-2">
                    <input type="text" className="flex-1 border-slate-200 rounded-lg focus:ring-primary focus:border-primary" placeholder="Escribe un mensaje..." />
                    <button className="bg-primary text-white p-2 rounded-lg"><span className="material-icons">send</span></button>
                </div>
            </div>
        </main>
        <aside className="w-72 bg-white border-l border-slate-200 p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Info Contacto</h3>
            <div className="space-y-4">
                 <div>
                     <label className="text-xs text-slate-500 block">Email</label>
                     <p className="text-sm font-medium">juan.perez@gmail.com</p>
                 </div>
                 <div>
                     <label className="text-xs text-slate-500 block">Teléfono</label>
                     <p className="text-sm font-medium">+54 9 11 5555 1234</p>
                 </div>
                 <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Propiedades Sugeridas</h4>
                      <div className="border border-slate-200 rounded-lg p-2 mb-2">
                          <div className="h-20 bg-slate-200 rounded mb-2"></div>
                          <p className="text-xs font-bold">Loft Gorriti</p>
                          <button className="text-xs text-primary w-full mt-1 text-center">Enviar</button>
                      </div>
                 </div>
            </div>
        </aside>
    </div>
  );
}
