// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // <-- ¡Nuevas importaciones vitales!
import { auth, db } from "@/lib/firebase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Iniciamos sesión en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Antes de movernos, leemos su perfil en la base de datos para saber su ROL
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // 3. EL OFICIAL DE TRÁNSITO: Redirigimos según el rol
        if (data.rol === "coffi") {
          router.push("/coffi");
        } else {
          // Si es supervisor, gerente o super_admin, va al panel de escritorio
          router.push("/admin"); 
        }
      } else {
        setError("Error: Este usuario no tiene un perfil configurado.");
        setIsLoading(false);
      }
      
    } catch (err: any) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nespresso-dark flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-nespresso-cream rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Cabecera del Login */}
        <div className="bg-nespresso-brown p-8 flex flex-col items-center justify-center text-nespresso-gold">
          <Coffee size={48} strokeWidth={1.5} className="mb-4" />
          <h1 className="text-2xl font-bold tracking-widest uppercase text-center text-white">Nespresso</h1>
          <p className="text-sm mt-1 text-nespresso-cream/80 tracking-widest">Portal Operativo</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-nespresso-brown uppercase tracking-wider mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-nespresso-dark focus:outline-none focus:border-nespresso-gold transition-colors"
                placeholder="tu.nombre@nespresso.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-nespresso-brown uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-nespresso-dark focus:outline-none focus:border-nespresso-gold transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-nespresso-dark text-nespresso-cream rounded-xl font-bold uppercase tracking-wider shadow-md hover:bg-black transition-colors flex justify-center items-center mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Iniciar Sesión"}
            </button>
          </form>

          {/* MENSAJE DE RECUPERACIÓN DIRIGIDO A TI */}
          <div className="mt-8 border-t border-gray-300 pt-6 text-center">
            <p className="text-xs text-gray-500 mb-1">¿Olvidaste tu contraseña o necesitas acceso?</p>
            <p className="text-sm font-bold text-nespresso-brown">
              Contacta a tu Administrador de Región.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}