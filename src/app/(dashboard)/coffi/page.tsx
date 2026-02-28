// src/app/(dashboard)/coffi/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DopamineBar from "@/components/ui/DopamineBar";
import { Loader2, Lightbulb, MessageSquare, BellRing, Camera, Clock, CheckCircle, AlertCircle, Flame, LogOut, X, Coffee, ChevronDown } from "lucide-react";
import { db, storage } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/hooks/useAuth"; 

const CONSEJOS_NESPRESSO = [
  "Técnica de Cierre: Si el cliente duda, ofrécele una degustación de Vertuo Melozio.",
  "Dato de Máquina: La Vertuo Pop lee el código de barras de la cápsula para ajustar la temperatura.",
  "Argumento Sostenible: Las cápsulas de aluminio son 100% reciclables."
];

// TEMAS BASADOS EN CÁPSULAS NESPRESSO
const TEMAS: Record<string, { bgPantalla: string, textTitulo: string, bgTarjeta: string, borderTarjeta: string, name: string, iconColor: string }> = {
  ristretto: { bgPantalla: "bg-[#F9F6F0]", textTitulo: "text-[#212121]", bgTarjeta: "bg-[#212121]", borderTarjeta: "border-[#424242]", name: "Ristretto (Intenso)", iconColor: "text-gray-800" },
  volluto: { bgPantalla: "bg-amber-50", textTitulo: "text-amber-900", bgTarjeta: "bg-amber-600", borderTarjeta: "border-amber-400", name: "Volluto (Dulce)", iconColor: "text-amber-500" },
  stormio: { bgPantalla: "bg-emerald-50", textTitulo: "text-emerald-900", bgTarjeta: "bg-emerald-800", borderTarjeta: "border-emerald-600", name: "Stormio (Amaderado)", iconColor: "text-emerald-700" },
  decaffeinato: { bgPantalla: "bg-red-50", textTitulo: "text-red-900", bgTarjeta: "bg-red-800", borderTarjeta: "border-red-600", name: "Decaffeinato", iconColor: "text-red-600" },
  odacio: { bgPantalla: "bg-blue-50", textTitulo: "text-blue-900", bgTarjeta: "bg-blue-800", borderTarjeta: "border-blue-600", name: "Odacio (Afrutado)", iconColor: "text-blue-700" }
};

