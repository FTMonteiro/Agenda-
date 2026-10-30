import React, { Children, forwardRef, isValidElement, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { Colors, Typography } from "@/constants/theme";

import type { TextInputInstance } from "react-native";
/*
 * Peças base no estilo das apps da Apple (Definições, Saúde, App Store):
 * secções agrupadas com cantos contínuos, linhas de 44 pt com separadores
 * finos recuados, um único botão principal preenchido com a cor de destaque
 * e feedback imediato ao toque (no press-in, não ao largar).
 */

export function useIOSColors() {
  return useColorScheme() === "dark" ? Colors.dark : Colors.light;
}

/* ---------------------------------------------------------
   Secção agrupada (inset grouped)
--------------------------------------------------------- */

interface GroupedSectionProps {
  header?: string;
  footer?: string;
  error?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GroupedSection({ header, footer, error, children, style }: GroupedSectionProps) {
  const colors = useIOSColors();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[styles.section, style]}>
      {header ? (
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{header.toUpperCase()}</Text>
      ) : null}

      <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
        {rows.map((row, index) => (
          <View key={row.key ?? index}>
            {row}
            {index < rows.length - 1 ? <View style={[styles.separator, { backgroundColor: colors.divider }]} /> : null}
          </View>
        ))}
      </View>

      {error ? (
        <Text style={[styles.sectionFooter, { color: colors.error }]}>{error}</Text>
      ) : footer ? (
        <Text style={[styles.sectionFooter, { color: colors.textSecondary }]}>{footer}</Text>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------
   Campo de texto numa linha da secção
--------------------------------------------------------- */

interface FieldRowProps extends TextInputProps {
  label: string;
  invalid?: boolean;
  trailing?: React.ReactNode;
}

export const FieldRow = forwardRef<TextInputInstance, FieldRowProps>(function FieldRow(
  { label, invalid, trailing, style, ...inputProps },
  ref,
) {
  const colors = useIOSColors();

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: invalid ? colors.error : colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        style={[styles.rowInput, { color: colors.text }, style]}
        {...inputProps}
      />
      {trailing}
    </View>
  );
});

/* ---------------------------------------------------------
   Botões
--------------------------------------------------------- */

interface FilledButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// Encolhe ligeiramente no instante do toque e volta com uma mola sem ressalto
// (damping crítico), como os botões do sistema.
export function FilledButton({ title, onPress, loading, disabled }: FilledButtonProps) {
  const colors = useIOSColors();
  const scale = useRef(new Animated.Value(1)).current;
  const inactive = disabled || loading;

  const springTo = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => springTo(0.97)}
      onPressOut={() => springTo(1)}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.filledButton,
            {
              backgroundColor: colors.primary,
              opacity: inactive && !loading ? 0.4 : pressed ? 0.85 : 1,
              transform: [{ scale }],
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.filledButtonText, { color: colors.primaryForeground }]}>{title}</Text>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

interface TextButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export function TextButton({ title, onPress, disabled }: TextButtonProps) {
  const colors = useIOSColors();

  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} hitSlop={10}>
      {({ pressed }) => (
        <Text style={[styles.textButton, { color: colors.primary, opacity: pressed ? 0.4 : 1 }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    ...Typography.footnote,
    marginHorizontal: 16,
    marginBottom: 7,
  },
  sectionCard: {
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  sectionFooter: {
    ...Typography.footnote,
    marginHorizontal: 16,
    marginTop: 7,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    ...Typography.body,
    width: 112,
  },
  rowInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 11,
  },
  filledButton: {
    height: 50,
    borderRadius: 12,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  filledButtonText: {
    ...Typography.headline,
  },
  textButton: {
    ...Typography.body,
  },
});
