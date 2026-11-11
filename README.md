<div align="center">

# WinOptimizer — официальный сайт

**Единый центр управления Windows 10/11**

Настройка, обслуживание и оптимизация системы в одном приложении. Открытый проект, прозрачные изменения и возможность отката поддерживаемых твиков.

[Открыть сайт](https://reikidod.github.io/WinOptimazer-site/) · [Скачать приложение](https://github.com/reikidod/WinOptimazer/releases/latest) · [Исходный код](https://github.com/reikidod/WinOptimazer)

![GitHub Pages](https://img.shields.io/github/actions/workflow/status/reikidod/WinOptimazer-site/pages-build-deployment?style=for-the-badge&label=GitHub%20Pages)
![License](https://img.shields.io/badge/license-MIT-4B6CA3?style=for-the-badge)
![Windows](https://img.shields.io/badge/platform-Windows%2010%20%2F%2011-8AAAD8?style=for-the-badge)

</div>

---

## О проекте

Этот репозиторий содержит официальный лендинг WinOptimizer. Сайт знакомит с возможностями приложения, объясняет принципы безопасной работы и ведёт к актуальным сборкам и исходному коду.

## Визуальная система

Оформление сайта и приложения строится на общей палитре и типографике:

| Элемент | Цвет | Назначение |
|---|---|---|
| Основной фон | `#1B1C1F` | Фон страниц и окон |
| Боковая поверхность | `#202225` | Навигация и вторичные области |
| Карточки | `#2A2C31` | Контентные блоки |
| Hover | `#353840` | Состояние наведения |
| Основной акцент | `#8AAAD8` | Ссылки, активные элементы, фокус |
| Глубокий акцент | `#4B6CA3` | Кнопки и выделение |
| Фирменный красный | `#C0262D` / `#FF5A5F` | Логотип и редкие брендовые акценты |
| Основной текст | `#F2F3F5` | Заголовки и основной контент |

Принципы: высокая читаемость, спокойные контрасты, умеренная анимация, адаптивная сетка и поддержка `prefers-reduced-motion`.

## Структура

- `index.html` — разметка лендинга.
- `styles.css` — адаптивная сетка, палитра, компоненты и анимации.
- `script.js` — меню, плавные появления и интерактивность.

## Локальный запуск

Откройте `index.html` в браузере или запустите локальный сервер:

```bash
python -m http.server 8080
```

После запуска откройте `http://localhost:8080`.

## Публикация

GitHub Pages настроен на ветку `main`, каталог `/(root)`. Каждый push в эту ветку запускает сборку и публикацию Pages.

Публичный адрес: **https://reikidod.github.io/WinOptimazer-site/**

## Связанные ресурсы

- [Репозиторий приложения](https://github.com/reikidod/WinOptimazer)
- [Последний релиз](https://github.com/reikidod/WinOptimazer/releases/latest)
- [Все релизы](https://github.com/reikidod/WinOptimazer/releases)
- [Сообщить об ошибке](https://github.com/reikidod/WinOptimazer/issues)

---

<div align="center">

**WinOptimizer** · Быстрее. Удобнее. Безопаснее.

</div>
