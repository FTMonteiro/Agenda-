import React from "react";
import { Image, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/contexts/AuthContext";

// A foto de perfil da conta, ou as iniciais sobre um gradiente enquanto não houver foto.
// Usada em todos os sítios onde aparece o símbolo do perfil, para ficar sempre igual.
export function UserAvatar({ size }: { size: number }) {
  const { user } = useAuth();
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (user?.avatarUrl) return <Image source={{ uri: user.avatarUrl }} style={shape} />;

  const initials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <LinearGradient colors={["#1451D6", "#1451D6"]} style={[shape, styles.center]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials || "?"}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