export default function CoffiDashboard() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  
  const [ventasJoselyn, setVentasJoselyn] = useState(0);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [consejoDelDia, setConsejoDelDia] = useState("");
  const [ultimoMensaje, setUltimoMensaje] = useState<any>(null);
  
  const [turnoActual, setTurnoActual] = useState<any>(null);
  const [cargandoTurno, setCargandoTurno] = useState(true);
  const [haciendoCheckIn, setHaciendoCheckIn] = useState(false);
  const [horaActual, setHoraActual] = useState(new Date());
  
  const [temaActivo, setTemaActivo] = useState("ristretto");
  const [menuSaboresAbierto, setMenuSaboresAbierto] = useState(false); // ESTADO PARA EL MENÚ DESPLEGABLE
  
  const [fotoSuficiente, setFotoSuficiente] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uniforme, setUniforme] = useState({ mandil: true, playera: true, zapatos: true });
  const [notaFaltaUniforme, setNotaFaltaUniforme] = useState("");

  const [modalSalida, setModalSalida] = useState(false);
  const [haciendoCheckOut, setHaciendoCheckOut] = useState(false);

  const metaAsignada = userData?.metaVentas || 10; 
  const rachaActual = userData?.racha || 0;

  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setConsejoDelDia(CONSEJOS_NESPRESSO[Math.floor(Math.random() * CONSEJOS_NESPRESSO.length)]);
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (userData && userData.rol !== "coffi") { router.push("/admin"); return; }

    if (user && userData) {
      if (userData.tema) setTemaActivo(userData.tema);

      const qVentas = query(collection(db, "sales"), where("coffiId", "==", user.uid));
      const unsubscribeVentas = onSnapshot(qVentas, (snapshot) => { setVentasJoselyn(snapshot.size); setCargandoVentas(false); });

      const qMensajes = query(collection(db, "messages"), where("destinatarios", "array-contains", user.uid));
      const unsubscribeMensajes = onSnapshot(qMensajes, (snapshot) => {
        if (!snapshot.empty) {
          const mensajes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          mensajes.sort((a, b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0));
          setUltimoMensaje(mensajes[0]); 
        }
      });

      const verificarTurno = async () => {
        try {
          const qTurno = query(collection(db, "attendance"), where("coffiId", "==", user.uid), where("estado", "==", "trabajando"));
          const turnoSnap = await getDocs(qTurno);
          if (!turnoSnap.empty) setTurnoActual({ id: turnoSnap.docs[0].id, ...turnoSnap.docs[0].data() });
        } catch (error) { console.error("Error al buscar turno:", error); } 
        finally { setCargandoTurno(false); }
      };

      verificarTurno();
      return () => { unsubscribeVentas(); unsubscribeMensajes(); };
    }
  }, [user, userData, loading, router]);

  const cambiarTema = async (nuevoTema: string) => {
    setTemaActivo(nuevoTema);
    setMenuSaboresAbierto(false); // Cerrar el menú al elegir
    if (user) await updateDoc(doc(db, "users", user.uid), { tema: nuevoTema });
  };

  const getEstadoVuelo = () => {
    const limite = new Date(); limite.setHours(10, 0, 0, 0);
    const tolerancia = new Date(); tolerancia.setHours(10, 10, 0, 0);
    if (horaActual < new Date(limite.getTime() - 15 * 60000)) return { texto: "Vuelo a tiempo. Sala de espera abierta.", color: "text-green-600", bg: "bg-green-100", aTiempo: true };
    if (horaActual <= limite) return { texto: "Abordaje en curso. Estás a excelente tiempo.", color: "text-blue-600", bg: "bg-blue-100", aTiempo: true };
    if (horaActual <= tolerancia) {
       const mins = Math.floor((tolerancia.getTime() - horaActual.getTime()) / 60000);
       return { texto: `Último llamado. Tolerancia activa (${mins} min restantes).`, color: "text-orange-600", bg: "bg-orange-100", aTiempo: true };
    }
    return { texto: "Puertas cerradas. Se registrará retardo.", color: "text-red-600", bg: "bg-red-100", aTiempo: false };
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFotoSuficiente(file); setFotoPreview(URL.createObjectURL(file)); }
  };

  const registrarEntrada = async () => {
    if (!fotoSuficiente || !user) return;
    setHaciendoCheckIn(true);
    try {
      const storageRef = ref(storage, `attendance/${user.uid}_in_${Date.now()}.jpg`);
      await uploadBytes(storageRef, fotoSuficiente);
      const fotoUrl = await getDownloadURL(storageRef);
      const faltaAlgo = !uniforme.mandil || !uniforme.playera || !uniforme.zapatos;
      const estadoVuelo = getEstadoVuelo();
      const nuevaRacha = estadoVuelo.aTiempo ? rachaActual + 1 : 0;

      const nuevoTurno = {
        coffiId: user.uid,
        coffiNombre: userData?.nombre,
        coffiPos: userData?.pos,
        fechaEntrada: serverTimestamp(),
        fotoEntradaUrl: fotoUrl,
        uniformeCompleto: !faltaAlgo,
        detalleUniforme: uniforme,
        notaIncidencia: faltaAlgo ? notaFaltaUniforme : "",
        estado: "trabajando",
        puntual: estadoVuelo.aTiempo
      };

      const docRef = await addDoc(collection(db, "attendance"), nuevoTurno);
      await updateDoc(doc(db, "users", user.uid), { racha: nuevaRacha });
      setTurnoActual({ id: docRef.id, ...nuevoTurno, fechaEntrada: new Date() });
      
      setFotoSuficiente(null); setFotoPreview(null);
      if (estadoVuelo.aTiempo) alert(`¡Entrada registrada! Racha actual: ${nuevaRacha} días seguidos 🔥`);
      else alert("Entrada registrada con retardo. Mañana iniciamos una nueva racha.");
    } catch (error) { alert("Error al registrar entrada."); } 
    finally { setHaciendoCheckIn(false); }
  };

  const registrarSalida = async () => {
    if (!fotoSuficiente || !user || !turnoActual) return;
    setHaciendoCheckOut(true);
    try {
      const storageRef = ref(storage, `attendance/${user.uid}_out_${Date.now()}.jpg`);
      await uploadBytes(storageRef, fotoSuficiente);
      const fotoUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "attendance", turnoActual.id), {
        estado: "finalizado",
        fechaSalida: serverTimestamp(),
        fotoSalidaUrl: fotoUrl
      });
      
      setTurnoActual(null);
      setModalSalida(false);
      setFotoSuficiente(null); setFotoPreview(null);
      alert("¡Turno finalizado con éxito! Descansa.");
    } catch (error) { alert("Error al registrar salida."); } 
    finally { setHaciendoCheckOut(false); }
  };

  if (loading || cargandoTurno || !userData) return <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0]"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>;

  const estiloTema = TEMAS[temaActivo] || TEMAS.ristretto;
  const estadoVuelo = getEstadoVuelo();

  // COMPONENTE DESPLEGABLE DE SABORES
  const MenuDeSabores = () => (
    <div className="relative">
      <button 
        onClick={() => setMenuSaboresAbierto(!menuSaboresAbierto)}
        className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <Coffee size={16} className={estiloTema.iconColor} />
        <span className="text-xs font-bold text-gray-700">{estiloTema.name.split(' ')[0]}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {menuSaboresAbierto && (
        <>
          {/* Fondo invisible para cerrar el menú al hacer clic afuera */}
          <div className="fixed inset-0 z-40" onClick={() => setMenuSaboresAbierto(false)}></div>
          
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Elige tu sabor de hoy</span>
            </div>
            <div className="flex flex-col max-h-60 overflow-y-auto">
              {Object.entries(TEMAS).map(([key, t]) => (
                <button 
                  key={key} 
                  onClick={() => cambiarTema(key)}
                  className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${temaActivo === key ? 'bg-orange-50/50' : 'hover:bg-gray-50'}`}
                >
                  <Coffee size={20} className={`${t.iconColor} ${temaActivo === key ? 'opacity-100 drop-shadow-sm' : 'opacity-60'}`} />
                  <span className={`text-sm ${temaActivo === key ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // =========================================================================
  // PANTALLA 1: CHECK-IN
  // =========================================================================
  if (!turnoActual) {
    const faltaAlgo = !uniforme.mandil || !uniforme.playera || !uniforme.zapatos;

    return (
      <div className={`p-6 pb-24 min-h-screen flex flex-col transition-colors duration-500 ${estiloTema.bgPantalla}`}>
        <header className="mb-6 text-center mt-4">
          <h1 className={`text-2xl font-bold ${estiloTema.textTitulo}`}>¡Hola, {userData.nombre.split(' ')[0]}!</h1>
          <p className="text-gray-500 font-medium">Es hora de brillar en {userData.pos}</p>
        </header>

        {/* SELECTOR DE SABORES */}
        <div className="flex justify-center mb-6">
          <MenuDeSabores />
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex-1 flex flex-col relative overflow-hidden">
          <div className={`${estadoVuelo.bg} ${estadoVuelo.color} p-4 -mx-6 -mt-6 mb-6 flex items-center justify-center gap-2 border-b border-black/5`}>
            <Clock size={18} className={estadoVuelo.aTiempo ? "animate-pulse" : ""} />
            <span className="text-xs font-black uppercase tracking-wider text-center">{estadoVuelo.texto}</span>
          </div>

          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-200 shadow-inner">
              <Flame className={rachaActual > 0 ? "text-orange-500 fill-orange-500" : "text-gray-400"} size={18} />
              <span className="text-xs font-bold text-orange-900 uppercase tracking-wider">{rachaActual > 0 ? `Racha: ${rachaActual} Días` : "Comienza tu racha hoy"}</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-bold text-gray-700 mb-3">Checklist de Apoyo</p>
            <div className="space-y-3">
              {[ { id: "mandil", label: "Mandil oficial" }, { id: "playera", label: "Playera/Camisa Nespresso" }, { id: "zapatos", label: "Zapatos limpios" } ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setUniforme({ ...uniforme, [item.id]: true })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${uniforme[item.id as keyof typeof uniforme] ? "bg-green-500 text-white" : "bg-white text-gray-400 border border-gray-200"}`}>Sí</button>
                    <button onClick={() => setUniforme({ ...uniforme, [item.id]: false })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${!uniforme[item.id as keyof typeof uniforme] ? "bg-red-500 text-white" : "bg-white text-gray-400 border border-gray-200"}`}>No</button>
                  </div>
                </div>
              ))}
            </div>

            {faltaAlgo && (
              <div className="mt-4 animate-in fade-in p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-xs font-bold text-orange-800 flex items-center gap-1.5 mb-2"><AlertCircle size={14} /> ¿Qué te hace falta?</p>
                <input type="text" placeholder="Ej. El supervisor no me ha traído mandil..." value={notaFaltaUniforme} onChange={(e) => setNotaFaltaUniforme(e.target.value)} className="w-full bg-white border border-orange-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-orange-400" />
              </div>
            )}
          </div>

          <div className="mb-8">
            <p className="text-sm font-bold text-gray-700 mb-3">Foto en vivo del POS</p>
            {!fotoPreview ? (
              <label className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors">
                <Camera size={28} className="mb-2 text-blue-500" />
                <span className="text-xs font-medium uppercase tracking-wider">Abrir Cámara</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden h-40 border border-gray-200">
                <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => { setFotoPreview(null); setFotoSuficiente(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full text-[10px] uppercase font-bold backdrop-blur-sm">Retomar</button>
              </div>
            )}
          </div>

          <button 
            onClick={registrarEntrada}
            disabled={!fotoSuficiente || haciendoCheckIn || (faltaAlgo && notaFaltaUniforme.trim().length === 0)}
            className={`w-full py-4 ${estiloTema.bgTarjeta} text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-auto shadow-lg`}
          >
            {haciendoCheckIn ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
            {haciendoCheckIn ? "Registrando..." : "Confirmar Check-In"}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PANTALLA 2: DASHBOARD PRINCIPAL
  // =========================================================================
  return (
    <div className={`p-6 pb-24 min-h-screen transition-colors duration-500 ${estiloTema.bgPantalla}`}>
      <header className="mb-6 flex justify-between items-start mt-4">
        <div>
          <h1 className={`text-2xl font-bold ${estiloTema.textTitulo}`}>¡Hola, {userData.nombre.split(' ')[0]}!</h1>
          <p className="text-gray-500 font-medium">Boutique {userData.pos}</p>
        </div>
        <div className="bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Turno Activo
        </div>
      </header>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-orange-200 shadow-sm">
          <Flame className={rachaActual > 0 ? "text-orange-500 fill-orange-500" : "text-gray-400"} size={16} />
          <span className="text-[10px] font-black text-orange-900 uppercase tracking-wider">Racha: {rachaActual} 🔥</span>
        </div>
        
        {/* SELECTOR DE SABORES EN EL DASHBOARD */}
        <MenuDeSabores />
      </div>

      <div className={`${estiloTema.bgTarjeta} rounded-3xl p-6 shadow-xl border-b-4 ${estiloTema.borderTarjeta} min-h-40 flex flex-col justify-center mb-6 transition-colors duration-500`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-white">Tu Meta Mensual</h2>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Objetivo: {metaAsignada}</span>
        </div>
        {cargandoVentas ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-white mb-2" size={24} /></div>
        ) : (
          <DopamineBar metaActual={metaAsignada} ventasActuales={ventasJoselyn} />
        )}
      </div>

      <div className="mb-6">
        <h3 className={`text-sm font-bold ${estiloTema.textTitulo} mb-3 flex items-center gap-2`}><MessageSquare size={16} /> Avisos del Equipo</h3>
        {ultimoMensaje ? (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-gray-100 opacity-50"><BellRing size={80} /></div>
            <div className="relative z-10">
              <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block">Aviso Importante</span>
              <h4 className="font-bold text-gray-900 text-base mb-1">{ultimoMensaje.titulo}</h4>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{ultimoMensaje.contenido}</p>
              <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">De: {ultimoMensaje.remitenteNombre || "Supervisor"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center"><p className="text-sm text-gray-400 italic">No hay avisos nuevos por el momento.</p></div>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h3 className={`text-sm font-bold ${estiloTema.textTitulo} mb-2 flex items-center gap-2`}><Lightbulb size={18} className="text-orange-500" /> Nespresso Academy</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{consejoDelDia}</p>
      </div>

      <button 
        onClick={() => setModalSalida(true)}
        className="w-full py-4 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-red-100 transition-colors"
      >
        <LogOut size={18} /> Finalizar Turno
      </button>

      {modalSalida && (
        <div className="fixed inset-0 bg-black/80 z-100 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => { setModalSalida(false); setFotoPreview(null); setFotoSuficiente(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Cierre de Turno</h3>
            <p className="text-sm text-gray-500 mb-6">Toma una foto de tu punto de venta al retirarte.</p>
            <div className="mb-6">
              {!fotoPreview ? (
                <label className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Camera size={32} className="mb-2 text-red-500" />
                  <span className="text-xs font-medium uppercase tracking-wider">Abrir Cámara</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden h-40 border border-gray-200">
                  <img src={fotoPreview} alt="Preview Salida" className="w-full h-full object-cover" />
                  <button onClick={() => { setFotoPreview(null); setFotoSuficiente(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full text-[10px] uppercase font-bold backdrop-blur-sm">Retomar</button>
                </div>
              )}
            </div>
            <button 
              onClick={registrarSalida} disabled={!fotoSuficiente || haciendoCheckOut}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg"
            >
              {haciendoCheckOut ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
              {haciendoCheckOut ? "Cerrando Turno..." : "Confirmar Salida"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}