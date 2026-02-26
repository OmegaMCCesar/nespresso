// src/app/(dashboard)/coffi/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DopamineBar from "@/components/ui/DopamineBar";
import { Loader2, Lightbulb, MessageSquare, BellRing } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth"; 

const CONSEJOS_NESPRESSO = [
  "Técnica de Cierre: Si el cliente duda, ofrécele una degustación de Vertuo Melozio.",
  "Dato de Máquina: La Vertuo Pop lee el código de barras de la cápsula para ajustar la temperatura.",
  "Argumento Sostenible: Las cápsulas de aluminio son 100% reciclables.",
  "Venta Cruzada: ¿Vendiste una Essenza Mini? Ofrécele siempre el Aeroccino 3.",
  "Psicología de Venta: Sonríe siempre al entregar la taza de degustación."
];

export default function CoffiDashboard() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  
  const [ventasJoselyn, setVentasJoselyn] = useState(0);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [consejoDelDia, setConsejoDelDia] = useState("");
  
  const [ultimoMensaje, setUltimoMensaje] = useState<any>(null);
  const [cargandoMensajes, setCargandoMensajes] = useState(true);
  
  // LA MAGIA: Leemos la meta desde la base de datos. Si no tiene, por defecto es 10.
  const metaAsignada = userData?.metaVentas || 10; 

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * CONSEJOS_NESPRESSO.length);
    setConsejoDelDia(CONSEJOS_NESPRESSO[randomIndex]);
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (userData && userData.rol !== "coffi") { router.push("/admin"); return; }

    if (user) {
      const qVentas = query(collection(db, "sales"), where("coffiId", "==", user.uid));
      const unsubscribeVentas = onSnapshot(qVentas, (snapshot) => {
        setVentasJoselyn(snapshot.size);
        setCargandoVentas(false);
      });

      const qMensajes = query(collection(db, "messages"), where("destinatarios", "array-contains", user.uid));
      const unsubscribeMensajes = onSnapshot(qMensajes, (snapshot) => {
        if (!snapshot.empty) {
          const mensajes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          mensajes.sort((a, b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0));
          setUltimoMensaje(mensajes[0]); 
        } else {
          setUltimoMensaje(null);
        }
        setCargandoMensajes(false);
      });

      return () => { unsubscribeVentas(); unsubscribeMensajes(); };
    }
  }, [user, userData, loading, router]);

  if (loading || !userData) {
    return <div className="min-h-screen flex items-center justify-center bg-nespresso-cream"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>;
  }

  return (
    <div className="p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-nespresso-dark">¡Hola, {userData.nombre.split(' ')[0]}!</h1>
        <p className="text-gray-500">Boutique {userData.pos}</p>
      </header>

      {/* TARJETA DE DOPAMINA */}
      <div className="bg-nespresso-dark rounded-xl p-6 shadow-md border-b-4 border-nespresso-gold min-h-40 flex flex-col justify-center mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-200">Tu Meta Mensual</h2>
          <span className="bg-white/10 text-nespresso-gold text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Objetivo: {metaAsignada}</span>
        </div>
        
        {cargandoVentas ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="animate-spin text-nespresso-gold mb-2" size={24} />
          </div>
        ) : (
          <DopamineBar metaActual={metaAsignada} ventasActuales={ventasJoselyn} />
        )}
      </div>

      {/* AVISOS DEL SUPERVISOR */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-nespresso-brown mb-3 flex items-center gap-2">
          <MessageSquare size={16} /> Avisos de tu Supervisor
        </h3>
        
        {cargandoMensajes ? (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-center"><Loader2 className="animate-spin text-gray-300" size={20} /></div>
        ) : ultimoMensaje ? (
          <div className="bg-blue-50 p-5 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-blue-100 opacity-50"><BellRing size={80} /></div>
            <div className="relative z-10">
              <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block">Aviso Importante</span>
              <h4 className="font-bold text-blue-900 text-base mb-1">{ultimoMensaje.titulo}</h4>
              <p className="text-sm text-blue-800/80 leading-relaxed mb-3">{ultimoMensaje.contenido}</p>
              <div className="flex justify-between items-center border-t border-blue-200/50 pt-3 mt-2">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">De: {ultimoMensaje.remitenteNombre || "Supervisor"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-sm text-gray-400 italic">No hay avisos nuevos por el momento.</p>
          </div>
        )}
      </div>

      {/* CONSEJO NESPRESSO */}
      <div className="bg-orange-50 p-5 rounded-xl shadow-sm border border-orange-100">
        <h3 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
          <Lightbulb size={18} className="text-orange-500" /> Nespresso Academy: Tip del Día
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">{consejoDelDia}</p>
      </div>

    </div>
  );
}