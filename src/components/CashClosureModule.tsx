import React, { useState, useEffect } from 'react';
import { UserProfile, Branch, Sede } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Card, Button, Input, Badge, cn } from './ui';
import { 
  Calculator, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Coins, 
  Banknote,
  Scan,
  Loader2,
  Sparkles,
  MapPin
} from 'lucide-react';
import { analyzeCashReport } from '../services/geminiService';

const DENOMINATIONS = [
  { label: 'RD$ 2,000', value: 2000, type: 'bill' },
  { label: 'RD$ 1,000', value: 1000, type: 'bill' },
  { label: 'RD$ 500', value: 500, type: 'bill' },
  { label: 'RD$ 200', value: 200, type: 'bill' },
  { label: 'RD$ 100', value: 100, type: 'bill' },
  { label: 'RD$ 50', value: 50, type: 'bill' },
  { label: 'RD$ 25', value: 25, type: 'coin' },
  { label: 'RD$ 10', value: 10, type: 'coin' },
  { label: 'RD$ 5', value: 5, type: 'coin' },
  { label: 'RD$ 1', value: 1, type: 'coin' },
];

export default function CashClosureModule({ profile }: { profile: UserProfile }) {
  const [systemTotal, setSystemTotal] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedSede, setSelectedSede] = useState<Sede>(profile.sede || '');

  const isAdmin = profile.role === 'Admin General' || profile.role === 'Admin';

  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'branches'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64 = (evt.target?.result as string).split(',')[1];
        const result = await analyzeCashReport(base64, file.type);
        setSystemTotal(result.totalVentas);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateCount = (value: number, count: number) => {
    setCounts(prev => ({ ...prev, [value]: count }));
  };

  const physicalTotal = Object.entries(counts).reduce((sum, [val, count]) => sum + (parseFloat(val) * count), 0);
  const difference = systemTotal !== null ? physicalTotal - systemTotal : 0;

  return (
    <div className="p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Cierre de Caja (Cuadre)</h1>
            <p className="text-zinc-500">
              {isAdmin ? 'Gestión Administrativa' : `Sucursal: ${profile.sede}`}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2 bg-white p-1 rounded-xl border border-zinc-200">
              {branches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => setSelectedSede(branch.nombre)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    selectedSede === branch.nombre 
                      ? "bg-emerald-600 text-white shadow-md" 
                      : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  {branch.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
        {systemTotal !== null && (
          <div className="flex gap-4">
            <Card className={cn(
              "px-6 py-3 flex flex-col items-end border-none",
              Math.abs(difference) < 1 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            )}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Diferencia</p>
              <p className="text-2xl font-black">RD${difference.toLocaleString()}</p>
            </Card>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Report Section */}
        <Card className="p-8 space-y-8 flex flex-col items-center justify-center text-center border-dashed border-2">
          {systemTotal === null ? (
            <>
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-4">
                <FileText size={40} />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">Reporte de Ventas Externo</h2>
              <p className="text-zinc-500 max-w-xs mx-auto mb-6">Sube el PDF de ventas para que la IA extraiga el total automáticamente.</p>
              <div className="relative w-full max-w-xs">
                <input 
                  type="file" 
                  accept="application/pdf,image/*" 
                  onChange={handleReportUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Scan size={20} />}
                  {loading ? 'Analizando...' : 'Analizar Reporte (IA)'}
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full space-y-6">
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <CheckCircle2 size={24} />
                <h3 className="text-xl font-bold">Reporte Analizado</h3>
              </div>
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total según Sistema</p>
                <p className="text-4xl font-black text-zinc-900">RD${systemTotal.toLocaleString()}</p>
              </div>
              <Button variant="outline" onClick={() => setSystemTotal(null)}>Cambiar Reporte</Button>
            </div>
          )}
        </Card>

        {/* Physical Counter Section */}
        <Card className="p-8 space-y-8">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <Calculator className="text-emerald-600" size={20} />
            <h2 className="font-bold text-zinc-900">Contador Físico</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {DENOMINATIONS.map(den => (
              <div key={den.value} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-100">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  den.type === 'bill' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>
                  {den.type === 'bill' ? <Banknote size={20} /> : <Coins size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-zinc-400">{den.label}</p>
                  <input 
                    type="number"
                    min="0"
                    value={counts[den.value] || ''}
                    onChange={(e) => updateCount(den.value, parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-transparent font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Subtotal</p>
                  <p className="font-black text-zinc-900">RD${((counts[den.value] || 0) * den.value).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Físico</p>
              <p className="text-3xl font-black text-zinc-900">RD${physicalTotal.toLocaleString()}</p>
            </div>
            {systemTotal !== null && Math.abs(difference) < 1 && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full font-bold text-sm">
                <Sparkles size={18} />
                Caja Cuadrada
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
