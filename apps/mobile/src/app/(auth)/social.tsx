import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useIOSColors } from "@/components/ios";

/*
 * Para onde aponta a ligação de regresso do login com Google ou Apple feito no browser.
 * Quem trata do resultado é o ecrã que abriu o browser (ver browserSignIn em
 * services/auth.ts); este só existe porque no Android a
 * ligação também chega à navegação, que sem ele mostraria "página não encontrada". Volta
 * de imediato ao ecrã anterior — ou ao login, se a app foi aberta de novo por esta ligação.
 */
export default function SocialReturnScreen() {
  const router = useRouter();
  const colors = useIOSColors();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/login");
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
