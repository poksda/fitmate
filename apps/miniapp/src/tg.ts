export function getTgUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user;
}

export function getInitData() {
  return window.Telegram?.WebApp?.initData ?? '';
}

export function initTgApp() {
  const app = window.Telegram?.WebApp;
  if (!app) return;
  app.ready();
  app.expand();
  document.body.style.background = '#0b1220';
  if (app.setBackgroundColor) app.setBackgroundColor('#0b1220');
  if (app.setHeaderColor) app.setHeaderColor('#0b1220');
}

export function tgTheme(): Record<string, string> {
  return window.Telegram?.WebApp?.themeParams ?? {};
}
