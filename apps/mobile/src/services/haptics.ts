import * as Haptics from "expo-haptics";

// Ligado ou desligado pela opção "Feedback háptico" das Definições (PreferencesContext).
let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

// Um toque leve, para ações pequenas (mudar de separador, marcar um favorito). Num
// aparelho sem motor de vibração (ou no browser) simplesmente não faz nada.
export function tapFeedback(): void {
  if (!enabled) return;
  void Haptics.selectionAsync().catch(() => undefined);
}
