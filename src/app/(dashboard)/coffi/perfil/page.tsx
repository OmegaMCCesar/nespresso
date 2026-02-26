// src/app/(dashboard)/coffi/perfil/page.tsx
"use client";

import { User, MapPin, Award, BookOpen, LogOut, ChevronRight, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

export default function PerfilPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  // Historial de capacitaciones (Por ahora lo mantenemos estático, 
  // después se puede conectar a una colección 'courses_progress' en Firestore)
  const capacitaciones = [
    { id: 1, curso: "Inducción a la Marca Nespresso", estado: "completado", fecha: "10 Ene 2026" },
    { id: 2, curso: "Masterclass: Origen y Tueste", estado: "completado", fecha: "15 Ene 2026" },
    { id: 3, curso: "Mantenimiento Línea Vertuo", estado: "pendiente", fecha: "Asignado" },
    { id: 4, curso: "Técnicas de Cierre de Ventas", estado: "pendiente", fecha: "Asignado" },
  ];

  const handleLogout = async () => {
    try {
      // Función real de Firebase para cerrar la sesión actual
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Hubo un problema al intentar salir.");
    }
  };

  // Si Firebase todavía está pensando quién eres, mostramos el loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-nespresso-brown" size={40} />
      </div>
    );
  }

  // Si no hay datos (porque quizá el usuario no existe en la BD), evitamos que rompa
  if (!userData) return null;

  return (
    <div className="p-6 pb-24 min-h-screen flex flex-col bg-gray-50">
      
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-nespresso-dark">Mi Perfil</h1>
      </header>

      {/* TARJETA PRINCIPAL DEL USUARIO */}
      <div className="bg-nespresso-dark rounded-2xl p-6 text-nespresso-cream shadow-lg mb-6 relative overflow-hidden">
        {/* Adorno visual */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-nespresso-gold/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="w-16 h-16 bg-nespresso-gold rounded-full flex items-center justify-center text-white shadow-md border-2 border-nespresso-brown">
            <User size={32} />
          </div>
          <div>
            {/* Aquí inyectamos el nombre real de Firebase */}
            <h2 className="text-xl font-bold">{userData.nombre}</h2>
            <p className="text-sm text-nespresso-gold font-medium flex items-center gap-1 uppercase tracking-wider">
              <ShieldCheck size={14} /> Nivel: {userData.rol}
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-6 border-t border-gray-700 pt-4 relative z-10">
          <div className="flex items-center text-sm gap-3 text-gray-300">
            <MapPin size={16} className="text-gray-400" />
            <span><strong>POS:</strong> {userData.pos || "No asignado"}{` (${userData.region})`}</span>
          </div>
          <div className="flex items-center text-sm gap-3 text-gray-300">
            <Award size={16} className="text-gray-400" />
            {/* Si no guardaste el nombre del supervisor en Firestore al crear la cuenta, puedes dejar uno por defecto o leer de userData.supervisorName */}
            <span><strong>Supervisor:</strong> {userData.supervisor} </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE CAPACITACIONES */}
      <div className="mb-8">
        <h3 className="font-bold text-nespresso-brown mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
          <BookOpen size={16} /> Mis Capacitaciones
        </h3>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {capacitaciones.map((curso, index) => (
            <div 
              key={curso.id} 
              className={`p-4 flex items-center justify-between ${
                index !== capacitaciones.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${curso.estado === 'completado' ? 'text-nespresso-dark' : 'text-gray-500'}`}>
                  {curso.curso}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">
                  {curso.estado === 'completado' ? `Aprobado el ${curso.fecha}` : curso.fecha}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {curso.estado === 'completado' ? (
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                    Completado
                  </span>
                ) : (
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                    Pendiente
                  </span>
                )}
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTÓN DE CERRAR SESIÓN */}
      <div className="mt-auto pt-6">
        <button 
          onClick={handleLogout}
          className="w-full py-4 bg-white border-2 border-red-100 text-red-500 rounded-xl font-bold flex justify-center items-center gap-2 shadow-sm hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </div>

    </div>
  );
}