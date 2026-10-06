import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { WhatsAppPackage, UserProfile, Sede, Branch, Provider } from '../types';
import { Card, Button, Input, Select, Badge, cn } from './ui';
import { 
  Upload, 
  Send, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Trash2, 
  Search,
  FileSpreadsheet,
  Type,
  ExternalLink,
  Package,
  Filter,
  BarChart3,
  Truck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { sendSequentialMessages, generateWhatsAppMessage, getWhatsAppLink } from '../services/whatsappService';

export default function WhatsAppModule({ profile }: { profile: UserProfile }) {
  const [packages, setPackages] = useState<WhatsAppPackage[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedSede, setSelectedSede] = useState<string>(profile.role === 'Admin General' ? 'Todas' : profile.sede);
  const [loading, setLoading] = useState(true);
  const [importText, setImportText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [importMode, setImportMode] = useState<'text' | 'excel'>('text');
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WhatsAppPackage['estado'] | 'Todos'>('Todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch branches first
    const bQuery = query(collection(db, 'branches'));
    const unsubscribeBranches = onSnapshot(bQuery, (snapshot) => {
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
    });

    // Fetch packages based on role and sede
    let q = query(collection(db, 'packages'));
    if (profile.role !== 'Admin General' || selectedSede !== 'Todas') {
      q = query(collection(db, 'packages'), where('sede', '==', selectedSede));
    }
    
    const unsubscribePackages = onSnapshot(q, (snapshot) => {
      const pkgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppPackage));
      setPackages(pkgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return () => {
      unsubscribeBranches();
      unsubscribePackages();
      };
    }, [selectedSede, profile.role]);

  useEffect(() => {
    const q = query(collection(db, 'providers'), where('sede', '==', selectedSede));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProviders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider)));
    });
    return () => unsubscribe();
  }, [selectedSede]);

  const findBranchByZone = (zona: string): string => {
    const branch = branches.find(b => b.zonas?.some(z => z.toLowerCase() === zona.toLowerCase()));
    return branch ? branch.nombre : 'Sin Asignar';
  };

  const handleTextImport = async () => {
    const lines = importText.split('\n').filter(l => l.trim());
    const newPkgs = lines.map(line => {
      const [cod, tienda, zona, nota, cliente, telefono, costo, articulo] = line.split('\t');
      // Use cod as cost if costo is missing or if cod is a valid number
      const parsedCosto = parseFloat(costo) || parseFloat(cod) || 0;
      const assignedSede = findBranchByZone(zona || '');
      
      return {
        cod: cod || 'N/A',
        tienda: tienda || 'N/A',
        zona: zona || 'N/A',
        nota: nota || '',
        cliente: cliente || 'N/A',
        telefono: telefono || '',
        costo: parsedCosto,
        articulo: articulo || 'Paquete',
        sede: assignedSede,
        proveedor: selectedProvider || 'N/A',
        estado: 'Abierto' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    for (const pkg of newPkgs) {
      await addDoc(collection(db, 'packages'), pkg);
    }
    setImportText('');
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const newPkgs = data.map(row => {
        const codVal = row.COD || row.cod || 'N/A';
        const parsedCosto = parseFloat(row.Costo || row.costo) || parseFloat(codVal) || 0;
        const zonaVal = row.Zona || row.zona || '';
        const assignedSede = findBranchByZone(zonaVal);

        return {
          cod: codVal,
          tienda: row.Tienda || row.tienda || 'N/A',
          zona: zonaVal || 'N/A',
          nota: row.Nota || row.nota || '',
          cliente: row.Cliente || row.cliente || 'N/A',
          telefono: String(row.Teléfono || row.telefono || ''),
          costo: parsedCosto,
          articulo: row.Artículo || row.articulo || 'Paquete',
          sede: assignedSede,
          proveedor: selectedProvider || 'N/A',
          estado: 'Abierto' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      for (const pkg of newPkgs) {
        await addDoc(collection(db, 'packages'), pkg);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleStatusChange = async (id: string, newStatus: WhatsAppPackage['estado']) => {
    await updateDoc(doc(db, 'packages', id), {
      estado: newStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este paquete?')) {
      await deleteDoc(doc(db, 'packages', id));
    }
  };

  const startMassSend = async () => {
    const selectedPkgs = packages.filter(p => selectedIds.has(p.id));
    if (selectedPkgs.length === 0) return alert('Por favor selecciona al menos un paquete para enviar.');
    
    setSending(true);
    setSendProgress(0);
    try {
      await sendSequentialMessages(selectedPkgs, branches, (progress) => {
        setSendProgress(progress);
      });
      alert('Envío masivo completado.');
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const filteredPackages = packages.filter(p => {
    const matchesSearch = p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tienda.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || p.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPackages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPackages.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const totalARecibir = packages
    .filter(p => p.estado === 'Entregado')
    .reduce((sum, p) => sum + p.costo, 0);

  return (
    <div className="p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Gestión de WhatsApp</h1>
            <p className="text-zinc-500">Sucursal: {selectedSede}</p>
          </div>
          {profile.role === 'Admin General' && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
              <Truck size={16} className="ml-2 text-zinc-400" />
              <select 
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer pr-8"
              >
                <option value="Todas">Todas las Sucursales</option>
                {branches.map(b => (
                  <option key={b.id} value={b.nombre}>{b.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 text-right">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total a Recibir</p>
            <p className="text-2xl font-black text-emerald-700">RD${totalARecibir.toLocaleString()}</p>
          </div>
          <Button onClick={startMassSend} disabled={sending || selectedIds.size === 0} className="h-full px-8">
            <Send size={20} />
            {sending ? `Enviando (${sendProgress}/${selectedIds.size})` : `Enviar Seleccionados (${selectedIds.size})`}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Import Section */}
        <Card className="p-6 space-y-6 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <Upload className="text-emerald-600" size={20} />
            <h2 className="font-bold text-zinc-900">Importar Paquetes</h2>
          </div>
          
          <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg">
            <button 
              onClick={() => setImportMode('text')}
              className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-all", importMode === 'text' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500")}
            >
              <Type size={16} className="inline mr-2" /> Texto
            </button>
            <button 
              onClick={() => setImportMode('excel')}
              className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-all", importMode === 'excel' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500")}
            >
              <FileSpreadsheet size={16} className="inline mr-2" /> Excel
            </button>
          </div>

          <div className="space-y-4">
            <Select 
              label="Proveedor (Opcional)"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              options={[
                { label: 'Seleccionar Proveedor', value: '' },
                ...providers.map(p => ({ label: p.nombre, value: p.nombre }))
              ]}
            />
            
            {importMode === 'text' ? (
              <div className="space-y-4">
              <textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Pega aquí: COD	Tienda	Zona	Nota	Cliente	Teléfono	Costo	Artículo"
                className="w-full h-48 p-3 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              <Button onClick={handleTextImport} className="w-full" disabled={!importText.trim()}>
                Procesar Texto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:border-emerald-500 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleExcelImport}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileSpreadsheet size={32} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">Haz clic o arrastra tu archivo Excel</p>
              </div>
            </div>
          )}
        </div>
      </Card>

        {/* List Section */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por cliente, COD o tienda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {(['Todos', 'Abierto', 'Entregado', 'Pagado'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setSelectedIds(new Set());
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                    statusFilter === status 
                      ? "bg-emerald-600 text-white border-emerald-600" 
                      : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={filteredPackages.length > 0 && selectedIds.size === filteredPackages.length}
                      onChange={toggleSelectAll}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Cliente / Tel</th>
                  <th className="px-6 py-4">Tienda / Art / Prov</th>
                  <th className="px-6 py-4">Costo</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredPackages.map(pkg => (
                  <tr key={pkg.id} className={cn("hover:bg-zinc-50 transition-all group", selectedIds.has(pkg.id) && "bg-emerald-50/30")}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(pkg.id)}
                        onChange={() => toggleSelect(pkg.id)}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={pkg.estado}
                        onChange={(e) => handleStatusChange(pkg.id, e.target.value as any)}
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border-none outline-none cursor-pointer",
                          pkg.estado === 'Abierto' ? "bg-amber-100 text-amber-700" :
                          pkg.estado === 'Entregado' ? "bg-emerald-100 text-emerald-700" :
                          "bg-zinc-100 text-zinc-700"
                        )}
                      >
                        <option value="Abierto">Abierto</option>
                        <option value="Entregado">Entregado</option>
                        <option value="Pagado">Pagado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900">{pkg.cliente}</p>
                      <p className="text-xs text-zinc-500">{pkg.telefono}</p>
                      {profile.role === 'Admin' && (
                        <Badge variant="secondary" className="mt-1 text-[8px] uppercase">
                          {pkg.sede}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-zinc-700 font-medium">{pkg.tienda}</p>
                      <p className="text-xs text-zinc-400">{pkg.articulo}</p>
                      {pkg.proveedor && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-bold">
                          <Truck size={10} />
                          {pkg.proveedor}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-zinc-900">RD${pkg.costo.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a 
                          href={getWhatsAppLink(pkg.telefono, generateWhatsAppMessage(pkg, branches.find(b => b.nombre === pkg.sede) || {
                            id: '', nombre: pkg.sede, direccion: '', repartidorNombre: '', repartidorTelefono: '', zonas: []
                          }))}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Enviar WhatsApp Individual"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button 
                          onClick={() => handleDelete(pkg.id)}
                          className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPackages.length === 0 && (
              <div className="p-12 text-center text-zinc-400">
                <Package size={48} className="mx-auto mb-4 opacity-20" />
                <p>No se encontraron paquetes.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
