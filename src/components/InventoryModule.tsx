import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { BlumboxPackage, UserProfile, Branch } from '../types';
import { Card, Button, Input, Badge, cn } from './ui';
import { 
  Package, 
  Search, 
  Scan, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  FileSpreadsheet,
  FileWarning,
  ChevronRight,
  Building2
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function InventoryModule({ profile }: { profile: UserProfile }) {
  const [inventory, setInventory] = useState<BlumboxPackage[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedSede, setSelectedSede] = useState<string>(profile.sede);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = profile.role === 'Admin General';

  useEffect(() => {
    if (isAdmin) {
      const fetchBranches = async () => {
        const snapshot = await getDocs(collection(db, 'branches'));
        const branchList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
        setBranches(branchList);
      };
      fetchBranches();
    }
  }, [isAdmin]);

  useEffect(() => {
    const q = query(
      collection(db, 'inventory'),
      where('sede', '==', selectedSede)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlumboxPackage));
      setInventory(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedSede]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const batch = writeBatch(db);
      const newItems = data
        .filter(row => row.Status === 'Disponible' || row.status === 'Disponible')
        .map(row => ({
          tracking: row.Tracking || row.tracking || 'N/A',
          cliente: row.Cliente || row.cliente || 'N/A',
          status: 'Disponible' as const,
          sede: selectedSede,
          checked: false,
          valor: parseFloat(row.Valor || row.valor) || 0
        }));

      for (const item of newItems) {
        const newDocRef = doc(collection(db, 'inventory'));
        batch.set(newDocRef, item);
      }
      await batch.commit();
      alert(`Importados ${newItems.length} paquetes disponibles.`);
    };
    reader.readAsBinaryString(file);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput) return;

    const pkg = inventory.find(p => p.tracking.toLowerCase() === scanInput.toLowerCase());
    if (pkg) {
      await updateDoc(doc(db, 'inventory', pkg.id), { checked: true });
      setScanInput('');
    } else {
      alert('Tracking no encontrado en el sistema.');
    }
  };

  const clearInventory = async () => {
    if (confirm('¿Vaciar todo el inventario actual?')) {
      const batch = writeBatch(db);
      inventory.forEach(item => {
        batch.delete(doc(db, 'inventory', item.id));
      });
      await batch.commit();
    }
  };

  const missingPackages = inventory.filter(p => !p.checked);
  const totalMissingValue = missingPackages.reduce((sum, p) => sum + (p.valor || 0), 0);

  const filteredInventory = inventory.filter(p => 
    p.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Inventario Blumbox</h1>
            <p className="text-zinc-500">Sucursal: {selectedSede}</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
              <Building2 size={16} className="ml-2 text-zinc-400" />
              <select 
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer pr-8"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.nombre}>{b.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100 text-right">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Faltantes ({missingPackages.length})</p>
            <p className="text-2xl font-black text-red-700">RD${totalMissingValue.toLocaleString()}</p>
          </div>
          <Button onClick={clearInventory} variant="danger" className="h-full">
            <Trash2 size={20} />
            Vaciar Inventario
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Audit Section */}
        <Card className="p-6 space-y-6 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <Scan className="text-emerald-600" size={20} />
            <h2 className="font-bold text-zinc-900">Auditoría Física</h2>
          </div>

          <form onSubmit={handleScan} className="space-y-4">
            <Input 
              label="Escanear Tracking" 
              value={scanInput} 
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Escanea o escribe el tracking..."
              className="font-mono text-lg"
            />
            <Button type="submit" className="w-full">Marcar como Encontrado</Button>
          </form>

          <div className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <FileSpreadsheet size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Importar Maestro</h3>
            </div>
            <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:border-emerald-500 transition-all cursor-pointer relative">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImport}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Package size={32} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">Cargar reporte Blumbox</p>
            </div>
          </div>
        </Card>

        {/* List Section */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por tracking o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Audit</th>
                  <th className="px-6 py-4">Tracking</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredInventory.map(pkg => (
                  <tr key={pkg.id} className={cn("hover:bg-zinc-50 transition-all", pkg.checked ? "bg-emerald-50/30" : "")}>
                    <td className="px-6 py-4">
                      {pkg.checked ? (
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      ) : (
                        <AlertCircle className="text-red-400" size={20} />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-zinc-900">{pkg.tracking}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-zinc-700">{pkg.cliente}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-zinc-900">RD${(pkg.valor || 0).toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredInventory.length === 0 && (
              <div className="p-12 text-center text-zinc-400">
                <Package size={48} className="mx-auto mb-4 opacity-20" />
                <p>Inventario vacío. Importa un reporte para comenzar.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
