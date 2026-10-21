import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReviewDTO } from "@slotix/types";

import { useIOSColors } from "@/components/ios";
import { STAR_COLOR } from "@/components/SpaceCards";
import { tapFeedback } from "@/services/haptics";
import { createReview } from "@/services/reviews";
import { useT } from "@/i18n";

/*
 * Folha "Avaliar o espaço", vinda de baixo: de 1 a 5 estrelas e um comentário opcional.
 * A avaliação fica presa a um atendimento concluído (a API só aceita uma por atendimento),
 * por isso quem a abre passa o atendimento que está a ser avaliado.
 */

const LABELS = ["", "Mau", "Razoável", "Bom", "Muito bom", "Excelente"];

function StarButton({ position, active, onPress }: { position: number; active: boolean; onPress: (value: number) => void }) {
  const colors = useIOSColors();
  const pop = useRef(new Animated.Value(1)).current;

  const press = () => {
    Animated.sequence([
      Animated.spring(pop, { toValue: 0.75, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
    ]).start();
    onPress(position);
  };

  return (
    <Pressable onPress={press} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${position}`}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Ionicons name={active ? "star" : "star-outline"} size={38} color={active ? STAR_COLOR : colors.iconSecondary} />
      </Animated.View>
    </Pressable>
  );
}

export function RateSpaceSheet({
  visible,
  businessId,
  businessName,
  appointmentId,
  onClose,
  onRated,
}: {
  visible: boolean;
  businessId: string;
  businessName: string;
  appointmentId: string | null;
  onClose: () => void;
  onRated: (review: ReviewDTO) => void;
}) {
  const t = useT();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada abertura começa do zero.
  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment("");
      setError(null);
    }
  }, [visible]);

  const choose = (value: number) => {
    tapFeedback();
    setRating(value);
    setError(null);
  };

  const submit = async () => {
    if (!appointmentId || rating === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      const review = await createReview(businessId, {
        appointmentId,
        rating,
        comment: comment.trim() || undefined,
      });
      onRated(review);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Não foi possível enviar a avaliação."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.grabber, { backgroundColor: colors.iconSecondary }]} />

          <Text style={[styles.title, { color: colors.text }]}>{t("Avaliar o espaço")}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {businessName}
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((position) => (
              <StarButton key={position} position={position} active={position <= rating} onPress={choose} />
            ))}
          </View>

          <Text style={[styles.label, { color: rating ? colors.text : colors.textTertiary }]}>
            {rating ? t(LABELS[rating]) : t("Toque nas estrelas para dar a sua nota")}
          </Text>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t("Conte como foi (opcional)")}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={2000}
            style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
          />

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          <Pressable
            onPress={() => void submit()}
            disabled={rating === 0 || sending}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary, opacity: rating === 0 ? 0.4 : pressed ? 0.85 : 1 },
              pressed && rating > 0 && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{t("Enviar avaliação")}</Text>
            )}
          </Pressable>

          <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancel} hitSlop={8}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>{t("Agora não")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    textAlign: "center",
  },
  stars: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    marginTop: 20,
    minHeight: 90,
    maxHeight: 160,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  error: {
    marginTop: 10,
    fontSize: 13,
    textAlign: "center",
  },
  button: {
    marginTop: 18,
    height: 50,
    borderRadius: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancel: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
