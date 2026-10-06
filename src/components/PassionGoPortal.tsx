import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { Branch, WhatsAppPackage, UserProfile } from '../types';
import { Card, Button, Badge } from './ui';
import { 
  Package, 
  Search, 
  MapPin, 
  Phone, 
  Truck, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Calculator, 
  MessageSquare, 
  Sparkles, 
  Building2, 
  LogIn, 
  LayoutDashboard,
  Store,
  ChevronRight,
  AlertCircle,
  Globe,
  Moon,
  Sun,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import Auth from './Auth';
import PassionGoIsometricGraphic from './PassionGoIsometricGraphic';

interface PassionGoPortalProps {
  userProfile?: UserProfile | null;
  onEnterDashboard?: () => void;
  isLoggedIn?: boolean;
}

export default function PassionGoPortal({ userProfile, onEnterDashboard, isLoggedIn }: PassionGoPortalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  
  // Tracking search state
  const [trackingQuery, setTrackingQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<WhatsAppPackage[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Rate calculator state
  const [calcWeight, setCalcWeight] = useState<string>('2');
  const [calcType, setCalcType] = useState<string>('standard');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Language & Theme mock toggle
  const [lang, setLang] = useState<'ES' | 'EN'>('ES');

  useEffect(() => {
    const q = query(collection(db, 'branches'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
      setBranches(list);
      setLoadingBranches(false);
    }, (err) => {
      console.error("Error fetching branches:", err);
      setLoadingBranches(false);
    });

    return () => unsubscribe();
  }, []);

  const handleTrackPackage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = trackingQuery.trim();
    if (!clean) return;

    setSearching(true);
    setHasSearched(true);
    setSearchResult(null);

    try {
      const qPackages = query(collection(db, 'packages'));
      const snapshot = await getDocs(qPackages);
      
      const cleanLower = clean.toLowerCase();
      const cleanDigits = clean.replace(/\D/g, '');

      const found = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as WhatsAppPackage))
        .filter(pkg => {
          const codMatch = pkg.cod?.toLowerCase().includes(cleanLower);
          const clienteMatch = pkg.cliente?.toLowerCase().includes(cleanLower);
          const telMatch = cleanDigits && pkg.telefono?.replace(/\D/g, '').includes(cleanDigits);
          return codMatch || clienteMatch || telMatch;
        });

      setSearchResult(found);
    } catch (err) {
      console.error("Error searching package:", err);
      setSearchResult([]);
    } finally {
      setSearching(false);
    }
  };

  const calculateShipping = () => {
    const weight = parseFloat(calcWeight) || 0;
    if (weight <= 0) {
      setEstimatedCost(null);
      return;
    }
    const ratePerLb = calcType === 'express' ? 220 : 150;
    const base = 75;
    const total = Math.round(base + (weight * ratePerLb));
    setEstimatedCost(total);
  };

  useEffect(() => {
    calculateShipping();
  }, [calcWeight, calcType]);

  const getStatusBadge = (estado: WhatsAppPackage['estado']) => {
    switch (estado) {
      case 'Pagado':
        return <Badge variant="success" className="gap-1.5 py-1 px-3 bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 size={14} /> Entregado y Pagado</Badge>;
      case 'Entregado':
        return <Badge variant="warning" className="gap-1.5 py-1 px-3 bg-amber-100 text-amber-900 border-amber-300"><Truck size={14} /> En Ruta de Entrega</Badge>;
      case 'Abierto':
      default:
        return <Badge variant="default" className="gap-1.5 py-1 px-3 bg-purple-700 text-white"><Clock size={14} /> Disponible en Sucursal</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-purple-950">
      
      {/* --- TOP NAVBAR --- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand: Passion Go */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-2">
              <div className="w-9 h-9 bg-purple-800 rounded-xl flex items-center justify-center text-amber-400 shadow-md shadow-purple-900/20">
                <Truck size={20} strokeWidth={2.5} />
              </div>
              <div className="flex items-baseline">
                <span className="font-black text-2xl tracking-tight text-purple-950">
                  Passion
                </span>
                <span className="font-black text-2xl tracking-tight text-amber-500 ml-1">
                  Go
                </span>
                {/* MailAmericas inspired upward geometric arrow in yellow */}
                <span className="ml-1 text-amber-500 font-black text-lg">↗</span>
              </div>
            </div>
          </div>

          {/* Navigation Links (Matching the MailAmericas header) */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-700">
            <a href="#inicio" className="text-purple-900 font-bold hover:text-amber-600 transition-colors">
              Inicio
            </a>
            <a href="#nosotros" className="hover:text-purple-800 transition-colors">
              Nosotros
            </a>
            <a href="#servicios" className="hover:text-purple-800 transition-colors">
              Servicios
            </a>
            <a href="#operaciones" className="hover:text-purple-800 transition-colors">
              Nuestras operaciones
            </a>
            <a href="#calculadora" className="hover:text-purple-800 transition-colors">
              Tarifas
            </a>
          </nav>

          {/* Right Utilities (Admin / Staff Button & Language Switcher Pill) */}
          <div className="flex items-center gap-3 sm:gap-4">
            {isLoggedIn ? (
              <Button 
                onClick={onEnterDashboard}
                className="bg-purple-900 hover:bg-purple-800 text-white font-bold rounded-lg px-4 py-2 text-xs shadow-md shadow-purple-900/20 flex items-center gap-2"
              >
                <LayoutDashboard size={16} />
                <span>Panel Interno</span>
              </Button>
            ) : (
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="bg-purple-950 hover:bg-purple-900 text-amber-300 hover:text-amber-200 border border-purple-800 font-bold rounded-lg px-4 py-2 text-xs shadow-sm flex items-center gap-2"
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Acceso Empleados</span>
                <span className="sm:hidden">Ingreso</span>
              </Button>
            )}

            {/* Language & Mode Pill matching reference */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-xs text-slate-600 shadow-sm">
              <button 
                onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
                className="font-bold hover:text-purple-900 px-1 transition-colors"
                title="Cambiar idioma"
              >
                {lang}
              </button>
              <span className="text-slate-300 mx-1">|</span>
              <button 
                className="hover:text-purple-900 p-0.5 transition-colors"
                title="Modo visual"
              >
                <Moon size={13} />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* --- HERO SECTION (2-COLUMNS: Exact MailAmericas Layout & Typographic Balance) --- */}
      <section id="inicio" className="relative pt-8 pb-16 lg:pt-16 lg:pb-24 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Bold Headline, Subtitle & Tracking Bar */}
            <div className="lg:col-span-6 space-y-6 text-left">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-purple-950 text-xs font-extrabold shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-amber-600 font-black">🇩🇴 REPÚBLICA DOMINICANA</span>
                <span className="text-slate-300">|</span>
                <span>Expertos en Entrega de Última Milla</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black text-slate-900 tracking-tight leading-[1.12]">
                Expertos en entrega de última milla en toda <span className="text-purple-900">República</span> <span className="text-amber-500">Dominicana</span>
              </h1>

              {/* Subhead */}
              <p className="text-slate-600 text-base sm:text-lg font-normal max-w-xl leading-relaxed">
                Llevamos tus paquetes, compras internacionales y pedidos de comercio electrónico directo a la puerta de tus clientes en cualquier provincia del país con velocidad, seguridad, alertas de WhatsApp y prueba de entrega digital.
              </p>

              {/* Modern High-Contrast Tracking Box */}
              <div className="pt-2">
                <form 
                  onSubmit={handleTrackPackage}
                  className="flex flex-col sm:flex-row items-stretch gap-2 max-w-xl"
                >
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search size={18} />
                    </div>
                    <input
                      type="text"
                      value={trackingQuery}
                      onChange={(e) => setTrackingQuery(e.target.value)}
                      placeholder="Ingresa tu código de tracking"
                      className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-purple-700 text-sm transition-all shadow-sm"
                    />
                  </div>

                  {/* Yellow/Gold Rastrear Button */}
                  <button
                    type="submit"
                    disabled={searching || !trackingQuery.trim()}
                    className="bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-purple-950 font-bold px-7 py-3.5 rounded-lg text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    {searching ? (
                      <span>Buscando...</span>
                    ) : (
                      <>
                        <span>Rastrear</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                {/* Popular Tracking tags */}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
                  <span>Ejemplos:</span>
                  <button 
                    onClick={() => { setTrackingQuery('AMZ'); }}
                    className="text-purple-800 hover:underline font-semibold"
                  >
                    #Amazon
                  </button>
                  <span>•</span>
                  <button 
                    onClick={() => { setTrackingQuery('SHN'); }}
                    className="text-purple-800 hover:underline font-semibold"
                  >
                    #SHEIN
                  </button>
                  <span>•</span>
                  <button 
                    onClick={() => { setTrackingQuery('TM'); }}
                    className="text-purple-800 hover:underline font-semibold"
                  >
                    #Temu
                  </button>
                </div>
              </div>

              {/* Value metric pills */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-100 max-w-lg">
                <div>
                  <div className="text-2xl font-black text-purple-950">32</div>
                  <div className="text-xs text-slate-500 font-medium">Provincias cubiertas</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-500">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Última Milla & POD</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-purple-950">24/7</div>
                  <div className="text-xs text-slate-500 font-medium">Rastreo WhatsApp</div>
                </div>
              </div>

            </div>

            {/* Right Column: 3D Isometric Logistics Hub with "Passion Go" Facade */}
            <div className="lg:col-span-6 flex items-center justify-center">
              <PassionGoIsometricGraphic />
            </div>

          </div>
        </div>

        {/* --- NATIONWIDE LAST MILE HIGHLIGHT STRIP --- */}
        <div className="mt-12 border-y border-purple-100 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center font-black shadow-lg shrink-0">
                  <Truck size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">Cobertura Nacional 🇩🇴</span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Red Activa</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Líderes en Logística de Última Milla en Toda República Dominicana
                  </h3>
                  <p className="text-xs sm:text-sm text-purple-200">
                    Entregas puerta a puerta, cobro contra entrega (COD), firma digital y notificación inmediata por WhatsApp en cada rincón del país.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-purple-800/80 border border-purple-700/60 text-xs font-bold text-purple-100">
                  📍 Gran Santo Domingo
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-purple-800/80 border border-purple-700/60 text-xs font-bold text-purple-100">
                  📍 Santiago & Cibao
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-purple-800/80 border border-purple-700/60 text-xs font-bold text-purple-100">
                  📍 Línea Noroeste & Dajabón
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-purple-800/80 border border-purple-700/60 text-xs font-bold text-purple-100">
                  📍 Región Este & Sur
                </span>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* --- TRACKING RESULTS SECTION (Dynamic when searched) --- */}
      {hasSearched && (
        <section id="resultados-rastreo" className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Estado de tu envío</span>
                <h2 className="text-2xl font-black text-purple-950 flex items-center gap-2">
                  <Package className="text-amber-500" /> Resultados de Rastreo
                </h2>
              </div>
              <span className="text-xs bg-purple-100 text-purple-900 px-3 py-1 rounded-full font-semibold">
                Guía: <strong>"{trackingQuery}"</strong>
              </span>
            </div>

            {searchResult && searchResult.length > 0 ? (
              <div className="space-y-4">
                {searchResult.map((pkg) => {
                  const branchInfo = branches.find(b => b.nombre.toLowerCase() === pkg.sede.toLowerCase());
                  const driverPhone = branchInfo?.repartidorTelefono || pkg.telefono;

                  return (
                    <Card key={pkg.id} className="p-6 bg-white border border-slate-200 shadow-lg shadow-purple-900/5 rounded-2xl space-y-4">
                      
                      {/* Top Package Details & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-purple-950">Código: {pkg.cod}</span>
                            {getStatusBadge(pkg.estado)}
                          </div>
                          <p className="text-sm text-slate-600">
                            Cliente: <strong className="text-slate-900 font-bold">{pkg.cliente}</strong> • Tienda: <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold text-xs">{pkg.tienda}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">Monto a Pagar</span>
                          <span className="text-3xl font-black text-amber-500">RD${pkg.costo || '0.00'}</span>
                        </div>
                      </div>

                      {/* Package Grid Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-purple-50/50 border border-purple-100 p-4 rounded-xl">
                        <div>
                          <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">Sucursal de Retiro</span>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                            <Building2 size={16} className="text-purple-700" />
                            {pkg.sede}
                          </p>
                          {branchInfo && (
                            <p className="text-xs text-slate-500 mt-0.5">{branchInfo.direccion}</p>
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">Artículo / Paquete</span>
                          <p className="font-medium text-slate-800 mt-1">{pkg.articulo || 'Paquete Express'}</p>
                          {pkg.zona && <p className="text-xs text-slate-500 font-medium">Zona: {pkg.zona}</p>}
                        </div>

                        <div>
                          <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">Repartidor Oficial</span>
                          <p className="font-medium text-slate-800 mt-1">
                            {branchInfo?.repartidorNombre || 'Repartidor Passion Go'}
                          </p>
                          {branchInfo?.repartidorTelefono && (
                            <p className="text-xs text-slate-500">Tel: {branchInfo.repartidorTelefono}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={14} /> Fecha de Registro: {new Date(pkg.createdAt).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-2">
                          {driverPhone && (
                            <a
                              href={`https://wa.me/${driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola Passion Go, consulto por mi paquete con código ${pkg.cod} a nombre de ${pkg.cliente}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-900 hover:bg-purple-800 text-amber-300 rounded-xl text-xs font-bold shadow-sm transition-all"
                            >
                              <MessageSquare size={16} />
                              Consultar por WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 bg-white text-center space-y-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900">No encontramos paquetes con ese código</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Revisa que el código coincida con tu guía de rastreo o comunícate con la sucursal Passion Go más cercana para asistirte de inmediato.
                </p>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* --- SECTION: NOSOTROS (About Passion Go) --- */}
      <section id="nosotros" className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Quiénes Somos</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Especialistas en la Última Milla en Toda la República Dominicana
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                En <strong className="text-purple-900 font-bold">Passion Go</strong> nos especializamos en la etapa más crítica de la logística: <strong>la entrega de última milla</strong>. Conectamos tus compras internacionales y envíos comerciales directo con el cliente final en Santo Domingo, Santiago, Dajabón, La Altagracia, Puerto Plata y todas las provincias de la República Dominicana.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <p className="text-sm text-slate-700 font-medium">Flotilla de repartidores motorizados y furgonetas equipados con app móvil GPS.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <p className="text-sm text-slate-700 font-medium">Prueba de Entrega Digital (POD) con firma táctil en pantalla y fotos de confirmación.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <p className="text-sm text-slate-700 font-medium">Cobro Contra Entrega (COD) en efectivo o transferencia con liquidación transparente.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-purple-100 text-purple-900 rounded-xl flex items-center justify-center">
                  <Globe size={20} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Recepción Global</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Consolidación de paquetes desde USA, China y Europa.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Última Milla Nacional</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Distribución express puerta a puerta en toda RD.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Firma & POD Digital</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Comprobante fotográfico y firma táctil del receptor.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-purple-100 text-purple-900 rounded-xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Rutas Optimizadas</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Despacho inteligente y tiempos de entrega récord.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- SECTION: SERVICIOS --- */}
      <section id="servicios" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Nuestros Servicios</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Soluciones Integrales de Entrega y Logística
            </h2>
            <p className="text-slate-500 text-sm">
              Diseñados para compradores individuales, tiendas en línea, emprendedores e importadores en toda República Dominicana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Service Card 1 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all space-y-4 group">
              <div className="w-14 h-14 bg-purple-900 text-amber-400 rounded-2xl flex items-center justify-center shadow-md shadow-purple-900/20 group-hover:scale-105 transition-transform">
                <Truck size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Entrega de Última Milla Express</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Reparto puerta a puerta en toda la República Dominicana con motorizados capacitados, geolocalización, cobranza contra entrega y confirmación digital instantánea.
              </p>
              <div className="pt-2 text-xs font-bold text-purple-900 flex items-center gap-1">
                <span>Cobertura en 32 Provincias</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Service Card 2 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all space-y-4 group">
              <div className="w-14 h-14 bg-amber-400 text-purple-950 rounded-2xl flex items-center justify-center shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform">
                <Store size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Casillero & Puntos Pick-Up</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Trae tus pedidos de Amazon, SHEIN, Temu y AliExpress. Retira cómodamente en nuestras sucursales y franquicias afiliadas o solicita delivery a tu casa.
              </p>
              <div className="pt-2 text-xs font-bold text-amber-600 flex items-center gap-1">
                <span>Red de Franquicias</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Service Card 3 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all space-y-4 group">
              <div className="w-14 h-14 bg-purple-900 text-amber-400 rounded-2xl flex items-center justify-center shadow-md shadow-purple-900/20 group-hover:scale-105 transition-transform">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Notificaciones WhatsApp 24/7</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Comprobantes automáticos con foto de tu paquete, valor por pagar, aviso de repartidor en camino y comunicación directa en un solo clic.
              </p>
              <div className="pt-2 text-xs font-bold text-purple-900 flex items-center gap-1">
                <span>Alertas en tiempo real</span>
                <ChevronRight size={14} />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- SECTION: NUESTRAS OPERACIONES & SUCURSALES --- */}
      <section id="operaciones" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Branches List (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-purple-800">Red de Cobertura</span>
                <h2 className="text-3xl font-black text-slate-900 mt-1">Nuestras Sucursales Passion Go</h2>
                <p className="text-slate-500 text-sm mt-1">Ubicaciones oficiales con atención al cliente y despacho motorizado.</p>
              </div>

              {loadingBranches ? (
                <div className="p-8 text-center text-slate-400 font-medium">Cargando sucursales activas...</div>
              ) : branches.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {branches.map(branch => (
                    <Card key={branch.id} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                          <Building2 size={18} className="text-purple-800" />
                          {branch.nombre}
                        </h4>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                          Abierto
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 flex items-start gap-2">
                        <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <span>{branch.direccion}</span>
                      </p>

                      {branch.repartidorNombre && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>Repartidor: <strong className="text-slate-800 font-bold">{branch.repartidorNombre}</strong></span>
                          {branch.repartidorTelefono && (
                            <a 
                              href={`tel:${branch.repartidorTelefono}`} 
                              className="text-purple-800 font-bold hover:underline flex items-center gap-1"
                            >
                              <Phone size={12} /> {branch.repartidorTelefono}
                            </a>
                          )}
                        </div>
                      )}

                      {branch.zonas && branch.zonas.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {branch.zonas.map((z, idx) => (
                            <span key={idx} className="text-[10px] bg-purple-50 text-purple-900 font-semibold px-2 py-0.5 rounded">
                              {z}
                            </span>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-6 bg-white rounded-2xl text-center text-slate-500">
                  Sedes disponibles: Dajabón y sucursales afiliadas.
                </Card>
              )}
            </div>

            {/* Rate Calculator (5 cols) */}
            <div id="calculadora" className="lg:col-span-5">
              <Card className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-lg shadow-purple-900/5 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-11 h-11 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center">
                    <Calculator size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Calculadora de Tarifas</h3>
                    <p className="text-xs text-slate-500">Estima el costo de tu paquete en RD$</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-2">
                      Peso estimado (Libras)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        step="0.5"
                        value={calcWeight}
                        onChange={(e) => setCalcWeight(e.target.value)}
                        className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-100 rounded-lg"
                      />
                      <span className="font-black text-base text-purple-950 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl min-w-[80px] text-center">
                        {calcWeight} lbs
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-2">
                      Tipo de Retiro
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setCalcType('standard')}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                          calcType === 'standard' 
                            ? 'border-purple-800 bg-purple-50 text-purple-950 ring-2 ring-purple-800/20 shadow-sm' 
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-black">En Sucursal</div>
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">Retiro en sede</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCalcType('express')}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                          calcType === 'express' 
                            ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20 shadow-sm' 
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-black">A Domicilio</div>
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">Motorizado express</div>
                      </button>
                    </div>
                  </div>

                  {/* Calculated Price Display */}
                  <div className="p-5 bg-purple-950 text-white rounded-2xl flex items-center justify-between border border-purple-900">
                    <div>
                      <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">Total Estimado</span>
                      <span className="text-3xl font-black text-white">RD${estimatedCost || 0}</span>
                    </div>
                    <div className="text-right text-[11px] text-purple-200 max-w-[120px]">
                      Tarifa base + manejo logístico
                    </div>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* --- FOOTER (Purple & Yellow accents) --- */}
      <footer className="bg-purple-950 text-white py-14 border-t border-purple-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-purple-900">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-purple-950 font-black shadow-md">
                <Truck size={22} />
              </div>
              <div>
                <span className="font-black text-xl text-white">Passion <span className="text-amber-400">Go</span></span>
                <p className="text-xs text-purple-300">Soluciones de paquetería, importaciones y última milla.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-purple-200">
              <a href="#inicio" className="hover:text-amber-400 transition-colors">Inicio</a>
              <a href="#nosotros" className="hover:text-amber-400 transition-colors">Nosotros</a>
              <a href="#servicios" className="hover:text-amber-400 transition-colors">Servicios</a>
              <a href="#operaciones" className="hover:text-amber-400 transition-colors">Operaciones</a>
              <a href="#calculadora" className="hover:text-amber-400 transition-colors">Tarifas</a>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-purple-400">
            <p>© 2026 Passion Go Logistics. Todos los derechos reservados.</p>
            <div>
              {isLoggedIn ? (
                <button 
                  onClick={onEnterDashboard}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Ir al Panel Administrativo
                </button>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Acceso para Empleados y Administradores
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* --- AUTHENTICATION MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-purple-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
            >
              ✕
            </button>
            <Auth onLoginSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}

    </div>
  );
}
