import { toast } from "sonner";

// Pergunta de confirmação sem a caixa do browser ("Esta página diz…"): aparece como uma
// notificação do painel com dois botões. Resolve true só se a pessoa confirmar; fechar
// ou deixar expirar conta como "não".
export function confirmAction(message: string, actionLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    toast(message, {
      duration: 12000,
      action: { label: actionLabel, onClick: () => settle(true) },
      cancel: { label: "Cancelar", onClick: () => settle(false) },
      onDismiss: () => settle(false),
      onAutoClose: () => settle(false),
    });
  });
}
