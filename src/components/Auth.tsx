import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Button, Card, Input } from './ui';
import { LogIn, ShieldCheck, Mail, Lock } from 'lucide-react';

export default function Auth({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      if (onLoginSuccess) onLoginSuccess();
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (error: any) {
      console.error("Login error:", error);
      alert('Error al iniciar sesión: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-transparent flex items-center justify-center p-2">
      <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6 shadow-2xl border border-purple-100 bg-white rounded-3xl">
        <div className="w-16 h-16 bg-purple-900 rounded-2xl flex items-center justify-center text-amber-400 shadow-lg shadow-purple-950/20">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-purple-950">Passion <span className="text-amber-500">Go</span></h1>
          <p className="text-slate-500 text-xs mt-1">Portal de Acceso Administrativo y Operativo</p>
        </div>

        {showEmailLogin ? (
          <form onSubmit={handleEmailLogin} className="w-full space-y-4">
            <Input 
              label="Correo Electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="usuario@ejemplo.com"
            />
            <Input 
              label="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
            />
            <Button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
            <button 
              type="button"
              onClick={() => setShowEmailLogin(false)}
              className="text-sm text-purple-800 font-semibold hover:underline"
            >
              Volver a Google Login
            </button>
          </form>
        ) : (
          <div className="w-full space-y-3">
            <Button 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-white font-bold"
            >
              <LogIn size={20} className="text-amber-400" />
              {loading ? 'Iniciando sesión...' : 'Continuar con Google'}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">O accede con</span>
              </div>
            </div>
            <Button 
              variant="secondary"
              onClick={() => setShowEmailLogin(true)}
              className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              <Mail size={20} className="text-purple-800" />
              Correo y Contraseña
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Acceso restringido a personal autorizado.
        </p>
      </Card>
    </div>
  );
}
