// src/app/(dashboard)/coffi/inventario/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Loader2 ,Trash2, Save, CalendarDays, Package, MinusCircle, ClipboardCheck } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth"; 

const CATALOGO = {
  Vertuo: ["Vertuo Pop", "Vertuo Next", "Vertuo Lattissima", "Vertuo Creatista"],
  Original: ["Pixie", "Citiz", "Essenza Mini", "Lattissima One"]
};

type LoteWinset = { id: string; linea: "Vertuo" | "Original"; modelo: string; color: string; caducidad: string; cantidad: number; };

export default function InventarioWinsetPage() {
  const { user } = useAuth();

  const [vistaActiva, setVistaActiva] = useState<"stock" | "registro">("stock");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  
  // Guardamos el ID del documento en Firebase para poder actualizarlo si restan máquinas
  const [reporteIdActual, setReporteIdActual] = useState<string | null>(null);

  const [lotes, setLotes] = useState<LoteWinset[]>([]);
  const [linea, setLinea] = useState<"Vertuo" | "Original">("Vertuo");
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState(""); 
  const [caducidad, setCaducidad] = useState("");
  const [cantidad, setCantidad] = useState("");
  
  const [corrugadoFaltante, setCorrugadoFaltante] = useState("");
  const [maquinasExhibidas, setMaquinasExhibidas] = useState("");
  const [winsetsFaltantes, setWinsetsFaltantes] = useState("");
  const [observaciones, setObservaciones] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Inicia vacío, Firebase lo llenará
  const [miStock, setMiStock] = useState<LoteWinset[]>([]);

  // Buscar el stock real en Firebase
  useEffect(() => {
    if (!user) return;
    const fetchStock = async () => {
      try {
        const q = query(
          collection(db, "reports_winset"), 
          where("coffiId", "==", user.uid),
          orderBy("fechaRegistro", "desc"), 
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docFirebase = snapshot.docs[0];
          setReporteIdActual(docFirebase.id);
          setMiStock(docFirebase.data().inventario || []);
        }
      } catch (error) {
        console.error("Error al cargar Winset:", error);
      } finally {
        setCargandoDatos(false);
      }
    };
    fetchStock();
  }, [user]);

  const analizarCaducidad = (fechaStr: string) => {
    const hoy = new Date().getTime();
    const fechaCad = new Date(fechaStr).getTime();
    const diasFaltantes = Math.ceil((fechaCad - hoy) / (1000 * 3600 * 24));

    if (diasFaltantes <= 1) return { bg: "bg-red-600", text: "text-white", alerta: "¡Caduca HOY/MAÑANA!", borde: "border-red-500" };
    if (diasFaltantes <= 3) return { bg: "bg-red-500", text: "text-white", alerta: `Crítico: ${diasFaltantes} días`, borde: "border-red-400" };
    if (diasFaltantes <= 7) return { bg: "bg-orange-500", text: "text-white", alerta: `Atención: ${diasFaltantes} días`, borde: "border-orange-400" };
    if (diasFaltantes <= 15) return { bg: "bg-yellow-400", text: "text-nespresso-dark", alerta: `Próximo: ${diasFaltantes} días`, borde: "border-yellow-300" };
    if (diasFaltantes <= 30) return { bg: "bg-blue-100", text: "text-blue-800", alerta: `En ${diasFaltantes} días`, borde: "border-blue-200" };
    
    return { bg: "bg-gray-100", text: "text-gray-600", alerta: "Stock Sano", borde: "border-gray-200" };
  };

  // Descontar máquina DE VERDAD en Firebase
  const descontarStock = async (id: string) => {
    const nuevoStock = miStock.map(item => {
      if (item.id === id && item.cantidad > 0) return { ...item, cantidad: item.cantidad - 1 };
      return item;
    }).filter(item => item.cantidad > 0);

    // Actualizamos la UI al instante
    setMiStock(nuevoStock);

    // Actualizamos Firebase silenciosamente para que el Supervisor vea el cambio
    if (reporteIdActual) {
      const docRef = doc(db, "reports_winset", reporteIdActual);
      await updateDoc(docRef, { inventario: nuevoStock });
    }
  };

  const agregarLote = () => {
    if (!modelo || !color || !caducidad || !cantidad || parseInt(cantidad) <= 0) return;
    const nuevoLote: LoteWinset = { id: Math.random().toString(36).substr(2, 9), linea, modelo, color, caducidad, cantidad: parseInt(cantidad) };
    setLotes([nuevoLote, ...lotes]);
    setModelo(""); setColor(""); setCantidad("");
  };

  const enviarReporte = async () => {
    if (lotes.length === 0 || !user) return;
    setIsSubmitting(true);
    try {
      // Unimos lo que ya tenía en piso + lo nuevo que le llegó
      const inventarioCombinado = [...lotes, ...miStock];

      const docRef = await addDoc(collection(db, "reports_winset"), {
        coffiId: user.uid,
        fechaRegistro: serverTimestamp(),
        inventario: inventarioCombinado, // Guardamos el total consolidado
        totalesControl: {
          corrugadoFaltante: corrugadoFaltante || 0,
          maquinasExhibidas: maquinasExhibidas || 0,
          winsetsFaltantes: winsetsFaltantes || 0,
          observaciones: observaciones || "Ninguna"
        },
        estado: "registrado"
      });
      
      alert("¡Reporte completo enviado con éxito!");
      
      setReporteIdActual(docRef.id); // Guardamos el nuevo ID por si resta máquinas
      setMiStock(inventarioCombinado);
      setLotes([]); 
      setCorrugadoFaltante(""); setMaquinasExhibidas(""); setWinsetsFaltantes(""); setObservaciones("");
      setVistaActiva("stock"); 
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cargandoDatos) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>;
  }

  return (
    <div className="p-6 pb-24 min-h-screen flex flex-col bg-gray-50">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-nespresso-dark flex items-center gap-2">
          <CalendarDays className="text-nespresso-gold" />
          Control de Winsets
        </h1>
      </header>

      <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
        <button onClick={() => setVistaActiva("stock")} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${vistaActiva === "stock" ? "bg-white text-nespresso-dark shadow-md" : "text-gray-500"}`}><Package size={18} /> Mi Stock</button>
        <button onClick={() => setVistaActiva("registro")} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${vistaActiva === "registro" ? "bg-white text-nespresso-dark shadow-md" : "text-gray-500"}`}><PlusCircle size={18} /> Nuevo Barrido</button>
      </div>

      {vistaActiva === "stock" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {miStock.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <Package className="mx-auto text-gray-300 mb-2" size={40} />
              <p className="text-gray-500">Tu inventario está vacío. Haz un barrido para comenzar.</p>
            </div>
          ) : (
            miStock.sort((a, b) => new Date(a.caducidad).getTime() - new Date(b.caducidad).getTime()).map(item => {
              const status = analizarCaducidad(item.caducidad);
              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-4 flex justify-between items-center ${status.borde}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                        {status.alerta}
                      </span>
                    </div>
                    <h3 className="font-bold text-nespresso-dark text-lg">{item.modelo}</h3>
                    <p className="text-xs text-gray-500 font-medium">Color: <span className="text-nespresso-brown">{item.color}</span></p>
                    <p className="text-xs text-gray-500">Vence: {item.caducidad}</p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 border-l border-gray-100 pl-4 ml-2">
                    <span className="text-2xl font-black text-nespresso-brown">{item.cantidad}</span>
                    <button 
                      onClick={() => descontarStock(item.id)}
                      className="bg-gray-100 text-nespresso-dark hover:bg-red-100 hover:text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <MinusCircle size={14} /> Quitar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {vistaActiva === "registro" && (
        <div className="animate-in fade-in duration-300">
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 mb-6">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {(["Vertuo", "Original"] as const).map((l) => (
                <button key={l} onClick={() => { setLinea(l); setModelo(""); }} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${linea === l ? "bg-white text-nespresso-dark shadow" : "text-gray-500"}`}>{l}</button>
              ))}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-nespresso-brown uppercase tracking-wider">Modelo</label>
                <select value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:border-nespresso-gold outline-none bg-gray-50 text-sm">
                  <option value="">Selecciona...</option>
                  {CATALOGO[linea].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-nespresso-brown uppercase tracking-wider">Color</label>
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej. Titan, Red..." className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:border-nespresso-gold outline-none bg-gray-50 text-sm" />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-nespresso-brown uppercase tracking-wider">Caducidad</label>
                <input type="date" value={caducidad} onChange={(e) => setCaducidad(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:border-nespresso-gold outline-none bg-gray-50 text-sm" />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-bold text-nespresso-brown uppercase tracking-wider">Cant.</label>
                <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:border-nespresso-gold outline-none bg-gray-50 text-center font-bold" placeholder="0" />
              </div>
            </div>

            <button onClick={agregarLote} disabled={!modelo || !color || !caducidad || !cantidad} className="w-full py-3 bg-nespresso-dark text-nespresso-cream rounded-xl font-semibold flex justify-center items-center gap-2 disabled:opacity-50">
              <PlusCircle size={20} /> Agregar Lote
            </button>
          </div>

          {lotes.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                {lotes.map((lote) => (
                  <div key={lote.id} className="p-3 bg-white rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-nespresso-dark">{lote.modelo} <span className="text-xs font-normal text-gray-500">({lote.color})</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">Vence: {lote.caducidad} | Cant: <strong className="text-black">{lote.cantidad}</strong></p>
                    </div>
                    <button onClick={() => setLotes(lotes.filter(l => l.id !== lote.id))} className="text-red-400 p-2"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>

              <div className="bg-nespresso-cream p-4 rounded-xl border border-nespresso-gold/30 mt-6">
                <h3 className="text-sm font-bold text-nespresso-brown mb-3 flex items-center gap-2"><ClipboardCheck size={18} /> Control de Piso</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-600">Corrugado Falt.</label>
                    <input type="number" min="0" value={corrugadoFaltante} onChange={e => setCorrugadoFaltante(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 text-center mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-600">Winsets Falt.</label>
                    <input type="number" min="0" value={winsetsFaltantes} onChange={e => setWinsetsFaltantes(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 text-center mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-600">Máquinas Exhibidas</label>
                  <input type="number" min="0" value={maquinasExhibidas} onChange={e => setMaquinasExhibidas(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 text-center mt-1 mb-3" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-600">Observaciones</label>
                  <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 text-sm mt-1 resize-none h-16" />
                </div>
              </div>

              <button onClick={enviarReporte} disabled={isSubmitting} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-200">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                {isSubmitting ? "Guardando..." : "Enviar Reporte Oficial"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}