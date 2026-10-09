import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { FilledButton, useIOSColors } from "@/components/ios";
import { normalizeText, type LocalityDTO, type ProvinceDTO } from "@slotix/types";

import { Typography } from "@/constants/theme";
import { useSelectedLocation } from "@/contexts/LocationContext";
import { useZoneOptions } from "@/hooks/use-zone-options";
import { countLabel, loadLocationOptions, provinciasOf, type ZoneOption } from "@/services/localities";
import { useT } from "@/i18n";

/*
 * Ecrã que aparece logo depois de criar a conta: a pessoa indica onde quer ver espaços.
 * É essa a localização que a app passa a usar (pode ser mudada depois, ao tocar na
 * localização na Home ou no Explorar).
 *
 * Dois passos no mesmo ecrã: primeiro a província (todas as de Angola, vindas do
 * OpenStreetMap), depois a zona dessa província — as suas cidades e bairros, também do
 * OpenStreetMap, com o número de espaços que ficam em cada um.
 */
export default function LocationOnboardingScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const { setBairro, setProvincia: saveProvincia, chooseNearMe } = useSelectedLocation();

  const [step, setStep] = useState<"provincia" | "bairro">("provincia");
  const [provincia, setProvincia] = useState<string | null>(null);
  const [bairro, setBairroChoice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectFailed, setDetectFailed] = useState(false);

  const [localities, setLocalities] = useState<LocalityDTO[]>([]);
  const [provinces, setProvinces] = useState<ProvinceDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadLocationOptions()
      .then((data) => {
        if (cancelled) return;
        setLocalities(data.localities);
        setProvinces(data.provinces);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { options: zonas, loading: loadingZonas } = useZoneOptions(provincia, localities);
  const items = useMemo<ZoneOption[]>(
    () => (step === "provincia" ? provinciasOf(localities, provinces).map((item) => ({ ...item, center: null })) : zonas),
    [step, zonas, localities, provinces],
  );
  const loadingItems = step === "provincia" ? loading : loadingZonas;
  const filtered = useMemo(() => {
    const target = normalizeText(query);
    return target ? items.filter((item) => normalizeText(item.name).includes(target)) : items;
  }, [items, query]);

  const pickProvincia = (name: string) => {
    setProvincia(name);
    setBairroChoice(null);
    setQuery("");
    setStep("bairro");
  };

  const useGps = async () => {
    setDetecting(true);
    setDetectFailed(false);
    // Com a localização do telemóvel a app mostra os espaços à volta da pessoa.
    const ok = await chooseNearMe();
    setDetecting(false);

    if (ok) router.replace("/");
    else setDetectFailed(true);
  };

  const seeEverything = () => {
    saveProvincia(null);
    router.replace("/");
  };

  const finish = () => {
    if (!provincia) return;
    const center = zonas.find((item) => item.name === bairro)?.center ?? null;
    setBairro(bairro, { provincia, center });
    router.replace("/");
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        {step === "bairro" ? (
          <Pressable
            onPress={() => {
              setStep("provincia");
              setQuery("");
            }}
            hitSlop={10}
            style={styles.back}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>{t("Província")}</Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}

        <View style={[styles.pin, { backgroundColor: colors.infoBackground }]}>
          <Ionicons name="location" size={30} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {step === "provincia" ? t("Onde quer ver espaços?") : t("Em que zona de {0}?", [provincia])}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === "provincia"
            ? t("Use a sua localização ou escolha uma província onde há espaços. Pode mudar isto mais tarde.")
            : t("Escolha a zona para ver os espaços de lá, ou veja a província toda.")}
        </Text>
        <Text style={[styles.step, { color: colors.textTertiary }]}>
          {step === "provincia" ? t("PASSO 1 DE 2") : t("PASSO 2 DE 2")}
        </Text>
      </View>

      <View style={[styles.searchField, { backgroundColor: colors.input }]}>
        <Ionicons name="search" size={17} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={step === "provincia" ? t("Pesquisar províncias") : t("Pesquisar zonas")}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {step === "provincia" && !query ? (
          <>
            <View style={[styles.group, { backgroundColor: colors.card }]}>
              <Pressable onPress={useGps} disabled={detecting}>
                {({ pressed }) => (
                  <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
                    <Ionicons name="navigate" size={18} color={colors.primary} />
                    <Text style={[styles.rowText, { color: colors.primary }]}>{t("Usar a minha localização")}</Text>
                    {detecting ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
                  </View>
                )}
              </Pressable>
              <View style={[styles.separator, { backgroundColor: colors.divider }]} />
              <Pressable onPress={seeEverything}>
                {({ pressed }) => (
                  <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
                    <Ionicons name="globe-outline" size={18} color={colors.primary} />
                    <Text style={[styles.rowText, { color: colors.primary }]}>{t("Ver todos os espaços")}</Text>
                  </View>
                )}
              </Pressable>
            </View>
            {detectFailed ? (
              <Text style={[styles.note, { color: colors.error }]}>
                {t("Sem acesso à sua localização. Autorize-a nas definições do telemóvel ou escolha uma província na lista.")}
              </Text>
            ) : null}
            <View style={styles.gap} />
          </>
        ) : null}

        <View style={[styles.group, { backgroundColor: colors.card }]}>
          {step === "bairro" && !query ? (
            <>
              <Option
                label={t("Toda a província de {0}", [provincia])}
                selected={bairro === null}
                onPress={() => setBairroChoice(null)}
              />
              <View style={[styles.separator, { backgroundColor: colors.divider }]} />
            </>
          ) : null}
          {filtered.map((item, index) => (
            <View key={item.name}>
              <Option
                label={item.name}
                detail={countLabel(item.count)}
                selected={step === "provincia" ? provincia === item.name : bairro === item.name}
                chevron={step === "provincia"}
                onPress={() => (step === "provincia" ? pickProvincia(item.name) : setBairroChoice(item.name))}
              />
              {index < filtered.length - 1 ? (
                <View style={[styles.separator, { backgroundColor: colors.divider }]} />
              ) : null}
            </View>
          ))}
          {loadingItems && filtered.length === 0 ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.rowText, { color: colors.textSecondary }]}>
                {query
                  ? t("Sem resultados para “{0}”", [query])
                  : step === "provincia"
                    ? t("Não foi possível carregar as províncias. Verifique a ligação.")
                    : t("Não foi possível carregar as zonas de {0}.", [provincia])}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {step === "bairro" ? (
        <View style={styles.footer}>
          <FilledButton title={t("Continuar")} onPress={finish} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Option({
  label,
  detail,
  selected,
  chevron,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  chevron?: boolean;
  onPress: () => void;
}) {
  const colors = useIOSColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      {({ pressed }) => (
        <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
          <Text style={[styles.rowText, { color: colors.text }]}>{label}</Text>
          {detail ? <Text style={[styles.rowDetail, { color: colors.textSecondary }]}>{detail}</Text> : null}
          {chevron ? (
            <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
          ) : selected ? (
            <Ionicons name="checkmark" size={20} color={colors.primary} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  back: {
    alignSelf: "flex-start",
    height: 40,
    marginLeft: -12,
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    ...Typography.body,
  },
  pin: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    ...Typography.title1,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.subheadline,
    textAlign: "center",
    marginTop: 6,
  },
  step: {
    ...Typography.caption1,
    fontWeight: "600",
    marginTop: 10,
  },
  searchField: {
    height: 36,
    marginHorizontal: 16,
    borderRadius: 10,
    borderCurve: "continuous",
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  gap: {
    height: 20,
  },
  group: {
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    ...Typography.body,
    flex: 1,
  },
  rowDetail: {
    ...Typography.footnote,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  note: {
    ...Typography.footnote,
    marginHorizontal: 16,
    marginTop: 7,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
});
