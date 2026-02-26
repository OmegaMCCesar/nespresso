// src/app/(admin)/admin/mensajes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { MessageSquare, Send, Users, CheckSquare, Square, Loader2, Megaphone } from "lucide-react";

type CoffiUser = {
  uid: string;
  nombre: string;
  pos: string;
};

export default function MensajesPushPage() {
  const { user, userData, loading: authLoading } = useAuth();
  
  const [coffis, setCoffis] = useState<CoffiUser[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados del Formulario
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !userData) return;

    const fetchCoffis = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const listaCoffis: CoffiUser[] = [];
        
        usersSnap.forEach(doc => {
          const data = doc.data();
          // Solo traemos a los promotores
          if (data.rol === "coffi") {
            // Lógica de visibilidad: El supervisor solo ve a los suyos, el admin ve a todos.
            if (userData.rol === "super_admin" || data.supervisorId === userData.uid) {
              listaCoffis.push({
                uid: doc.id,
                nombre: data.nombre,
                pos: data.pos || "Sin POS"
              });
            }
          }
        });

        setCoffis(listaCoffis);
      } catch (error) {
        console.error("Error al cargar promotores:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchCoffis();
  }, [userData, authLoading]);

  // Manejadores de Checkboxes
  const toggleSeleccion = (uid: string) => {
    if (seleccionados.includes(uid)) {
      setSeleccionados(seleccionados.filter(id => id !== uid));
    } else {
      setSeleccionados([...seleccionados, uid]);
    }
  };

  const seleccionarTodos = () => {
    if (seleccionados.length === coffis.length) {
      setSeleccionados([]); // Desmarcar todos
    } else {
      setSeleccionados(coffis.map(c => c.uid)); // Marcar todos
    }
  };

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (seleccionados.length === 0) {
      alert("Debes seleccionar al menos a un promotor.");
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "messages"), {
        titulo,
        contenido: mensaje,
        remitenteId: user?.uid,
        remitenteNombre: userData?.nombre,
        destinatarios: seleccionados, // Guardamos un arreglo con los IDs de los Coffis
        fecha: serverTimestamp(),
        leidoPor: [] // Para futura función de "Visto"
      });

      alert("¡Mensaje enviado con éxito a la fuerza de ventas!");
      
      // Limpiamos el formulario
      setTitulo("");
      setMensaje("");
      setSeleccionados([]);
    } catch (error) {
      console.error("Error al enviar el mensaje:", error);
      alert("Hubo un error al enviar la notificación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || cargando) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>;
  }

  return (
    <div className="animate-in fade-in duration-500">
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-nespresso-dark flex items-center gap-3">
          <MessageSquare className="text-nespresso-gold" size={32} />
          Mensajes PUSH
        </h1>
        <p className="text-gray-500 mt-1">Envía avisos, metas diarias y recordatorios a tus promotores en tiempo real.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: REDACTAR MENSAJE */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-nespresso-dark p-4 flex items-center gap-2 text-white">
              <Megaphone size={18} className="text-nespresso-gold" />
              <h2 className="font-bold uppercase tracking-wider text-sm">Redactar Comunicado</h2>
            </div>
            
            <form onSubmit={enviarMensaje} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Título del Aviso
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. ¡Llegó la meta de fin de mes!"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-nespresso-dark font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Contenido del Mensaje
                </label>
                <textarea
                  required
                  maxLength={300}
                  rows={5}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe aquí las instrucciones o consejos para tu equipo..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-gray-700 resize-none"
                />
                <p className="text-[10px] text-gray-400 text-right mt-1 font-medium">{mensaje.length} / 300 caracteres</p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting || seleccionados.length === 0 || !titulo || !mensaje}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                  {isSubmitting ? "Enviando al piso de venta..." : `Enviar a ${seleccionados.length} Promotores`}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: SELECCIONAR DESTINATARIOS */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full max-h-150">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h2 className="font-bold text-nespresso-dark flex items-center gap-2 text-sm">
                <Users size={16} className="text-gray-400" /> Destinatarios
              </h2>
              <button 
                type="button"
                onClick={seleccionarTodos}
                className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {seleccionados.length === coffis.length && coffis.length > 0 ? "Desmarcar Todos" : "Seleccionar Todos"}
              </button>
            </div>
            
            <div className="p-2 overflow-y-auto sleek-scrollbar flex-1">
              {coffis.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <p className="text-sm">No tienes promotores asignados a tu cargo.</p>
                </div>
              ) : (
                coffis.map(coffi => {
                  const isSelected = seleccionados.includes(coffi.uid);
                  return (
                    <div 
                      key={coffi.uid}
                      onClick={() => toggleSeleccion(coffi.uid)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-transparent hover:bg-gray-50"
                      }`}
                    >
                      <button className={`shrink-0 ${isSelected ? "text-blue-600" : "text-gray-300"}`}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                      <div>
                        <p className={`text-sm font-bold ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                          {coffi.nombre}
                        </p>
                        <p className={`text-[10px] ${isSelected ? "text-blue-600/70" : "text-gray-400"}`}>
                          {coffi.pos}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
              <p className="text-xs text-center font-bold text-gray-500">
                {seleccionados.length} de {coffis.length} seleccionados
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}