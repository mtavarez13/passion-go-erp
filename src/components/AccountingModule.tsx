import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Transaction, UserProfile, Branch, Provider, WhatsAppPackage } from '../types';
import { Card, Button, Input, Select, Badge, cn } from './ui';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Scan, 
  Mail, 
  Search,
  Calendar,
  Sparkles,
  Loader2,
  Receipt,
  Building2,
  Truck,
  Trash2,
  User
} from 'lucide-react';
import { analyzeTransaction, extractInvoiceData, generateEmailSummary } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

export default function AccountingModule({ profile }: { profile: UserProfile }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [packages, setPackages] = useState<WhatsAppPackage[]>([]);
  const [selectedSede, setSelectedSede] = useState<string>(profile.sede);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [newProvider, setNewProvider] = useState({ nombre: '', telefono: '', email: '' });
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [newTx, setNewTx] = useState<{
    tipo: 'Ingreso' | 'Gasto';
    monto: number;
    categoria: string;
    descripcion: string;
    fecha: string;
    estado: 'Pendiente' | 'Pagado';
  }>({
    tipo: 'Gasto',
    monto: 0,
    categoria: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'Pagado'
  });
  const [aiReport, setAiReport] = useState<string | null>(null);

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
      collection(db, 'transactions'),
      where('sede', '==', selectedSede)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedSede]);

  useEffect(() => {
    const q = query(collection(db, 'providers'), where('sede', '==', selectedSede));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProviders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider)));
    });
    return () => unsubscribe();
  }, [selectedSede]);

  useEffect(() => {
    const q = query(collection(db, 'packages'), where('sede', '==', selectedSede));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppPackage)));
    });
    return () => unsubscribe();
  }, [selectedSede]);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.nombre) return;
    await addDoc(collection(db, 'providers'), {
      ...newProvider,
      sede: selectedSede
    });
    setNewProvider({ nombre: '', telefono: '', email: '' });
    setShowProviderForm(false);
  };

  const handleDeleteProvider = async (id: string) => {
    if (confirm('¿Eliminar este proveedor?')) {
      await deleteDoc(doc(db, 'providers', id));
    }
  };

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'transactions'), {
      ...newTx,
      sede: selectedSede,
      createdAt: new Date().toISOString()
    });
    setNewTx({
      tipo: 'Gasto',
      monto: 0,
      categoria: '',
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
      estado: 'Pagado'
    });
  };

  const handleAiCategorize = async () => {
    if (!newTx.descripcion) return;
    setAiLoading(true);
    try {
      const result = await analyzeTransaction(newTx.descripcion);
      setNewTx(prev => ({ ...prev, ...result }));
    } catch (error) {
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleInvoiceScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64 = (evt.target?.result as string).split(',')[1];
        const { facturas } = await extractInvoiceData(base64, file.type);
        
        if (facturas && facturas.length > 0) {
          // If there's only one, we can just set the form
          if (facturas.length === 1) {
            const result = facturas[0];
            setNewTx(prev => ({
              ...prev,
              monto: result.monto,
              descripcion: `Factura ${result.numeroFactura} de ${result.proveedor}`,
              categoria: 'Factura Escaneada',
              facturaData: result
            }));
          } else {
            // If there are multiple, we register them immediately or ask?
            // The user said "debe registrar todo", so let's register them.
            for (const result of facturas) {
              await addDoc(collection(db, 'transactions'), {
                tipo: 'Gasto',
                monto: result.monto,
                categoria: 'Factura Escaneada',
                descripcion: `Factura ${result.numeroFactura} de ${result.proveedor}`,
                fecha: new Date().toISOString().split('T')[0],
                sede: selectedSede,
                estado: 'Pagado',
                createdAt: new Date().toISOString(),
                facturaData: result
              });
            }
            alert(`${facturas.length} facturas registradas automáticamente.`);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert('Error al procesar la factura con IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setAiLoading(true);
    try {
      const report = await generateEmailSummary(transactions.slice(0, 10));
      setAiReport(report);
    } catch (error) {
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleStatus = async (tx: Transaction) => {
    const newStatus = tx.estado === 'Pagado' ? 'Pendiente' : 'Pagado';
    await updateDoc(doc(db, 'transactions', tx.id), {
      estado: newStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const totalIngresos = transactions.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.monto, 0);
  const totalGastos = transactions.filter(t => t.tipo === 'Gasto').reduce((sum, t) => sum + t.monto, 0);
  const balance = totalIngresos - totalGastos;

  const providerSummary = providers.map(provider => {
    const providerPackages = packages.filter(p => p.proveedor === provider.nombre && p.estado === 'Pagado');
    const totalMonto = providerPackages.reduce((sum, p) => sum + p.costo, 0);
    return {
      ...provider,
      totalMonto,
      count: providerPackages.length
    };
  });

  return (
    <div className="p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Contabilidad e IA</h1>
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
          <Card className="px-6 py-3 flex flex-col items-end border-emerald-100 bg-emerald-50">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Balance Neto</p>
            <p className="text-2xl font-black text-emerald-700">RD${balance.toLocaleString()}</p>
          </Card>
          <Button onClick={handleGenerateReport} variant="outline" disabled={aiLoading}>
            <Mail size={18} />
            Generar Reporte IA
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <Card className="p-6 space-y-6 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <Plus className="text-emerald-600" size={20} />
            <h2 className="font-bold text-zinc-900">Nueva Transacción</h2>
          </div>

          <form onSubmit={handleAddTx} className="space-y-4">
            <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg">
              <button 
                type="button"
                onClick={() => setNewTx(prev => ({ ...prev, tipo: 'Ingreso' }))}
                className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-all", newTx.tipo === 'Ingreso' ? "bg-white shadow-sm text-emerald-600" : "text-zinc-500")}
              >
                Ingreso
              </button>
              <button 
                type="button"
                onClick={() => setNewTx(prev => ({ ...prev, tipo: 'Gasto' }))}
                className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-all", newTx.tipo === 'Gasto' ? "bg-white shadow-sm text-red-600" : "text-zinc-500")}
              >
                Gasto
              </button>
            </div>

            <div className="flex gap-2">
              <Input 
                label="Descripción" 
                value={newTx.descripcion} 
                onChange={(e) => setNewTx(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Ej: Pago de luz..."
              />
              <button 
                type="button"
                onClick={handleAiCategorize}
                disabled={aiLoading || !newTx.descripcion}
                className="mt-6 p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all disabled:opacity-50"
                title="Categorizar con IA"
              >
                {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Monto (RD$)" 
                type="number"
                value={newTx.monto} 
                onChange={(e) => setNewTx(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
              />
              <Input 
                label="Categoría" 
                value={newTx.categoria} 
                onChange={(e) => setNewTx(prev => ({ ...prev, categoria: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Fecha" 
                type="date"
                value={newTx.fecha} 
                onChange={(e) => setNewTx(prev => ({ ...prev, fecha: e.target.value }))}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Estado</label>
                <select 
                  value={newTx.estado}
                  onChange={(e) => setNewTx(prev => ({ ...prev, estado: e.target.value as any }))}
                  className="w-full bg-zinc-100 border-none rounded-xl text-sm p-3 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Pagado">Pagado</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  onChange={handleInvoiceScan}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="w-full border-dashed border-2">
                  <Scan size={18} />
                  Escanear Factura (IA)
                </Button>
              </div>
              <Button type="submit" className="w-full">Registrar Transacción</Button>
            </div>
          </form>
        </Card>

        {/* List Section */}
        <div className="lg:col-span-2 space-y-6">
          {aiReport && (
            <Card className="p-6 bg-zinc-900 text-zinc-100 border-none relative">
              <button 
                onClick={() => setAiReport(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Sparkles size={18} />
                <h3 className="font-bold uppercase tracking-widest text-xs">Reporte Generado por IA</h3>
              </div>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{aiReport}</ReactMarkdown>
              </div>
            </Card>
          )}

          <Card className="flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">Historial de Transacciones</h2>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingUp size={14} /> RD${totalIngresos.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown size={14} /> RD${totalGastos.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Descripción / Cat</th>
                    {isAdmin && <th className="px-6 py-4">Sucursal</th>}
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-zinc-50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Calendar size={14} />
                          <span className="text-xs">{tx.fecha}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900">{tx.descripcion}</p>
                        <div className="flex gap-2 items-center mt-1">
                          <Badge variant="default">{tx.categoria}</Badge>
                          {tx.facturaData?.numeroFactura && (
                            <Badge variant="default" className="text-[10px] border border-emerald-200 text-emerald-700 bg-emerald-50">
                              #{tx.facturaData.numeroFactura}
                            </Badge>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-zinc-500">{tx.sede}</span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => toggleStatus(tx)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                            tx.estado === 'Pagado' 
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          )}
                        >
                          {tx.estado || 'Pagado'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={cn(
                          "font-black text-lg",
                          tx.tipo === 'Ingreso' ? "text-emerald-600" : "text-red-600"
                        )}>
                          {tx.tipo === 'Ingreso' ? '+' : '-'} RD${tx.monto.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <div className="p-12 text-center text-zinc-400">
                  <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No hay transacciones registradas.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Providers Summary Section */}
          <Card className="flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="text-emerald-600" size={20} />
                <h2 className="font-bold text-zinc-900">Resumen de Proveedores</h2>
              </div>
              <Button variant="outline" onClick={() => setShowProviderForm(!showProviderForm)}>
                <Plus size={18} />
                {showProviderForm ? 'Cerrar' : 'Nuevo Proveedor'}
              </Button>
            </div>

            {showProviderForm && (
              <div className="p-6 bg-zinc-50 border-b border-zinc-100">
                <form onSubmit={handleAddProvider} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <Input 
                    label="Nombre" 
                    value={newProvider.nombre} 
                    onChange={e => setNewProvider({ ...newProvider, nombre: e.target.value })}
                  />
                  <Input 
                    label="Teléfono" 
                    value={newProvider.telefono} 
                    onChange={e => setNewProvider({ ...newProvider, telefono: e.target.value })}
                  />
                  <Input 
                    label="Email" 
                    value={newProvider.email} 
                    onChange={e => setNewProvider({ ...newProvider, email: e.target.value })}
                  />
                  <Button type="submit">Guardar</Button>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Proveedor</th>
                    <th className="px-6 py-4">Contacto</th>
                    <th className="px-6 py-4">Paquetes Pagados</th>
                    <th className="px-6 py-4 text-right">Monto Obtenido</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {providerSummary.map(ps => (
                    <tr key={ps.id} className="hover:bg-zinc-50 transition-all">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900">{ps.nombre}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500">
                        {ps.telefono && <p>{ps.telefono}</p>}
                        {ps.email && <p>{ps.email}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success">{ps.count} Paquetes</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-zinc-900 text-lg">RD${ps.totalMonto.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteProvider(ps.id)}
                          className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {providerSummary.length === 0 && (
                <div className="p-12 text-center text-zinc-400">
                  <Truck size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No hay proveedores registrados.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const X = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
