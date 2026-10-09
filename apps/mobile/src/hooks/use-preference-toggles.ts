import { useCallback } from "react";
import { Alert } from "react-native";

import { usePreferences } from "@/contexts/PreferencesContext";
import { getCurrentCoordinates } from "@/services/location";
import { syncReminders } from "@/services/reminders";
import { useT } from "@/i18n";

/**
 * Os dois interruptores que dependem de uma autorização do telemóvel — localização e
 * lembretes — aparecem em vários ecrãs (Perfil, Privacidade, Notificações). Aqui fica o
 * que acontece ao ligá-los: pede-se a autorização e, se for recusada, o interruptor
 * volta a desligado com uma explicação, em vez de ficar ligado sem efeito.
 */
export function usePreferenceToggles() {
  const t = useT();
  const { preferences, setPreference } = usePreferences();

  const setLocation = useCallback(
    async (value: boolean) => {
      if (!value) {
        setPreference("location", false);
        return;
      }

      const position = await getCurrentCoordinates();
      if (!position) {
        Alert.alert(
          t("Sem acesso à localização"),
          t("Autorize a localização para o Agenda+ nas definições do telemóvel e volte a ligar esta opção."),
        );
        return;
      }
      setPreference("location", true);
    },
    [setPreference],
  );

  const setReminders = useCallback(
    async (value: boolean) => {
      setPreference("reminders", value);

      const result = await syncReminders(value, true);
      if (value && result === "denied") {
        setPreference("reminders", false);
        Alert.alert(
          t("Notificações desligadas"),
          t("Autorize as notificações para o Agenda+ nas definições do telemóvel e volte a ligar os lembretes."),
        );
      }
    },
    [setPreference],
  );

  return { preferences, setPreference, setLocation, setReminders };
}
