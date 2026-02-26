// src/hooks/useAuth.ts
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

// Definimos la estructura de nuestro usuario en la base de datos
export type UserData = {
  uid: string;
  nombre: string;
  rol: "coffi" | "supervisor" | "gerente" | "super_admin";
  pos?: string;
  region?: string;
  supervisor?: string;
  supervisorId?: string;
  metaVentas?: number;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en la sesión (Login/Logout)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Si hay sesión, buscamos su rol en Firestore
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
          console.error("El usuario no tiene un documento de perfil asociado.");
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, userData, loading };
}