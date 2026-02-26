// src/app/(dashboard)/coffi/insumos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Coffee, Save, Loader2, Info, Package, CheckSquare, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth"; 

const INSUMOS_BASE = [
  { id: "v_intenso", nombre: "Vertuo - Intenso", categoria: "Cápsulas Vertuo" },
  { id: "v_melozio", nombre: "Vertuo - Melozio", categoria: "Cápsulas Vertuo" },
  { id: "v_altissio", nombre: "Vertuo - Altissio", categoria: "Cápsulas Vertuo" },
  { id: "v_diavolitto", nombre: "Vertuo - Diavolitto", categoria: "Cápsulas Vertuo" },
  { id: "v_bianco_p", nombre: "Vertuo - Bianco Piccolo", categoria: "Cápsulas Vertuo" },
  { id: "o_ristretto", nombre: "Original - Ristretto", categoria: "Cápsulas Original" },
  { id: "o_arpeggio", nombre: "Original - Arpeggio", categoria: "Cápsulas Original" },
  { id: "o_roma", nombre: "Original - Roma", categoria: "Cápsulas Original" },
  { id: "o_volluto", nombre: "Original - Volluto", categoria: "Cápsulas Original" },
  { id: "des_vaso_4", nombre: "Vasos de Cartón 4 Oz", categoria: "Desechables" },
  { id: "des_vaso_8", nombre: "Vasos de Cartón 8 Oz", categoria: "Desechables" },
  { id: "des_tapas", nombre: "Tapas para Vasos 8 Oz", categoria: "Desechables" },
  { id: "des_agita", nombre: "Agitadores de Madera", categoria: "Desechables" },
  { id: "lac_entera", nombre: "Leche Entera (Lts)", categoria: "Complementos" },
  { id: "lac_deslac", nombre: "Leche Deslactosada (Lts)", categoria: "Complementos" },
  { id: "lac_almendra", nombre: "Leche de Almendra (Lts)", categoria: "Complementos" },
  { id: "com_azucar_b", nombre: "Sobres Azúcar Blanca", categoria: "Complementos" },
  { id: "com_azucar_m", nombre: "Sobres Azúcar Mascabado", categoria: "Complementos" },
  { id: "com_edulco", nombre: "Sobres Edulcorante (Splenda)", categoria: "Complementos" },
  { id: "com_agua", nombre: "Agua (Garrafón)", categoria: "Complementos" },
];

type ItemInsumo = { id: string; nombre: string; categoria: string; inicial: number | ""; resurtido: number | ""; final: number | ""; };

