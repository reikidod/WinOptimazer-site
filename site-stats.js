(() => {
  const API = "https://winoptimizer-theme-sync-api.aceberi86.workers.dev";
  const SESSION_KEY = "winoptimizer.siteStats.tabSession.v1";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const getSessionId = () => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved && uuidPattern.test(saved)) return saved;

      const value = (() => {
        if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
        return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" +
          hex.slice(16, 20) + "-" + hex.slice(20);
      })();

      sessionStorage.setItem(SESSION_KEY, value);
      return value;
    } catch {
      return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : null;
    }
  };

  const numberFormat = new Intl.NumberFormat("ru-RU");
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const trackPageView = async () => {
    const sessionId = getSessionId();
    if (!sessionId) throw new Error("Не удалось создать идентификатор сессии.");

    const response = await fetch(API + "/v1/site/visit", {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "HTTP " + response.status);
    }
  };

  const renderChart = (rows) => {
    const root = document.getElementById("siteStatsChart");
    if (!root) return;

    root.replaceChildren();
    const values = rows.map(row => Math.max(0, Number(row.views) || 0));
    const max = Math.max(1, ...values);

    rows.forEach((row, index) => {
      const column = document.createElement("div");
      column.className = "site-stats-bar-column";

      const value = document.createElement("span");
      value.className = "site-stats-bar-value";
      value.textContent = numberFormat.format(values[index]);

      const track = document.createElement("div");
      track.className = "site-stats-bar-track";
      track.setAttribute("aria-hidden", "true");

      const bar = document.createElement("div");
      bar.className = "site-stats-bar";
      bar.style.height = Math.max(values[index] > 0 ? 5 : 0, values[index] / max * 100) + "%";
      track.append(bar);

      const label = document.createElement("span");
      label.className = "site-stats-bar-label";
      const date = new Date(row.day + "T00:00:00Z");
      label.textContent = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(date);

      column.append(value, track, label);
      root.append(column);
    });
  };

  const loadStatistics = async () => {
    const response = await fetch(API + "/v1/site/stats?days=30", {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "HTTP " + response.status);
    }

    const data = await response.json();
    setText("siteStatsViewsToday", numberFormat.format(data.today?.views || 0));
    setText("siteStatsSessionsToday", numberFormat.format(data.today?.sessions || 0));
    setText("siteStatsViews30", numberFormat.format(data.totals?.views || 0));
    setText("siteStatsSessions30", numberFormat.format(data.totals?.sessions || 0));
    renderChart((data.daily || []).slice(-7));
    setText("siteStatsUpdated", "Обновлено: " + new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit", minute: "2-digit"
    }).format(new Date()));
    setText("siteStatsStatus", "Счётчик работает. Значения обновляются при посещении страниц сайта.");
  };

  const initialize = async () => {
    try {
      await trackPageView();
      if (document.getElementById("siteStatsChart"))
        await loadStatistics();
    } catch (error) {
      setText("siteStatsStatus", "Статистика временно недоступна. Данные сайта не затронуты; попробуйте обновить страницу позже.");
      const chart = document.getElementById("siteStatsChart");
      if (chart) {
        chart.replaceChildren();
        const message = document.createElement("p");
        message.className = "site-stats-loading";
        message.textContent = "Не удалось загрузить статистику.";
        chart.append(message);
      }
      // The counter is non-critical: a stats outage must never affect navigation or page content.
    }
  };

  void initialize();
})();
