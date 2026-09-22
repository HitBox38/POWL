import WolSenderModule from './src/WolSenderModule';

export function quickActionsUnavailableReason() {
  return typeof WolSenderModule?.syncQuickActions === 'function'
    ? null : 'Quick access requires an Android build with Quick Settings and shortcut support.';
}

let pending: Promise<void> = Promise.resolve();
export function syncQuickActions(config: string) {
  pending = pending.catch(() => {}).then(async () => {
    if (!WolSenderModule?.syncQuickActions) throw new Error(quickActionsUnavailableReason()!);
    await WolSenderModule.syncQuickActions(config);
  });
  return pending;
}

export async function requestAddWakeTile() {
  await pending;
  return await WolSenderModule?.requestAddWakeTile?.() ?? false;
}
