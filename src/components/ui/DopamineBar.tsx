// src/components/ui/DopamineBar.tsx
"use client";

import { useEffect, useState } from "react";

interface DopamineBarProps {
  metaActual: number;
  ventasActuales: number;
}

export default function DopamineBar({ metaActual, ventasActuales }: DopamineBarProps) {
  const [animating, setAnimating] = useState(false);
  
  // Calcular porcentaje (topado a 200% para que la barra no se salga de la pantalla)
  const rawPercentage = (ventasActuales / metaActual) * 100;
  const percentage = Math.min(rawPercentage, 200);
  
  // Lógica para los colores y mensajes basados en los niveles de comisión
  let colorClass = "bg-nespresso-brown";
  let mensaje = `¡Vamos con todo! Estás a ${Math.ceil(metaActual * 0.8) - ventasActuales} máquinas del 80%.`;
  let textColor = "text-gray-300";

  if (rawPercentage >= 150) {
    colorClass = "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]";
    mensaje = "¡NIVEL LEYENDA! 🚀 Rompiste el 150%.";
    textColor = "text-purple-300 font-bold";
  } else if (rawPercentage >= 120) {
    colorClass = "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]";
    mensaje = "¡Imparable! 💎 Superaste el 120%.";
    textColor = "text-blue-300 font-bold";
  } else if (rawPercentage >= 100) {
    colorClass = "bg-dopamine-success shadow-[0_0_15px_rgba(34,197,94,0.5)]";
    mensaje = "¡Meta cumplida! 🎉 ¿Vamos por el 120%?";
    textColor = "text-green-400 font-bold";
  } else if (rawPercentage >= 80) {
    colorClass = "bg-dopamine-warning shadow-[0_0_15px_rgba(245,158,11,0.5)]";
    mensaje = "¡Comisión asegurada! 🔥 A nada del 100%.";
    textColor = "text-yellow-400 font-medium";
  }

  // Animación de entrada
  useEffect(() => {
    setTimeout(() => setAnimating(true), 100);
  }, []);

  return (
    <div className="w-full mt-4">
      {/* Encabezado con los números */}
      <div className="flex justify-between items-end mb-2">
        <span className="text-3xl font-bold text-nespresso-cream">
          {ventasActuales} <span className="text-sm font-normal text-gray-400">/ {metaActual} mqs</span>
        </span>
        <span className={`text-lg ${textColor}`}>
          {rawPercentage.toFixed(0)}%
        </span>
      </div>

      {/* El contenedor de la barra (El 100%) */}
      <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden">
        {/* Marcas de los objetivos (80% y 100%) */}
        <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-gray-600 z-10"></div>
        <div className="absolute top-0 bottom-0 left-full w-0.5 bg-gray-500 z-10"></div>

        {/* La barra que se llena */}
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
          style={{ width: animating ? `${Math.min(percentage, 100)}%` : "0%" }}
        />
      </div>

      {/* Mensaje dinámico */}
      <p className={`mt-3 text-sm ${textColor} transition-opacity duration-500 ${animating ? "opacity-100" : "opacity-0"}`}>
        {mensaje}
      </p>
    </div>
  );
}