# 📋 Шаблон информации о сервере для новых чатов

## 🖥️ Данные сервера

**IP:** 31.59.126.197  
**ОС:** Ubuntu (на базе Lubuntu)  
**Домен:** moneymap-finance.duckdns.org (DuckDNS, бесплатный)  
**Пользователь:** root  
**Рабочая папка проектов:** /usr/src/code/  
**Папка сайтов:** /var/www/

---

## 📦 Установленное ПО

| Компонент | Версия | Как установлен |
|-----------|--------|----------------|
| Docker | latest | apt install docker.io |
| Node.js | v18.20.8 | через nvm (nvm install 18) |
| npm | v10.8.2 | вместе с Node.js |
| Nginx | 1.18.0 | apt install nginx |
| Git | 1.2.34 | apt install git |
| Certbot | latest | apt install certbot python3-certbot-nginx |
| PocketBase | 0.21.0 | бинарник в /usr/src/code/ |

**ВАЖНО:** Node.js ставится только через nvm, через apt ставится старая версия v12, которая не работает с Vite.

---

## 📁 Структура папок

```
/usr/src/code/
├── pocketbase              # Бинарник PocketBase
├── pocketbase.min.js       # SDK PocketBase (локально, не CDN)
├── index.html              # Фронтенд приложения MoneyMap
├── translations.js         # Файл переводов на русский (unicode-escape)
├── gen_trans.py            # Скрипт генерации translations.js
├── moneymap-new/           # Репозиторий MoneyMap для деплоя
└── (сюда клонируем новые проекты)

/var/www/
└── (папка для будущих проектов)
```

---

## ⚙️ Конфигурация Nginx

**Файл:** `/etc/nginx/sites-available/pocketbase`

```nginx
server {
    listen 80;
    server_name moneymap-finance.duckdns.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name moneymap-finance.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/moneymap-finance.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moneymap-finance.duckdns.org/privkey.pem;

    client_max_body_size 50M;

    # Админка PocketBase (закрыта, доступна только через SSH туннель)
    # location /admin/ {
    #     proxy_pass http://127.0.0.1:8090/_/;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto $scheme;
    # }

    # API PocketBase
    location /api/ {
        proxy_pass http://127.0.0.1:8090/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Само приложение
    location / {
        root /usr/src/code;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

**Логика:**
- HTTP (80) → редирект на HTTPS
- HTTPS (443) → сертификаты Let's Encrypt
- `/admin/` → закрыто (доступ только через SSH туннель)
- `/api/` → API PocketBase (порт 8090)
- `/` → фронтенд приложения (index.html)

---

## 🔐 HTTPS

- Сертификат Let's Encrypt через certbot
- Автообновление настроено
- Команда: `certbot --nginx -d moneymap-finance.duckdns.org --redirect`
- Срок действия: до 17 января 2027

---

## 🗄️ PocketBase

- **Версия:** 0.21.0
- **Порт:** 8090
- **Папка:** /usr/src/code/
- **Файл:** /usr/src/code/pocketbase (бинарник)
- **Автозапуск:** systemctl enable pocketbase (systemd сервис)
- **Админка:** доступна только через SSH туннель
- **Приложение:** https://moneymap-finance.duckdns.org/ (файл /usr/src/code/index.html)
- **SDK:** /usr/src/code/pocketbase.min.js (локально, не CDN)

### Структура базы данных

**Коллекции:**
- `users` (встроенная, auth)
- `cards` (name, type, balance, creditlimit, currentdebit, lastFourdigits, color, userId)
- `credits` (name, totalAmount, remainingAmount, interestRate, monthlyPayment, paymentDay, lastPaidDate, userId)
- `categories` (name, icon, color, type: income/expense)
- `transactions` (amount, type: income/expense, date, description, categoryId, cardId, field, userId)
- `budgets` (month, categoryId, amount, userId)
- `budget_plans` (name, amount, type: income/expense, dayOfMonth, recurring, month, userId)

**API Rules:** Для всех коллекций `@request.auth.id != ""` или `@request.auth.id = userId`

### Команды для управления PocketBase

```bash
# Статус
sudo systemctl status pocketbase

# Перезапуск
sudo systemctl restart pocketbase

# Логи
sudo journalctl -u pocketbase -f

# Остановить
sudo systemctl stop pocketbase

