import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, query, collection, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile, Sede, Module } from '../types';
import Auth from './Auth';
import PassionGoPortal from './PassionGoPortal';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Receipt, 
  Package, 
  Calculator, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  ChevronRight,
  Building2,
  Users,
  BarChart3,
  Truck,
  Globe,
  Zap,
  Store,
  Smartphone
} from 'lucide-react';
import { Button, cn } from './ui';
import WhatsAppModule from './WhatsAppModule';
import AccountingModule from './AccountingModule';
import InventoryModule from './InventoryModule';
import CashClosureModule from './CashClosureModule';
import BranchManagement from './BranchManagement';
import UserManagement from './UserManagement';
import PackagesModule from './PackagesModule';
import ApiPanel from './ApiPanel';
import FranchiseManagement from './FranchiseManagement';
import DeliveryDriverManagement from './DeliveryDriverManagement';
import DriverPortal from './DriverPortal';

export default function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'passion-go' | 'dashboard' | 'whatsapp' | 'accounting' | 'inventory' | 'cash' | 'branches' | 'users' | 'packages' | 'api-panel' | 'franchises' | 'delivery-drivers' | 'driver-portal'
  >('passion-go');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (u) {
        console.log('Auth state changed: User logged in', u.email, u.uid);
        
        const setupProfileListener = () => {
          if (unsubscribeProfile) unsubscribeProfile();
          unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), async (docSnap) => {
            setError(null);
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              console.log(`Profile updated (Real-time from ${u.uid}):`, data);
              
              // Auto-promote primary admin if needed
              if (u.email === 'martin.tavarez.gomez@gmail.com' && u.emailVerified && data.role !== 'Admin General') {
                await updateDoc(doc(db, 'users', u.uid), { role: 'Admin General' });
              } else {
                setProfile(data);
                // If role is Repartidor, default to driver portal
                if (data.role === 'Repartidor') {
                  setActiveTab('driver-portal');
                }
                setLoading(false);
              }
            } else {
              console.log(`Profile document ${u.uid} does not exist yet`);
              await handleProfileSync(u);
            }
          }, (error) => {
            console.error('Profile listener error:', error);
            setError('Error al cargar el perfil. Por favor, intenta de nuevo.');
            setLoading(false);
          });
        };

        const handleProfileSync = async (user: User) => {
          try {
            const primary = user.email === 'martin.tavarez.gomez@gmail.com' && user.emailVerified;
            const email = user.email?.toLowerCase() || '';
            const invitation = await getDoc(doc(db, 'user_access', email));
            if (!primary && !invitation.exists()) {
              setError('Tu cuenta aún no tiene acceso. Solicita autorización al Administrador General.');
              setLoading(false);
              return;
            }
            const access = invitation.exists() ? invitation.data() : {};
            await setDoc(doc(db, 'users', user.uid), {
              ...access,
              uid: user.uid,
              email,
              role: primary ? 'Admin General' : access.role,
              enabledModules: primary ? ['whatsapp', 'accounting', 'inventory', 'cash', 'branches', 'packages', 'api-panel', 'franchises', 'delivery-drivers', 'driver-portal'] : access.enabledModules || [],
              sede: access.sede || 'Principal',
              createdAt: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error syncing profile:', error);
            setError('No se pudo verificar el acceso. Revisa las reglas de Firebase.');
            setLoading(false);
          }
        };

        setupProfileListener();
      } else {
        console.log('Auth state changed: User logged out');
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const isGeneralAdmin = profile?.role === 'Admin General';
  const isAdmin = isGeneralAdmin || profile?.role === 'Admin';
  const isDriver = profile?.role === 'Repartidor';

  const navItems = React.useMemo(() => [
    { id: 'passion-go', label: 'Portal Passion Go', icon: Truck },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(isAdmin || profile?.enabledModules?.includes('api-panel') ? [{ id: 'api-panel', label: 'Conexión APIs & 3PL', icon: Zap }] : []),
    ...(isAdmin || profile?.enabledModules?.includes('franchises') ? [{ id: 'franchises', label: 'Franquicias & Puntos', icon: Store }] : []),
    ...(isAdmin || profile?.enabledModules?.includes('delivery-drivers') ? [{ id: 'delivery-drivers', label: 'Repartidores Última Milla', icon: Truck }] : []),
    ...(isAdmin || isDriver || profile?.enabledModules?.includes('driver-portal') ? [{ id: 'driver-portal', label: 'App Móvil Repartidor', icon: Smartphone }] : []),
    ...(isAdmin || profile?.enabledModules?.includes('packages') ? [{ id: 'packages', label: 'Paquetes & Facturación', icon: Receipt }] : []),
    ...(isAdmin || profile?.enabledModules?.includes('whatsapp') ? [{ id: 'whatsapp', label: 'WhatsApp Bot', icon: MessageSquare }] : []),
    ...(isAdmin || profile?.enabledModules?.includes('accounting') ? [{ id: 'accounting', label: 'Contabilidad', icon: Calculator }] : []),
    ...(isAdmin || profile?.enabledModules?.includes('inventory') ? [{ id: 'inventory', label: 'Inventario', icon: Package }] : []),
    ...(isAdmin || profile?.enabledModules?.includes('cash') ? [{ id: 'cash', label: 'Cierre de Caja', icon: BarChart3 }] : []),
    ...(isAdmin ? [
      { id: 'branches', label: 'Sucursales', icon: Building2 },
      { id: 'users', label: 'Usuarios & Roles', icon: Users }
    ] : []),
  ], [isAdmin, isGeneralAdmin, isDriver, profile?.enabledModules]);

  // Redirect if activeTab is not allowed
  useEffect(() => {
    if (profile && !loading) {
      const isTabAllowed = navItems.some(item => item.id === activeTab);
      if (!isTabAllowed) {
        console.log(`Active tab ${activeTab} not allowed, redirecting`);
        setActiveTab(isDriver ? 'driver-portal' : 'passion-go');
      }
    }
  }, [profile, loading, activeTab, navItems, isDriver]);

  if (loading || (user && !profile && !error)) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-medium text-zinc-500">Cargando perfil Passion Go...</div>;
  
  // Show Passion Go Portal by default at the start when not logged in
  if (!user) return <PassionGoPortal isLoggedIn={false} />;

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm max-w-md text-center">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Error de Conexión</h2>
          <p className="text-zinc-500 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = () => signOut(auth);

  const renderContent = () => {
    switch (activeTab) {
      case 'passion-go':
        return (
          <PassionGoPortal 
            userProfile={profile} 
            isLoggedIn={true} 
            onEnterDashboard={() => setActiveTab('dashboard')} 
          />
        );
      case 'dashboard':
        return (
          <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
            <header className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                Bienvenido, {user.displayName || profile?.email}
              </h1>
              <p className="text-zinc-500 text-sm">
                Panel de control logístico Passion Go • Sucursal: <strong className="text-zinc-800">{profile?.sede}</strong>
              </p>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {navItems.slice(1).map(item => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs hover:shadow-md transition-all text-left flex flex-col gap-3 group"
                >
                  <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-purple-900 group-hover:bg-purple-900 group-hover:text-amber-300 transition-all shadow-xs">
                    <item.icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm sm:text-base">{item.label}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Acceder al módulo</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 'api-panel': 
        return (
          <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <ApiPanel userProfile={profile} onNavigateToPackages={() => setActiveTab('packages')} />
          </div>
        );
      case 'franchises':
        return (
          <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <FranchiseManagement 
              profile={profile!} 
              onNavigateToPackages={(franchiseId) => {
                setActiveTab('packages');
              }} 
            />
          </div>
        );
      case 'delivery-drivers':
        return (
          <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <DeliveryDriverManagement 
              profile={profile!}
              onOpenDriverPortal={(driverId) => {
                setActiveTab('driver-portal');
              }}
              onNavigateToPackages={() => {
                setActiveTab('packages');
              }}
            />
          </div>
        );
      case 'driver-portal':
        return (
          <div className="p-4 sm:p-8">
            <DriverPortal 
              profile={profile!} 
              onBack={() => setActiveTab('dashboard')} 
            />
          </div>
        );
      case 'whatsapp': return <WhatsAppModule profile={profile!} />;
      case 'packages': return <PackagesModule profile={profile!} />;
      case 'accounting': return <AccountingModule profile={profile!} />;
      case 'inventory': return <InventoryModule profile={profile!} />;
      case 'cash': return <CashClosureModule profile={profile!} />;
      case 'branches': return <BranchManagement profile={profile!} />;
      case 'users': return <UserManagement profile={profile!} />;
      default: return <div>Módulo en desarrollo</div>;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-zinc-200 transition-all duration-300 flex flex-col shrink-0 min-h-screen",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-5 flex items-center justify-between border-b border-zinc-100">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-purple-900 rounded-lg flex items-center justify-center text-amber-400 shadow-sm shadow-purple-900/30">
                <Truck size={18} />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-purple-950 uppercase block leading-none">
                  Passion <span className="text-amber-500">Go</span>
                </span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block mt-0.5">
                  Última Milla Express
                </span>
              </div>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
            title="Colapsar / Expandir menú"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1.5 mt-3 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-xs font-semibold",
                  isActive 
                    ? "bg-purple-950 text-amber-400 shadow-md shadow-purple-950/20 font-bold" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon size={18} className={cn("shrink-0", isActive ? "text-amber-400" : "text-slate-500")} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-100 mt-auto">
          <div className={cn("flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50 border border-zinc-100", !sidebarOpen && "justify-center")}>
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-purple-900 shrink-0 font-bold text-xs">
              {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-zinc-900 truncate">{user.displayName || user.email}</p>
                <p className="text-[10px] text-zinc-500 truncate">{profile?.role} • {profile?.sede}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-2 p-2 mt-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-all",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut size={16} />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
