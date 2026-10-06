import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, updateDoc, doc, query, where, addDoc } from 'firebase/firestore';
import { DeliveryDriver, WhatsAppPackage, UserProfile } from '../types';
import { Card, Button, Input, Badge, cn } from './ui';
import { 
  Smartphone, 
  Truck, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Camera, 
  Upload, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  Check, 
  X, 
  ChevronRight, 
  UserCheck, 
  PenTool, 
  DollarSign, 
  Search,
  ArrowLeft,
  Share2,
  ExternalLink,
  ShieldCheck,
  ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';

const RESCHEDULE_REASONS = [
  'Cliente ausente / no atendió la puerta',
  'Cliente no contesta llamadas ni WhatsApp',
  'Cliente solicitó reprogramar para otra fecha/hora',
  'Dirección incompleta o no localizada',
  'Cliente no tenía el dinero completo en efectivo',
  'Inaccesible por lluvia, calle cerrada o seguridad',
  'Paquete dañado o con inconsistencias',
  'Otro motivo particular'
];

export default function DriverPortal({
  profile,
  initialDriverId,
  onBack
}: {
  profile: UserProfile;
  initialDriverId?: string;
  onBack?: () => void;
}) {
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    initialDriverId || profile.driverId || ''
  );
  const [packages, setPackages] = useState<WhatsAppPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<'pending' | 'rescheduled' | 'delivered' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Delivery POD Modal
  const [deliveryModalPkg, setDeliveryModalPkg] = useState<WhatsAppPackage | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientIdCard, setRecipientIdCard] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card' | 'already_paid'>('cash');
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [submittingPod, setSubmittingPod] = useState(false);

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // Reschedule Modal
  const [rescheduleModalPkg, setRescheduleModalPkg] = useState<WhatsAppPackage | null>(null);
  const [newDate, setNewDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
  const [timeWindow, setTimeWindow] = useState<'morning' | 'afternoon' | 'evening' | 'anytime'>('morning');
  const [rescheduleReason, setRescheduleReason] = useState(RESCHEDULE_REASONS[0]);
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Camera file input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch Drivers
  useEffect(() => {
    const q = query(collection(db, 'delivery_drivers'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryDriver));
      setDrivers(list);
      if (!selectedDriverId && list.length > 0) {
        setSelectedDriverId(list[0].id);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch Packages for Selected Driver
  useEffect(() => {
    if (!selectedDriverId) {
      setPackages([]);
      return;
    }

    const q = query(collection(db, 'packages'), where('assignedDriverId', '==', selectedDriverId));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppPackage));
      setPackages(list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
    });

    return () => unsub();
  }, [selectedDriverId]);

  const currentDriver = drivers.find(d => d.id === selectedDriverId);

  // Canvas Signature Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#18181b';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Photo Capture / File Upload
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Open POD Delivery Modal
  const openDeliveryModal = (pkg: WhatsAppPackage) => {
    setDeliveryModalPkg(pkg);
    setRecipientName(pkg.cliente || '');
    setRecipientIdCard('');
    setCapturedPhoto(null);
    setPaymentMethod('cash');
    setCollectedAmount(pkg.costo || 0);
    setDeliveryNotes('');
    setHasSignature(false);
  };

  // Submit Proof of Delivery
  const handleCompleteDelivery = async () => {
    if (!deliveryModalPkg) return;
    if (!recipientName.trim()) {
      alert('Por favor ingresa el nombre de la persona que recibe el paquete.');
      return;
    }

    setSubmittingPod(true);
    try {
      let signatureDataUrl = '';
      if (canvasRef.current && hasSignature) {
        signatureDataUrl = canvasRef.current.toDataURL('image/png');
      }

      const now = new Date().toISOString();

      // Update package
      await updateDoc(doc(db, 'packages', deliveryModalPkg.id), {
        estado: 'Entregado',
        deliveryStatus: 'delivered',
        deliveredAt: now,
        deliveryProofPhoto: capturedPhoto || '',
        signaturePhoto: signatureDataUrl || '',
        recipientReceivedName: recipientName.trim(),
        recipientIdCard: recipientIdCard.trim(),
        paymentMethodCollected: paymentMethod,
        collectedAmount: Number(collectedAmount) || 0,
        deliveryNotes: deliveryNotes.trim(),
        updatedAt: now
      });

      // Record transaction if collected cash/transfer
      if (collectedAmount > 0) {
        await addDoc(collection(db, 'transactions'), {
          tipo: 'Ingreso',
          monto: Number(collectedAmount),
          categoria: 'Cobro Entrega Última Milla',
          descripcion: `Cobro paquete ${deliveryModalPkg.cod} (${deliveryModalPkg.cliente}) por repartidor ${currentDriver?.name || 'Repartidor'}`,
          fecha: now.split('T')[0],
          sede: deliveryModalPkg.sede,
          createdAt: now
        });
      }

      alert(`¡Entrega del paquete ${deliveryModalPkg.cod} registrada exitosamente!`);
      setDeliveryModalPkg(null);
    } catch (err) {
      console.error('Error completing delivery:', err);
      alert('Ocurrió un error al registrar la entrega.');
    } finally {
      setSubmittingPod(false);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (pkg: WhatsAppPackage) => {
    setRescheduleModalPkg(pkg);
    setNewDate(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
    setTimeWindow('morning');
    setRescheduleReason(RESCHEDULE_REASONS[0]);
    setRescheduleNote('');
  };

  // Submit Reschedule
  const handleConfirmReschedule = async () => {
    if (!rescheduleModalPkg) return;

    setSubmittingReschedule(true);
    try {
      const now = new Date().toISOString();
      const existingHistory = rescheduleModalPkg.rescheduleHistory || [];
      const newHistoryItem = {
        date: now.split('T')[0],
        newScheduledDate: newDate,
        timeWindow: timeWindow,
        reason: rescheduleReason,
        notes: rescheduleNote.trim(),
        driverName: currentDriver?.name || 'Repartidor',
        createdAt: now
      };

      await updateDoc(doc(db, 'packages', rescheduleModalPkg.id), {
        deliveryStatus: 'rescheduled',
        rescheduledDate: newDate,
        rescheduledTimeWindow: timeWindow,
        rescheduleReason: rescheduleReason,
        rescheduleHistory: [...existingHistory, newHistoryItem],
        updatedAt: now
      });

      // WhatsApp direct notify prompt
      const cleanPhone = rescheduleModalPkg.telefono.replace(/\D/g, '');
      const timeLabel = timeWindow === 'morning' ? 'en la mañana (8AM-12PM)' : timeWindow === 'afternoon' ? 'en la tarde (1PM-6PM)' : 'durante el día';
      const waMsg = encodeURIComponent(
        `¡Hola ${rescheduleModalPkg.cliente}! Te informamos desde Passion Go que tu entrega del paquete *${rescheduleModalPkg.cod}* ha sido reprogramada para el *${newDate}* ${timeLabel}. Motivo: ${rescheduleReason}. Si tienes alguna duda, contáctanos.`
      );

      const notifyWhatsApp = confirm(
        `Entrega reprogramada con éxito. ¿Deseas abrir WhatsApp para notificar al cliente (${rescheduleModalPkg.telefono}) de la nueva fecha?`
      );

      if (notifyWhatsApp && cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${waMsg}`, '_blank');
      }

      setRescheduleModalPkg(null);
    } catch (err) {
      console.error('Error rescheduling delivery:', err);
      alert('Error al reprogramar la entrega.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  // Filter packages for driver
  const pendingDeliveries = packages.filter(p => p.estado !== 'Entregado' && p.deliveryStatus !== 'rescheduled');
  const rescheduledDeliveries = packages.filter(p => p.deliveryStatus === 'rescheduled' && p.estado !== 'Entregado');
  const deliveredToday = packages.filter(p => p.estado === 'Entregado');

  const displayedPackages = packages.filter(p => {
    const matchesSearch = p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.telefono.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.zona.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'pending') {
      return p.estado !== 'Entregado' && p.deliveryStatus !== 'rescheduled';
    }
    if (activeFilter === 'rescheduled') {
      return p.deliveryStatus === 'rescheduled' && p.estado !== 'Entregado';
    }
    if (activeFilter === 'delivered') {
      return p.estado === 'Entregado';
    }
    return true;
  });

  const totalCashToCollect = pendingDeliveries.reduce((sum, p) => sum + (p.costo || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Top Banner / Mobile Nav */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-emerald-950 text-white p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
              title="Volver"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Smartphone size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold text-emerald-400 tracking-wider">
                App Móvil Repartidor
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold">Ruta de Reparto Última Milla</h1>
          </div>
        </div>

        {/* Driver Selector */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-xs border border-white/10">
          <Truck size={16} className="text-emerald-400 ml-2" />
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="bg-transparent text-white text-sm font-semibold focus:outline-none pr-3 cursor-pointer"
          >
            {drivers.map(d => (
              <option key={d.id} value={d.id} className="text-zinc-900 bg-white">
                {d.name} ({d.assignedSede})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Summary Card */}
      {currentDriver && (
        <Card className="p-4 bg-zinc-900 text-white border-zinc-800 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                {currentDriver.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-100">{currentDriver.name}</h3>
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>Sede: {currentDriver.assignedSede}</span>
                  <span>•</span>
                  <span>Tel: {currentDriver.phone}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 font-mono">
                Placa: {currentDriver.vehiclePlate || 'N/A'}
              </span>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded-lg font-semibold">
                RD$ {totalCashToCollect.toLocaleString()} por cobrar
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Metric Tabs Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <button
          onClick={() => setActiveFilter('pending')}
          className={cn(
            "p-3 sm:p-4 rounded-xl border text-left transition-all",
            activeFilter === 'pending'
              ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900"
              : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">En Ruta</p>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black mt-1 text-zinc-900">{pendingDeliveries.length}</p>
          <p className="text-[11px] text-zinc-500 truncate">Pendientes hoy</p>
        </button>

        <button
          onClick={() => setActiveFilter('rescheduled')}
          className={cn(
            "p-3 sm:p-4 rounded-xl border text-left transition-all",
            activeFilter === 'rescheduled'
              ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-amber-900"
              : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Reprogramadas</p>
            <Calendar size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black mt-1 text-zinc-900">{rescheduledDeliveries.length}</p>
          <p className="text-[11px] text-zinc-500 truncate">Próximas fechas</p>
        </button>

        <button
          onClick={() => setActiveFilter('delivered')}
          className={cn(
            "p-3 sm:p-4 rounded-xl border text-left transition-all",
            activeFilter === 'delivered'
              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900"
              : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Entregadas</p>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black mt-1 text-zinc-900">{deliveredToday.length}</p>
          <p className="text-[11px] text-zinc-500 truncate">Completadas con POD</p>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar paquete por código, cliente, teléfono o zona..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
        />
      </div>

      {/* Deliveries Queue */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-zinc-400">Cargando cola de entregas del repartidor...</div>
        ) : displayedPackages.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-zinc-200 bg-white">
            <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={48} />
            <h3 className="text-lg font-bold text-zinc-800">
              {activeFilter === 'pending' ? '¡Todo al día! No tienes entregas pendientes' : 'No hay paquetes en esta categoría'}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              {activeFilter === 'pending'
                ? 'Puedes consultar con el despachador de la sede para asignar nuevos paquetes a tu ruta.'
                : 'Usa los filtros superiores para explorar otras entregas.'}
            </p>
          </Card>
        ) : (
          displayedPackages.map((pkg) => {
            const isDelivered = pkg.estado === 'Entregado';
            const isRescheduled = pkg.deliveryStatus === 'rescheduled';
            const cleanPhone = pkg.telefono.replace(/\D/g, '');
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pkg.zona}, ${pkg.sede}, Republica Dominicana`)}`;
            const waDefaultMsg = encodeURIComponent(
              `¡Hola ${pkg.cliente}! Te saluda ${currentDriver?.name || 'tu repartidor'} de Passion Go 📦. Estoy en camino con tu paquete con código *${pkg.cod}*. Por favor confírmame si estás disponible para recibir.`
            );

            return (
              <Card 
                key={pkg.id}
                className={cn(
                  "p-5 border transition-all shadow-sm rounded-2xl bg-white",
                  isDelivered 
                    ? "border-emerald-200 bg-emerald-50/20" 
                    : isRescheduled 
                    ? "border-amber-200 bg-amber-50/20" 
                    : "border-zinc-200 hover:border-blue-300"
                )}
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm bg-zinc-900 text-white px-2 py-0.5 rounded-lg">
                          {pkg.cod}
                        </span>
                        
                        {isDelivered ? (
                          <Badge variant="success">Entregado Exitosamente</Badge>
                        ) : isRescheduled ? (
                          <Badge variant="warning">Reprogramado ({pkg.rescheduledDate})</Badge>
                        ) : (
                          <Badge variant="info">En Reparto Activo</Badge>
                        )}

                        <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                          {pkg.tienda}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-zinc-900 mt-1.5">{pkg.cliente}</h3>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-700">RD$ {pkg.costo?.toLocaleString() || '0'}</p>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                        {isDelivered ? 'Cobrado / Liquidado' : 'Monto a Cobrar (COD)'}
                      </span>
                    </div>
                  </div>

                  {/* Destination & Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <div className="space-y-1">
                      <div className="flex items-start gap-1.5 text-zinc-700">
                        <MapPin size={15} className="text-red-500 shrink-0 mt-0.5" />
                        <span className="font-medium">
                          Zona: <strong className="text-zinc-900">{pkg.zona}</strong> • {pkg.sede}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-600 pl-5">
                        <span>Artículo: {pkg.articulo || 'Paquete de compras'}</span>
                      </div>
                      {pkg.nota && (
                        <p className="text-[11px] text-zinc-500 italic pl-5">Nota: "{pkg.nota}"</p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:border-l sm:border-zinc-200 sm:pl-3">
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-zinc-400" />
                        <a href={`tel:${pkg.telefono}`} className="font-bold text-zinc-900 hover:text-blue-600">
                          {pkg.telefono}
                        </a>
                      </div>
                      {pkg.assignedFranchiseName && (
                        <div className="text-[11px] text-purple-700 font-medium">
                          Punto Pick-Up: {pkg.assignedFranchiseName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rescheduled Notice */}
                  {isRescheduled && pkg.rescheduleReason && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Reprogramado para:</strong> {pkg.rescheduledDate} ({pkg.rescheduledTimeWindow || 'Cualquier hora'})
                        <p className="text-[11px] text-amber-800 mt-0.5">Motivo: {pkg.rescheduleReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Proof of Delivery Details (if delivered) */}
                  {isDelivered && (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between text-emerald-900 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={16} className="text-emerald-600" />
                          Prueba de Entrega (POD) Confirmada
                        </span>
                        {pkg.deliveredAt && (
                          <span className="text-[11px] text-zinc-500 font-normal">
                            {format(new Date(pkg.deliveredAt), 'dd/MM/yyyy HH:mm')}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-zinc-700 pt-1">
                        <div>
                          <span className="text-zinc-400 block text-[10px] uppercase">Recibido Por:</span>
                          <strong className="text-zinc-900">{pkg.recipientReceivedName || pkg.cliente}</strong>
                          {pkg.recipientIdCard && <span className="text-xs block text-zinc-500 font-mono">{pkg.recipientIdCard}</span>}
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px] uppercase">Método de Pago:</span>
                          <span className="font-semibold text-zinc-800 capitalize">
                            {pkg.paymentMethodCollected === 'cash' ? 'Efectivo' : pkg.paymentMethodCollected === 'transfer' ? 'Transferencia' : 'Ya pagado'}
                          </span>
                        </div>
                      </div>

                      {/* Photo / Signature preview */}
                      <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                        {pkg.deliveryProofPhoto && (
                          <div className="relative group cursor-pointer" onClick={() => window.open(pkg.deliveryProofPhoto, '_blank')}>
                            <img src={pkg.deliveryProofPhoto} alt="Foto POD" className="w-16 h-16 object-cover rounded-lg border border-emerald-300 shadow-xs" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5 rounded-b-lg">Foto</span>
                          </div>
                        )}
                        {pkg.signaturePhoto && (
                          <div className="relative group bg-white p-1 rounded-lg border border-emerald-300">
                            <img src={pkg.signaturePhoto} alt="Firma digital" className="w-24 h-14 object-contain" />
                            <span className="block text-[8px] text-zinc-500 text-center">Firma Digital</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions Toolbar */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100">
                    <div className="flex items-center gap-2">
                      {/* Call Button */}
                      <a
                        href={`tel:${pkg.telefono}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors"
                      >
                        <Phone size={14} className="text-zinc-600" />
                        Llamar
                      </a>

                      {/* WhatsApp Button */}
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${waDefaultMsg}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                        >
                          <MessageSquare size={14} className="text-emerald-700" />
                          WhatsApp
                        </a>
                      )}

                      {/* Navigation GPS Button */}
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                      >
                        <Navigation size={14} className="text-blue-600" />
                        GPS
                      </a>
                    </div>

                    {/* Delivery & Reschedule Buttons */}
                    {!isDelivered && (
                      <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRescheduleModal(pkg)}
                          className="flex-1 sm:flex-initial text-xs border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold"
                        >
                          <Calendar size={14} />
                          Reprogramar
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => openDeliveryModal(pkg)}
                          className="flex-1 sm:flex-initial text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
                        >
                          <CheckCircle2 size={15} />
                          Entregar con POD
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Proof of Delivery (POD) Modal */}
      {deliveryModalPkg && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-emerald-600 tracking-wider">Prueba de Entrega (POD)</span>
                <h3 className="text-xl font-black text-zinc-900">
                  Completar Entrega #{deliveryModalPkg.cod}
                </h3>
              </div>
              <button 
                onClick={() => setDeliveryModalPkg(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Recipient details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nombre de quien Recibe"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
                <Input
                  label="Cédula / Documento (Opcional)"
                  value={recipientIdCard}
                  onChange={(e) => setRecipientIdCard(e.target.value)}
                  placeholder="001-0000000-0"
                />
              </div>

              {/* Photo Capture Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera size={14} className="text-emerald-600" />
                  Foto de Entrega / Paquete en Puerta
                </label>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {capturedPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-zinc-900 group">
                    <img src={capturedPhoto} alt="Evidencia capturada" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white text-zinc-900 text-xs"
                      >
                        Cambiar Foto
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => setCapturedPhoto(null)}
                        className="text-xs"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-zinc-300 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center gap-2 bg-zinc-50 hover:bg-emerald-50/50 transition-all text-zinc-600"
                  >
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full">
                      <Camera size={24} />
                    </div>
                    <span className="text-xs font-bold text-zinc-800">Tomar o Subir Foto con Cámara</span>
                    <span className="text-[11px] text-zinc-400">Captura la entrega o el paquete en mano</span>
                  </button>
                )}
              </div>

              {/* Digital Signature Pad */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool size={14} className="text-blue-600" />
                    Firma Digital del Cliente en Pantalla
                  </label>
                  {hasSignature && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs text-red-600 hover:underline font-semibold"
                    >
                      Limpiar Firma
                    </button>
                  )}
                </div>

                <div className="border border-zinc-300 rounded-2xl p-2 bg-zinc-50 touch-none">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 bg-white rounded-xl border border-zinc-200 cursor-crosshair"
                  />
                  <p className="text-[10px] text-zinc-400 text-center mt-1">
                    El receptor puede firmar directamente con su dedo o puntero táctil
                  </p>
                </div>
              </div>

              {/* Payment Collection */}
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 uppercase">Cobro al Cliente</span>
                  <strong className="text-base text-emerald-700">RD$ {deliveryModalPkg.costo?.toLocaleString() || '0'}</strong>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'Efectivo' },
                    { id: 'transfer', label: 'Transferencia' },
                    { id: 'card', label: 'Tarjeta' },
                    { id: 'already_paid', label: 'Ya Pagado' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={cn(
                        "p-2 rounded-lg text-xs font-semibold border transition-all text-center",
                        paymentMethod === m.id
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod !== 'already_paid' && (
                  <Input
                    label="Monto Cobrado (RD$)"
                    type="number"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(Number(e.target.value))}
                    placeholder="Monto"
                  />
                )}
              </div>

              {/* Delivery Notes */}
              <Input
                label="Notas Adicionales de Entrega"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Ej: Entregado a conserje de turno, dejado con cédula anotada..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <Button 
                variant="outline" 
                onClick={() => setDeliveryModalPkg(null)}
                disabled={submittingPod}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCompleteDelivery}
                disabled={submittingPod}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 shadow-lg shadow-emerald-900/30 flex items-center gap-2"
              >
                {submittingPod ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={18} />}
                Confirmar Entrega
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalPkg && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-amber-600 tracking-wider">Gestión de Reprogramación</span>
                <h3 className="text-xl font-black text-zinc-900">
                  Reprogramar Paquete #{rescheduleModalPkg.cod}
                </h3>
              </div>
              <button 
                onClick={() => setRescheduleModalPkg(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer summary */}
              <div className="p-3 bg-zinc-50 rounded-xl text-xs text-zinc-700 space-y-1 border border-zinc-200">
                <p><strong>Cliente:</strong> {rescheduleModalPkg.cliente}</p>
                <p><strong>Teléfono:</strong> {rescheduleModalPkg.telefono}</p>
                <p><strong>Zona:</strong> {rescheduleModalPkg.zona}</p>
              </div>

              {/* New Date */}
              <Input
                label="Nueva Fecha de Entrega"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />

              {/* Preferred Time Window */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Horario Preferido
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'morning', label: 'Mañana (8:00 AM - 12:00 PM)' },
                    { id: 'afternoon', label: 'Tarde (1:00 PM - 6:00 PM)' },
                    { id: 'evening', label: 'Noche (6:00 PM - 9:00 PM)' },
                    { id: 'anytime', label: 'Cualquier Hora' }
                  ].map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setTimeWindow(w.id as any)}
                      className={cn(
                        "p-2.5 rounded-xl text-xs font-medium border text-left transition-all",
                        timeWindow === w.id
                          ? "bg-amber-50 border-amber-400 text-amber-950 font-bold"
                          : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                      )}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Motivo de la Reprogramación
                </label>
                <select
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-800"
                >
                  {RESCHEDULE_REASONS.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Custom note */}
              <Input
                label="Detalles o Aclaraciones (Opcional)"
                value={rescheduleNote}
                onChange={(e) => setRescheduleNote(e.target.value)}
                placeholder="Ej: Cliente llamó diciendo que llega a las 4:00 PM..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <Button 
                variant="outline" 
                onClick={() => setRescheduleModalPkg(null)}
                disabled={submittingReschedule}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmReschedule}
                disabled={submittingReschedule}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 shadow-lg shadow-amber-900/30 flex items-center gap-2"
              >
                {submittingReschedule ? <RefreshCw className="animate-spin" size={16} /> : <Calendar size={18} />}
                Confirmar Reprogramación
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
