import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIOSColors } from "@/components/ios";
import { RangeSlider } from "@/components/RangeSlider";
import { Typography } from "@/constants/theme";
import { useT } from "@/i18n";

// null = sem limite (o controlo todo à direita).
export type MapFilters = { radiusKm: number | null; maxPrice: number | null };
export const NO_MAP_FILTERS: MapFilters = { radiusKm: null, maxPrice: null };

const MAX_RADIUS_KM = 50;
const MAX_PRICE = 50000;
const PRICE_STEP = 1000;

export function priceLabel(value: number): string {
  return `${value.toLocaleString("pt-AO")} Kz`;
}

/*
 * Folha de filtros do mapa: até que distância de onde a pessoa está, e até que preço.
 * Com um controlo todo à direita, esse filtro não limita nada.
 */
export function MapFiltersSheet({
  visible,
  initial,
  onApply,
  onClose,
}: {
  visible: boolean;
  initial: MapFilters;
  onApply: (filters: MapFilters) => void;
  onClose: () => void;
}) {
  const t = useT();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("Fechar filtros")} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: colors.textTertiary }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t("Filtros")}</Text>
          <Pressable onPress={() => setDraft(NO_MAP_FILTERS)} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.clear, { color: colors.primary }]}>{t("Limpar filtros")}</Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("Fechar")}>
            <View style={[styles.close, { backgroundColor: colors.input }]}>
              <Ionicons name="close" size={18} color={colors.text} />
            </View>
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>{t("Distância")}</Text>
        <Text style={[styles.value, { color: colors.textSecondary }]}>
          {draft.radiusKm === null ? t("Qualquer distância") : t("Até {0} km de si", [draft.radiusKm])}
        </Text>
        <RangeSlider
          accessibilityLabel={t("Distância máxima")}
          value={draft.radiusKm ?? MAX_RADIUS_KM + 1}
          min={1}
          max={MAX_RADIUS_KM + 1}
          step={1}
          onChange={(next) => setDraft((current) => ({ ...current, radiusKm: next > MAX_RADIUS_KM ? null : next }))}
        />

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <Text style={[styles.label, { color: colors.text }]}>{t("Preço")}</Text>
        <Text style={[styles.value, { color: colors.textSecondary }]}>
          {draft.maxPrice === null ? t("Qualquer preço") : t("Serviços até {0}", [priceLabel(draft.maxPrice)])}
        </Text>
        <RangeSlider
          accessibilityLabel={t("Preço máximo")}
          value={draft.maxPrice ?? MAX_PRICE + PRICE_STEP}
          min={PRICE_STEP}
          max={MAX_PRICE + PRICE_STEP}
          step={PRICE_STEP}
          onChange={(next) => setDraft((current) => ({ ...current, maxPrice: next > MAX_PRICE ? null : next }))}
        />

        <Pressable
          onPress={() => {
            onApply(draft);
            onClose();
          }}
          accessibilityRole="button"
        >
          {({ pressed }) => (
            <View style={[styles.apply, { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.applyText, { color: colors.primaryForeground }]}>{t("Aplicar filtros")}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingTop: 8,
    // Tapa a costura entre o fundo escurecido e a folha.
    marginTop: -22,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 22,
  },
  title: {
    ...Typography.title2,
    flex: 1,
  },
  clear: {
    ...Typography.subheadline,
    fontWeight: "600",
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...Typography.headline,
  },
  value: {
    ...Typography.subheadline,
    marginTop: 4,
    marginBottom: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  apply: {
    height: 50,
    borderRadius: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  applyText: {
    ...Typography.headline,
  },
});
