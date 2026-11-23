# Переезд ВДВОЁМ НАЛЕГКЕ на свой домен

**Статус:** подготовка. Не публиковать `CNAME` и не менять текущий GitHub Pages, пока владелец не подтвердил, какой домен куплен и что он активен.

Текущий рабочий адрес: `https://gudush03-cell.github.io/vdvoem-web/`.
Сайт: `gudush03-cell/vdvoem-web`.
Backend Railway: `https://perceptive-patience-production-79bfb421.up.railway.app`.

## Порядок безопасного переключения

1. После покупки подтвердить **точное имя** домена (.online или .ru), регистратора и наличие доступа к DNS.
2. В GitHub в **Settings → Pages** репозитория `vdvoem-web` указать домен в **Custom domain**. Верифицировать право на домен в настройках аккаунта GitHub, если требуется. GitHub создаёт/обновляет `CNAME` автоматически при сохранении домена из настройки Pages.
3. У регистратора добавить DNS для корня домена (хост `@`, тип `A`) на четыре адреса GitHub Pages:

   | Тип | Имя | Значение |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | gudush03-cell.github.io |

   Не менять существующие записи, относящиеся к отправке почты (MX, TXT SPF/DKIM), при добавлении A/CNAME. Не создавать wildcard DNS.
4. Дождаться DNS и сертификата GitHub Pages, включить **Enforce HTTPS**. Проверить главную, демо, `secure-game.html`, `secure-purchase.html`, проверку покупки, анимации и мобильную версию.
5. **До объявления домена покупателям** добавить новый `https://<домен>` в строгий CORS allowlist backend Railway. Текущий сервер принимает только `https://gudush03-cell.github.io`; без изменения CORS Telegram-вход, покупка и карты на новом домене не заработают. Должны быть разрешены только явно указанные origins, без `*`.
6. В BotFather выполнить `/setdomain` для `@VdvoemNaLegkeBOT` на новый hostname. Telegram Login Widget должен авторизовать с новым origin. Проверить вход в мобильном браузере и повторный вход после перезагрузки.
7. Перепроверить настройки Robokassa для страниц `SuccessURL`/`FailURL` (если настроены на старый адрес); callback на сервер Railway сохранять, если он не меняется. **Сейчас оплата в режиме test**, а не настоящий приём денег.
8. Для входа по почте: создать отправителя (например, `login@<домен>`) в Resend, опубликовать **именно те** SPF/DKIM/MX DNS-записи, которые покажет Resend, дождаться проверки. Настроить в Railway `RESEND_API_KEY`, `EMAIL_FROM`, случайный `EMAIL_OTP_SECRET` и только после реального тестового письма включить `ENABLE_EMAIL_LOGIN=true`. Backend PR `gudush03-cell/vdvoem-pay-server#2` пока черновой.
9. Проверить все ссылочные пути: после подключения собственного домена корень будет `https://<домен>/`, **без** `/vdvoem-web/`. Внутренние ссылки сайта в основном относительные (`./secure-game.html`, `./secure-purchase.html`) и переживут перенос. Внешние старые ссылки GitHub Pages должны корректно перенаправляться.

## Проверка и откат

- Не удалять старую ветку, карты, базу и привязки заказов.
- До переключения зафиксировать успешные GitHub Actions: `Public Site and Account API Smoke`, `Secure game static syntax`, `pages build and deployment`.
- В браузере проверить CORS preflight `OPTIONS /api/auth/telegram` с `Origin: https://<домен>` и заголовками `Content-Type, Authorization` — ответ 204, `Access-Control-Allow-Origin` должен совпадать с новым доменом.
- При сбое: вернуть Pages **Custom domain** на прежнюю конфигурацию, проверить DNS и CORS, пока не готовы повторно включить новый. Не переводить оплачивающих пользователей на сломанный адрес.

Официальные источники:
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- https://resend.com/docs/dashboard/domains/introduction
