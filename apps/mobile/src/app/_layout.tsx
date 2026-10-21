import React, { useCallback, useEffect, useRef, useState } from "react";

import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from "expo-router";

import { SafeAreaProvider } from "react-native-safe-area-context";

import FloatingNavigation, { TAB_ROUTES } from "@/components/FloatingNavigation";
import { IntroSplash } from "@/components/Brand";
import { AppDialogHost } from "@/components/AppDialog";
import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { LocationProvider } from "../contexts/LocationContext";
import { PreferencesProvider, usePreferences } from "../contexts/PreferencesContext";
import { syncReminders } from "../services/reminders";
import { ThemeProvider } from "../contexts/ThemeContext";
import { loadLanguage, useLanguage } from "@/i18n";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PreferencesProvider>
          <FavoritesProvider>
            <LocationProvider>
              <RootLayoutContent />
            </LocationProvider>
          </FavoritesProvider>
        </PreferencesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  /*
   * Detecta automaticamente o tema definido
   * no telefone:
   *
   * light → tema claro
   * dark  → tema escuro
   */
  const colorScheme = useColorScheme();

  /*
   * Seleciona as cores correspondentes ao tema atual.
   *
   * Se o sistema devolver null, usamos light
   * como fallback.
   */
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;

  /*
   * Detecta em que grupo de rotas estamos.
   *
   * As telas dentro de (auth), como:
   * /login
   * /cadastro
   *
   * não devem mostrar a navegação inferior.
   */
  const segments = useSegments();
  const pathname = usePathname();
  const isTabRoute = TAB_ROUTES.includes(pathname) || pathname === "/index";
  const router = useRouter();

  const isAuthRoute = segments[0] === "(auth)";

  /*
   * Nenhum ecrã pedia sessão antes (os dados eram todos mock).
   * Agora que appointments/favorites/perfil dependem de um
   * utilizador real, sem sessão válida volta sempre para o login.
   */
  const { isAuthenticated, isLoading } = useAuth();

  // O redirecionamento para o login só é pedido depois de a navegação estar montada;
  // pedido antes disso, não há navegador para o tratar.
  const navigationReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    if (isLoading || !navigationReady) return;
    if (!isAuthenticated && !isAuthRoute) {
      router.replace("/login");
    }
  }, [isLoading, navigationReady, isAuthenticated, isAuthRoute, router]);

  const { preferences, loaded: preferencesLoaded } = usePreferences();

  // O idioma guardado no telemóvel é lido ao abrir. Quando muda, os ecrãs são refeitos
  // (a chave abaixo), para nenhum texto ficar no idioma anterior.
  const language = useLanguage();
  useEffect(() => {
    void loadLanguage();
  }, []);

  // A app abre no separador escolhido em Definições → Página inicial. Só na abertura:
  // depois disso "Início" é um separador como os outros.
  const openedOnStartPage = useRef(false);
  useEffect(() => {
    if (openedOnStartPage.current || isLoading || !navigationReady || !preferencesLoaded || !isAuthenticated) return;
    openedOnStartPage.current = true;
    // Só separadores: uma preferência antiga pode apontar para um ecrã que deixou de o ser.
    if (preferences.startPage !== "/" && TAB_ROUTES.includes(preferences.startPage) && (pathname === "/" || pathname === "/index")) {
      router.replace(preferences.startPage as never);
    }
  }, [isLoading, navigationReady, preferencesLoaded, isAuthenticated, preferences.startPage, pathname, router]);

  // Os lembretes das marcações são postos em dia ao abrir a app (e ao ligar/desligar a
  // opção); quem cria ou cancela uma marcação volta a acertá-los nesse momento.
  useEffect(() => {
    if (!preferencesLoaded || !isAuthenticated) return;
    void syncReminders(preferences.reminders);
  }, [preferencesLoaded, isAuthenticated, preferences.reminders]);

  // O ecrã de abertura (ícone + nome) é a primeira coisa a aparecer. A navegação fica
  // montada por baixo desde o início; o ecrã de abertura só sai quando a sessão já foi
  // lida, por isso nunca se vê um ecrã protegido antes de se saber se há sessão.
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  return (
    <SafeAreaProvider>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        {/* =================================================
            STATUS BAR
            ================================================= */}

        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />

        {/* =================================================
            STACK PRINCIPAL
            ================================================= */}

        <View key={`stack-${language}`} style={styles.stackContainer}>
          <Stack
            screenOptions={{
              headerShown: false,

              animation: "default",

              contentStyle: {
                backgroundColor: colors.background,
              },

              /*
               * Garante que as telas do Stack
               * não apresentem fundo diferente
               * do tema global.
               */
            }}
          />
        </View>

        {/* =================================================
            NAVEGAÇÃO INFERIOR
            =================================================

            Login e cadastro não mostram
            FloatingNavigation.
        */}

        {!isAuthRoute && isTabRoute && !isLoading && (
          <View key={`nav-${language}`} pointerEvents="box-none" style={styles.navigationLayer}>
            <FloatingNavigation />
          </View>
        )}

        <AppDialogHost />

        {!introDone ? (
          <IntroSplash ready={!isLoading && (isAuthenticated || isAuthRoute)} onDone={finishIntro} />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

/* =========================================================
   ESTILOS
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  stackContainer: {
    flex: 1,
  },

  navigationLayer: {
    position: "absolute",

    top: 0,
    right: 0,
    bottom: 0,
    left: 0,

    zIndex: 9999,
    elevation: 9999,
  },
});
