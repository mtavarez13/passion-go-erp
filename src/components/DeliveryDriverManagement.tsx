import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DeliveryDriver, Branch, Franchise, UserProfile, WhatsAppPackage } from '../types';
import { Card, Button, Input, Badge, cn } from './ui';
import { 
  Truck, 
  Bike, 
  Car, 
  User, 
  Phone, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Send, 
  Package, 
  Smartphone, 
  Navigation, 
  Building2,
  Calendar,
  X,
  ExternalLink,
  Camera,
  Key,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  Copy,
  Check
} from 'lucide-react';

// Safe helper to get or initialize secondary app for driver account creation without disconnecting admin
function getSecondaryDriverAuth() {
  try {
    const existing = getApps().find(app => app.name === 'SecondaryDriver');
    if (existing) {
      return getAuth(existing);
    }
    const newApp = initializeApp(firebaseConfig, 'SecondaryDriver');
    return getAuth(newApp);
  } catch (e) {
    console.error('Error getting secondary driver auth:', e);
    return getAuth();
  }
}

const VEHICLE_CONFIG: Record<DeliveryDriver['vehicleType'], { label: string; icon: any; color: string }> = {
  motorcycle: { label: 'Motocicleta', icon: Bike, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  van: { label: 'Furgoneta', icon: Truck, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  car: { label: 'Automóvil', icon: Car, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  bicycle: { label: 'Bicicleta', icon: Bike, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  light_truck: { label: 'Camión Liviano', icon: Truck, color: 'text-orange-600 bg-orange-50 border-orange-200' }
};

export default function DeliveryDriverManagement({ 
  profile,
  onOpenDriverPortal,
  onNavigateToPackages
}: { 
  profile: UserProfile;
  onOpenDriverPortal?: (driverId: string) => void;
  onNavigateToPackages?: () => void;
}) {
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [packages, setPackages] = useState<WhatsAppPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSede, setFilterSede] = useState<string>(profile.role === 'Admin General' ? 'all' : (profile.sede || 'all'));

  // Driver Edit/Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null);
  const [driverFormData, setDriverFormData] = useState<Omit<DeliveryDriver, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    phone: '',
    email: '',
    cedula: '',
    accessPin: '',
    loginEmail: '',
    vehicleType: 'motorcycle',
    vehiclePlate: '',
    assignedSede: profile.sede || 'Dajabón',
    assignedFranchiseId: '',
    assignedFranchiseName: '',
    assignedZones: [],
    status: 'active',
    notes: ''
  });
  const [zoneInput, setZoneInput] = useState('');

  // Password / Credentials Management Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetDriverForPassword, setTargetDriverForPassword] = useState<DeliveryDriver | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dispatch / Assign Packages Modal
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedDriverForDispatch, setSelectedDriverForDispatch] = useState<DeliveryDriver | null>(null);
  const [selectedPackageIdsToAssign, setSelectedPackageIdsToAssign] = useState<string[]>([]);
  const [dispatchSearchTerm, setDispatchSearchTerm] = useState('');

  useEffect(() => {
    // Listen to drivers
    const qDrivers = query(collection(db, 'delivery_drivers'));
    const unsubDrivers = onSnapshot(qDrivers, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryDriver));
      setDrivers(list.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    });

    // Listen to branches
    const qBranches = query(collection(db, 'branches'));
    const unsubBranches = onSnapshot(qBranches, (snapshot) => {
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch)));
    });

    // Listen to franchises
    const qFranchises = query(collection(db, 'franchises'));
    const unsubFranchises = onSnapshot(qFranchises, (snapshot) => {
      setFranchises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Franchise)));
    });

    // Listen to packages
    const qPackages = query(collection(db, 'packages'));
    const unsubPackages = onSnapshot(qPackages, (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppPackage)));
    });

    return () => {
      unsubDrivers();
      unsubBranches();
      unsubFranchises();
      unsubPackages();
    };
  }, []);

  const openNewDriverModal = () => {
    setEditingDriver(null);
    setDriverFormData({
      name: '',
      phone: '',
      email: '',
      cedula: '',
      accessPin: '',
      loginEmail: '',
      vehicleType: 'motorcycle',
      vehiclePlate: '',
      assignedSede: profile.sede || (branches[0]?.nombre || 'Dajabón'),
      assignedFranchiseId: '',
      assignedFranchiseName: '',
      assignedZones: [],
      status: 'active',
      notes: ''
    });
    setZoneInput('');
    setIsModalOpen(true);
  };

  const openEditDriverModal = (driver: DeliveryDriver) => {
    setEditingDriver(driver);
    setDriverFormData({
      name: driver.name || '',
      phone: driver.phone || '',
      email: driver.email || '',
      cedula: driver.cedula || '',
      accessPin: driver.accessPin || '',
      loginEmail: driver.loginEmail || '',
      vehicleType: driver.vehicleType || 'motorcycle',
      vehiclePlate: driver.vehiclePlate || '',
      assignedSede: driver.assignedSede || '',
      assignedFranchiseId: driver.assignedFranchiseId || '',
      assignedFranchiseName: driver.assignedFranchiseName || '',
      assignedZones: driver.assignedZones || [],
      status: driver.status || 'active',
      notes: driver.notes || ''
    });
    setZoneInput('');
    setIsModalOpen(true);
  };

  // Open Password & Credential Modal
  const openPasswordModal = (driver: DeliveryDriver) => {
    setTargetDriverForPassword(driver);
    setNewPassword('');
    setNewPin(driver.accessPin || '');
    setShowPassword(false);
    setCopiedKey(null);
    setIsPasswordModalOpen(true);
  };

  // Save new Password / PIN for driver
  const handleUpdateDriverCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDriverForPassword) return;

    setIsSavingPassword(true);
    try {
      const now = new Date().toISOString();
      const driverEmail = targetDriverForPassword.loginEmail || 
                          targetDriverForPassword.email || 
                          `driver.${targetDriverForPassword.phone.replace(/\D/g, '') || targetDriverForPassword.id.slice(0, 6)}@passiongo.com`;

      // 1. If password was provided, update Auth account or create user
      if (newPassword.trim()) {
        const idToken = await getAuth().currentUser?.getIdToken();
        
        // Check if there is an existing user in 'users' collection linked to this driver
        let targetUid = targetDriverForPassword.authUid;
        if (!targetUid) {
          const userSnap = await getDocs(query(collection(db, 'users'), where('driverId', '==', targetDriverForPassword.id)));
          if (!userSnap.empty) {
            targetUid = userSnap.docs[0].id;
          }
        }

        if (targetUid && idToken) {
          // Update existing Auth password via API
          const response = await fetch('/api/admin/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: targetUid,
              newPassword: newPassword.trim(),
              idToken
            })
          });

          const resData = await response.json();
          if (!response.ok) {
            throw new Error(resData.error || 'No se pudo actualizar la contraseña en el servidor.');
          }
        } else {
          // Create new user account in secondary Auth
          try {
            const secAuth = getSecondaryDriverAuth();
            const userCred = await createUserWithEmailAndPassword(secAuth, driverEmail, newPassword.trim());
            targetUid = userCred.user.uid;

            // Create/update user document
            await setDoc(doc(db, 'users', targetUid), {
              uid: targetUid,
              email: driverEmail,
              role: 'Repartidor',
              sede: targetDriverForPassword.assignedSede,
              driverId: targetDriverForPassword.id,
              displayName: targetDriverForPassword.name,
              phone: targetDriverForPassword.phone,
              enabledModules: ['driver-portal'],
              createdAt: now,
              updatedAt: now
            });
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // Try updating if already exists
              console.warn('Email already registered, updating Firestore record...');
            } else {
              throw createErr;
            }
          }
        }
      }

      // 2. Update delivery_drivers document with PIN and Auth references
      await updateDoc(doc(db, 'delivery_drivers', targetDriverForPassword.id), {
        accessPin: newPin.trim() || targetDriverForPassword.accessPin || '',
        loginEmail: driverEmail,
        updatedAt: now
      });

      alert(`✅ ¡Credenciales y contraseña de acceso para ${targetDriverForPassword.name} actualizadas correctamente!`);
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      console.error('Error updating driver password:', err);
      alert('Error al modificar la contraseña del repartidor: ' + (err.message || err));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAddZone = () => {
    if (!zoneInput.trim()) return;
    if (driverFormData.assignedZones.includes(zoneInput.trim())) return;
    setDriverFormData(prev => ({
      ...prev,
      assignedZones: [...prev.assignedZones, zoneInput.trim()]
    }));
    setZoneInput('');
  };

  const handleRemoveZone = (zone: string) => {
    setDriverFormData(prev => ({
      ...prev,
      assignedZones: prev.assignedZones.filter(z => z !== zone)
    }));
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverFormData.name.trim() || !driverFormData.phone.trim()) {
      alert('Nombre y teléfono son obligatorios.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const franchise = franchises.find(f => f.id === driverFormData.assignedFranchiseId);
      const dataToSave = {
        ...driverFormData,
        assignedFranchiseName: franchise ? franchise.name : '',
        updatedAt: now
      };

      if (editingDriver) {
        await updateDoc(doc(db, 'delivery_drivers', editingDriver.id), dataToSave);
      } else {
        await addDoc(collection(db, 'delivery_drivers'), {
          ...dataToSave,
          activeDeliveriesCount: 0,
          totalDeliveredCount: 0,
          createdAt: now
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving driver:', err);
      alert('Error al guardar el repartidor.');
    }
  };

  const handleDeleteDriver = async (driver: DeliveryDriver) => {
    if (confirm(`¿Estás seguro de eliminar al repartidor ${driver.name}?`)) {
      try {
        await deleteDoc(doc(db, 'delivery_drivers', driver.id));
      } catch (err) {
        console.error('Error deleting driver:', err);
        alert('Error al eliminar el repartidor.');
      }
    }
  };

  // Open Dispatch Modal for a specific driver
  const openDispatchModal = (driver: DeliveryDriver) => {
    setSelectedDriverForDispatch(driver);
    setSelectedPackageIdsToAssign([]);
    setDispatchSearchTerm('');
    setIsDispatchModalOpen(true);
  };

  const handleTogglePackageSelection = (pkgId: string) => {
    setSelectedPackageIdsToAssign(prev => 
      prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]
    );
  };

  const handleConfirmDispatch = async () => {
    if (!selectedDriverForDispatch || selectedPackageIdsToAssign.length === 0) return;

    try {
      const now = new Date().toISOString();
      for (const pkgId of selectedPackageIdsToAssign) {
        await updateDoc(doc(db, 'packages', pkgId), {
          assignedDriverId: selectedDriverForDispatch.id,
          assignedDriverName: selectedDriverForDispatch.name,
          assignedDriverPhone: selectedDriverForDispatch.phone,
          deliveryStatus: 'assigned',
          updatedAt: now
        });
      }

      // Update driver status to on_route if was active
      if (selectedDriverForDispatch.status === 'active') {
        await updateDoc(doc(db, 'delivery_drivers', selectedDriverForDispatch.id), {
          status: 'on_route',
          updatedAt: now
        });
      }

      alert(`¡Se asignaron con éxito ${selectedPackageIdsToAssign.length} paquetes a ${selectedDriverForDispatch.name}!`);
      setIsDispatchModalOpen(false);
    } catch (err) {
      console.error('Error assigning packages:', err);
      alert('Error al asignar los paquetes.');
    }
  };

  // Filtered drivers
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.cedula && d.cedula.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchesSede = filterSede === 'all' || d.assignedSede === filterSede;

    return matchesSearch && matchesStatus && matchesSede;
  });

  // Unassigned packages available for dispatch
  const unassignedPackages = packages.filter(p => 
    p.estado !== 'Entregado' && 
    p.estado !== 'Pagado' &&
    (!p.assignedDriverId || p.assignedDriverId === '') &&
    (selectedDriverForDispatch ? p.sede === selectedDriverForDispatch.assignedSede || !selectedDriverForDispatch.assignedSede : true)
  );

  const filteredUnassignedPackages = unassignedPackages.filter(p => {
    const q = dispatchSearchTerm.toLowerCase();
    return p.cod.toLowerCase().includes(q) ||
      p.cliente.toLowerCase().includes(q) ||
      p.telefono.toLowerCase().includes(q) ||
      p.zona.toLowerCase().includes(q) ||
      p.tienda.toLowerCase().includes(q);
  });

  const totalDrivers = drivers.length;
  const onRouteDrivers = drivers.filter(d => d.status === 'on_route').length;
  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const totalAssignedPackages = packages.filter(p => p.assignedDriverId && p.estado !== 'Entregado').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-800 to-blue-950 p-6 md:p-8 rounded-2xl text-white shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
            <Truck size={14} />
            Flota de Entregas & Despacho
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Repartidores & Control de Rutas</h1>
          <p className="text-zinc-300 text-sm max-w-2xl">
            Crea y administra repartidores de última milla, asigna paquetes por zonas y franquicias, y supervisa el estado de entrega en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={openNewDriverModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-900/30 flex items-center gap-2"
          >
            <Plus size={18} />
            Nuevo Repartidor
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-zinc-200 shadow-sm hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Repartidores</p>
              <h3 className="text-2xl font-bold text-zinc-900 mt-1">{totalDrivers}</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">Registrados en el sistema</p>
            </div>
            <div className="p-3 bg-zinc-100 text-zinc-700 rounded-xl">
              <User size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-zinc-200 shadow-sm hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">En Ruta de Entrega</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{onRouteDrivers}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">Repartiendo actualmente</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Navigation size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-zinc-200 shadow-sm hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Disponibles</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{activeDrivers}</h3>
              <p className="text-xs text-blue-600 font-medium mt-1">Listos para asignación</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Clock size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-zinc-200 shadow-sm hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Paquetes Asignados</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">{totalAssignedPackages}</h3>
              <p className="text-xs text-purple-600 font-medium mt-1">En curso de entrega</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Package size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 border-zinc-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, teléfono, placa o cédula..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-700"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Disponible</option>
              <option value="on_route">En Ruta</option>
              <option value="off_duty">Fuera de Servicio</option>
              <option value="inactive">Inactivo</option>
            </select>

            <select
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-700"
            >
              <option value="all">Todas las Sedes</option>
              {branches.map(b => (
                <option key={b.id} value={b.nombre}>{b.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Drivers Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">Cargando repartidores de última milla...</div>
      ) : filteredDrivers.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-zinc-200">
          <Truck className="mx-auto text-zinc-300 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-zinc-800">No se encontraron repartidores</h3>
          <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
            {searchTerm || filterStatus !== 'all' || filterSede !== 'all'
              ? 'Prueba a modificar los filtros de búsqueda.'
              : 'Registra a tus primeros repartidores o mensajeros de entrega.'}
          </p>
          <Button onClick={openNewDriverModal} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white">
            Crear Repartidor
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((driver) => {
            const vehicleInfo = VEHICLE_CONFIG[driver.vehicleType] || VEHICLE_CONFIG.motorcycle;
            const VehicleIcon = vehicleInfo.icon;
            const driverPkgs = packages.filter(p => p.assignedDriverId === driver.id);
            const activeDeliveries = driverPkgs.filter(p => p.estado !== 'Entregado' && p.estado !== 'Pagado');
            const completedDeliveries = driverPkgs.filter(p => p.estado === 'Entregado' || p.estado === 'Pagado');

            return (
              <Card 
                key={driver.id}
                className="p-6 flex flex-col justify-between border-zinc-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 group"
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 group-hover:text-blue-700 transition-colors">
                          {driver.name}
                        </h3>
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-zinc-400" />
                          {driver.assignedSede} {driver.assignedFranchiseName ? `• ${driver.assignedFranchiseName}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openPasswordModal(driver)}
                        className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        title="Modificar Contraseña / PIN de acceso"
                      >
                        <Key size={16} />
                      </button>
                      <button 
                        onClick={() => openEditDriverModal(driver)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                        title="Editar repartidor"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteDriver(driver)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar repartidor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium", vehicleInfo.color)}>
                      <VehicleIcon size={12} />
                      {vehicleInfo.label} {driver.vehiclePlate ? `(${driver.vehiclePlate})` : ''}
                    </span>

                    <Badge variant={
                      driver.status === 'on_route' ? 'warning' :
                      driver.status === 'active' ? 'success' :
                      driver.status === 'off_duty' ? 'neutral' : 'danger'
                    }>
                      {driver.status === 'on_route' ? 'En Ruta' :
                       driver.status === 'active' ? 'Disponible' :
                       driver.status === 'off_duty' ? 'Descanso' : 'Inactivo'}
                    </Badge>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 text-xs text-zinc-600 border-y border-zinc-100 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Teléfono:</span>
                      <a 
                        href={`tel:${driver.phone}`}
                        className="font-semibold text-zinc-800 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Phone size={12} />
                        {driver.phone}
                      </a>
                    </div>
                    {driver.cedula && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Cédula:</span>
                        <span className="font-mono text-zinc-800">{driver.cedula}</span>
                      </div>
                    )}
                    {driver.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Email:</span>
                        <span className="text-zinc-800">{driver.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Zones */}
                  {driver.assignedZones && driver.assignedZones.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Zonas Asignadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {driver.assignedZones.map((z, idx) => (
                          <span key={idx} className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200">
                            {z}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/60 text-center">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">En Reparto</p>
                      <p className="text-base font-bold text-blue-600">{activeDeliveries.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">Entregados</p>
                      <p className="text-base font-bold text-emerald-600">{completedDeliveries.length}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-2 grid grid-cols-2 gap-2 border-t border-zinc-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDispatchModal(driver)}
                    className="w-full text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 flex items-center justify-center gap-1.5"
                  >
                    <Package size={14} />
                    Asignar Carga
                  </Button>

                  {onOpenDriverPortal && (
                    <Button
                      size="sm"
                      onClick={() => onOpenDriverPortal(driver.id)}
                      className="w-full text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center gap-1.5"
                    >
                      <Smartphone size={14} />
                      App Repartidor
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Driver Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 my-8">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Truck className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-zinc-900">
                  {editingDriver ? 'Editar Repartidor' : 'Nuevo Repartidor de Última Milla'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre Completo"
                  value={driverFormData.name}
                  onChange={(e) => setDriverFormData({ ...driverFormData, name: e.target.value })}
                  placeholder="Ej: José Manuel Rosario"
                  required
                />

                <Input
                  label="Teléfono / WhatsApp"
                  value={driverFormData.phone}
                  onChange={(e) => setDriverFormData({ ...driverFormData, phone: e.target.value })}
                  placeholder="Ej: 809-555-0144"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Cédula de Identidad (Opcional)"
                  value={driverFormData.cedula || ''}
                  onChange={(e) => setDriverFormData({ ...driverFormData, cedula: e.target.value })}
                  placeholder="001-0000000-0"
                />

                <Input
                  label="Correo Electrónico (Opcional)"
                  value={driverFormData.email || ''}
                  onChange={(e) => setDriverFormData({ ...driverFormData, email: e.target.value })}
                  placeholder="repartidor@passiongo.com"
                  type="email"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Tipo de Vehículo</label>
                  <select
                    value={driverFormData.vehicleType}
                    onChange={(e) => setDriverFormData({ ...driverFormData, vehicleType: e.target.value as any })}
                    className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="motorcycle">Motocicleta</option>
                    <option value="van">Furgoneta</option>
                    <option value="car">Automóvil</option>
                    <option value="bicycle">Bicicleta</option>
                    <option value="light_truck">Camión Liviano</option>
                  </select>
                </div>

                <Input
                  label="Número de Placa / Matrícula"
                  value={driverFormData.vehiclePlate || ''}
                  onChange={(e) => setDriverFormData({ ...driverFormData, vehiclePlate: e.target.value })}
                  placeholder="Ej: K098765"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Sede Asignada</label>
                  <select
                    value={driverFormData.assignedSede}
                    onChange={(e) => setDriverFormData({ ...driverFormData, assignedSede: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.nombre}>{b.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Franquicia / Punto Asociado (Opcional)</label>
                  <select
                    value={driverFormData.assignedFranchiseId || ''}
                    onChange={(e) => setDriverFormData({ ...driverFormData, assignedFranchiseId: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Ninguna / Directo de Sede Matriz</option>
                    {franchises.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coverage Zones */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Zonas de Reparto Asignadas</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={zoneInput}
                    onChange={(e) => setZoneInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddZone(); } }}
                    placeholder="Escribe la zona y pulsa Enter (Ej: Centro Ciudad, Los Miches)"
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <Button type="button" onClick={handleAddZone} variant="outline" size="sm">
                    Agregar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {driverFormData.assignedZones.map((z) => (
                    <span key={z} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md">
                      {z}
                      <button type="button" onClick={() => handleRemoveZone(z)} className="hover:text-red-600">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado Operativo</label>
                <select
                  value={driverFormData.status}
                  onChange={(e) => setDriverFormData({ ...driverFormData, status: e.target.value as any })}
                  className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="active">Disponible para Entregas</option>
                  <option value="on_route">En Ruta de Reparto</option>
                  <option value="off_duty">Fuera de Servicio / Descanso</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                  {editingDriver ? 'Actualizar Repartidor' : 'Registrar Repartidor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Assignment Modal */}
      {isDispatchModalOpen && selectedDriverForDispatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-zinc-200 my-8">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <Package className="text-blue-600" size={22} />
                  Asignar Paquetes a {selectedDriverForDispatch.name}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Sede: <strong>{selectedDriverForDispatch.assignedSede}</strong> • Tel: {selectedDriverForDispatch.phone}
                </p>
              </div>
              <button 
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search within dispatch */}
            <div className="mb-4">
              <input
                type="text"
                value={dispatchSearchTerm}
                onChange={(e) => setDispatchSearchTerm(e.target.value)}
                placeholder="Filtrar paquetes por código, cliente, zona o tienda..."
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Selection Counter */}
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-lg mb-4 text-xs font-semibold">
              <span>{selectedPackageIdsToAssign.length} paquetes seleccionados para asignación inmediata</span>
              {selectedPackageIdsToAssign.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setSelectedPackageIdsToAssign([])}
                  className="text-blue-700 hover:underline"
                >
                  Limpiar selección
                </button>
              )}
            </div>

            {/* Packages List */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-100">
              {filteredUnassignedPackages.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-sm">
                  No hay paquetes pendientes sin asignar disponibles para esta sede.
                </div>
              ) : (
                filteredUnassignedPackages.map((pkg) => {
                  const isSelected = selectedPackageIdsToAssign.includes(pkg.id);
                  return (
                    <div 
                      key={pkg.id}
                      onClick={() => handleTogglePackageSelection(pkg.id)}
                      className={cn(
                        "p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all border",
                        isSelected 
                          ? "bg-blue-50/80 border-blue-300 text-blue-950" 
                          : "hover:bg-zinc-50 border-transparent text-zinc-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePackageSelection(pkg.id)}
                          className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">
                              {pkg.cod}
                            </span>
                            <span className="font-semibold text-sm">{pkg.cliente}</span>
                            <span className="text-xs text-zinc-500">({pkg.telefono})</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Zona: <strong className="text-zinc-700">{pkg.zona}</strong> • Tienda: {pkg.tienda} • {pkg.articulo}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-sm text-zinc-900">RD$ {pkg.costo?.toLocaleString() || '0'}</p>
                        <span className="text-[10px] text-zinc-400">Por cobrar</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-zinc-100">
              <Button type="button" variant="outline" onClick={() => setIsDispatchModalOpen(false)}>
                Cancelar
              </Button>

              <Button 
                type="button" 
                onClick={handleConfirmDispatch}
                disabled={selectedPackageIdsToAssign.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2"
              >
                <Send size={16} />
                Confirmar Despacho ({selectedPackageIdsToAssign.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Password / PIN Management Modal */}
      {isPasswordModalOpen && targetDriverForPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 my-8">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">
                    Gestionar Contraseña de Acceso
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Repartidor: <strong className="text-zinc-800">{targetDriverForPassword.name}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateDriverCredentials} className="space-y-4">
              {/* Account Info Box */}
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Usuario / Correo de Login:</span>
                  <div className="flex items-center gap-1.5 font-mono font-semibold text-zinc-800">
                    <span>
                      {targetDriverForPassword.loginEmail || 
                       targetDriverForPassword.email || 
                       `driver.${targetDriverForPassword.phone.replace(/\D/g, '') || targetDriverForPassword.id.slice(0, 6)}@passiongo.com`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const emailToCopy = targetDriverForPassword.loginEmail || targetDriverForPassword.email || `driver.${targetDriverForPassword.phone.replace(/\D/g, '') || targetDriverForPassword.id.slice(0, 6)}@passiongo.com`;
                        navigator.clipboard.writeText(emailToCopy);
                        setCopiedKey('email');
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="text-zinc-400 hover:text-zinc-700"
                      title="Copiar correo de acceso"
                    >
                      {copiedKey === 'email' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Sede Operativa:</span>
                  <span className="font-semibold text-zinc-800">{targetDriverForPassword.assignedSede}</span>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                  <span>Nueva Contraseña de Acceso</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Mínimo 6 caracteres</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Escribe la nueva contraseña para el repartidor"
                    minLength={6}
                    className="w-full px-3 py-2 pr-10 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  El repartidor usará esta contraseña para iniciar sesión en la App Móvil o Portal de Reparto.
                </p>
              </div>

              {/* Quick PIN Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                  <span>PIN Rápido de Validación / Desbloqueo (Opcional)</span>
                  <span className="text-[10px] text-zinc-400 font-normal">4 a 6 dígitos</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 1234"
                    className="w-full px-3 py-2 font-mono tracking-widest text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Código numérico para confirmación rápida en ruta y firmas digitales.
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Lock className="shrink-0 text-amber-600 mt-0.5" size={16} />
                <p>
                  Como Administrador tienes control total para restablecer el acceso de tus repartidores en cualquier momento sin requerir confirmación por correo.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSavingPassword}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSavingPassword || (!newPassword.trim() && !newPin.trim())}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-2"
                >
                  {isSavingPassword ? (
                    <span>Guardando cambios...</span>
                  ) : (
                    <>
                      <Key size={16} />
                      Guardar Nueva Contraseña
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
