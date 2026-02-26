// src/app/(dashboard)/coffi/ventas/page.tsx
"use client";

import { useState, useRef } from "react";
import { Camera, CheckCircle, Loader2, UploadCloud } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Importaciones de Firebase
import { db, storage } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const MAQUINAS = [
  { id: "v_pop", nombre: "Vertuo Pop (Cualquier color)", linea: "Vertuo" },
  { id: "v_next", nombre: "Vertuo Next", linea: "Vertuo" },
  { id: "v_lat", nombre: "Vertuo Lattissima", linea: "Vertuo" },
  { id: "o_pixie", nombre: "Pixie", linea: "Original" },
  { id: "o_citiz", nombre: "Citiz / Citiz Platinum", linea: "Original" },
];

export default function NuevaVentaPage() {
  const [modeloSeleccionado, setModeloSeleccionado] = useState("");
  const [ticketFoto, setTicketFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth(); // Traemos al usuario

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTicketFoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modeloSeleccionado || !ticketFoto || !user) return; // Validamos que exista 'user'

    setIsSubmitting(true);

    try {
      const fileName = `tickets/ticket_${Date.now()}_${ticketFoto.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, ticketFoto);
      const ticketUrl = await getDownloadURL(storageRef);

      // 2. Usamos el user.uid real al guardar
      await addDoc(collection(db, "sales"), {
        coffiId: user.uid, // <-- ¡REEMPLAZO!
        modeloId: modeloSeleccionado,
        cantidad: 1,
        ticketUrl: ticketUrl,
        fecha: serverTimestamp(),
        estado: "pendiente_validacion"
      });

      setSuccess(true);
    } catch (error) {
      console.error("Error al guardar la venta:", error);
      alert("Hubo un error al subir el ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 h-[80vh] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200">
          <CheckCircle size={64} />
        </div>
        <h2 className="text-3xl font-bold text-nespresso-dark mb-2">¡Venta Registrada!</h2>
        <p className="text-gray-500 mb-8">Has sumado una máquina más a tu meta mensual. ¡Sigue así!</p>
        <button
          onClick={() => {
            setSuccess(false);
            setModeloSeleccionado("");
            setTicketFoto(null);
            setPreviewUrl(null);
          }}
          className="bg-nespresso-gold text-white font-semibold py-3 px-8 rounded-full shadow-md hover:bg-yellow-600 transition-colors"
        >
          Registrar otra venta
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-nespresso-dark">Registrar Venta</h1>
        <p className="text-gray-500 text-sm">Sube tu ticket para validar la comisión.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-nespresso-brown">
            1. ¿Qué modelo vendiste?
          </label>
          <select
            value={modeloSeleccionado}
            onChange={(e) => setModeloSeleccionado(e.target.value)}
            required
            className="w-full bg-white border-2 border-nespresso-gray rounded-xl p-4 text-nespresso-dark focus:outline-none focus:border-nespresso-gold transition-colors appearance-none"
          >
            <option value="" disabled>Selecciona un modelo...</option>
            {MAQUINAS.map((maq) => (
              <option key={maq.id} value={maq.id}>
                {maq.linea} - {maq.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-nespresso-brown">
            2. Foto del Ticket
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleCapture}
            className="hidden"
            required
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              previewUrl ? 'border-nespresso-gold bg-yellow-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {previewUrl ? (
              <div className="space-y-3 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="h-32 object-contain rounded-md shadow-sm" />
                <span className="text-sm font-medium text-nespresso-gold flex items-center gap-2">
                  <UploadCloud size={18} /> Cambiar foto
                </span>
              </div>
            ) : (
              <div className="space-y-3 flex flex-col items-center text-gray-400">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-nespresso-dark">
                  <Camera size={32} />
                </div>
                <span className="text-sm font-medium">Toca para abrir la cámara</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!modeloSeleccionado || !ticketFoto || isSubmitting}
          className="w-full bg-nespresso-dark text-nespresso-cream font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin mr-2" size={24} />
              Subiendo a la nube...
            </>
          ) : (
            "Validar Venta"
          )}
        </button>
      </form>
    </div>
  );
}