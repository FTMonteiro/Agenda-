import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIOSColors } from '@/components/ios';
import { formatDistance, normalizeText, sameLocality, type LocalityDTO, type ProvinceDTO } from '@slotix/types';

import { Typography } from '@/constants/theme';
import { NEAR_ME_RADIUS_KM, useSelectedLocation } from '@/contexts/LocationContext';
import { listBusinesses } from '@/services/businesses';
import { useZoneOptions } from '@/hooks/use-zone-options';
import { countLabel, loadLocationOptions, provinciasOf, type ZoneOption } from '@/services/localities';
import { useT } from "@/i18n";

type NearbyBairro = { bairro: string; provincia: string; count: number; distanceKm: number };

/*
 * Folha de escolha de localização, como as folhas do iOS (Definições → Região):
 * "Perto de si", as zonas onde há espaços registados perto da pessoa, a província
 * e as zonas dessa província com pesquisa e um visto na escolhida. Aparecem todas as
 * províncias de Angola e, em cada uma, as suas cidades e bairros (do OpenStreetMap),
 * com o número de espaços que ficam em cada um.
 */
export function LocationPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const colors = useIOSColors();
  const { provincia, bairro, nearMe, coordinates, setProvincia, setBairro, chooseNearMe } = useSelectedLocation();

  const [mode, setMode] = useState<'bairros' | 'provincias'>('bairros');
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);
  const [nearbyBairros, setNearbyBairros] = useState<NearbyBairro[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [localities, setLocalities] = useState<LocalityDTO[]>([]);
  const [provinces, setProvinces] = useState<ProvinceDTO[]>([]);
  const [loadingLocalities, setLoadingLocalities] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoadingLocalities(true);
    loadLocationOptions()
      .then((data) => {
        if (cancelled) return;
        setLocalities(data.localities);
        setProvinces(data.provinces);
      })
      .finally(() => {
        if (!cancelled) setLoadingLocalities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  // As zonas com espaços perto da pessoa vêm dos espaços registados à volta dela.
  useEffect(() => {
    if (!visible || !coordinates) return;

    let cancelled = false;
    setLoadingNearby(true);

    listBusinesses({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusKm: 25,
      sortBy: 'nearest',
      limit: 100,
    })
      .then(({ data }) => {
        if (cancelled) return;
        const byBairro = new Map<string, NearbyBairro>();
        for (const space of data) {
          const zona = space.bairro ?? space.municipio;
          if (!zona || !space.provincia) continue;
          const found = { bairro: zona, provincia: space.provincia };
          const current = byBairro.get(found.bairro);
          const distance = space.distanceKm ?? Number.POSITIVE_INFINITY;
          byBairro.set(found.bairro, {
            ...found,
            count: (current?.count ?? 0) + 1,
            distanceKm: Math.min(current?.distanceKm ?? Number.POSITIVE_INFINITY, distance),
          });
        }
        setNearbyBairros([...byBairro.values()].sort((a, b) => a.distanceKm - b.distanceKm));
      })
      .catch(() => {
        if (!cancelled) setNearbyBairros([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingNearby(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, coordinates]);

  const { options: zonas, loading: loadingZonas } = useZoneOptions(visible ? provincia : null, localities);
  const items = useMemo<ZoneOption[]>(
    () => (mode === 'bairros' ? zonas : provinciasOf(localities, provinces).map((item) => ({ ...item, center: null }))),
    [mode, zonas, localities, provinces],
  );
  const loadingItems = mode === 'bairros' ? loadingZonas : loadingLocalities;
  const filtered = useMemo(() => {
    const target = normalizeText(query);
    return target ? items.filter((item) => normalizeText(item.name).includes(target)) : items;
  }, [items, query]);

  const close = () => {
    setMode('bairros');
    setQuery('');
    setLocationFailed(false);
    onClose();
  };

  const pickNearMe = async () => {
    setLocating(true);
    setLocationFailed(false);
    const ok = await chooseNearMe();
    setLocating(false);

    if (!ok) {
      setLocationFailed(true);
      return;
    }
    close();
  };

  const choose = (item: string | null, center: ZoneOption['center'] = null) => {
    if (mode === 'provincias') {
      setProvincia(item);
      setQuery('');
      // "Todas as províncias" não tem zonas para escolher a seguir.
      if (item) setMode('bairros');
      else close();
      return;
    }
    setBairro(item, { center });
    close();
  };

  const showTop = mode === 'bairros' && !query;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={close}
    >
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={Platform.OS === 'ios' ? [] : ['top']}>
        <View style={styles.grabber}>
          <View style={[styles.grabberBar, { backgroundColor: colors.textTertiary }]} />
        </View>

        <View style={styles.navBar}>
          {mode === 'provincias' ? (
            <Pressable onPress={() => setMode('bairros')} hitSlop={10} style={styles.navSide}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
              <Text style={[styles.navButton, { color: colors.primary }]}>{t("Voltar")}</Text>
            </Pressable>
          ) : (
            <View style={styles.navSide} />
          )}
          <Text style={[styles.navTitle, { color: colors.text }]}>{mode === 'bairros' ? t("Localização") : t("Província")}</Text>
          <Pressable onPress={close} hitSlop={10} style={[styles.navSide, styles.navSideRight]}>
            <Text style={[styles.navButton, styles.navDone, { color: colors.primary }]}>{t("OK")}</Text>
          </Pressable>
        </View>

        <View style={[styles.searchField, { backgroundColor: colors.input }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={mode === 'provincias' ? t("Pesquisar províncias") : provincia ? t("Pesquisar em {0}", [provincia]) : t("Pesquisar")}
            placeholderTextColor={colors.textSecondary}
            selectionColor={colors.primary}
            autoCorrect={false}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {showTop ? (
            <>
              <View style={[styles.group, { backgroundColor: colors.card }]}>
                <Pressable onPress={pickNearMe} disabled={locating}>
                  {({ pressed }) => (
                    <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
                      <View style={[styles.rowIcon, { backgroundColor: colors.primary }]}>
                        <Ionicons name="navigate" size={15} color="#FFFFFF" />
                      </View>
                      <View style={styles.rowTextBlock}>
                        <Text style={[styles.rowText, { color: colors.text }]}>{t("Perto de si")}</Text>
                        <Text style={[styles.rowSubtext, { color: colors.textSecondary }]}>
                          {t("Espaços até")}{" "}{NEAR_ME_RADIUS_KM}{" "}{t("km de onde está")}
                        </Text>
                      </View>
                      {locating ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      ) : nearMe ? (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      ) : null}
                    </View>
                  )}
                </Pressable>
                <View style={[styles.separator, styles.separatorIcon, { backgroundColor: colors.divider }]} />
                <Pressable onPress={() => setMode('provincias')}>
                  {({ pressed }) => (
                    <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
                      <View style={[styles.rowIcon, { backgroundColor: '#34C759' }]}>
                        <Ionicons name="map" size={15} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.rowText, styles.flex, { color: colors.text }]}>{t("Província")}</Text>
                      <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{provincia ?? t("Todas")}</Text>
                      <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
                    </View>
                  )}
                </Pressable>
              </View>
              {locationFailed ? (
                <Text style={[styles.footer, { color: colors.error }]}>
                  {t("Não foi possível obter a sua localização. Verifique a autorização nas definições do telemóvel.")}
                </Text>
              ) : null}

              {coordinates ? (
                <>
                  <Text style={[styles.header, { color: colors.textSecondary }]}>{t("ZONAS COM ESPAÇOS PERTO DE SI")}</Text>
                  <View style={[styles.group, { backgroundColor: colors.card }]}>
                    {loadingNearby ? (
                      <View style={styles.row}>
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      </View>
                    ) : nearbyBairros.length === 0 ? (
                      <View style={styles.row}>
                        <Text style={[styles.rowSubtext, { color: colors.textSecondary }]}>{t("Ainda não há espaços registados à sua volta.")}</Text>
                      </View>
                    ) : (
                      nearbyBairros.map((item, index) => (
                        <View key={item.bairro}>
                          <Pressable
                            onPress={() => {
                              setBairro(item.bairro, { provincia: item.provincia });
                              close();
                            }}
                          >
                            {({ pressed }) => (
                              <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
                                <View style={styles.rowTextBlock}>
                                  <Text style={[styles.rowText, { color: colors.text }]}>{item.bairro}</Text>
                                  <Text style={[styles.rowSubtext, { color: colors.textSecondary }]}>
                                    {item.count} {item.count === 1 ? t("espaço") : t("espaços")}
                                    {Number.isFinite(item.distanceKm) ? ` · a ${formatDistance(item.distanceKm)}` : ''}
                                  </Text>
                                </View>
                                {!nearMe && sameLocality(bairro, item.bairro) ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                              </View>
                            )}
                          </Pressable>
                          {index < nearbyBairros.length - 1 ? <View style={[styles.separator, { backgroundColor: colors.divider }]} /> : null}
                        </View>
                      ))
                    )}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          <Text style={[styles.header, { color: colors.textSecondary }]}>
            {mode === 'provincias' ? t("PROVÍNCIAS") : provincia ? t("ZONAS DE {0}", [provincia.toUpperCase()]) : t("ZONAS")}
          </Text>

          <View style={[styles.group, { backgroundColor: colors.card }]}>
            {!query && (mode === 'provincias' || provincia) ? (
              <>
                <OptionRow
                  label={mode === 'provincias' ? t("Todas as províncias") : t("Toda a província de {0}", [provincia])}
                  selected={!nearMe && (mode === 'provincias' ? provincia === null : bairro === null)}
                  onPress={() => choose(null)}
                />
                {filtered.length > 0 ? <View style={[styles.separator, { backgroundColor: colors.divider }]} /> : null}
              </>
            ) : null}
            {filtered.map((item, index) => (
              <View key={item.name}>
                <OptionRow
                  label={item.name}
                  detail={countLabel(item.count)}
                  selected={!nearMe && sameLocality(mode === 'bairros' ? bairro : provincia, item.name)}
                  onPress={() => choose(item.name, item.center)}
                />
                {index < filtered.length - 1 ? <View style={[styles.separator, { backgroundColor: colors.divider }]} /> : null}
              </View>
            ))}
            {loadingItems && items.length === 0 ? (
              <View style={styles.row}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            ) : query && filtered.length === 0 ? (
              <View style={styles.row}>
                <Text style={[styles.rowText, { color: colors.textSecondary }]}>{t("Sem resultados para “")}{query}”</Text>
              </View>
            ) : mode === 'bairros' && items.length === 0 && !loadingItems ? (
              <View style={styles.row}>
                <Text style={[styles.rowSubtext, { color: colors.textSecondary }]}>
                  {provincia
                    ? t("Não foi possível carregar as zonas de {0}.", [provincia])
                    : t("Escolha uma província para ver as zonas onde há espaços.")}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function OptionRow({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useIOSColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      {({ pressed }) => (
        <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
          <Text style={[styles.rowText, styles.flex, { color: colors.text }]}>{label}</Text>
          {detail ? <Text style={[styles.rowSubtext, { color: colors.textSecondary }]}>{detail}</Text> : null}
          {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  grabber: {
    alignItems: 'center',
    paddingTop: 6,
  },
  grabberBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navSide: {
    width: 96,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navSideRight: {
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
  navTitle: {
    ...Typography.headline,
    flex: 1,
    textAlign: 'center',
  },
  navButton: {
    ...Typography.body,
  },
  navDone: {
    fontWeight: '600',
  },
  searchField: {
    height: 36,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  header: {
    ...Typography.footnote,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 7,
  },
  footer: {
    ...Typography.footnote,
    marginHorizontal: 16,
    marginTop: 7,
  },
  group: {
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 29,
    height: 29,
    borderRadius: 7,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextBlock: {
    flex: 1,
  },
  rowText: {
    ...Typography.body,
  },
  rowSubtext: {
    ...Typography.footnote,
  },
  rowValue: {
    ...Typography.body,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  separatorIcon: {
    marginLeft: 57,
  },
});
