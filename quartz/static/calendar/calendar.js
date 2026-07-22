(function () {
  "use strict";

  var DATA_URL = "/static/data/performances.json";
  var CATEGORIES = ["무용", "클래식", "국악", "연극", "뮤지컬"];

  var state = {
    performances: [], // raw rows fetched once from performances.json
    activeCategory: "ALL",
    calendar: null,
  };

  // ---------- Theme ----------
  function initTheme() {
    var stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (e) {
      /* localStorage unavailable (privacy mode) -- fall back to system preference */
    }
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }

    var toggle = document.getElementById("theme-toggle");
    toggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      if (!current) {
        current = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* ignore */
      }
    });
  }

  // ---------- Data ----------
  function fetchPerformances() {
    return fetch(DATA_URL, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function filteredPerformances() {
    if (state.activeCategory === "ALL") return state.performances;
    return state.performances.filter(function (p) {
      return p.category === state.activeCategory;
    });
  }

  function addDays(dateStr, days) {
    // Format with local getters, not toISOString() (which converts to UTC
    // and would shift the date backward a day for any visitor west of UTC).
    var d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return toDateStr(d);
  }

  function toFullCalendarEvents(performances) {
    return performances.map(function (p) {
      var start = p.start_date;
      var end = p.end_date && p.end_date !== p.start_date ? addDays(p.end_date, 1) : undefined;
      return {
        id: String(p.id),
        title: p.title,
        start: start,
        end: end,
        allDay: true,
        extendedProps: {
          venue: p.venue,
          category: p.category,
          city: p.city,
          festival: p.festival,
          detailUrl: p.url,
        },
      };
    });
  }

  // ---------- Calendar ----------
  function renderEventContent(arg) {
    var category = arg.event.extendedProps.category;
    var dot = document.createElement("span");
    dot.className = "cal-event-dot";
    dot.style.background = "var(--cat-" + cssEscapeCategory(category) + ", var(--cat-기타))";

    var title = document.createElement("span");
    title.className = "cal-event-title";
    title.textContent = arg.event.title;

    var wrap = document.createElement("div");
    wrap.className = "cal-event";
    wrap.title = arg.event.title + (arg.event.extendedProps.venue ? " · " + arg.event.extendedProps.venue : "");
    wrap.appendChild(dot);
    wrap.appendChild(title);

    return { domNodes: [wrap] };
  }

  function cssEscapeCategory(category) {
    // Category values are a fixed known set (무용/클래식/국악/연극/뮤지컬) plus "기타" --
    // matches the --cat-* custom properties defined in calendar.css.
    return CATEGORIES.indexOf(category) !== -1 ? category : "기타";
  }

  function handleEventClick(info) {
    info.jsEvent.preventDefault();
    var url = info.event.extendedProps.detailUrl;
    if (url) {
      window.location.href = url;
    }
  }

  function handleDateOrMoreClick(dateStr) {
    openDrawer(dateStr);
  }

  function initCalendar() {
    var el = document.getElementById("calendar");
    state.calendar = new FullCalendar.Calendar(el, {
      locale: "ko",
      initialView: "dayGridMonth",
      height: "auto",
      firstDay: 0,
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "",
      },
      dayMaxEvents: 3,
      moreLinkContent: function (arg) {
        return "+" + arg.num + "개";
      },
      moreLinkClick: function (arg) {
        handleDateOrMoreClick(toDateStr(arg.date));
        return "none";
      },
      dateClick: function (info) {
        handleDateOrMoreClick(info.dateStr);
      },
      eventClick: handleEventClick,
      eventContent: renderEventContent,
      events: [],
    });
    state.calendar.render();
  }

  function toDateStr(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function refreshEvents() {
    var events = toFullCalendarEvents(filteredPerformances());
    state.calendar.removeAllEventSources();
    state.calendar.addEventSource(events);
  }

  // ---------- Filters ----------
  function initFilters() {
    var nav = document.getElementById("filters");
    nav.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      nav.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-active", c === btn);
      });
      state.activeCategory = btn.dataset.category;
      refreshEvents();
    });
  }

  // ---------- Drawer ----------
  var drawerEls = {};

  function initDrawer() {
    drawerEls.backdrop = document.getElementById("drawer-backdrop");
    drawerEls.drawer = document.getElementById("drawer");
    drawerEls.dateLabel = document.getElementById("drawer-date");
    drawerEls.body = document.getElementById("drawer-body");
    drawerEls.close = document.getElementById("drawer-close");
    drawerEls.handle = document.getElementById("drawer-handle");

    drawerEls.close.addEventListener("click", closeDrawer);
    drawerEls.backdrop.addEventListener("click", closeDrawer);
    drawerEls.handle.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });
  }

  function formatDrawerDate(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + weekday + ")";
  }

  function isDateWithinRange(dateStr, startStr, endStr) {
    return dateStr >= startStr && dateStr <= (endStr || startStr);
  }

  function openDrawer(dateStr) {
    drawerEls.dateLabel.textContent = formatDrawerDate(dateStr);

    var dayPerformances = filteredPerformances().filter(function (p) {
      return isDateWithinRange(dateStr, p.start_date, p.end_date);
    });

    drawerEls.body.innerHTML = "";
    if (dayPerformances.length === 0) {
      var empty = document.createElement("p");
      empty.className = "drawer-empty";
      empty.textContent = "이 날짜에 등록된 공연이 없습니다.";
      drawerEls.body.appendChild(empty);
    } else {
      dayPerformances.forEach(function (p) {
        drawerEls.body.appendChild(buildDrawerCard(p));
      });
    }

    drawerEls.backdrop.classList.add("is-open");
    drawerEls.drawer.classList.add("is-open");
    drawerEls.drawer.setAttribute("aria-hidden", "false");
  }

  function buildDrawerCard(p) {
    var el = document.createElement(p.url ? "a" : "div");
    el.className = "drawer-card " + (p.url ? "is-linked" : "is-unlinked");
    if (p.url) el.href = p.url;

    var tag = document.createElement("div");
    tag.className = "drawer-card-tag";
    var dot = document.createElement("span");
    dot.className = "cal-event-dot";
    dot.style.background = "var(--cat-" + cssEscapeCategory(p.category) + ", var(--cat-기타))";
    tag.appendChild(dot);
    tag.appendChild(document.createTextNode(p.category));
    el.appendChild(tag);

    var title = document.createElement("div");
    title.className = "drawer-card-title";
    title.textContent = p.title;
    el.appendChild(title);

    if (p.venue) {
      var venue = document.createElement("div");
      venue.className = "drawer-card-venue";
      venue.textContent = p.venue;
      el.appendChild(venue);
    }

    return el;
  }

  function closeDrawer() {
    drawerEls.backdrop.classList.remove("is-open");
    drawerEls.drawer.classList.remove("is-open");
    drawerEls.drawer.setAttribute("aria-hidden", "true");
  }

  // ---------- Boot ----------
  function showStatus(message) {
    var status = document.getElementById("cal-status");
    var cal = document.getElementById("calendar");
    if (message) {
      status.textContent = message;
      status.hidden = false;
      cal.style.display = "none";
    } else {
      status.hidden = true;
      cal.style.display = "";
    }
  }

  function boot() {
    initTheme();
    initFilters();
    initDrawer();
    initCalendar();

    showStatus("공연 데이터를 불러오는 중...");
    fetchPerformances()
      .then(function (data) {
        state.performances = data.performances || [];
        showStatus(null);
        refreshEvents();
      })
      .catch(function (err) {
        showStatus("공연 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        console.error("[calendar] failed to load performances.json", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
