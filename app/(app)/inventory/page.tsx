'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Property } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function InventoryPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchProps = async () => {
      const { data } = await supabase.from('properties').select('*');
      if (data) setProperties(data);
    };
    fetchProps();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-20">
         <h1 className="text-2xl font-bold text-gray-900">Propiedades</h1>
         <Button>+ Nueva Propiedad</Button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-background-light">
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {properties.map(prop => (
                <div key={prop.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="h-48 bg-slate-200 relative">
                        {/* Placeholder image logic */}
                        <div className="absolute top-3 left-3 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">{prop.status}</div>
                    </div>
                    <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                             <div>
                                 <h3 className="text-lg font-bold text-gray-900">{formatCurrency(prop.price_sale || prop.price_rent || 0)}</h3>
                                 <p className="text-sm text-gray-500">{prop.address}</p>
                             </div>
                             <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded font-medium border border-blue-100 uppercase">{prop.operation}</span>
                        </div>
                         <div className="flex items-center gap-4 py-3 border-t border-b border-gray-100 my-3 text-sm text-gray-600">
                             <span className="flex items-center gap-1"><span className="material-icons text-sm">bed</span> {prop.bedrooms}</span>
                             <span className="flex items-center gap-1"><span className="material-icons text-sm">bathtub</span> {prop.bathrooms}</span>
                             <span className="flex items-center gap-1"><span className="material-icons text-sm">square_foot</span> {prop.area_sqm}m²</span>
                         </div>
                         <Button variant="outline" className="w-full text-xs h-8">Ver Detalles</Button>
                         <button className="w-full mt-2 text-xs text-green-600 hover:underline flex items-center justify-center gap-1">
                            <span className="material-icons text-xs">share</span> Compartir WhatsApp
                         </button>
                    </div>
                </div>
            ))}
         </div>
      </main>
    </div>
  );
}
