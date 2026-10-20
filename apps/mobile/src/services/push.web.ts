// No browser não há push do Expo: na versão web os avisos ficam só na lista de notificações.
export async function registerForPush(): Promise<void> {}

export async function unregisterFromPush(): Promise<void> {}

export function setRealtimeActive(_active: boolean): void {}

// No browser o aviso que chega em tempo real fica na lista de notificações da app.
export async function showLocalNotification(_title: string, _body: string): Promise<void> {}
