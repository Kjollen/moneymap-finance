import PocketBase from 'pocketbase';

// URL вашего сервера PocketBase
const POCKETBASE_URL = 'https://moneymap-finance.duckdns.org';

// Создаём экземпляр клиента
const pb = new PocketBase(POCKETBASE_URL);

// Автоматически загружаем токен из localStorage (если был сохранён)
pb.authStore.loadFromCookie(document.cookie);

// Сохраняем токен в cookie при изменении авторизации
pb.authStore.onChange(() => {
  document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
}, true);

export default pb;
