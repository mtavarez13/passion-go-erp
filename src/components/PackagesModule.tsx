import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { WhatsAppPackage, UserProfile, Sede, Transaction, Branch, Franchise, DeliveryDriver, CarrierIntegration } from '../types';
import { Card, Button, Input, Badge, cn } from './ui';
import { 
  Package, 
  Receipt, 
  Calendar, 
  DollarSign, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Printer,
  BarChart3,
  Download,
  Truck,
  Store,
  Camera,
  ShieldCheck,
  X,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';

const escapeLabelHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export default function PackagesModule({ 
  profile,
  initialFranchiseId
}: { 
  profile: UserProfile;
  initialFranchiseId?: string;
}) {
  const [packages, setPackages] = useState<WhatsAppPackage[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [carriers, setCarriers] = useState<CarrierIntegration[]>([]);
  
  const [selectedSede, setSelectedSede] = useState<string>(profile.role === 'Admin General' ? 'Todas' : profile.sede);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WhatsAppPackage['estado'] | 'Todos'>('Todos');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [franchiseFilter, setFranchiseFilter] = useState<string>(initialFranchiseId || 'all');
  
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [showCuadre, setShowCuadre] = useState(false);

  // Assignment Modal
  const [assigningPkg, setAssigningPkg] = useState<WhatsAppPackage | null>(null);
  const [selectedDriverToAssign, setSelectedDriverToAssign] = useState<string>('');
  const [selectedFranchiseToAssign, setSelectedFranchiseToAssign] = useState<string>('');

  // Proof of Delivery View Modal
  const [viewingPodPkg, setViewingPodPkg] = useState<WhatsAppPackage | null>(null);

  useEffect(() => {
    // Fetch branches
    const bQuery = query(collection(db, 'branches'));
    const unsubscribeBranches = onSnapshot(bQuery, (snapshot) => {
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
    });

    // Fetch franchises
    const fQuery = query(collection(db, 'franchises'));
    const unsubscribeFranchises = onSnapshot(fQuery, (snapshot) => {
      setFranchises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Franchise)));
    });

    // Fetch drivers
    const dQuery = query(collection(db, 'delivery_drivers'));
    const unsubscribeDrivers = onSnapshot(dQuery, (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryDriver)));
    });

    // Company branding used on printable shipping labels.
    const unsubscribeCarriers = onSnapshot(collection(db, 'carrier_integrations'), (snapshot) => {
      setCarriers(snapshot.docs.map(carrierDoc => ({ id: carrierDoc.id, ...carrierDoc.data() } as CarrierIntegration)));
    });

    // Fetch packages
    let q = query(collection(db, 'packages'));
    if (profile.role !== 'Admin General' || selectedSede !== 'Todas') {
      q = query(collection(db, 'packages'), where('sede', '==', selectedSede));
    }
    
    const unsubscribePackages = onSnapshot(q, (snapshot) => {
      const pkgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppPackage));
      setPackages(pkgs.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()));
      setLoading(false);
    });

    return () => {
      unsubscribeBranches();
      unsubscribeFranchises();
      unsubscribeDrivers();
      unsubscribeCarriers();
      unsubscribePackages();
    };
  }, [selectedSede, profile.role]);

  const handleFacturar = async (pkg: WhatsAppPackage) => {
    if (pkg.estado === 'Pagado') return;
    
    try {
      await updateDoc(doc(db, 'packages', pkg.id), {
        estado: 'Pagado',
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'transactions'), {
        tipo: 'Ingreso',
        monto: pkg.costo,
        categoria: 'Facturación Paquete',
        descripcion: `Pago paquete ${pkg.cod} - ${pkg.cliente}`,
        fecha: new Date().toISOString().split('T')[0],
        sede: pkg.sede,
        createdAt: new Date().toISOString()
      });

      alert(`Paquete ${pkg.cod} facturado con éxito.`);
    } catch (error) {
      console.error('Error al facturar:', error);
      alert('Error al procesar la facturación.');
    }
  };

  const openAssignModal = (pkg: WhatsAppPackage) => {
    setAssigningPkg(pkg);
    setSelectedDriverToAssign(pkg.assignedDriverId || '');
    setSelectedFranchiseToAssign(pkg.assignedFranchiseId || '');
  };

  const handleSaveAssignment = async () => {
    if (!assigningPkg) return;

    try {
      const now = new Date().toISOString();
      const driver = drivers.find(d => d.id === selectedDriverToAssign);
      const franchise = franchises.find(f => f.id === selectedFranchiseToAssign);

      await updateDoc(doc(db, 'packages', assigningPkg.id), {
        assignedDriverId: driver ? driver.id : '',
        assignedDriverName: driver ? driver.name : '',
        assignedDriverPhone: driver ? driver.phone : '',
        assignedFranchiseId: franchise ? franchise.id : '',
        assignedFranchiseName: franchise ? franchise.name : '',
        deliveryStatus: driver ? 'assigned' : franchise ? 'ready_for_pickup' : 'unassigned',
        updatedAt: now
      });

      alert('Asignación guardada con éxito.');
      setAssigningPkg(null);
    } catch (err) {
      console.error('Error updating package assignment:', err);
      alert('Error al asignar el paquete.');
    }
  };

  const handlePrintLabel = (pkg: WhatsAppPackage) => {
    const normalizedCompany = pkg.tienda.trim().toLowerCase();
    const carrier = carriers.find(item => {
      const name = item.name.trim().toLowerCase();
      return name === normalizedCompany || name.includes(normalizedCompany) || normalizedCompany.includes(name);
    });
    const logoUrl = carrier?.logoUrl && (/^data:image\//i.test(carrier.logoUrl) || /^https:\/\//i.test(carrier.logoUrl))
      ? escapeLabelHtml(carrier.logoUrl)
      : '';
    const printWindow = window.open('', '_blank', 'width=760,height=900');
    if (!printWindow) {
      alert('Permite las ventanas emergentes para imprimir la etiqueta.');
      return;
    }

    printWindow.document.write(`<!doctype html>
      <html lang="es"><head><meta charset="utf-8"><title>Etiqueta ${escapeLabelHtml(pkg.cod)}</title>
      <style>
        @page { size: 4in 6in; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; }
        .label { width: 4in; min-height: 6in; padding: 18px; border: 2px solid #111827; display: flex; flex-direction: column; }
        .brand { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 3px solid #111827; }
        .logo { width: 62px; height: 62px; object-fit: contain; border: 1px solid #d1d5db; border-radius: 10px; padding: 4px; }
        .fallback { width: 62px; height: 62px; border-radius: 10px; display: grid; place-items: center; background: #3b0764; color: #fbbf24; font-weight: 900; font-size: 17px; }
        .company { font-size: 21px; font-weight: 900; line-height: 1.08; }
        .eyebrow { color: #6b7280; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 4px; }
        .tracking { text-align: center; padding: 18px 8px; border-bottom: 1px dashed #9ca3af; }
        .tracking strong { display: block; font-size: 27px; letter-spacing: .06em; overflow-wrap: anywhere; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; padding: 17px 0; }
        .field.wide { grid-column: 1 / -1; }
        .value { font-size: 14px; font-weight: 800; line-height: 1.3; overflow-wrap: anywhere; }
        .amount { margin-top: 3px; padding: 12px; border: 2px solid #111827; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; }
        .amount strong { font-size: 20px; }
        .footer { margin-top: auto; padding-top: 14px; border-top: 2px solid #111827; text-align: center; }
        .footer strong { display: block; font-size: 12px; letter-spacing: .08em; }
        .footer span { display: block; margin-top: 4px; font-size: 14px; font-weight: 900; }
        @media print { body { width: 4in; height: 6in; } .label { border: 0; } }
      </style></head><body><main class="label">
        <header class="brand">
          ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo">` : `<div class="fallback">${escapeLabelHtml((carrier?.slug || pkg.tienda || 'EMP').slice(0, 3).toUpperCase())}</div>`}
          <div><div class="eyebrow">Empresa remitente</div><div class="company">${escapeLabelHtml(carrier?.name || pkg.tienda)}</div></div>
        </header>
        <section class="tracking"><div class="eyebrow">Número de guía</div><strong>${escapeLabelHtml(pkg.cod)}</strong></section>
        <section class="grid">
          <div class="field wide"><div class="eyebrow">Destinatario</div><div class="value">${escapeLabelHtml(pkg.cliente)}</div></div>
          <div class="field"><div class="eyebrow">Teléfono</div><div class="value">${escapeLabelHtml(pkg.telefono)}</div></div>
          <div class="field"><div class="eyebrow">Destino / sede</div><div class="value">${escapeLabelHtml(pkg.zona || pkg.sede)}</div></div>
          <div class="field wide"><div class="eyebrow">Contenido</div><div class="value">${escapeLabelHtml(pkg.articulo || 'Paquete')}</div></div>
          ${pkg.nota ? `<div class="field wide"><div class="eyebrow">Instrucciones</div><div class="value">${escapeLabelHtml(pkg.nota)}</div></div>` : ''}
        </section>
        <div class="amount"><span class="eyebrow">Cobro contra entrega</span><strong>RD$${Number(pkg.costo || 0).toLocaleString('es-DO')}</strong></div>
        <footer class="footer"><strong>PASSION GO · ERP LOGÍSTICO</strong><span>go.hispaniolapay.com</span></footer>
      </main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), logoUrl ? 700 : 150);
  };

  const filteredPackages = packages.filter(p => {
    const matchesSearch = p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tienda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.assignedDriverName && p.assignedDriverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.assignedFranchiseName && p.assignedFranchiseName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'Todos' || p.estado === statusFilter;
    const matchesDriver = driverFilter === 'all' || p.assignedDriverId === driverFilter;
    const matchesFranchise = franchiseFilter === 'all' || p.assignedFranchiseId === franchiseFilter;

    return matchesSearch && matchesStatus && matchesDriver && matchesFranchise;
  });

  const cuadrePackages = packages.filter(p => {
    if (p.estado !== 'Pagado') return false;
    const date = parseISO(p.updatedAt || p.createdAt);
    return isWithinInterval(date, {
      start: startOfDay(parseISO(dateRange.start)),
      end: endOfDay(parseISO(dateRange.end))
    });
  });

  const totalCuadre = cuadrePackages.reduce((sum, p) => sum + p.costo, 0);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Control & Facturación de Paquetes</h1>
            <p className="text-zinc-500 text-sm">Sucursal: <strong>{selectedSede}</strong></p>
          </div>
          {profile.role === 'Admin General' && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200 shadow-xs">
              <Package size={16} className="ml-2 text-zinc-400" />
              <select 
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                className="bg-transparent border-none text-xs sm:text-sm font-bold focus:ring-0 cursor-pointer pr-8 text-zinc-800"
              >
                <option value="Todas">Todas las Sucursales</option>
                {branches.map(b => (
                  <option key={b.id} value={b.nombre}>{b.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button 
            variant={showCuadre ? "primary" : "outline"} 
            onClick={() => setShowCuadre(!showCuadre)}
            className="px-5 text-xs sm:text-sm font-semibold"
          >
            <BarChart3 size={18} />
            {showCuadre ? 'Ver Listado' : 'Generar Cuadre'}
          </Button>
        </div>
      </header>

      {showCuadre ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row items-end gap-4 mb-8">
              <div className="flex-1 w-full">
                <Input 
                  label="Desde" 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div className="flex-1 w-full">
                <Input 
                  label="Hasta" 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
              <div className="bg-emerald-50 px-8 py-3 rounded-2xl border border-emerald-100 text-right min-w-[200px] w-full md:w-auto">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Cuadre</p>
                <p className="text-2xl font-black text-emerald-700">RD${totalCuadre.toLocaleString()}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Fecha Pago</th>
                    <th className="px-6 py-4">COD / Cliente</th>
                    <th className="px-6 py-4">Tienda / Art</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cuadrePackages.map(pkg => (
                    <tr key={pkg.id} className="hover:bg-zinc-50 transition-all">
                      <td className="px-6 py-4 text-xs text-zinc-500">
                        {format(parseISO(pkg.updatedAt || pkg.createdAt), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900">{pkg.cliente}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-zinc-500">COD: {pkg.cod}</p>
                          <span className="text-[10px] bg-zinc-100 px-1.5 rounded text-zinc-500 font-medium">{pkg.zona}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-700">{pkg.tienda}</p>
                        <p className="text-xs text-zinc-400">{pkg.articulo}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-zinc-900">RD${pkg.costo.toLocaleString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cuadrePackages.length === 0 && (
                <div className="p-12 text-center text-zinc-400">
                  <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No hay paquetes facturados en este rango.</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-end">
              <Button variant="outline" onClick={() => window.print()} className="print:hidden">
                <Printer size={18} />
                Imprimir Cuadre
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-col">
            {/* Filter Bar */}
            <div className="p-6 border-b border-zinc-100 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar por cliente, COD, tienda, repartidor o franquicia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  {(['Todos', 'Abierto', 'Entregado', 'Pagado'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap",
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

              {/* Secondary Filters: Driver & Franchise */}
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-zinc-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <Truck size={14} className="text-zinc-400" />
                  <span className="text-zinc-500 font-medium">Repartidor:</span>
                  <select
                    value={driverFilter}
                    onChange={(e) => setDriverFilter(e.target.value)}
                    className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-800 font-medium focus:outline-none"
                  >
                    <option value="all">Todos los Repartidores</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.assignedSede})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Store size={14} className="text-zinc-400" />
                  <span className="text-zinc-500 font-medium">Franquicia / Punto:</span>
                  <select
                    value={franchiseFilter}
                    onChange={(e) => setFranchiseFilter(e.target.value)}
                    className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-800 font-medium focus:outline-none"
                  >
                    <option value="all">Todas las Franquicias</option>
                    {franchises.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Status & Despacho</th>
                    <th className="px-6 py-4">Cliente / COD</th>
                    <th className="px-6 py-4">Tienda / Art</th>
                    <th className="px-6 py-4">Repartidor / Franquicia</th>
                    <th className="px-6 py-4">Costo</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredPackages.map(pkg => {
                    const isDelivered = pkg.estado === 'Entregado';
                    const hasPod = !!(pkg.deliveryProofPhoto || pkg.signaturePhoto || pkg.recipientReceivedName);

                    return (
                      <tr key={pkg.id} className="hover:bg-zinc-50 transition-all text-xs">
                        <td className="px-6 py-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={
                              pkg.estado === 'Abierto' ? 'warning' :
                              pkg.estado === 'Entregado' ? 'success' :
                              'default'
                            }>
                              {pkg.estado}
                            </Badge>

                            {pkg.deliveryStatus === 'rescheduled' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Reprog: {pkg.rescheduledDate}
                              </span>
                            )}
                          </div>

                          {/* POD indicator badge */}
                          {hasPod && (
                            <button
                              type="button"
                              onClick={() => setViewingPodPkg(pkg)}
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1"
                            >
                              <ShieldCheck size={12} />
                              Ver Evidencia POD
                            </button>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-zinc-900">{pkg.cliente}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-zinc-500">COD: {pkg.cod}</p>
                            <span className="text-[10px] bg-zinc-100 px-1.5 rounded text-zinc-600 font-medium">{pkg.zona}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-zinc-700">{pkg.tienda}</p>
                          <p className="text-[11px] text-zinc-400">{pkg.articulo}</p>
                        </td>

                        <td className="px-6 py-4 space-y-1">
                          {pkg.assignedDriverName ? (
                            <div className="flex items-center gap-1 text-blue-700 font-semibold">
                              <Truck size={13} />
                              <span>{pkg.assignedDriverName}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">Sin repartidor</span>
                          )}

                          {pkg.assignedFranchiseName && (
                            <div className="flex items-center gap-1 text-purple-700 font-medium text-[11px]">
                              <Store size={12} />
                              <span>{pkg.assignedFranchiseName}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => openAssignModal(pkg)}
                            className="text-[10px] text-emerald-600 hover:underline block font-semibold"
                          >
                            {pkg.assignedDriverName || pkg.assignedFranchiseName ? 'Reasignar' : '+ Asignar Ruta/Punto'}
                          </button>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-black text-zinc-900">RD${pkg.costo?.toLocaleString() || '0'}</p>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintLabel(pkg)}
                              className="text-xs font-semibold"
                            >
                              <Printer size={14} />
                              Etiqueta
                            </Button>
                            {pkg.estado !== 'Pagado' ? (
                            <Button 
                              size="sm"
                              onClick={() => handleFacturar(pkg)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
                            >
                              <Receipt size={14} />
                              Facturar
                            </Button>
                            ) : (
                            <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold text-xs">
                              <CheckCircle2 size={16} />
                              Facturado
                            </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredPackages.length === 0 && (
                <div className="p-12 text-center text-zinc-400">
                  <Package size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No se encontraron paquetes con los filtros seleccionados.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Package Assignment Modal */}
      {assigningPkg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Asignar Reparto / Franquicia</h3>
                <p className="text-xs text-zinc-500">Paquete #{assigningPkg.cod} ({assigningPkg.cliente})</p>
              </div>
              <button onClick={() => setAssigningPkg(null)} className="text-zinc-400 hover:text-zinc-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Repartidor de Última Milla
                </label>
                <select
                  value={selectedDriverToAssign}
                  onChange={(e) => setSelectedDriverToAssign(e.target.value)}
                  className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Sin Repartidor Asignado</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.assignedSede} • {d.phone})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Punto Pick-Up / Franquicia de Retiro
                </label>
                <select
                  value={selectedFranchiseToAssign}
                  onChange={(e) => setSelectedFranchiseToAssign(e.target.value)}
                  className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Sin Franquicia / Entrega a Domicilio</option>
                  {franchises.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code} • {f.city})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <Button variant="outline" size="sm" onClick={() => setAssigningPkg(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveAssignment} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                Guardar Asignación
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Delivery (POD) Viewer Modal */}
      {viewingPodPkg && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Evidencia de Entrega (POD)</h3>
                  <p className="text-xs text-zinc-500">Paquete #{viewingPodPkg.cod} • {viewingPodPkg.cliente}</p>
                </div>
              </div>
              <button onClick={() => setViewingPodPkg(null)} className="text-zinc-400 hover:text-zinc-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Receptor:</span>
                  <strong className="text-zinc-900">{viewingPodPkg.recipientReceivedName || viewingPodPkg.cliente}</strong>
                </div>
                {viewingPodPkg.recipientIdCard && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Cédula:</span>
                    <span className="font-mono text-zinc-900">{viewingPodPkg.recipientIdCard}</span>
                  </div>
                )}
                {viewingPodPkg.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Fecha y Hora:</span>
                    <span className="text-zinc-900">{format(new Date(viewingPodPkg.deliveredAt), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">Repartidor:</span>
                  <span className="text-blue-700 font-semibold">{viewingPodPkg.assignedDriverName || 'No especificado'}</span>
                </div>
                {viewingPodPkg.deliveryNotes && (
                  <div className="pt-1 border-t border-zinc-200 text-zinc-600 italic">
                    Notas: "{viewingPodPkg.deliveryNotes}"
                  </div>
                )}
              </div>

              {/* Photo Evidence */}
              {viewingPodPkg.deliveryProofPhoto && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 uppercase flex items-center gap-1">
                    <Camera size={14} className="text-emerald-600" />
                    Fotografía en Lugar de Entrega
                  </label>
                  <img 
                    src={viewingPodPkg.deliveryProofPhoto} 
                    alt="Evidencia fotográfica" 
                    className="w-full h-56 object-cover rounded-xl border border-zinc-200" 
                  />
                </div>
              )}

              {/* Digital Signature */}
              {viewingPodPkg.signaturePhoto && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 uppercase">Firma Digital del Receptor</label>
                  <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200 flex items-center justify-center">
                    <img 
                      src={viewingPodPkg.signaturePhoto} 
                      alt="Firma del receptor" 
                      className="max-h-24 object-contain" 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-100">
              <Button onClick={() => setViewingPodPkg(null)} className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
