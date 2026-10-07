import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  addDoc 
} from 'firebase/firestore';
import { CarrierIntegration, ApiKeyRecord, ApiLogRecord, Sede, UserProfile } from '../types';
import { 
  Zap, 
  Plus, 
  Key, 
  Activity, 
  BookOpen, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Shield, 
  Globe, 
  Server, 
  Truck, 
  Send, 
  Search, 
  Filter, 
  Sliders, 
  Layers, 
  Code, 
  Terminal, 
  Bell, 
  ChevronRight,
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  Clock,
  Sparkles
} from 'lucide-react';
import { Button, Card, Input, Select, Badge, cn } from './ui';

interface ApiPanelProps {
  userProfile: UserProfile | null;
  onNavigateToPackages?: () => void;
}

const DEFAULT_CARRIERS: Omit<CarrierIntegration, 'id'>[] = [
  {
    name: 'DHL Express',
    slug: 'dhl',
    logoColor: 'bg-amber-400 text-red-700 border-amber-500',
    status: 'active',
    apiKey: 'dhl_live_sec_8921f00b91c84b12',
    environment: 'production',
    webhookUrl: 'https://api.dhl.com/v1/shipments/status-updates',
    defaultSede: 'Dajabón',
    autoNotifyWhatsApp: true,
    serviceType: 'last_mile_delivery',
    ratePerKg: 180,
    totalSyncedPackages: 342,
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'FedEx Cross Border',
    slug: 'fedex',
    logoColor: 'bg-purple-900 text-amber-400 border-purple-800',
    status: 'active',
    apiKey: 'fdx_live_sec_44829ad32091c7ef',
    environment: 'production',
    webhookUrl: 'https://api.fedex.com/track/v1/notifications',
    defaultSede: 'Santiago',
    autoNotifyWhatsApp: true,
    serviceType: 'last_mile_delivery',
    ratePerKg: 195,
    totalSyncedPackages: 289,
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'MailAmericas Logistics',
    slug: 'mailamericas',
    logoColor: 'bg-blue-600 text-white border-blue-700',
    status: 'active',
    apiKey: 'ma_live_sec_991823bc891aa302',
    environment: 'production',
    webhookUrl: 'https://tracking.mailamericas.com/api/v2/events',
    defaultSede: 'Santo Domingo',
    autoNotifyWhatsApp: true,
    serviceType: 'all',
    ratePerKg: 160,
    totalSyncedPackages: 614,
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Gofo Express',
    slug: 'gofo',
    logoColor: 'bg-emerald-600 text-amber-300 border-emerald-700',
    status: 'active',
    apiKey: 'gofo_live_sec_771920ac391bb011',
    environment: 'production',
    webhookUrl: 'https://gofo-express.com/api/v1/webhook/passiongo',
    defaultSede: 'Dajabón',
    autoNotifyWhatsApp: true,
    serviceType: 'last_mile_delivery',
    ratePerKg: 150,
    totalSyncedPackages: 478,
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'UPS Supply Chain',
    slug: 'ups',
    logoColor: 'bg-amber-900 text-amber-300 border-amber-950',
    status: 'testing',
    apiKey: 'ups_sandbox_key_1102938472910a',
    environment: 'sandbox',
    webhookUrl: 'https://onlinetools.ups.com/api/track/v1/details',
    defaultSede: 'Santiago',
    autoNotifyWhatsApp: false,
    serviceType: 'hub_sorting',
    ratePerKg: 210,
    totalSyncedPackages: 45,
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function ApiPanel({ userProfile, onNavigateToPackages }: ApiPanelProps) {
  const [activeTab, setActiveTab] = useState<'carriers' | 'sandbox' | 'keys' | 'logs' | 'docs'>('carriers');
  const [carriers, setCarriers] = useState<CarrierIntegration[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedCodeLang, setCopiedCodeLang] = useState<string | null>(null);

  // Modal / Form state for carriers
  const [carrierModalOpen, setCarrierModalOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<CarrierIntegration | null>(null);
  const [carrierForm, setCarrierForm] = useState({
    name: '',
    logoUrl: '',
    slug: 'custom' as CarrierIntegration['slug'],
    status: 'active' as CarrierIntegration['status'],
    apiKey: '',
    apiSecret: '',
    environment: 'production' as CarrierIntegration['environment'],
    webhookUrl: '',
    webhookSecret: '',
    defaultSede: 'Dajabón',
    autoNotifyWhatsApp: true,
    serviceType: 'last_mile_delivery' as CarrierIntegration['serviceType'],
    ratePerKg: 175
  });

  const handleCarrierLogoUpload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecciona una imagen válida para el logo.');
      return;
    }
    if (file.size > 600 * 1024) {
      alert('El logo debe pesar menos de 600 KB para guardarse correctamente.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCarrierForm(current => ({ ...current, logoUrl: String(reader.result || '') }));
    reader.onerror = () => alert('No se pudo leer la imagen seleccionada.');
    reader.readAsDataURL(file);
  };

  // Modal for new API Key
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyForm, setKeyForm] = useState({
    name: '',
    carrierSlug: 'dhl',
    scopes: ['read:tracking', 'write:packages'] as ApiKeyRecord['scopes'],
    rateLimitPerMinute: 120
  });

  // Sandbox Live Testing State
  const [sandboxPreset, setSandboxPreset] = useState<'dhl' | 'fedex' | 'mailamericas' | 'gofo' | 'ups' | 'custom'>('dhl');
  const [sandboxForm, setSandboxForm] = useState({
    trackingNumber: 'DHL-RD-' + Math.floor(100000 + Math.random() * 900000),
    carrier: 'DHL Express',
    customerName: 'Carlos Manuel Gómez',
    customerPhone: '809-555-0142',
    destinationAddress: 'Calle Duarte #45, Sector Centro',
    destinationZone: 'Dajabón Centro',
    packageItem: 'Electrónicos / Laptop Dell XPS',
    declaredValue: 250,
    serviceType: 'Entrega Domicilio Express',
    targetBranch: 'Dajabón',
    notes: 'Entregar en horario de oficina. Llamar 10 min antes.'
  });
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);
  const [sandboxStatusQuery, setSandboxStatusQuery] = useState('');
  const [sandboxStatusResult, setSandboxStatusResult] = useState<any>(null);
  const [sandboxStatusLoading, setSandboxStatusLoading] = useState(false);

  // Filter logs
  const [logFilterCarrier, setLogFilterCarrier] = useState<string>('all');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('all');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ApiLogRecord | null>(null);

  // Docs Code generator
  const [docLang, setDocLang] = useState<'curl' | 'node' | 'python'>('curl');

  // Load Firestore collections or seed initial defaults
  useEffect(() => {
    // 1. Listen to carrier_integrations
    const unsubscribeCarriers = onSnapshot(collection(db, 'carrier_integrations'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default carriers for seamless immediate out-of-the-box usage
        DEFAULT_CARRIERS.forEach(async (carrier) => {
          try {
            await addDoc(collection(db, 'carrier_integrations'), carrier);
          } catch (e) {
            console.error('Error seeding carrier:', e);
          }
        });
      } else {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CarrierIntegration));
        setCarriers(list);
      }
      setLoading(false);
    });

    // 2. Listen to api_keys
    const unsubscribeKeys = onSnapshot(collection(db, 'api_keys'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default API keys
        const initialKeys: Omit<ApiKeyRecord, 'id'>[] = [
          {
            name: 'DHL Production Gateway Key',
            carrierSlug: 'dhl',
            keyPrefix: 'pg_live_dhl_',
            fullKey: 'pg_live_dhl_90f821a7c88b4012de9910',
            scopes: ['read:tracking', 'write:packages', 'sync:status', 'webhooks'],
            status: 'active',
            rateLimitPerMinute: 300,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
            lastUsedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
          },
          {
            name: 'FedEx LatAm Connect Key',
            carrierSlug: 'fedex',
            keyPrefix: 'pg_live_fdx_',
            fullKey: 'pg_live_fdx_88192301ab887201cba904',
            scopes: ['read:tracking', 'write:packages'],
            status: 'active',
            rateLimitPerMinute: 200,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
            lastUsedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString()
          },
          {
            name: 'MailAmericas Ingestion Key',
            carrierSlug: 'mailamericas',
            keyPrefix: 'pg_live_ma_',
            fullKey: 'pg_live_ma_552810aa771092cc889100',
            scopes: ['read:tracking', 'write:packages', 'sync:status'],
            status: 'active',
            rateLimitPerMinute: 500,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
            lastUsedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
          },
          {
            name: 'Gofo Express Dispatch Key',
            carrierSlug: 'gofo',
            keyPrefix: 'pg_live_gofo_',
            fullKey: 'pg_live_gofo_3381920acbb91823ef0011',
            scopes: ['read:tracking', 'write:packages'],
            status: 'active',
            rateLimitPerMinute: 150,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
            lastUsedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString()
          }
        ];
        initialKeys.forEach(async (k) => {
          try {
            await addDoc(collection(db, 'api_keys'), k);
          } catch (e) {
            console.error('Error seeding key:', e);
          }
        });
      } else {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiKeyRecord));
        setApiKeys(list);
      }
    });

    // 3. Listen to api_logs
    const qLogs = query(collection(db, 'api_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      if (snapshot.empty) {
        // Seed mock initial logs for rich UI appearance
        const sampleLogs: Omit<ApiLogRecord, 'id'>[] = [
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            method: 'POST',
            endpoint: '/api/v1/last-mile/ingest',
            carrierName: 'Gofo Express',
            statusCode: 201,
            durationMs: 42,
            payloadSummary: 'Ingesta de paquete GOFO-RD-99210 para Laura Peña (Dajabón)',
            trackingCode: 'GOFO-RD-99210',
            statusText: 'success'
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            method: 'POST',
            endpoint: '/api/v1/last-mile/ingest',
            carrierName: 'MailAmericas',
            statusCode: 201,
            durationMs: 38,
            payloadSummary: 'Ingesta de paquete MA-9021-DO para Roberto Martínez (Santo Domingo)',
            trackingCode: 'MA-9021-DO',
            statusText: 'success'
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            method: 'GET',
            endpoint: '/api/v1/last-mile/status/DHL-RD-884910',
            carrierName: 'DHL Express',
            statusCode: 200,
            durationMs: 18,
            payloadSummary: 'Consulta de estado: DHL-RD-884910 -> Abierto',
            trackingCode: 'DHL-RD-884910',
            statusText: 'success'
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
            method: 'POST',
            endpoint: '/api/v1/last-mile/webhook',
            carrierName: 'FedEx Cross Border',
            statusCode: 200,
            durationMs: 25,
            payloadSummary: 'Webhook recibido: evento=shipment.dispatched | tracking=FDX-RD-77102',
            trackingCode: 'FDX-RD-77102',
            statusText: 'success'
          }
        ];
        sampleLogs.forEach(async (l) => {
          try {
            await addDoc(collection(db, 'api_logs'), l);
          } catch (e) {
            console.error('Error seeding log:', e);
          }
        });
      } else {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiLogRecord));
        setApiLogs(list);
      }
    });

    return () => {
      unsubscribeCarriers();
      unsubscribeKeys();
      unsubscribeLogs();
    };
  }, []);

  // Update preset form in sandbox
  const handlePresetChange = (preset: 'dhl' | 'fedex' | 'mailamericas' | 'gofo' | 'ups' | 'custom') => {
    setSandboxPreset(preset);
    const rand = Math.floor(100000 + Math.random() * 900000);
    if (preset === 'dhl') {
      setSandboxForm({
        trackingNumber: `DHL-RD-${rand}`,
        carrier: 'DHL Express',
        customerName: 'Carlos Manuel Gómez',
        customerPhone: '809-555-0142',
        destinationAddress: 'Calle Duarte #45, Sector Centro',
        destinationZone: 'Dajabón Centro',
        packageItem: 'Electrónicos / Laptop Dell XPS',
        declaredValue: 250,
        serviceType: 'Entrega Domicilio Express',
        targetBranch: 'Dajabón',
        notes: 'Entregar en horario de oficina. Llamar 10 min antes.'
      });
    } else if (preset === 'fedex') {
      setSandboxForm({
        trackingNumber: `FDX-RD-${rand}`,
        carrier: 'FedEx Cross Border',
        customerName: 'Ana Lucía Fernández',
        customerPhone: '829-444-1299',
        destinationAddress: 'Av. Las Carreras #12, Edif. Colonial',
        destinationZone: 'Santiago Monumental',
        packageItem: 'Indumentaria / Ropa Zara',
        declaredValue: 180,
        serviceType: 'Entrega Domicilio Express',
        targetBranch: 'Santiago',
        notes: 'Dejar en recepción si no está disponible.'
      });
    } else if (preset === 'mailamericas') {
      setSandboxForm({
        trackingNumber: `MA-DO-${rand}`,
        carrier: 'MailAmericas Logistics',
        customerName: 'José Alberto Rosario',
        customerPhone: '849-333-8821',
        destinationAddress: 'Calle El Sol #89',
        destinationZone: 'Santo Domingo Este',
        packageItem: 'Paquete eCommerce AliExpress',
        declaredValue: 150,
        serviceType: 'Entrega Domicilio Express',
        targetBranch: 'Santo Domingo',
        notes: 'Cobrar flete contra entrega si aplica.'
      });
    } else if (preset === 'gofo') {
      setSandboxForm({
        trackingNumber: `GOFO-RD-${rand}`,
        carrier: 'Gofo Express',
        customerName: 'Patricia Morales Cruz',
        customerPhone: '809-777-6622',
        destinationAddress: 'Barrio La Fe, Calle 3 #14',
        destinationZone: 'Dajabón Sur',
        packageItem: 'Cosméticos y Cuidado Personal',
        declaredValue: 140,
        serviceType: 'Entrega Domicilio Express',
        targetBranch: 'Dajabón',
        notes: 'Cliente prefiere entrega en la tarde.'
      });
    } else if (preset === 'ups') {
      setSandboxForm({
        trackingNumber: `1Z-RD-${rand}`,
        carrier: 'UPS Supply Chain',
        customerName: 'Manuel Antonio Santana',
        customerPhone: '809-222-9911',
        destinationAddress: 'Av. Estrella Sadhalá #55',
        destinationZone: 'Santiago',
        packageItem: 'Repuestos Automotrices',
        declaredValue: 310,
        serviceType: 'Entrega Domicilio Express',
        targetBranch: 'Santiago',
        notes: 'Paquete frágil. Requiere firma.'
      });
    }
  };

  // Run Sandbox Ingestion Call
  const handleExecuteSandbox = async () => {
    setSandboxLoading(true);
    setSandboxResponse(null);
    try {
      const response = await fetch('/api/v1/last-mile/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'pg_sandbox_tester_key_001'
        },
        body: JSON.stringify(sandboxForm)
      });
      const data = await response.json();
      setSandboxResponse({
        httpStatus: response.status,
        ok: response.ok,
        data
      });
      if (response.ok && data.trackingCode) {
        setSandboxStatusQuery(data.trackingCode);
      }
    } catch (err: any) {
      setSandboxResponse({
        httpStatus: 500,
        ok: false,
        data: { error: err.message }
      });
    } finally {
      setSandboxLoading(false);
    }
  };

  // Run Sandbox Status Query
  const handleQueryStatus = async () => {
    if (!sandboxStatusQuery.trim()) return;
    setSandboxStatusLoading(true);
    setSandboxStatusResult(null);
    try {
      const response = await fetch(`/api/v1/last-mile/status/${encodeURIComponent(sandboxStatusQuery.trim())}`);
      const data = await response.json();
      setSandboxStatusResult({
        httpStatus: response.status,
        ok: response.ok,
        data
      });
    } catch (err: any) {
      setSandboxStatusResult({
        httpStatus: 500,
        ok: false,
        data: { error: err.message }
      });
    } finally {
      setSandboxStatusLoading(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleCopyCode = (text: string, lang: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeLang(lang);
    setTimeout(() => setCopiedCodeLang(null), 2500);
  };

  // Toggle carrier status
  const handleToggleCarrierStatus = async (carrier: CarrierIntegration) => {
    const nextStatus = carrier.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'carrier_integrations', carrier.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error toggling carrier:', e);
    }
  };

  // Save new/edit carrier
  const handleSaveCarrier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCarrier) {
        await updateDoc(doc(db, 'carrier_integrations', editingCarrier.id), {
          ...carrierForm,
          updatedAt: new Date().toISOString()
        });
      } else {
        const newCarrier: Omit<CarrierIntegration, 'id'> = {
          ...carrierForm,
          logoColor: 'bg-purple-700 text-amber-300 border-purple-800',
          totalSyncedPackages: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'carrier_integrations'), newCarrier);
      }
      setCarrierModalOpen(false);
      setEditingCarrier(null);
    } catch (err) {
      console.error('Error saving carrier:', err);
    }
  };

  // Create new API Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const randHex = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 10);
    const prefix = `pg_live_${keyForm.carrierSlug}_`;
    const fullKey = `${prefix}${randHex}`;
    try {
      const newKey: Omit<ApiKeyRecord, 'id'> = {
        name: keyForm.name,
        carrierSlug: keyForm.carrierSlug,
        keyPrefix: prefix,
        fullKey,
        scopes: keyForm.scopes,
        status: 'active',
        rateLimitPerMinute: keyForm.rateLimitPerMinute,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'api_keys'), newKey);
      setKeyModalOpen(false);
      setKeyForm({
        name: '',
        carrierSlug: 'dhl',
        scopes: ['read:tracking', 'write:packages'],
        rateLimitPerMinute: 120
      });
    } catch (err) {
      console.error('Error creating api key:', err);
    }
  };

  // Delete API Key
  const handleDeleteKey = async (id: string) => {
    if (window.confirm('¿Estás seguro de revocar y eliminar esta clave API? El transportista perderá acceso inmediatamente.')) {
      try {
        await deleteDoc(doc(db, 'api_keys', id));
      } catch (err) {
        console.error('Error deleting key:', err);
      }
    }
  };

  // Summary Metrics
  const activeCarriersCount = carriers.filter(c => c.status === 'active').length;
  const totalPackagesSynced = carriers.reduce((acc, c) => acc + (c.totalSyncedPackages || 0), 0);
  const totalKeysCount = apiKeys.filter(k => k.status === 'active').length;

  // Filtered Logs
  const filteredLogs = apiLogs.filter(log => {
    if (logFilterCarrier !== 'all' && !log.carrierName.toLowerCase().includes(logFilterCarrier.toLowerCase())) {
      return false;
    }
    if (logFilterStatus === '200' && log.statusCode !== 200 && log.statusCode !== 201) return false;
    if (logFilterStatus === '400' && (log.statusCode < 400 || log.statusCode >= 500)) return false;
    if (logFilterStatus === '500' && log.statusCode < 500) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner - Passion Go Purple & Yellow Branding */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-zinc-950 border border-purple-800/60 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-amber-400 text-purple-950 font-black text-xs rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Zap className="w-3.5 h-3.5 fill-current" />
                Hub de Última Milla & 3PL
              </span>
              <span className="text-xs text-purple-200/80 font-medium">
                Conectividad API REST & Webhooks
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Panel de Conexión de Transportistas
              <span className="text-amber-400">Passion Go</span>
            </h1>
            <p className="text-purple-200/90 text-sm max-w-2xl leading-relaxed">
              Integra plataformas globales y locales como <strong className="text-amber-300">DHL, FedEx, MailAmericas, Gofo Express y UPS</strong> para recibir e ingerir paquetes automáticamente, asignar sucursales de entrega y notificar a clientes en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setActiveTab('sandbox')}
              variant="outline"
              className="border-amber-400/40 text-amber-300 hover:bg-amber-400/10 hover:text-white"
            >
              <Play className="w-4 h-4 text-amber-400" />
              Probar Simulador API
            </Button>
            <Button
              onClick={() => {
                setEditingCarrier(null);
                setCarrierForm({
                  name: '',
                  logoUrl: '',
                  slug: 'custom',
                  status: 'active',
                  apiKey: `sec_${Math.random().toString(36).substring(2, 14)}`,
                  apiSecret: '',
                  environment: 'production',
                  webhookUrl: '',
                  webhookSecret: '',
                  defaultSede: 'Dajabón',
                  autoNotifyWhatsApp: true,
                  serviceType: 'last_mile_delivery',
                  ratePerKg: 175
                });
                setCarrierModalOpen(true);
              }}
              className="bg-amber-400 text-purple-950 font-bold hover:bg-amber-300 shadow-lg shadow-amber-400/20"
            >
              <Plus className="w-4 h-4" />
              Nueva Integración
            </Button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-purple-800/50">
          <div className="bg-purple-950/60 backdrop-blur-sm border border-purple-800/40 rounded-xl p-3.5">
            <div className="text-xs text-purple-300 font-medium">Transportistas Activos</div>
            <div className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-2">
              {activeCarriersCount}
              <span className="text-xs text-emerald-400 font-normal flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-0.5" /> En línea
              </span>
            </div>
          </div>

          <div className="bg-purple-950/60 backdrop-blur-sm border border-purple-800/40 rounded-xl p-3.5">
            <div className="text-xs text-purple-300 font-medium">Paquetes Ingeridos (API)</div>
            <div className="text-2xl font-black text-white mt-1">
              {totalPackagesSynced.toLocaleString()}
            </div>
          </div>

          <div className="bg-purple-950/60 backdrop-blur-sm border border-purple-800/40 rounded-xl p-3.5">
            <div className="text-xs text-purple-300 font-medium">Claves API Activas</div>
            <div className="text-2xl font-black text-white mt-1 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              {totalKeysCount}
            </div>
          </div>

          <div className="bg-purple-950/60 backdrop-blur-sm border border-purple-800/40 rounded-xl p-3.5">
            <div className="text-xs text-purple-300 font-medium">Latencia Promedio</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1">
              <Activity className="w-4 h-4" />
              32 ms
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('carriers')}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
            activeTab === 'carriers'
              ? "bg-purple-900 text-amber-300 shadow-md"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          <Truck className="w-4 h-4" />
          Transportistas ({carriers.length})
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
            activeTab === 'sandbox'
              ? "bg-purple-900 text-amber-300 shadow-md"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          <Play className="w-4 h-4 text-amber-400" />
          Simulador & Sandbox
        </button>

        <button
          onClick={() => setActiveTab('keys')}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
            activeTab === 'keys'
              ? "bg-purple-900 text-amber-300 shadow-md"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          <Key className="w-4 h-4" />
          Claves API ({apiKeys.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
            activeTab === 'logs'
              ? "bg-purple-900 text-amber-300 shadow-md"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          <Activity className="w-4 h-4" />
          Tráfico & Logs ({apiLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
            activeTab === 'docs'
              ? "bg-purple-900 text-amber-300 shadow-md"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          <BookOpen className="w-4 h-4" />
          Documentación Swagger
        </button>
      </div>

      {/* TAB 1: CARRIERS LIST & CONFIGURATION */}
      {activeTab === 'carriers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Transportistas & Servicios de Última Milla</h2>
              <p className="text-sm text-zinc-500">
                Configura los parámetros de ingesta, credenciales de sincronización y sucursales asignadas en RD.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingCarrier(null);
                setCarrierForm({
                  name: '',
                  logoUrl: '',
                  slug: 'custom',
                  status: 'active',
                  apiKey: `sec_${Math.random().toString(36).substring(2, 14)}`,
                  apiSecret: '',
                  environment: 'production',
                  webhookUrl: '',
                  webhookSecret: '',
                  defaultSede: 'Dajabón',
                  autoNotifyWhatsApp: true,
                  serviceType: 'last_mile_delivery',
                  ratePerKg: 175
                });
                setCarrierModalOpen(true);
              }}
              variant="outline"
              className="border-purple-700 text-purple-900 hover:bg-purple-50"
            >
              <Plus className="w-4 h-4 text-purple-700" />
              Añadir Transportista
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {carriers.map((carrier) => (
              <Card key={carrier.id} className="border border-zinc-200/80 hover:border-purple-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden">
                {/* Carrier Top Header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {carrier.logoUrl ? (
                        <img src={carrier.logoUrl} alt={`Logo de ${carrier.name}`} className="w-12 h-12 rounded-xl object-contain bg-white border border-zinc-200 shadow-sm p-1" />
                      ) : (
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm uppercase tracking-wider border shadow-sm", carrier.logoColor || 'bg-zinc-800 text-white')}>
                          {carrier.slug.toUpperCase().slice(0, 3)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-zinc-900 text-base">{carrier.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                            carrier.status === 'active' 
                              ? "bg-emerald-100 text-emerald-700"
                              : carrier.status === 'testing'
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-600"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", carrier.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500')} />
                            {carrier.status === 'active' ? 'Activo' : carrier.status === 'testing' ? 'En Pruebas' : 'Inactivo'}
                          </span>
                          <span className="text-[11px] text-zinc-400 uppercase font-mono">
                            {carrier.environment}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleCarrierStatus(carrier)}
                      title="Activar / Desactivar"
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative focus:outline-none",
                        carrier.status === 'active' ? "bg-emerald-600" : "bg-zinc-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                        carrier.status === 'active' ? "right-0.5" : "left-0.5"
                      )} />
                    </button>
                  </div>

                  {/* Attributes Grid */}
                  <div className="bg-zinc-50 rounded-xl p-3 space-y-2 text-xs border border-zinc-100">
                    <div className="flex justify-between items-center text-zinc-600">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-zinc-400" />
                        Sede Asignada RD:
                      </span>
                      <strong className="text-zinc-900">{carrier.defaultSede}</strong>
                    </div>

                    <div className="flex justify-between items-center text-zinc-600">
                      <span className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-zinc-400" />
                        Aviso WhatsApp:
                      </span>
                      <strong className={carrier.autoNotifyWhatsApp ? "text-emerald-700" : "text-zinc-400"}>
                        {carrier.autoNotifyWhatsApp ? "Automático ✓" : "Desactivado"}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-zinc-600">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-zinc-400" />
                        Servicio:
                      </span>
                      <strong className="text-zinc-900 capitalize">
                        {carrier.serviceType === 'last_mile_delivery' ? 'Última Milla' : carrier.serviceType}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-zinc-600">
                      <span className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-zinc-400" />
                        Paquetes Sincronizados:
                      </span>
                      <span className="font-mono font-bold text-purple-900 bg-purple-100/60 px-2 py-0.5 rounded">
                        {carrier.totalSyncedPackages || 0}
                      </span>
                    </div>
                  </div>

                  {/* Webhook & Credentials preview */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-zinc-500 flex justify-between items-center">
                      <span>Webhook Dispatcher:</span>
                      <span className="font-mono text-zinc-400 truncate max-w-[150px]">
                        {carrier.webhookUrl ? carrier.webhookUrl.replace('https://', '') : 'No configurado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <Button
                    onClick={() => {
                      handlePresetChange(carrier.slug);
                      setActiveTab('sandbox');
                    }}
                    variant="ghost"
                    className="text-xs text-purple-900 hover:bg-purple-100/50 py-1.5 px-2.5 font-bold"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-500" />
                    Probar Ingesta
                  </Button>

                  <Button
                    onClick={() => {
                      setEditingCarrier(carrier);
                      setCarrierForm({
                        name: carrier.name,
                        logoUrl: carrier.logoUrl || '',
                        slug: carrier.slug,
                        status: carrier.status,
                        apiKey: carrier.apiKey || '',
                        apiSecret: carrier.apiSecret || '',
                        environment: carrier.environment || 'production',
                        webhookUrl: carrier.webhookUrl || '',
                        webhookSecret: carrier.webhookSecret || '',
                        defaultSede: carrier.defaultSede || 'Dajabón',
                        autoNotifyWhatsApp: carrier.autoNotifyWhatsApp ?? true,
                        serviceType: carrier.serviceType || 'last_mile_delivery',
                        ratePerKg: carrier.ratePerKg || 175
                      });
                      setCarrierModalOpen(true);
                    }}
                    variant="outline"
                    className="text-xs py-1.5 px-3 border-zinc-200"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TESTING SANDBOX & SIMULATOR */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Presets */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 border-zinc-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="font-black text-lg text-zinc-900 flex items-center gap-2">
                    <Play className="w-5 h-5 text-amber-500 fill-current" />
                    Simulador de Ingesta API (Última Milla)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Envía un paquete de prueba a través del endpoint <code className="bg-zinc-100 text-purple-900 px-1 py-0.5 rounded font-mono text-[11px]">POST /api/v1/last-mile/ingest</code>
                  </p>
                </div>
              </div>

              {/* Carrier Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Cargar Preset de Transportista:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetChange('dhl')}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                      sandboxPreset === 'dhl'
                        ? "bg-amber-400 border-amber-500 text-red-900 shadow-sm"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    DHL Express
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetChange('fedex')}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                      sandboxPreset === 'fedex'
                        ? "bg-purple-900 border-purple-800 text-amber-300 shadow-sm"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    FedEx
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetChange('mailamericas')}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                      sandboxPreset === 'mailamericas'
                        ? "bg-blue-600 border-blue-700 text-white shadow-sm"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    MailAmericas
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetChange('gofo')}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                      sandboxPreset === 'gofo'
                        ? "bg-emerald-600 border-emerald-700 text-amber-300 shadow-sm"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    Gofo Express
                  </button>
                </div>
              </div>

              {/* Ingestion Payload Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Número de Guía / Tracking No."
                  value={sandboxForm.trackingNumber}
                  onChange={(e) => setSandboxForm({ ...sandboxForm, trackingNumber: e.target.value })}
                  placeholder="ej. DHL-RD-889102"
                />

                <Input
                  label="Transportista Emisor"
                  value={sandboxForm.carrier}
                  onChange={(e) => setSandboxForm({ ...sandboxForm, carrier: e.target.value })}
                  placeholder="DHL, FedEx, MailAmericas..."
                />

                <Input
                  label="Nombre del Destinatario"
                  value={sandboxForm.customerName}
                  onChange={(e) => setSandboxForm({ ...sandboxForm, customerName: e.target.value })}
                  placeholder="Juan Pérez"
                />

                <Input
                  label="Teléfono Destinatario (WhatsApp)"
                  value={sandboxForm.customerPhone}
                  onChange={(e) => setSandboxForm({ ...sandboxForm, customerPhone: e.target.value })}
                  placeholder="809-555-0100"
                />

                <Input
                  label="Dirección de Entrega"
                  value={sandboxForm.destinationAddress}
                  onChange={(e) => setSandboxForm({ ...sandboxForm, destinationAddress: e.target.value })}
                  placeholder="Calle Principal #12"
                />

                <Input
                  label="Zona / Sector"
                  value={sandboxForm.destinationZone}
                  onChange={(e) => setSandboxForm({ ...sandboxForm, destinationZone: e.target.value })}
                  placeholder="Sector El Tamarindo"
                />

                <Input
                  label="Descripción del Contenido"
                  value={sandboxForm.packageItem}
                  onChange={(e) => setSandboxForm({ ...sandboxForm, packageItem: e.target.value })}
                  placeholder="Artículos Personales, Calzado..."
                />

                <Select
                  label="Sede Asignada en RD"
                  value={sandboxForm.targetBranch}
                  onChange={(e) => setSandboxForm({ ...sandboxForm, targetBranch: e.target.value })}
                  options={[
                    { label: 'Dajabón (Principal)', value: 'Dajabón' },
                    { label: 'Santiago', value: 'Santiago' },
                    { label: 'Santo Domingo', value: 'Santo Domingo' },
                    { label: 'Montecristi', value: 'Montecristi' }
                  ]}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  onClick={handleExecuteSandbox}
                  disabled={sandboxLoading || !sandboxForm.trackingNumber || !sandboxForm.customerName}
                  className="w-full sm:w-auto bg-purple-900 text-amber-300 hover:bg-purple-950 font-bold px-6 py-2.5 shadow-md flex items-center justify-center gap-2"
                >
                  {sandboxLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      Enviando Ingesta...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-amber-400" />
                      Ejecutar Ingesta API
                    </>
                  )}
                </Button>

                {onNavigateToPackages && (
                  <button
                    onClick={onNavigateToPackages}
                    className="text-xs text-purple-800 font-semibold hover:underline flex items-center gap-1"
                  >
                    Ver en Módulo de Paquetes
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Card>

            {/* Quick Status Checker Card */}
            <Card className="p-5 border-zinc-200/80 shadow-sm space-y-4">
              <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-700" />
                Consulta de Estado en Tiempo Real (GET /status)
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sandboxStatusQuery}
                  onChange={(e) => setSandboxStatusQuery(e.target.value)}
                  placeholder="Ingresa código de tracking (ej. DHL-RD-884910)"
                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <Button
                  onClick={handleQueryStatus}
                  disabled={sandboxStatusLoading || !sandboxStatusQuery.trim()}
                  variant="secondary"
                  className="bg-zinc-900 text-white text-xs font-bold"
                >
                  {sandboxStatusLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Consultar'}
                </Button>
              </div>

              {sandboxStatusResult && (
                <div className={cn(
                  "p-3 rounded-xl border text-xs font-mono space-y-1.5",
                  sandboxStatusResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-red-50 border-red-200 text-red-950"
                )}>
                  <div className="font-bold flex items-center justify-between">
                    <span>HTTP {sandboxStatusResult.httpStatus}</span>
                    <span className="text-[10px] uppercase font-sans font-black bg-white/80 px-2 py-0.5 rounded">
                      {sandboxStatusResult.ok ? 'Encontrado' : 'No Encontrado'}
                    </span>
                  </div>
                  <pre className="overflow-x-auto text-[11px] whitespace-pre-wrap">
                    {JSON.stringify(sandboxStatusResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Live Terminal Response */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-zinc-950 border-zinc-800 text-zinc-100 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full min-h-[480px]">
              {/* Terminal Titlebar */}
              <div className="bg-zinc-900/90 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs font-mono text-zinc-400 ml-2">PassionGo API Gateway Console</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950 text-amber-400 font-bold border border-purple-800">
                  HTTP 1.1 / JSON
                </span>
              </div>

              {/* Terminal Body */}
              <div className="p-5 flex-1 font-mono text-xs overflow-y-auto space-y-4">
                <div className="text-zinc-500">
                  # Payload a enviar:
                </div>
                <pre className="text-amber-300/90 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80 overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(sandboxForm, null, 2)}
                </pre>

                <div className="border-t border-zinc-800/80 pt-4">
                  <div className="text-zinc-500 flex items-center justify-between mb-2">
                    <span># Respuesta del Servidor:</span>
                    {sandboxResponse && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded",
                        sandboxResponse.ok ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"
                      )}>
                        STATUS {sandboxResponse.httpStatus}
                      </span>
                    )}
                  </div>

                  {sandboxResponse ? (
                    <div className="space-y-3">
                      <pre className={cn(
                        "p-3 rounded-xl border overflow-x-auto text-[11px] leading-relaxed",
                        sandboxResponse.ok 
                          ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                          : "bg-red-950/40 border-red-800/60 text-red-300"
                      )}>
                        {JSON.stringify(sandboxResponse.data, null, 2)}
                      </pre>

                      {sandboxResponse.ok && (
                        <div className="bg-purple-950/60 border border-purple-800 rounded-xl p-3 text-[11px] text-purple-200 space-y-1 font-sans">
                          <strong className="text-amber-400 flex items-center gap-1.5 font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            ¡Paquete integrado en tiempo real!
                          </strong>
                          <p>
                            El paquete ha sido registrado en la base de datos de Passion Go y asignado a la sucursal <strong className="text-white">{sandboxResponse.data.assignedBranch}</strong> para su reparto de última milla.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-zinc-600 space-y-2">
                      <Terminal className="w-8 h-8 mx-auto text-zinc-700" />
                      <p className="text-xs">Presiona "Ejecutar Ingesta API" para emitir la petición.</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: API KEYS MANAGEMENT */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Claves de Acceso de Transportistas (API Keys)</h2>
              <p className="text-sm text-zinc-500">
                Genera tokens y claves seguras para que DHL, FedEx, MailAmericas y Gofo autentiquen sus peticiones.
              </p>
            </div>
            <Button
              onClick={() => setKeyModalOpen(true)}
              className="bg-purple-900 text-amber-300 hover:bg-purple-950 font-bold"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Generar Nueva API Key
            </Button>
          </div>

          <div className="space-y-3">
            {apiKeys.map((keyRecord) => (
              <Card key={keyRecord.id} className="p-5 border-zinc-200/80 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 text-base">{keyRecord.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="uppercase font-semibold text-purple-800">{keyRecord.carrierSlug}</span>
                          <span>•</span>
                          <span>Límite: {keyRecord.rateLimitPerMinute} req/min</span>
                          <span>•</span>
                          <span>Creada: {new Date(keyRecord.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Masked Key Display */}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-zinc-100 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-800 border border-zinc-200 select-all">
                        {keyRecord.fullKey}
                      </code>
                      <Button
                        onClick={() => handleCopy(keyRecord.fullKey, keyRecord.id)}
                        variant="outline"
                        className="py-1 px-2.5 text-xs h-8 border-zinc-200"
                      >
                        {copiedKeyId === keyRecord.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Scopes */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {keyRecord.scopes?.map(scope => (
                        <span key={scope} className="text-[10px] font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      keyRecord.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    )}>
                      {keyRecord.status === 'active' ? 'Activa' : 'Revocada'}
                    </span>
                    <Button
                      onClick={() => handleDeleteKey(keyRecord.id)}
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: API TRAFFIC & LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Registro de Tráfico en Vivo (API Stream)</h2>
              <p className="text-sm text-zinc-500">
                Monitorea cada llamada entrante, ingestas de paquetes y consultas de tracking de transportistas.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={logFilterCarrier}
                onChange={(e) => setLogFilterCarrier(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-zinc-200 bg-white"
              >
                <option value="all">Todos los Carriers</option>
                <option value="dhl">DHL Express</option>
                <option value="fedex">FedEx</option>
                <option value="mailamericas">MailAmericas</option>
                <option value="gofo">Gofo Express</option>
              </select>

              <select
                value={logFilterStatus}
                onChange={(e) => setLogFilterStatus(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-zinc-200 bg-white"
              >
                <option value="all">Todos los Códigos</option>
                <option value="200">200 / 201 OK</option>
                <option value="400">4xx Errores Cliente</option>
                <option value="500">5xx Errores Servidor</option>
              </select>
            </div>
          </div>

          <Card className="border-zinc-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">Hora</th>
                    <th className="p-3.5">Método & Endpoint</th>
                    <th className="p-3.5">Transportista</th>
                    <th className="p-3.5">Tracking</th>
                    <th className="p-3.5">Código HTTP</th>
                    <th className="p-3.5">Latencia</th>
                    <th className="p-3.5">Detalle / Resumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3.5 font-mono text-zinc-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "font-mono font-bold px-1.5 py-0.5 rounded text-[10px]",
                              log.method === 'POST' ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            )}>
                              {log.method}
                            </span>
                            <span className="font-mono text-zinc-800">{log.endpoint}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-zinc-900">
                          {log.carrierName}
                        </td>
                        <td className="p-3.5 font-mono text-purple-900 font-semibold">
                          {log.trackingCode || '—'}
                        </td>
                        <td className="p-3.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded font-mono font-bold text-[11px]",
                            log.statusCode >= 200 && log.statusCode < 300
                              ? "bg-emerald-100 text-emerald-800"
                              : log.statusCode >= 400 && log.statusCode < 500
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          )}>
                            {log.statusCode}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-zinc-500">
                          {log.durationMs} ms
                        </td>
                        <td className="p-3.5 text-zinc-600 max-w-xs truncate">
                          {log.payloadSummary}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-400">
                        No hay logs registrados con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: SWAGGER / OPENAPI INTERACTIVE DOCUMENTATION */}
      {activeTab === 'docs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Guía de Integración Técnica para Carriers (API Reference)</h2>
              <p className="text-sm text-zinc-500">
                Proporciona esta documentación a los equipos de ingeniería de DHL, FedEx, MailAmericas y Gofo.
              </p>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl">
              <button
                onClick={() => setDocLang('curl')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                  docLang === 'curl' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                cURL
              </button>
              <button
                onClick={() => setDocLang('node')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                  docLang === 'node' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                Node.js
              </button>
              <button
                onClick={() => setDocLang('python')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                  docLang === 'python' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                Python
              </button>
            </div>
          </div>

          {/* Endpoint 1: Ingest */}
          <Card className="p-6 border-zinc-200/80 space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-purple-900 text-amber-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                POST
              </span>
              <code className="text-sm font-bold text-zinc-900">/api/v1/last-mile/ingest</code>
              <span className="text-xs text-zinc-500">— Ingesta de Paquetes para Última Milla</span>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Permite a los transportistas externos transferir paquetes que arriban a República Dominicana hacia los centros de distribución de Passion Go para reparto puerta a puerta o entrega en sucursales.
            </p>

            {/* Code Snippet Box */}
            <div className="bg-zinc-950 rounded-xl p-4 text-zinc-100 font-mono text-xs relative overflow-hidden">
              <button
                onClick={() => handleCopyCode(
                  docLang === 'curl'
                    ? `curl -X POST https://passiongo.app/api/v1/last-mile/ingest \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pg_live_dhl_90f821a7c88b4012" \\
  -d '{
    "trackingNumber": "DHL-RD-990182",
    "carrier": "DHL Express",
    "customerName": "Juan Carlos Pérez",
    "customerPhone": "809-555-0199",
    "destinationAddress": "Calle Duarte #12",
    "destinationZone": "Dajabón",
    "packageItem": "Calzado Deportivo",
    "declaredValue": 250,
    "targetBranch": "Dajabón"
  }'`
                    : docLang === 'node'
                    ? `const axios = require('axios');

const response = await axios.post('https://passiongo.app/api/v1/last-mile/ingest', {
  trackingNumber: 'DHL-RD-990182',
  carrier: 'DHL Express',
  customerName: 'Juan Carlos Pérez',
  customerPhone: '809-555-0199',
  destinationAddress: 'Calle Duarte #12',
  destinationZone: 'Dajabón',
  packageItem: 'Calzado Deportivo',
  declaredValue: 250,
  targetBranch: 'Dajabón'
}, {
  headers: {
    'x-api-key': 'pg_live_dhl_90f821a7c88b4012'
  }
});
console.log(response.data);`
                    : `import requests

url = "https://passiongo.app/api/v1/last-mile/ingest"
payload = {
    "trackingNumber": "DHL-RD-990182",
    "carrier": "DHL Express",
    "customerName": "Juan Carlos Pérez",
    "customerPhone": "809-555-0199",
    "destinationAddress": "Calle Duarte #12",
    "destinationZone": "Dajabón",
    "packageItem": "Calzado Deportivo",
    "declaredValue": 250,
    "targetBranch": "Dajabón"
}
headers = {"x-api-key": "pg_live_dhl_90f821a7c88b4012"}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
                  'ingest'
                )}
                className="absolute top-3 right-3 text-zinc-400 hover:text-white bg-zinc-800 px-2.5 py-1 rounded text-[11px] flex items-center gap-1"
              >
                {copiedCodeLang === 'ingest' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCodeLang === 'ingest' ? 'Copiado' : 'Copiar'}
              </button>

              <pre className="overflow-x-auto text-[11px] leading-relaxed text-amber-300/90">
                {docLang === 'curl' && `curl -X POST https://passiongo.app/api/v1/last-mile/ingest \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pg_live_dhl_90f821a7c88b4012" \\
  -d '{
    "trackingNumber": "DHL-RD-990182",
    "carrier": "DHL Express",
    "customerName": "Juan Carlos Pérez",
    "customerPhone": "809-555-0199",
    "destinationAddress": "Calle Duarte #12",
    "destinationZone": "Dajabón",
    "packageItem": "Calzado Deportivo",
    "declaredValue": 250,
    "targetBranch": "Dajabón"
  }'`}

                {docLang === 'node' && `const axios = require('axios');

const response = await axios.post('https://passiongo.app/api/v1/last-mile/ingest', {
  trackingNumber: 'DHL-RD-990182',
  carrier: 'DHL Express',
  customerName: 'Juan Carlos Pérez',
  customerPhone: '809-555-0199',
  destinationAddress: 'Calle Duarte #12',
  destinationZone: 'Dajabón',
  packageItem: 'Calzado Deportivo',
  declaredValue: 250,
  targetBranch: 'Dajabón'
}, {
  headers: {
    'x-api-key': 'pg_live_dhl_90f821a7c88b4012'
  }
});
console.log(response.data);`}

                {docLang === 'python' && `import requests

url = "https://passiongo.app/api/v1/last-mile/ingest"
payload = {
    "trackingNumber": "DHL-RD-990182",
    "carrier": "DHL Express",
    "customerName": "Juan Carlos Pérez",
    "customerPhone": "809-555-0199",
    "destinationAddress": "Calle Duarte #12",
    "destinationZone": "Dajabón",
    "packageItem": "Calzado Deportivo",
    "declaredValue": 250,
    "targetBranch": "Dajabón"
}
headers = {"x-api-key": "pg_live_dhl_90f821a7c88b4012"}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
              </pre>
            </div>
          </Card>

          {/* Endpoint 2: Status Query */}
          <Card className="p-6 border-zinc-200/80 space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                GET
              </span>
              <code className="text-sm font-bold text-zinc-900">/api/v1/last-mile/status/{'{trackingNumber}'}</code>
              <span className="text-xs text-zinc-500">— Consulta de Estado en Vivo</span>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Permite a los transportistas consultar el estado exacto del paquete (Abierto / En Almacén, Entregado, Pagado y liquidado), así como la sucursal y comprobantes de entrega.
            </p>
          </Card>
        </div>
      )}

      {/* MODAL: ADD / EDIT CARRIER */}
      {carrierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-black text-lg text-zinc-900">
                {editingCarrier ? 'Editar Integración de Transportista' : 'Nueva Integración de Transportista'}
              </h3>
              <button
                onClick={() => setCarrierModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCarrier} className="space-y-4">
              <Input
                label="Nombre del Transportista / Empresa"
                value={carrierForm.name}
                onChange={(e) => setCarrierForm({ ...carrierForm, name: e.target.value })}
                placeholder="ej. DHL Express, FedEx, MailAmericas..."
                required
              />

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-3">
                <div className="flex items-center gap-3">
                  {carrierForm.logoUrl ? (
                    <img src={carrierForm.logoUrl} alt="Vista previa del logo" className="w-16 h-16 rounded-xl object-contain bg-white border border-zinc-200 p-1" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-black text-lg border border-purple-200">
                      {(carrierForm.name || 'EMP').slice(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800">Logo de la empresa</p>
                    <p className="text-[11px] text-zinc-500">PNG, JPG, WEBP o SVG · máximo 600 KB.</p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(event) => handleCarrierLogoUpload(event.target.files?.[0])}
                      className="mt-2 block w-full text-[11px] text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-purple-900 file:px-3 file:py-1.5 file:font-bold file:text-amber-300 hover:file:bg-purple-950"
                    />
                  </div>
                </div>
                <Input
                  label="O usar URL HTTPS del logo"
                  value={carrierForm.logoUrl.startsWith('data:') ? '' : carrierForm.logoUrl}
                  onChange={(e) => setCarrierForm({ ...carrierForm, logoUrl: e.target.value })}
                  placeholder="https://empresa.com/logo.png"
                />
                {carrierForm.logoUrl && (
                  <button type="button" onClick={() => setCarrierForm({ ...carrierForm, logoUrl: '' })} className="text-[11px] font-bold text-red-600 hover:underline">
                    Quitar logo
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Tipo / Slug"
                  value={carrierForm.slug}
                  onChange={(e) => setCarrierForm({ ...carrierForm, slug: e.target.value as any })}
                  options={[
                    { label: 'DHL Express', value: 'dhl' },
                    { label: 'FedEx', value: 'fedex' },
                    { label: 'MailAmericas', value: 'mailamericas' },
                    { label: 'Gofo Express', value: 'gofo' },
                    { label: 'UPS', value: 'ups' },
                    { label: 'Personalizado / Otro', value: 'custom' }
                  ]}
                />

                <Select
                  label="Entorno"
                  value={carrierForm.environment}
                  onChange={(e) => setCarrierForm({ ...carrierForm, environment: e.target.value as any })}
                  options={[
                    { label: 'Producción (Live)', value: 'production' },
                    { label: 'Sandbox (Pruebas)', value: 'sandbox' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Sede por Defecto en RD"
                  value={carrierForm.defaultSede}
                  onChange={(e) => setCarrierForm({ ...carrierForm, defaultSede: e.target.value })}
                  options={[
                    { label: 'Dajabón', value: 'Dajabón' },
                    { label: 'Santiago', value: 'Santiago' },
                    { label: 'Santo Domingo', value: 'Santo Domingo' },
                    { label: 'Montecristi', value: 'Montecristi' }
                  ]}
                />

                <Input
                  label="Tarifa Base / Kg (RD$)"
                  type="number"
                  value={carrierForm.ratePerKg}
                  onChange={(e) => setCarrierForm({ ...carrierForm, ratePerKg: Number(e.target.value) })}
                />
              </div>

              <Input
                label="URL de Webhook para Dispatch de Eventos"
                value={carrierForm.webhookUrl}
                onChange={(e) => setCarrierForm({ ...carrierForm, webhookUrl: e.target.value })}
                placeholder="https://api.carrier.com/v1/webhooks/passiongo"
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoNotify"
                  checked={carrierForm.autoNotifyWhatsApp}
                  onChange={(e) => setCarrierForm({ ...carrierForm, autoNotifyWhatsApp: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded border-zinc-300 focus:ring-purple-500"
                />
                <label htmlFor="autoNotify" className="text-xs font-medium text-zinc-700">
                  Notificar al cliente por WhatsApp automáticamente al ingresar paquete
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <Button
                  onClick={() => setCarrierModalOpen(false)}
                  variant="outline"
                  type="button"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-900 text-amber-300 hover:bg-purple-950 font-bold"
                >
                  Guardar Integración
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GENERATE API KEY */}
      {keyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-black text-lg text-zinc-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Generar Clave API para Transportista
              </h3>
              <button
                onClick={() => setKeyModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <Input
                label="Nombre Descriptivo de la Clave"
                value={keyForm.name}
                onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                placeholder="ej. DHL Gateway Producción"
                required
              />

              <Select
                label="Transportista Destino"
                value={keyForm.carrierSlug}
                onChange={(e) => setKeyForm({ ...keyForm, carrierSlug: e.target.value })}
                options={[
                  { label: 'DHL Express', value: 'dhl' },
                  { label: 'FedEx Cross Border', value: 'fedex' },
                  { label: 'MailAmericas Logistics', value: 'mailamericas' },
                  { label: 'Gofo Express', value: 'gofo' },
                  { label: 'UPS Supply Chain', value: 'ups' },
                  { label: 'Genérico / Custom', value: 'custom' }
                ]}
              />

              <Input
                label="Límite de Peticiones (req/minuto)"
                type="number"
                value={keyForm.rateLimitPerMinute}
                onChange={(e) => setKeyForm({ ...keyForm, rateLimitPerMinute: Number(e.target.value) })}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <Button
                  onClick={() => setKeyModalOpen(false)}
                  variant="outline"
                  type="button"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-900 text-amber-300 hover:bg-purple-950 font-bold"
                >
                  Generar y Activar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
