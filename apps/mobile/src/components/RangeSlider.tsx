import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { useIOSColors } from "@/components/ios";

const THUMB = 28;

/*
 * Controlo deslizante de um valor (distância, preço): arrasta-se o botão ou toca-se na
 * barra. Feito com as peças do React Native para não exigir um módulo nativo.
 */
export function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
}) {
  const colors = useIOSColors();
  const [width, setWidth] = useState(0);
  // Os valores mais recentes, para os gestos (o PanResponder é criado uma só vez).
  const latest = useRef({ width, min, max, step, onChange });
  useEffect(() => {
    latest.current = { width, min, max, step, onChange };
  });

  const responder = useMemo(() => {
    const update = (x: number) => {
      const current = latest.current;
      const track = current.width - THUMB;
      if (track <= 0) return;
      const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / track));
      const stepped = current.min + Math.round((ratio * (current.max - current.min)) / current.step) * current.step;
      current.onChange(Math.min(current.max, Math.max(current.min, stepped)));
    };

    // Onde o dedo pousou; a partir daí conta o que ele andou (dx), que é fiável mesmo
    // quando passa por cima de outras vistas.
    let start = 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Dentro de uma folha que desliza: o gesto fica com o controlo até o dedo sair.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        start = event.nativeEvent.locationX;
        update(start);
      },
      onPanResponderMove: (_event, gesture) => update(start + gesture.dx),
    });
  }, []);

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const offset = Math.max(0, width - THUMB) * ratio;

  return (
    <View
      style={styles.slider}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      {...responder.panHandlers}
    >
      {/* pointerEvents="none": o toque cai sempre na área do controlo, e locationX conta a partir dela. */}
      <View pointerEvents="none" style={[styles.track, { backgroundColor: colors.input }]} />
      <View pointerEvents="none" style={[styles.track, styles.filled, { backgroundColor: colors.primary, width: offset + THUMB / 2 }]} />
      <View pointerEvents="none" style={[styles.thumb, { backgroundColor: colors.primary, transform: [{ translateX: offset }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  slider: {
    height: 40,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 3,
  },
  filled: {
    position: "absolute",
    left: 0,
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB + 8,
    marginLeft: -4,
    height: THUMB,
    borderRadius: THUMB / 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