# Запустить
sudo systemctl start pocketbase
```

---

## 🚀 Алгоритм деплоя нового приложения

1. **Клонировать репо:**
   ```bash
   cd /usr/src/code
   git clone https://github.com/ПОЛЬЗОВАТЕЛЬ/НАЗВАНИЕ.git
   cd НАЗВАНИЕ
   ```

2. **Установить зависимости:**
   ```bash
   nvm use 18
   npm install
   ```

3. **Создать .env** (если нужен) — скопировать из .env.example и заполнить

4. **Собрать проект:**
   ```bash
   npm run build
   ```

5. **Создать папку в /var/www/:**
   ```bash
   mkdir /var/www/НАЗВАНИЕ
   cp -r dist/* /var/www/НАЗВАНИЕ/
   ```

6. **Добавить конфиг Nginx:**
   ```bash
   nano /etc/nginx/sites-available/НАЗВАНИЕ
   ```
   Скопировать конфиг, заменить домен на новый.

7. **Включить сайт:**
   ```bash
   ln -s /etc/nginx/sites-available/НАЗВАНИЕ /etc/nginx/sites-enabled/
   systemctl restart nginx
   ```

8. **Получить HTTPS:**
   ```bash
   certbot --nginx -d НОВЫЙ.ДОМЕН --redirect
   ```

---

## 📱 Мои приложения

| Приложение | GitHub | Статус | Домен |
|------------|--------|--------|-------|
| MoneyMap | Kjollen/moneymap-finance | ✅ Работает | moneymap-finance.duckdns.org |
| Приложение 2 | (указать) | 📋 Планируется | (указать) |
| Приложение 3 | (указать) | 📋 Планируется | (указать) |

---

## 🔄 Команды после перезагрузки сервера

```bash
# Запустить PocketBase
sudo systemctl start pocketbase

# Запустить Nginx
sudo systemctl start nginx

# Проверить статус
sudo systemctl status pocketbase
sudo systemctl status nginx
```

---

## 💾 Бэкапы

**Автоматические бэкапы** (настроены через crontab):
```bash
# Ежедневный бэкап в 3:00
0 3 * * * tar -czf /root/pb-backup-$(date +\%Y\%m\%d).tar.gz /usr/src/code/pb_data/ && find /root -name "pb-backup-*.tar.gz" -mtime +30 -delete
```

**Ручные бэкапы:**
```bash
# Бэкап файлов сайта и PocketBase
tar -czf /root/moneymap-backup-$(date +%Y%m%d).tar.gz /usr/src/code/

# Бэкап базы данных PocketBase
tar -czf /root/pocketbase-db-$(date +%Y%m%d).tar.gz /usr/src/code/pb_data/
```

---

## ⚠️ Важные нюансы

1. **Node.js только через nvm** — apt ставит v12, который не работает с Vite
2. **PocketBase на порту 8090**, Nginx на 80/443
3. **Админка PocketBase закрыта** — доступна только через SSH туннель:
   ```bash
   ssh -L 8090:localhost:8090 root@31.59.126.197
   # Затем открыть http://localhost:8090/_/
   ```
4. **В .env проекта endpoint** должен быть `https://ТВОЙ.ДОМЕН/api` (с HTTPS!)
5. **После сборки** нужно скопировать файлы из `dist/` в `/var/www/` или `/usr/src/code/`
6. **Certbot автоматически обновляет** конфиг Nginx — не трогай его руками после certbot
7. **DuckDNS нужно обновлять** каждые 30 дней (через cron или вручную)
8. **Русский язык в интерфейсе** работает через translations.js (unicode-escape) или напрямую в React-компонентах

---

## 🐛 Если что-то сломалось

```bash
# Логи Nginx
tail -30 /var/log/nginx/error.log

# Логи PocketBase
sudo journalctl -u pocketbase -f

# Проверить порты
ss -tlnp | grep ':80'
ss -tlnp | grep ':443'
ss -tlnp | grep ':8090'

# Проверить конфиг Nginx
sudo nginx -t

# Перезапустить Nginx
sudo systemctl reload nginx
```

---

## 💡 Советы для новых чатов

При создании нового чата для нового приложения:

1. **Скопируй этот шаблон** в начало сообщения
2. **Добавь описание задачи:**
   - Что нужно сделать (новое приложение, доработка, исправление бага)
   - Какие технологии используются (React, Vue, Node.js, и т.д.)
   - Есть ли особые требования

3. **Пример начала сообщения:**
   ```
   [СКОПИРОВАННЫЙ ШАБЛОН СЕРВЕРА]
   
   Задача: Создать новое приложение "TODO List"
   Технологии: React + Vite + Tailwind CSS
   Требования: 
   - Простой список задач
   - Сохранение в PocketBase
   - Авторизация пользователей
   ```

---

## 📝 Чек-лист для нового приложения

- [ ] Создан репозиторий на GitHub
- [ ] Настроена структура проекта
- [ ] Добавлены зависимости в package.json
- [ ] Настроен PocketBase (коллекции, API Rules)
- [ ] Протестировано локально
- [ ] Задеплоено на сервер
- [ ] Настроен HTTPS через certbot
- [ ] Проверена работа в браузере
- [ ] Настроены бэкапы (если нужно)

---

**Версия шаблона:** 1.0  
**Дата обновления:** 21 октября 2026  
**Автор:** MoneyMap Finance Team