export default function InventarioInsumosPage() {
  const { user } = useAuth();
  const [vistaActiva, setVistaActiva] = useState<"stock" | "registro">("stock");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [notas, setNotas] = useState("");

  const [inventario, setInventario] = useState<ItemInsumo[]>(
    INSUMOS_BASE.map(item => ({ ...item, inicial: "", resurtido: "", final: "" }))
  );
  
  const [stockActual, setStockActual] = useState(
    INSUMOS_BASE.map(item => ({ ...item, cantidadActual: 0 }))
  );

  useEffect(() => {
    if (!user) return;
    const fetchUltimoCierre = async () => {
      try {
        const q = query(
          collection(db, "reports_insumos"), 
          where("coffiId", "==", user.uid),
          orderBy("fechaRegistro", "desc"), 
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const ultimoReporte = snapshot.docs[0].data();
          const datosAyer = ultimoReporte.datos;

          setStockActual(INSUMOS_BASE.map(base => {
            const itemAyer = datosAyer.find((d: any) => d.id === base.id);
            return { ...base, cantidadActual: itemAyer ? itemAyer.final : 0 };
          }));

          setInventario(INSUMOS_BASE.map(base => {
            const itemAyer = datosAyer.find((d: any) => d.id === base.id);
            return { ...base, inicial: itemAyer ? itemAyer.final : "", resurtido: "", final: "" };
          }));
        }
      } catch (error) {
        console.error("Error al cargar último inventario", error);
      } finally {
        setCargandoDatos(false);
      }
    };
    fetchUltimoCierre();
  }, [user]);

  const actualizarValor = (id: string, campo: "inicial" | "resurtido" | "final", valor: string) => {
    const num = valor === "" ? "" : parseInt(valor);
    setInventario(prev => prev.map(item => item.id === id ? { ...item, [campo]: num } : item));
  };

  const enviarReporte = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      
      // LOGICA CORREGIDA: Procesar los datos antes de guardarlos para evitar que los vacíos se vuelvan ceros
      const datosParaGuardar = inventario.map(item => {
        const inicialNum = Number(item.inicial) || 0;
        const resurtidoNum = Number(item.resurtido) || 0;
        
        // Si el usuario no escribió un número "Final", asumimos que no hubo cambios (Inicial + Resurtido)
        const finalNum = item.final === "" ? (inicialNum + resurtidoNum) : Number(item.final);

        return {
          ...item,
          inicial: inicialNum,
          resurtido: resurtidoNum,
          final: finalNum
        };
      });

      await addDoc(collection(db, "reports_insumos"), {
        coffiId: user.uid,
        fechaRegistro: serverTimestamp(),
        datos: datosParaGuardar, // Guardamos la versión procesada
        arqueoNotas: notas,
        estado: "registrado"
      });
      
      alert("¡Cierre guardado! Los insumos sin cambios conservaron su stock.");
      
      // Actualizamos UI con los datos procesados
      setStockActual(datosParaGuardar.map(item => ({ ...item, cantidadActual: item.final })));
      setInventario(datosParaGuardar.map(item => ({ ...item, inicial: item.final, resurtido: "", final: "" })));
      setNotas("");
      setVistaActiva("stock");
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categorias = Array.from(new Set(INSUMOS_BASE.map(i => i.categoria)));

  if (cargandoDatos) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-nespresso-brown" size={40} /></div>;
  }

  return (
    <div className="p-6 pb-24 min-h-screen flex flex-col bg-gray-50">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-nespresso-dark flex items-center gap-2">
          <Coffee className="text-nespresso-brown" />
          Barra y Degustación
        </h1>
      </header>

      <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
        <button onClick={() => setVistaActiva("stock")} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${vistaActiva === "stock" ? "bg-white text-nespresso-dark shadow-md" : "text-gray-500"}`}><Package size={18} /> Mi Barra Hoy</button>
        <button onClick={() => setVistaActiva("registro")} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${vistaActiva === "registro" ? "bg-white text-nespresso-dark shadow-md" : "text-gray-500"}`}><CheckSquare size={18} /> Cierre Diario</button>
      </div>

      {vistaActiva === "stock" && (
        <div className="animate-in fade-in duration-300 space-y-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
            <Info className="text-blue-500 shrink-0" />
            <p className="text-sm text-blue-800">Este es tu inventario inicial basado en tu último cierre. Si ves algo en <strong className="text-red-600">rojo</strong>, solicita resurtido.</p>
          </div>
          {categorias.map(cat => (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-nespresso-dark text-nespresso-cream py-2 px-4 font-bold text-xs uppercase tracking-wider">{cat}</div>
              <div className="divide-y divide-gray-50">
                {stockActual.filter(item => item.categoria === cat).map(item => (
                  <div key={item.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">{item.nombre}</span>
                    <span className={`font-bold px-3 py-1 rounded-lg text-sm ${item.cantidadActual < 10 && item.cantidadActual > 0 ? "bg-red-100 text-red-700 border border-red-200" : "bg-gray-100 text-gray-700"}`}>
                      {item.cantidadActual}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {vistaActiva === "registro" && (
        <div className="animate-in fade-in duration-300 space-y-6">
          <p className="text-sm text-gray-500">Los campos <strong>Iniciales</strong> se han llenado con tu último cierre. Completa el resto.</p>
          {categorias.map(cat => (
            <div key={cat} className="space-y-3">
              <h2 className="text-xs font-black uppercase text-nespresso-brown tracking-wider border-b-2 border-nespresso-gold pb-1">{cat}</h2>
              {inventario.filter(i => i.categoria === cat).map(item => (
                <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <p className="font-bold text-xs text-nespresso-dark mb-2">{item.nombre}</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400">Inicial</label>
                      <input type="number" min="0" value={item.inicial} onChange={(e) => actualizarValor(item.id, "inicial", e.target.value)} className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2 text-center text-sm font-semibold focus:outline-none" placeholder="0" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400">Resurtido</label>
                      <input type="number" min="0" value={item.resurtido} onChange={(e) => actualizarValor(item.id, "resurtido", e.target.value)} className="w-full bg-blue-50 border border-blue-100 text-blue-800 rounded-lg p-2 text-center text-sm font-semibold focus:border-blue-400 outline-none" placeholder="0" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400">Final</label>
                      <input type="number" min="0" value={item.final} onChange={(e) => actualizarValor(item.id, "final", e.target.value)} className="w-full bg-nespresso-dark text-nespresso-cream rounded-lg p-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-nespresso-gold" placeholder="0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <section className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-6">
            <h2 className="text-xs font-black uppercase text-orange-800 tracking-wider flex items-center gap-1 mb-2"><AlertCircle size={14} /> Notas de Arqueo</h2>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Justificaciones..." className="w-full bg-white p-3 rounded-lg border border-orange-200 text-sm focus:outline-none focus:border-orange-400 resize-none h-20" />
          </section>

          <button onClick={enviarReporte} disabled={isSubmitting} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-200">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            {isSubmitting ? "Guardando..." : "Guardar Cierre Diario"}
          </button>
        </div>
      )}
    </div>
  );
}