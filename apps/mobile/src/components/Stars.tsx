import React from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { STAR_COLOR } from "@/components/SpaceCards";

/*
 * Cinco estrelas só de leitura para uma nota de 0 a 5: cheias, meia estrela a partir
 * de .25 e vazias até ao fim (4.3 → ★★★★☆, 4.6 → ★★★★⯪).
 */
export function Stars({ value, size = 14, emptyColor }: { value: number; size?: number; emptyColor: string }) {
  return (
    <View style={{ flexDirection: "row", gap: Math.max(1, Math.round(size / 7)) }} accessibilityLabel={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((position) => {
        const fill = value - (position - 1);
        const name = fill >= 0.75 ? "star" : fill >= 0.25 ? "star-half" : "star-outline";
        return <Ionicons key={position} name={name} size={size} color={name === "star-outline" ? emptyColor : STAR_COLOR} />;
      })}
    </View>
  );
}
