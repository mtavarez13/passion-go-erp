import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { Franchise, Branch, UserProfile, WhatsAppPackage } from '../types';
import { Card, Button, Input, Badge, cn } from './ui';
import { 
  Building2, 
  Store, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Phone, 
  User, 
  Mail, 
  MessageSquare, 
  Package, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Truck,
  ArrowUpRight,
  Layers,
  X
} from 'lucide-react';

const FRANCHISE_TYPES = [
  { value: 'pickup_point', label: 'Punto de Recolección & Pick-Up', desc: 'Punto físico para que clientes retiren y dejen paquetes', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'franchise_hub', label: 'Centro de Distribución Franquiciado', desc: 'Hub regional con almacenamiento y reparto local', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'delivery_agency', label: 'Agencia de Entrega Aliada', desc: 'Negocio comercial afiliado a la red Passion Go', color: 'bg-amber-50 text-amber-700 border-amber-200' }
] as const;

export default function FranchiseManagement({ 
  profile,
  onNavigateToPackages
}: { 
  profile: UserProfile;
  onNavigateToPackages?: (franchiseId?: string) => void;
}) {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<WhatsAppPackage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSede, setFilterSede] = useState<string>(profile.role === 'Admin General' ? 'all' : (profile.sede || 'all'));
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Omit<Franchise, 'id' | 'createdAt' | 'updatedAt'>>({
    code: '',
    name: '',
    type: 'pickup_point',
    managerName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: 'Dajabón',
    province: 'Dajabón',
    assignedSede: profile.sede || 'Dajabón',
    coverageZones: [],
    commissionPerPackage: 50,
    status: 'active',
    openingHours: 'Lun - Sáb: 8:00 AM - 6:00 PM',
    notes: ''
  });
  
  const [zoneInput, setZoneInput] = useState('');
  const [selectedFranchiseDetail, setSelectedFranchiseDetail] = useState<Franchise | null>(null);

  useEffect(() => {
    // Listen to franchises
    const qFranchises = query(collection(db, 'franchises'));
    const unsubFranchises = onSnapshot(qFranchises, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Franchise));
      setFranchises(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      setLoading(false);
    });

    // Listen to branches
    const qBranches = query(collection(db, 'branches'));
    const unsubBranches = onSnapshot(qBranches, (snapshot) => {
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
    });

    // Listen to packages to compute package counts
    const qPackages = query(collection(db, 'packages'));
    const unsubPackages = onSnapshot(qPackages, (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppPackage)));
    });

    return () => {
      unsubFranchises();
      unsubBranches();
      unsubPackages();
    };
  }, []);

  const openNewModal = () => {
    setEditingFranchise(null);
    const randCode = `FQ-${(formData.city || 'RD').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    setFormData({
      code: randCode,
      name: '',
      type: 'pickup_point',
      managerName: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      city: 'Dajabón',
      province: 'Dajabón',
      assignedSede: profile.sede || (branches[0]?.nombre || 'Dajabón'),
      coverageZones: [],
      commissionPerPackage: 50,
      status: 'active',
      openingHours: 'Lun - Sáb: 8:00 AM - 6:00 PM',
      notes: ''
    });
    setZoneInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (franchise: Franchise) => {
    setEditingFranchise(franchise);
    setFormData({
      code: franchise.code || '',
      name: franchise.name || '',
      type: franchise.type || 'pickup_point',
      managerName: franchise.managerName || '',
      phone: franchise.phone || '',
      whatsapp: franchise.whatsapp || '',
      email: franchise.email || '',
      address: franchise.address || '',
      city: franchise.city || '',
      province: franchise.province || '',
      assignedSede: franchise.assignedSede || '',
      coverageZones: franchise.coverageZones || [],
      commissionPerPackage: franchise.commissionPerPackage ?? 50,
      status: franchise.status || 'active',
      openingHours: franchise.openingHours || 'Lun - Sáb: 8:00 AM - 6:00 PM',
      notes: franchise.notes || ''
    });
    setZoneInput('');
    setIsModalOpen(true);
  };

  const handleAddZone = () => {
    if (!zoneInput.trim()) return;
    if (formData.coverageZones.includes(zoneInput.trim())) return;
    setFormData(prev => ({
      ...prev,
      coverageZones: [...prev.coverageZones, zoneInput.trim()]
    }));
    setZoneInput('');
  };

  const handleRemoveZone = (zone: string) => {
    setFormData(prev => ({
      ...prev,
      coverageZones: prev.coverageZones.filter(z => z !== zone)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.address.trim()) {
      alert('Por favor completa el nombre, código y dirección de la franquicia.');
      return;
    }

    try {
      const now = new Date().toISOString();
      if (editingFranchise) {
        await updateDoc(doc(db, 'franchises', editingFranchise.id), {
          ...formData,
          updatedAt: now
        });
      } else {
        await addDoc(collection(db, 'franchises'), {
          ...formData,
          totalPackagesReceived: 0,
          totalPackagesDelivered: 0,
          createdAt: now,
          updatedAt: now
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving franchise:', err);
      alert('Hubo un error al guardar la franquicia.');
    }
  };

  const handleDelete = async (franchise: Franchise) => {
    if (confirm(`¿Estás seguro de eliminar la franquicia "${franchise.name}"?`)) {
      try {
        await deleteDoc(doc(db, 'franchises', franchise.id));
        if (selectedFranchiseDetail?.id === franchise.id) {
          setSelectedFranchiseDetail(null);
        }
      } catch (err) {
        console.error('Error deleting franchise:', err);
        alert('Error al eliminar la franquicia.');
      }
    }
  };

  // Compute live stats
  const filteredFranchises = franchises.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || f.type === filterType;
    const matchesSede = filterSede === 'all' || f.assignedSede === filterSede;

    return matchesSearch && matchesType && matchesSede;
  });

  const totalFranchises = franchises.length;
  const activeFranchises = franchises.filter(f => f.status === 'active').length;
  const totalPackagesAssigned = packages.filter(p => p.assignedFranchiseId).length;
  const totalCommissionsEstimated = franchises.reduce((acc, f) => {
    const count = packages.filter(p => p.assignedFranchiseId === f.id && p.estado === 'Entregado').length;
    return acc + (count * (f.commissionPerPackage || 50));
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-800 to-emerald-950 p-6 md:p-8 rounded-2xl text-white shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
            <Store size={14} />
            Red de Puntos y Franquicias Passion Go
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Franquicias & Puntos de Recolección</h1>
          <p className="text-zinc-300 text-sm max-w-2xl">
            Gestiona puntos autorizados de recolección (Drop-Off), centros de entrega Pick-Up y agencias aliadas para la red nacional de última milla.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={openNewModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/30 flex items-center gap-2"
          >
            <Plus size={18} />
            Nueva Franquicia / Punto
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-zinc-200 shadow-sm hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Franquicias</p>
              <h3 className="text-2xl font-bold text-zinc-900 mt-1">{totalFranchises}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">{activeFranchises} operando activamente</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Building2 size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-zinc-200 shadow-sm hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Puntos Pick-Up</p>
              <h3 className="text-2xl font-bold text-zinc-900 mt-1">
                {franchises.filter(f => f.type === 'pickup_point').length}
              </h3>
              <p className="text-xs text-blue-600 font-medium mt-1">Retiro directo para clientes</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Store size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-zinc-200 shadow-sm hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Paquetes en Red</p>
              <h3 className="text-2xl font-bold text-zinc-900 mt-1">{totalPackagesAssigned}</h3>
              <p className="text-xs text-purple-600 font-medium mt-1">Asignados a puntos y agencias</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Package size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-zinc-200 shadow-sm hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Comisiones Estimadas</p>
              <h3 className="text-2xl font-bold text-zinc-900 mt-1">RD$ {totalCommissionsEstimated.toLocaleString()}</h3>
              <p className="text-xs text-amber-600 font-medium mt-1">Generadas por entregas exitosas</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <DollarSign size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border-zinc-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, nombre, encargado, ciudad o dirección..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-700"
            >
              <option value="all">Todos los Tipos</option>
              <option value="pickup_point">Puntos Pick-Up</option>
              <option value="franchise_hub">Hubs Franquiciados</option>
              <option value="delivery_agency">Agencias Aliadas</option>
            </select>

            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-700"
            >
              <option value="all">Todas las Sedes</option>
              {branches.map(b => (
                <option key={b.id} value={b.nombre}>{b.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Franchises Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">Cargando franquicias y puntos de recolección...</div>
      ) : filteredFranchises.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-zinc-200">
          <Store className="mx-auto text-zinc-300 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-zinc-800">No se encontraron franquicias</h3>
          <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
            {searchTerm || filterType !== 'all' || filterSede !== 'all'
              ? 'Prueba a cambiar los filtros o el término de búsqueda.'
              : 'Comienza creando la primera franquicia o punto de recolección autorizado.'}
          </p>
          <Button onClick={openNewModal} className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white">
            Crear Primera Franquicia
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFranchises.map((franchise) => {
            const typeConfig = FRANCHISE_TYPES.find(t => t.value === franchise.type) || FRANCHISE_TYPES[0];
            const franchisePkgs = packages.filter(p => p.assignedFranchiseId === franchise.id);
            const deliveredCount = franchisePkgs.filter(p => p.estado === 'Entregado').length;
            const pendingCount = franchisePkgs.filter(p => p.estado !== 'Entregado').length;

            return (
              <Card 
                key={franchise.id}
                className={cn(
                  "p-6 flex flex-col justify-between border-zinc-200 shadow-sm hover:shadow-md transition-all hover:border-emerald-300 group",
                  selectedFranchiseDetail?.id === franchise.id && "ring-2 ring-emerald-500 border-emerald-500"
                )}
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200">
                          {franchise.code}
                        </span>
                        <Badge variant={franchise.status === 'active' ? 'success' : franchise.status === 'pending' ? 'warning' : 'neutral'}>
                          {franchise.status === 'active' ? 'Activa' : franchise.status === 'pending' ? 'En Proceso' : 'Inactiva'}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 mt-1 group-hover:text-emerald-700 transition-colors">
                        {franchise.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(franchise)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                        title="Editar franquicia"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(franchise)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar franquicia"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className={cn("text-xs px-2.5 py-1 rounded-md border font-medium", typeConfig.color)}>
                    {typeConfig.label}
                  </div>

                  {/* Location & Details */}
                  <div className="space-y-2 text-sm text-zinc-600 border-y border-zinc-100 py-3">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                      <span className="text-xs leading-relaxed">{franchise.address}, {franchise.city} ({franchise.assignedSede})</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-zinc-400 shrink-0" />
                      <span className="text-xs font-medium text-zinc-800">{franchise.managerName || 'Sin encargado'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-zinc-700">
                        <Phone size={14} className="text-zinc-400" />
                        <span>{franchise.phone || 'N/A'}</span>
                      </div>
                      {franchise.whatsapp && (
                        <a 
                          href={`https://wa.me/${franchise.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <MessageSquare size={13} />
                          WhatsApp
                        </a>
                      )}
                    </div>

                    {franchise.openingHours && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Clock size={14} className="text-zinc-400" />
                        <span>{franchise.openingHours}</span>
                      </div>
                    )}
                  </div>

                  {/* Coverage Zones */}
                  {franchise.coverageZones && franchise.coverageZones.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Zonas de Cobertura:</p>
                      <div className="flex flex-wrap gap-1">
                        {franchise.coverageZones.map((z, idx) => (
                          <span key={idx} className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200">
                            {z}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operational Stats */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/60 text-center">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">Pendientes</p>
                      <p className="text-base font-bold text-amber-600">{pendingCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">Entregados</p>
                      <p className="text-base font-bold text-emerald-600">{deliveredCount}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-2 flex items-center justify-between border-t border-zinc-100">
                  <div className="text-xs text-zinc-500 font-medium">
                    Comisión: <strong className="text-zinc-900">RD$ {franchise.commissionPerPackage ?? 50}</strong> / paq.
                  </div>

                  {onNavigateToPackages && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigateToPackages(franchise.id)}
                      className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1"
                    >
                      Ver Paquetes
                      <ChevronRight size={14} />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 my-8">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Store className="text-emerald-600" size={24} />
                <h3 className="text-xl font-bold text-zinc-900">
                  {editingFranchise ? 'Editar Franquicia / Punto' : 'Nueva Franquicia / Punto de Recolección'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código Identificador"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ej: FQ-DAJ-01"
                  required
                />

                <Input
                  label="Nombre de la Franquicia / Punto"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Punto Pick-up Dajabón Centro"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Tipo de Establecimiento</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="pickup_point">Punto de Recolección & Pick-Up</option>
                    <option value="franchise_hub">Centro de Distribución Franquiciado</option>
                    <option value="delivery_agency">Agencia de Entrega Aliada</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Sede Matriz Asignada</label>
                  <select
                    value={formData.assignedSede}
                    onChange={(e) => setFormData({ ...formData, assignedSede: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.nombre}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre del Encargado / Franquiciado"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  placeholder="Ej: Lic. Carlos Mendoza"
                  required
                />

                <Input
                  label="Teléfono Principal"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: 809-555-0199"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="WhatsApp Oficial"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="Ej: 809-555-0199"
                />

                <Input
                  label="Correo Electrónico (Opcional)"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="franquicia@passiongo.com"
                  type="email"
                />
              </div>

              <Input
                label="Dirección Completa del Punto"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ej: Calle Duarte #45, casi esq. Beller"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Ciudad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Dajabón"
                />

                <Input
                  label="Provincia"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="Dajabón"
                />

                <Input
                  label="Comisión por Paquete (RD$)"
                  type="number"
                  value={formData.commissionPerPackage}
                  onChange={(e) => setFormData({ ...formData, commissionPerPackage: Number(e.target.value) })}
                  placeholder="50"
                />
              </div>

              {/* Coverage Zones Tag Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Zonas de Cobertura / Entrega</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={zoneInput}
                    onChange={(e) => setZoneInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddZone(); } }}
                    placeholder="Escribe una zona y presiona Enter (Ej: Los Miches)"
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <Button type="button" onClick={handleAddZone} variant="outline" size="sm">
                    Agregar Zona
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.coverageZones.map((z) => (
                    <span key={z} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md">
                      {z}
                      <button type="button" onClick={() => handleRemoveZone(z)} className="hover:text-red-600">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {formData.coverageZones.length === 0 && (
                    <p className="text-xs text-zinc-400 italic">No hay zonas agregadas aún.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Horario de Atención"
                  value={formData.openingHours || ''}
                  onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                  placeholder="Lun - Sáb: 8:00 AM - 6:00 PM"
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado Operativo</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="active">Activa / Operando</option>
                    <option value="pending">En Proceso de Apertura</option>
                    <option value="inactive">Inactiva / Pausada</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  {editingFranchise ? 'Actualizar Franquicia' : 'Guardar Franquicia'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
