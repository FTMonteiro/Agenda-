import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useIOSColors } from "@/components/ios";
import { Typography } from "@/constants/theme";
import { translate } from "@/i18n";

// As distâncias que a pessoa pode escolher para procurar à sua volta; null = sem limite.
export const DISTANCE_OPTIONS: (number | null)[] = [null, 5, 10, 20, 50];

export function distanceLabel(radiusKm: number | null): string {
  return radiusKm === null ? translate("Qualquer distância") : `${radiusKm} km`;
}

/*
 * As opções de distância, para pôr dentro de uma fila que desliza na horizontal. `solid`
 * dá-lhes fundo opaco, para se lerem por cima do mapa.
 */
export function DistanceChips({
  value,
  onChange,
  solid,
}: {
  value: number | null;
  onChange: (radiusKm: number | null) => void;
  solid?: boolean;
}) {
  const colors = useIOSColors();

  return (
    <>
      {DISTANCE_OPTIONS.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option ?? "all"}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.chip,
                  solid && styles.solid,
                  {
                    backgroundColor: active ? colors.primary : solid ? colors.card : colors.input,
                    color: active ? colors.primaryForeground : colors.text,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                {distanceLabel(option)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    ...Typography.footnote,
    fontWeight: "600",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  solid: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
