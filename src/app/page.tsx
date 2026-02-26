// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Coffee } from "lucide-react";

export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo actuamos cuando Firebase termine de verificar la sesión
    if (!loading) {
      if (!user) {
        // No hay nadie logueado, a la puerta principal
        router.push("/login");
      } else if (userData) {
        // Sí hay alguien logueado, lo mandamos a su panel correspondiente
        if (userData.rol === "coffi") {
          router.push("/coffi");
        } else {
          router.push("/admin");
        }
      }
    }
  }, [user, userData, loading, router]);

  // Pantalla de carga elegante mientras el sistema piensa (dura fracciones de segundo)
  return (
    <div className="min-h-screen bg-nespresso-dark flex flex-col items-center justify-center text-nespresso-gold">
      <Coffee size={56} strokeWidth={1.5} className="mb-4 animate-pulse" />
      <h1 className="text-xl font-bold tracking-[0.2em] uppercase text-white mb-8">Nespresso</h1>
      <Loader2 className="animate-spin text-nespresso-brown" size={32} />
    </div>
  );
}