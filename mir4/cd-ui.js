/* Page behavior for Crazy Dragon Web. Data stays in localStorage. */
(function () {
  var CD = window.CD;
  var KEY = "cd-web-v1";
  var state = CD.emptyState();
  var bosses = [];
  var notices = [];
  var ui = {
    bossQuery: "",
    favoritesOnly: false,
    category: "",
    layer: "All",
    world: "All"
  };
  var ticks = 0;
  var reminderTimers = [];
  var fired = {};
  var undoDeduction = null;
  var built = false;

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value == null || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.indexOf("on") === 0 && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value === true ? "" : value);
    });
    (children || []).forEach(function (child) {
      if (child == null || child === false) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      status("This browser could not store the data. Export a copy before you continue.");
    }
  }

  function status(message) {
    var node = $("cd-status");
    if (node) node.textContent = message;
  }

  function region() {
    return CD.regionById(state.region);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        status("Copied.");
      }, function () {
        fallbackCopy(text);
      });
      return;
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      status("Copied.");
    } catch (error) {
      status("Could not copy. Select the report and copy it yourself.");
    }
    area.remove();
  }

  function shareOrCopy(text, title) {
    if (navigator.share) {
      navigator.share({ title: title, text: text }).catch(function (error) {
        if (error && error.name === "AbortError") return;
        copyText(text);
      });
      return;
    }
    copyText(text);
  }

  function option(value, label, selected) {
    return el("option", { value: value, selected: selected ? true : null, text: label });
  }

  function select(attrs, values, current) {
    return el("select", attrs, values.map(function (value) {
      var item = typeof value === "string" ? { value: value, label: value } : value;
      return option(item.value, item.label, item.value === current);
    }));
  }

  function field(label, control) {
    return el("label", { class: "cd-field" }, [el("span", { text: label }), control]);
  }

  function button(label, className, onClick, extra) {
    var attrs = Object.assign({ type: "button", class: className || "cd-btn", text: label, onclick: onClick }, extra || {});
    return el("button", attrs);
  }

  function loadState() {
    try {
      state = CD.normalizeState(JSON.parse(localStorage.getItem(KEY) || "null"));
    } catch (error) {
      state = CD.emptyState();
    }
    save();
  }

  function renderAll() {
    renderToday();
    renderBosses();
    renderCompare();
    renderExpedition();
    renderClan();
    renderPlanner();
    renderNotices();
    paintDynamic(Date.now());
    armReminders();
    built = true;
  }

  function tick() {
    ticks += 1;
    var now = Date.now();
    var day = CD.localDay(new Date(now));
    if (state.checklistDay !== day) {
      state.checklistDay = day;
      state.completed = [];
      save();
      renderChecklist();
    }
    paintDynamic(now);
    if (ticks % 30 === 0) armReminders();
  }

  function paintDynamic(now) {
    paintToday(now);
    paintBossTimes(now);
    paintPlannerTimes(now);
  }

  function renderToday() {
    var mount = $("today-mount");
    clear(mount);
    var setup = null;
    if (!state.setupDismissed) {
      setup = el("div", { class: "cd-card" }, [
        el("h3", { text: "Make it yours" }),
        el("p", { text: "Choose your server above, star your favorite bosses, then enable and test reminders. Clan setup is optional." }),
        el("div", { class: "cd-row" }, [
          el("a", { class: "cd-btn", href: "#bosses", text: "Choose my bosses" }),
          button("Dismiss", "cd-btn cd-btn-quiet", function () {
            state.setupDismissed = true;
            save();
            renderToday();
            paintToday(Date.now());
          })
        ])
      ]);
    }
    mount.appendChild(el("div", { class: "cd-stack" }, [
      field("Server region", regionSelect("today-region")),
      setup,
      el("div", { class: "cd-card cd-next", id: "today-next" }),
      el("p", { id: "today-star-note" }),
      el("div", { class: "cd-row cd-spread" }, [
        el("h3", { text: "Coming up" }),
        el("a", { href: "#bosses", text: "View all" })
      ]),
      el("div", { id: "today-upcoming" }),
      el("div", { class: "cd-card", id: "today-checklist" }),
      el("p", { class: "cd-clan-line", id: "today-clan" }),
      el("p", { class: "cd-fine", text: "Timers are schedule estimates, not live game reports." })
    ]));
    renderChecklist();
    bindRegion($("today-region"));
  }

  function regionSelect(idName) {
    return select({ id: idName }, CD.REGIONS.map(function (item) {
      return { value: item.id, label: item.name + " · " + CD.offsetLabel(item.offsetHours) };
    }), state.region);
  }

  function bindRegion(node) {
    node.addEventListener("change", function () {
      state.region = node.value;
      save();
      var other = node.id === "today-region" ? $("boss-region") : $("today-region");
      if (other) other.value = state.region;
      paintDynamic(Date.now());
      renderBossResults();
      armReminders();
    });
  }

  function renderChecklist() {
    var mount = $("today-checklist");
    if (!mount) return;
    clear(mount);
    mount.appendChild(el("h3", { text: "Daily checklist · " + state.completed.length + "/" + CD.TASKS.length }));
    mount.appendChild(el("p", { class: "cd-fine", text: "Your personal checklist. Resets at phone midnight." }));
    CD.TASKS.forEach(function (task) {
      var input = el("input", { type: "checkbox" });
      input.checked = state.completed.indexOf(task) >= 0;
      input.addEventListener("change", function () { toggleTask(task); });
      mount.appendChild(el("label", { class: "cd-check" }, [input, el("span", { text: task })]));
    });
  }

  function toggleTask(task) {
    var day = CD.localDay();
    if (state.checklistDay !== day) {
      state.checklistDay = day;
      state.completed = [];
    }
    var index = state.completed.indexOf(task);
    if (index >= 0) state.completed.splice(index, 1);
    else state.completed.push(task);
    save();
    renderChecklist();
  }

  function paintToday(now) {
    var slots = todaySlots(now);
    var next = slots[0];
    var card = $("today-next");
    if (!card) return;
    clear(card);
    if (!next) {
      card.appendChild(el("p", { text: "No timed bosses match this view." }));
    } else {
      card.appendChild(el("p", { class: "cd-kicker", text: state.favorites.length ? "NEXT FAVORITE BOSS" : "NEXT SCHEDULED BOSS" }));
      card.appendChild(el("h3", { class: "cd-next-name", id: "today-next-name", text: next.boss.name }));
      card.appendChild(el("p", { class: "cd-count", id: "today-next-count", "data-cd": "countdown", text: next.live ? "Spawn window" : CD.formatCountdown(next.spawnUtc - now) }));
      card.appendChild(el("p", { id: "today-next-where", text: next.boss.location }));
      card.appendChild(el("p", { class: "cd-fine", id: "today-next-server", text: CD.formatOffsetInstant(next.spawnUtc, region().offsetHours) + " · " + region().name }));
      card.appendChild(el("p", { class: "cd-fine", id: "today-next-when", text: CD.formatLocalInstant(next.spawnUtc) + " · phone time" }));
      card.appendChild(el("a", { class: "cd-btn", href: "#bosses", text: "Choose bosses & reminders" }));
    }
    var note = $("today-star-note");
    clear(note);
    if (!state.favorites.length) {
      note.appendChild(el("a", { href: "#bosses", text: "Star your bosses to personalize Today" }));
    }
    var upcoming = $("today-upcoming");
    clear(upcoming);
    slots.slice(1, 4).forEach(function (slot) {
      upcoming.appendChild(el("div", { class: "cd-line" }, [
        el("div", {}, [el("strong", { text: slot.boss.name }), el("span", { class: "cd-fine", text: slot.boss.location })]),
        el("span", { class: "cd-count-sm", "data-spawn": String(slot.spawnUtc), "data-live": slot.live ? "1" : "0", text: slot.live ? "Spawn window" : CD.formatCountdown(slot.spawnUtc - now) })
      ]));
    });
    if (slots.length < 2) upcoming.appendChild(el("p", { class: "cd-fine", text: "No further bosses in this view." }));
    var clan = $("today-clan");
    if (clan) clan.textContent = state.clan.name ? "My clan · " + state.clan.name : "";
  }

  function todaySlots(now) {
    var offset = region().offsetHours;
    var favoritesOnly = state.favorites.length > 0;
    var slots = [];
    bosses.forEach(function (boss) {
      if (!boss.times.length) return;
      if (favoritesOnly && state.favorites.indexOf(boss.id) === -1) return;
      var slot = CD.currentSlot(boss, now, offset);
      if (slot) slots.push(slot);
    });
    slots.sort(function (a, b) { return a.spawnUtc - b.spawnUtc; });
    return slots;
  }

  function renderBosses() {
    var mount = $("boss-mount");
    clear(mount);
    mount.appendChild(el("div", { class: "cd-stack" }, [
      el("input", { id: "boss-search", type: "search", placeholder: "Search boss or location", value: ui.bossQuery }),
      el("div", { class: "cd-chips", id: "boss-fav-chips" }),
      el("p", { text: "Scheduled times use this phone's clock. Boss presence is not verified." }),
      el("p", { class: "cd-fine", text: "Schedule checked 4 Oct 2026. Timers are estimates; boss presence is not tracked." }),
      field("Server region", regionSelect("boss-region")),
      el("details", { class: "cd-card" }, [
        el("summary", { text: "Reminder settings" }),
        el("p", { class: "cd-fine", id: "reminder-status" }),
        field("Remind me", select({ id: "lead-minutes" }, [
          { value: "0", label: "At scheduled spawn" },
          { value: "2", label: "2 minutes before" },
          { value: "5", label: "5 minutes before" },
          { value: "10", label: "10 minutes before" }
        ], String(state.leadMinutes))),
        button("Enable & test notification", "cd-btn", enableReminders),
        el("p", { class: "cd-fine", text: "Reminders fire only while this page is open. Permission is asked when you enable them." })
      ]),
      el("div", { class: "cd-chips", id: "boss-cat-chips" }),
      el("div", { class: "cd-grid-2" }, [
        field("Layer", select({ id: "boss-layer" }, ["All", "Layer 1", "Layer 3"], ui.layer)),
        field("World", select({ id: "boss-world" }, ["All", "World 1", "World 2", "World 3", "World 4", "World 5", "World 6", "World 7", "World 8"], ui.world))
      ]),
      el("p", { class: "cd-fine", text: "A layer or world filter keeps only bosses tied to that place." }),
      el("div", { id: "boss-results" })
    ]));
    $("boss-search").addEventListener("input", function (event) {
      ui.bossQuery = event.target.value;
      renderBossResults();
    });
    $("lead-minutes").addEventListener("change", function (event) {
      state.leadMinutes = Number(event.target.value);
      save();
      armReminders();
    });
    $("boss-layer").addEventListener("change", function (event) {
      ui.layer = event.target.value;
      renderBossResults();
    });
    $("boss-world").addEventListener("change", function (event) {
      ui.world = event.target.value;
      renderBossResults();
    });
    bindRegion($("boss-region"));
    renderBossChips();
    renderBossResults();
    paintReminderStatus();
  }

  function renderBossChips() {
    var fav = $("boss-fav-chips");
    clear(fav);
    fav.appendChild(chip("All bosses", !ui.favoritesOnly, function () {
      ui.favoritesOnly = false;
      renderBossChips();
      renderBossResults();
    }));
    fav.appendChild(chip("Favorites", ui.favoritesOnly, function () {
      ui.favoritesOnly = true;
      renderBossChips();
      renderBossResults();
    }));
    var cats = $("boss-cat-chips");
    clear(cats);
    [["", "All"], ["worldBoss", "World Boss"], ["secretPeak", "Secret Peak"], ["magicSquare", "Magic Square"], ["layerBoss", "Layer Boss"]].forEach(function (item) {
      cats.appendChild(chip(item[1], ui.category === item[0], function () {
        ui.category = item[0];
        renderBossChips();
        renderBossResults();
      }));
    });
  }

  function chip(label, selected, onClick) {
    return button(label, "cd-chip" + (selected ? " is-on" : ""), onClick, { "aria-pressed": selected ? "true" : "false" });
  }

  function visibleBosses() {
    var q = ui.bossQuery.trim().toLowerCase();
    return bosses.filter(function (boss) {
      if (ui.favoritesOnly && state.favorites.indexOf(boss.id) === -1) return false;
      if (q && (boss.name + " " + boss.location).toLowerCase().indexOf(q) === -1) return false;
      if (ui.category && boss.category !== ui.category) return false;
      if (ui.layer !== "All" && boss.layer !== ui.layer) return false;
      if (ui.world !== "All" && boss.world !== ui.world) return false;
      return true;
    });
  }

  function renderBossResults() {
    var now = Date.now();
    var offset = region().offsetHours;
    var soon = [];
    var upcoming = [];
    var untimed = [];
    visibleBosses().forEach(function (boss) {
      if (!boss.times.length) {
        untimed.push(boss);
        return;
      }
      var slot = CD.currentSlot(boss, now, offset);
      if (!slot) return;
      if (CD.isSoon(slot, now)) soon.push(slot);
      else upcoming.push(slot);
    });
    soon.sort(function (a, b) { return a.spawnUtc - b.spawnUtc; });
    upcoming.sort(function (a, b) { return a.spawnUtc - b.spawnUtc; });
    var mount = $("boss-results");
    clear(mount);
    mount.appendChild(sectionTitle("Spawning soon", soon.length, true));
    if (!soon.length) mount.appendChild(el("p", { class: "cd-fine", text: "Nothing spawning in the next 30 minutes." }));
    soon.forEach(function (slot) { mount.appendChild(bossCard(slot, now, true)); });
    mount.appendChild(sectionTitle("Upcoming", upcoming.length, false));
    if (!upcoming.length) mount.appendChild(el("p", { class: "cd-fine", text: "No later spawns match these filters." }));
    upcoming.forEach(function (slot) { mount.appendChild(bossCard(slot, now, false)); });
    mount.appendChild(sectionTitle("No countdown", untimed.length, false));
    if (!untimed.length) mount.appendChild(el("p", { class: "cd-fine", text: "No kill-count bosses match these filters." }));
    untimed.forEach(function (boss) { mount.appendChild(untimedCard(boss)); });
  }

  function sectionTitle(label, count, highlight) {
    return el("h3", { class: "cd-section-title" + (highlight ? " is-hot" : ""), text: label + " · " + count });
  }

  function bossCard(slot, now, highlight) {
    var boss = slot.boss;
    return el("article", { class: "cd-card cd-boss" + (highlight ? " is-hot" : ""), "data-boss": boss.id }, [
      el("div", { class: "cd-row cd-spread" }, [
        el("div", {}, [
          el("h3", { text: boss.name }),
          el("p", { class: "cd-meta", text: [boss.categoryLabel, boss.layer, boss.world].filter(Boolean).join(" · ") })
        ]),
        el("div", { class: "cd-row" }, [
          iconButton(state.favorites.indexOf(boss.id) >= 0 ? "★" : "☆", "Favorite " + boss.name, function () { toggleFavorite(boss.id); }, state.favorites.indexOf(boss.id) >= 0),
          iconButton(state.muted.indexOf(boss.id) >= 0 ? "🔕" : "🔔", "Mute reminder for " + boss.name, function () { toggleMute(boss.id); }, state.muted.indexOf(boss.id) >= 0)
        ])
      ]),
      el("p", { class: "cd-count", "data-spawn": String(slot.spawnUtc), "data-live": slot.live ? "1" : "0", text: slot.live ? "Spawn window" : CD.formatCountdown(slot.spawnUtc - now) }),
      el("p", { text: boss.location }),
      el("p", { class: "cd-fine", text: CD.cadenceLabel(boss) + " · " + CD.asiaScheduleLabel(boss) }),
      el("p", { class: "cd-fine", text: CD.formatOffsetInstant(slot.spawnUtc, region().offsetHours) + " · " + region().name }),
      el("p", { class: "cd-fine", "data-local": String(slot.spawnUtc), text: CD.formatLocalInstant(slot.spawnUtc) + " · phone time" }),
      el("p", { text: boss.detail }),
      reportBossButton(boss)
    ]);
  }

  function untimedCard(boss) {
    return el("article", { class: "cd-card cd-boss", "data-boss": boss.id }, [
      el("div", { class: "cd-row cd-spread" }, [
        el("h3", { text: boss.name }),
        iconButton(state.favorites.indexOf(boss.id) >= 0 ? "★" : "☆", "Favorite " + boss.name, function () { toggleFavorite(boss.id); }, state.favorites.indexOf(boss.id) >= 0)
      ]),
      el("p", { class: "cd-meta", text: "No countdown" }),
      el("p", { text: boss.location }),
      el("p", { class: "cd-fine", text: [boss.categoryLabel, boss.layer, boss.world].filter(Boolean).join(" · ") }),
      el("p", { text: boss.detail }),
      reportBossButton(boss)
    ]);
  }

  function reportBossButton(boss) {
    return button("Report wrong boss time", "cd-btn cd-btn-quiet cd-report", function () {
      openBossReport(boss);
    });
  }

  function openBossReport(boss) {
    var form = $("cd-feedback");
    if (!form) return;
    form.elements.namedItem("type").value = "Wrong boss time";
    form.elements.namedItem("boss").value = boss.name;
    form.elements.namedItem("time").value = CD.asiaScheduleLabel(boss);
    form.elements.namedItem("location").value = boss.location || "";
    form.elements.namedItem("region").value = region().name;
    var note = $("feedback-status");
    if (note) note.textContent = "";
    if (location.hash === "#feedback") {
      document.documentElement.setAttribute("data-section", "feedback");
    } else {
      location.hash = "feedback";
    }
    window.requestAnimationFrame(function () {
      var message = form.elements.namedItem("message");
      if (message) message.focus();
    });
  }

  function fieldValue(form, name) {
    var node = form.elements.namedItem(name);
    return node ? String(node.value || "") : "";
  }

  function feedbackPayload(form) {
    return {
      type: fieldValue(form, "type").trim(),
      boss: fieldValue(form, "boss").trim(),
      time: fieldValue(form, "time").trim(),
      location: fieldValue(form, "location").trim(),
      region: fieldValue(form, "region").trim(),
      message: fieldValue(form, "message").trim(),
      email: fieldValue(form, "email").trim(),
      _gotcha: fieldValue(form, "_gotcha")
    };
  }

  function feedbackProblem(data) {
    var types = ["General", "Wrong boss time", "Bug", "Idea"];
    if (types.indexOf(data.type) < 0) return "Choose a feedback type.";
    if (data.type === "Wrong boss time") {
      if (!data.boss) return "Enter the boss name.";
      if (!data.time) return "Enter the listed time.";
      if (!data.region) return "Choose the server region.";
    }
    if (!data.message) return "Enter a message.";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Enter a valid reply email, or leave it blank.";
    return "";
  }

  function feedbackNote(message) {
    var note = $("feedback-status");
    if (note) note.textContent = message;
  }

  function bindFeedback() {
    var form = $("cd-feedback");
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = feedbackPayload(form);
      var problem = feedbackProblem(data);
      if (problem) {
        feedbackNote(problem);
        return;
      }
      if (data._gotcha) {
        form.reset();
        feedbackNote("Thanks. The feedback was sent.");
        return;
      }
      var endpoint = (window.FEEDBACK_ENDPOINT || "").trim();
      var submit = form.querySelector("[type=submit]");
      if (!endpoint) {
        var body = [
          "Type: " + data.type,
          "Boss: " + data.boss,
          "Time: " + data.time,
          "Location: " + data.location,
          "Server region: " + data.region,
          "Reply email: " + data.email,
          "",
          data.message
        ].join("\n");
        window.location.href = "mailto:playtechcorner@gmail.com?subject=" +
          encodeURIComponent("Crazy Dragon Control Center feedback") +
          "&body=" + encodeURIComponent(body);
        feedbackNote("Your email app should open with this feedback filled in.");
        return;
      }
      if (submit) submit.disabled = true;
      feedbackNote("Sending…");
      var payload = {
        type: data.type,
        boss: data.boss,
        time: data.time,
        location: data.location,
        region: data.region,
        message: data.message,
        email: data.email,
        _replyto: data.email,
        _subject: "Crazy Dragon Control Center: " + data.type,
        _gotcha: data._gotcha
      };
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }).then(function (response) {
        if (!response.ok) throw new Error("status");
        form.reset();
        feedbackNote("Thanks. The feedback was sent.");
      }).catch(function () {
        feedbackNote("The feedback could not be sent. Try again, or email playtechcorner@gmail.com.");
      }).then(function () {
        if (submit) submit.disabled = false;
      });
    });
  }

  function iconButton(label, aria, onClick, pressed) {
    return button(label, "cd-icon-btn" + (pressed ? " is-on" : ""), onClick, { "aria-label": aria, "aria-pressed": pressed ? "true" : "false" });
  }

  function toggleFavorite(id) {
    var index = state.favorites.indexOf(id);
    if (index >= 0) state.favorites.splice(index, 1);
    else state.favorites.push(id);
    save();
    renderBossResults();
    paintToday(Date.now());
  }

  function toggleMute(id) {
    var index = state.muted.indexOf(id);
    if (index >= 0) state.muted.splice(index, 1);
    else state.muted.push(id);
    save();
    renderBossResults();
    armReminders();
  }

  function paintBossTimes(now) {
    document.querySelectorAll("#boss-results [data-spawn]").forEach(function (node) {
      var spawn = Number(node.getAttribute("data-spawn"));
      var live = node.getAttribute("data-live") === "1";
      var text = live ? "Spawn window" : CD.formatCountdown(spawn - now);
      if (node.textContent !== text) node.textContent = text;
    });
    var soonIds = [];
    var offset = region().offsetHours;
    visibleBosses().forEach(function (boss) {
      if (!boss.times.length) return;
      var slot = CD.currentSlot(boss, now, offset);
      if (slot && CD.isSoon(slot, now)) soonIds.push(boss.id);
    });
    var signature = soonIds.join("|");
    if (paintBossTimes.last !== signature) {
      var previous = paintBossTimes.last;
      paintBossTimes.last = signature;
      if (previous != null && $("boss-results")) renderBossResults();
    }
  }

  function paintReminderStatus() {
    var node = $("reminder-status");
    if (!node) return;
    if (typeof Notification === "undefined") {
      node.textContent = "This browser does not offer notifications.";
    } else if (Notification.permission === "denied" || (state.remindersOn && Notification.permission !== "granted")) {
      node.textContent = "Notifications are off, so a scheduled spawn can pass without a reminder.";
    } else if (state.remindersOn) {
      node.textContent = "Reminders are on for this open page.";
    } else {
      node.textContent = "Choose your reminder time and test delivery.";
    }
  }

  function enableReminders() {
    if (typeof Notification === "undefined") {
      status("This browser does not offer notifications.");
      return;
    }
    Notification.requestPermission().then(function (result) {
      state.remindersOn = result === "granted";
      save();
      paintReminderStatus();
      if (result === "granted") {
        try {
          new Notification("Crazy Dragon reminder test", { body: "Your boss reminder notifications are ready." });
        } catch (error) {
          status("Test requested. Check your notifications. Delivery depends on browser permission, and reminders fire only while this page is open.");
          armReminders();
          return;
        }
        status("Test requested. Check your notifications. Delivery depends on browser permission, and reminders fire only while this page is open.");
        armReminders();
      } else {
        status("Notifications are off, so a scheduled spawn can pass without a reminder.");
      }
    });
  }

  function armReminders() {
    reminderTimers.forEach(clearTimeout);
    reminderTimers = [];
    if (!state.remindersOn || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    var now = Date.now();
    var offset = region().offsetHours;
    bosses.forEach(function (boss) {
      if (!boss.times.length || state.muted.indexOf(boss.id) >= 0) return;
      CD.upcomingSpawnsUtc(boss, now, offset, 3, 36 * 3600000).forEach(function (spawn) {
        var reminder = spawn - state.leadMinutes * 60000;
        if (reminder <= now + 2000) return;
        var delay = reminder - now;
        if (delay > 2147483647) return;
        var key = boss.id + ":" + spawn + ":" + state.leadMinutes;
        reminderTimers.push(setTimeout(function () {
          if (fired[key]) return;
          fired[key] = true;
          try {
            new Notification(CD.reminderTitle(boss, state.leadMinutes), { body: CD.reminderBody(boss, spawn) });
          } catch (error) {}
        }, delay));
      });
    });
  }

  function renderCompare() {
    var mount = $("compare-mount");
    clear(mount);
    mount.appendChild(el("div", { class: "cd-grid-2" }, [
      characterForm("a", "Character A"),
      characterForm("b", "Character B")
    ]));
    mount.appendChild(el("div", { id: "compare-table" }));
    mount.appendChild(el("div", { class: "cd-row" }, [
      button("Copy comparison", "cd-btn", function () {
        shareOrCopy(comparisonText(), "Crazy Dragon · Character Compare");
      }),
      button("Clear comparison", "cd-btn cd-btn-quiet", function () {
        state.compare.a = CD.blankCharacter();
        state.compare.b = CD.blankCharacter();
        save();
        renderCompare();
      })
    ]));
    paintComparison();
  }

  function characterForm(side, title) {
    var character = state.compare[side];
    var box = el("div", { class: "cd-card cd-stack" }, [el("h3", { text: title })]);
    box.appendChild(textField("IGN", character.name, function (value) { character.name = value; touchCompare(); }));
    box.appendChild(textField("Server", character.server, function (value) { character.server = value; touchCompare(); }));
    var classSelect = select({}, CD.CLASSES, character.className);
    classSelect.addEventListener("change", function () {
      character.className = classSelect.value;
      save();
      paintComparison();
    });
    box.appendChild(field("Class", classSelect));
    box.appendChild(textField("Level", character.level, function (value) { character.level = value; touchCompare(); }));
    box.appendChild(textField("Power score", character.power, function (value) { character.power = value; touchCompare(); }));
    CD.COMPARE_SECTIONS.forEach(function (section) {
      box.appendChild(pairEditor(character, section.key, section.title));
    });
    box.appendChild(equipmentEditor(character));
    box.appendChild(spiritEditor(character));
    return box;
  }

  function textField(label, value, onInput) {
    var input = el("input", { type: "text", value: value, maxlength: "80" });
    input.addEventListener("input", function () { onInput(input.value); });
    return field(label, input);
  }

  function touchCompare() {
    save();
    paintComparison();
  }

  function pairEditor(character, key, title) {
    var wrap = el("div", { class: "cd-sub" });
    wrap.appendChild(el("h4", { text: title }));
    character[key].forEach(function (row, index) {
      var name = el("input", { type: "text", value: row.name, placeholder: "Name", maxlength: "80" });
      var value = el("input", { type: "text", value: row.value, placeholder: "Value", maxlength: "40" });
      name.addEventListener("input", function () { row.name = name.value; touchCompare(); });
      value.addEventListener("input", function () { row.value = value.value; touchCompare(); });
      wrap.appendChild(el("div", { class: "cd-row" }, [
        name,
        value,
        button("Remove", "cd-btn cd-btn-quiet", function () {
          character[key].splice(index, 1);
          save();
          renderCompare();
        })
      ]));
    });
    wrap.appendChild(button("Add row", "cd-btn cd-btn-quiet", function () {
      character[key].push({ name: "", value: "" });
      save();
      renderCompare();
    }));
    return wrap;
  }

  function equipmentEditor(character) {
    var wrap = el("div", { class: "cd-sub" }, [el("h4", { text: "Equipment" })]);
    character.equipment.forEach(function (row, index) {
      var name = el("input", { type: "text", value: row.name, placeholder: "Item", maxlength: "80" });
      var tier = el("input", { type: "text", value: row.tier, placeholder: "Tier", maxlength: "20" });
      var enhance = el("input", { type: "text", value: row.enhance, placeholder: "Enhancement", maxlength: "20" });
      name.addEventListener("input", function () { row.name = name.value; touchCompare(); });
      tier.addEventListener("input", function () { row.tier = tier.value; touchCompare(); });
      enhance.addEventListener("input", function () { row.enhance = enhance.value; touchCompare(); });
      wrap.appendChild(el("div", { class: "cd-row" }, [
        name, tier, enhance,
        button("Remove", "cd-btn cd-btn-quiet", function () {
          character.equipment.splice(index, 1);
          save();
          renderCompare();
        })
      ]));
    });
    wrap.appendChild(button("Add item", "cd-btn cd-btn-quiet", function () {
      character.equipment.push({ name: "", tier: "", enhance: "" });
      save();
      renderCompare();
    }));
    return wrap;
  }

  function spiritEditor(character) {
    var wrap = el("div", { class: "cd-sub" }, [el("h4", { text: "Spirits" })]);
    character.spirits.forEach(function (row, index) {
      var name = el("input", { type: "text", value: row.name, placeholder: "Spirit", maxlength: "80" });
      var grade = el("input", { type: "text", value: row.grade, placeholder: "Grade", maxlength: "40" });
      var transcend = el("input", { type: "text", value: row.transcend, placeholder: "Transcend", maxlength: "20" });
      name.addEventListener("input", function () { row.name = name.value; touchCompare(); });
      grade.addEventListener("input", function () { row.grade = grade.value; touchCompare(); });
      transcend.addEventListener("input", function () { row.transcend = transcend.value; touchCompare(); });
      wrap.appendChild(el("div", { class: "cd-row" }, [
        name, grade, transcend,
        button("Remove", "cd-btn cd-btn-quiet", function () {
          character.spirits.splice(index, 1);
          save();
          renderCompare();
        })
      ]));
    });
    wrap.appendChild(button("Add spirit", "cd-btn cd-btn-quiet", function () {
      character.spirits.push({ name: "", grade: "", transcend: "" });
      save();
      renderCompare();
    }));
    return wrap;
  }

  function paintComparison() {
    var mount = $("compare-table");
    if (!mount) return;
    clear(mount);
    var a = state.compare.a;
    var b = state.compare.b;
    mount.appendChild(el("h3", { text: "A: " + (a.name || "Unnamed") + " · B: " + (b.name || "Unnamed") }));
    mount.appendChild(el("p", { text: "Higher stats are highlighted for comparison. They do not predict a fight winner or overall value." }));
    mount.appendChild(compareTable([
      ["IGN", a.name, b.name],
      ["Server", a.server, b.server],
      ["Class", a.className, b.className],
      ["Level", a.level, b.level],
      ["Power score", a.power, b.power]
    ], false));
    CD.COMPARE_SECTIONS.forEach(function (section) {
      var rows = mergedRows(a[section.key], b[section.key]);
      var highlight = section.highlight === true || (section.highlight === "same-class" && a.className === b.className);
      var block = el("div", { class: "cd-sub" }, [el("h4", { text: section.title })]);
      if (section.key === "skills" && a.className !== b.className) {
        block.appendChild(el("p", { class: "cd-fine", text: "Different classes have different skills. A missing skill is not level zero." }));
      }
      if (!rows.length) block.appendChild(el("p", { class: "cd-fine", text: "No details entered." }));
      else block.appendChild(compareTable(rows, highlight));
      mount.appendChild(block);
    });
    mount.appendChild(equipmentSummary(a, "A"));
    mount.appendChild(equipmentSummary(b, "B"));
    mount.appendChild(spiritSummary(a, "A"));
    mount.appendChild(spiritSummary(b, "B"));
  }

  function mergedRows(left, right) {
    var names = [];
    function add(name) {
      if (names.indexOf(name) === -1) names.push(name);
    }
    left.forEach(function (row) { if (row.name.trim()) add(row.name.trim()); });
    right.forEach(function (row) { if (row.name.trim()) add(row.name.trim()); });
    return names.map(function (name) {
      return [name, valueFor(left, name), valueFor(right, name)];
    });
  }

  function valueFor(rows, name) {
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].name.trim() === name) return rows[i].value || "—";
    }
    return "—";
  }

  function compareTable(rows, highlight) {
    var table = el("table", { class: "cd-table" });
    table.appendChild(el("tr", {}, [el("th", { text: "Detail" }), el("th", { text: "A" }), el("th", { text: "B" })]));
    rows.forEach(function (row) {
      table.appendChild(el("tr", {}, [
        el("td", { text: row[0] || "—" }),
        el("td", { class: highlight && CD.higher(row[1], row[2]) ? "is-higher" : "", text: row[1] || "—" }),
        el("td", { class: highlight && CD.higher(row[2], row[1]) ? "is-higher" : "", text: row[2] || "—" })
      ]));
    });
    return el("div", { class: "cd-table-wrap" }, [table]);
  }

  function equipmentSummary(character, label) {
    var block = el("div", { class: "cd-sub" }, [el("h4", { text: label + " · " + (character.name || "Unnamed") + " (" + character.equipment.length + " items)" })]);
    if (!character.equipment.length) block.appendChild(el("p", { class: "cd-fine", text: "No equipment entered." }));
    character.equipment.forEach(function (item) {
      block.appendChild(el("p", { text: (item.name || "Unnamed item") + " · Tier " + (item.tier || "?") + " · Enhancement +" + (item.enhance || "?") }));
    });
    return block;
  }

  function spiritSummary(character, label) {
    var block = el("div", { class: "cd-sub" }, [el("h4", { text: "Spirits · " + label + " · " + (character.name || "Unnamed") })]);
    if (!character.spirits.length) block.appendChild(el("p", { class: "cd-fine", text: "No spirits entered." }));
    else block.appendChild(el("p", { text: "Owned spirits: " + character.spirits.length }));
    character.spirits.forEach(function (spirit) {
      block.appendChild(el("p", { text: (spirit.name || "Unnamed spirit") + " · " + (spirit.grade || "Grade ?") + " · Transcend " + (spirit.transcend || "?") }));
    });
    return block;
  }

  function comparisonText() {
    var a = state.compare.a;
    var b = state.compare.b;
    var lines = [
      "Crazy Dragon · Character Compare",
      "IGN: " + (a.name || "—") + " | " + (b.name || "—"),
      "Server: " + (a.server || "—") + " | " + (b.server || "—"),
      "Class: " + a.className + " | " + b.className,
      "Level: " + (a.level || "—") + " | " + (b.level || "—"),
      "Power score: " + (a.power || "—") + " | " + (b.power || "—")
    ];
    CD.COMPARE_SECTIONS.forEach(function (section) {
      var rows = mergedRows(a[section.key], b[section.key]);
      if (!rows.length) return;
      lines.push("");
      lines.push(section.title);
      rows.forEach(function (row) { lines.push(row[0] + ": " + row[1] + " | " + row[2]); });
    });
    lines.push("");
    lines.push("Entered on this device. Higher numbers are a side-by-side reading, not a combat prediction.");
    return lines.join("\n");
  }

  function renderExpedition() {
    var mount = $("expedition-mount");
    clear(mount);
    mount.appendChild(el("div", { class: "cd-row cd-spread" }, [
      el("p", { id: "run-count" }),
      button("Clear selections", "cd-btn cd-btn-quiet", clearRuns)
    ]));
    mount.appendChild(el("div", { class: "cd-card", id: "clan-resource-readout" }));
    mount.appendChild(el("div", { class: "cd-card", id: "remain-readout" }));
    mount.appendChild(el("div", { class: "cd-row cd-spread" }, [
      el("h3", { text: "Expedition Bosses" }),
      el("div", { class: "cd-row" }, [
        el("strong", { id: "run-status" }),
        button("Sort", "cd-btn cd-btn-quiet", toggleRunSort, { id: "run-sort" })
      ])
    ]));
    mount.appendChild(el("div", { id: "run-list" }));
    mount.appendChild(el("p", { id: "undo-slot" }));
    paintExpedition();
  }

  function paintExpedition() {
    if (!$("run-list")) return;
    var totals = CD.expeditionTotals(state.runs);
    var remain = CD.expeditionRemain(state.clan, state.runs);
    var ok = CD.sufficient(remain);
    var selected = Object.keys(state.runs.run1).filter(function (key) { return state.runs.run1[key]; }).length + Object.keys(state.runs.run2).filter(function (key) { return state.runs.run2[key]; }).length;
    $("run-count").textContent = selected + " runs selected";
    $("run-status").textContent = ok ? "Available" : "Shortfall";
    $("run-status").className = ok ? "is-ok" : "is-bad";
    var sortBtn = $("run-sort");
    sortBtn.textContent = state.runs.sortAsc ? "Fox → Ice Demon" : "Ice Demon → Fox";
    var have = CD.clanResources(state.clan);
    fillResources($("clan-resource-readout"), "Clan Resources", have, false);
    fillResources($("remain-readout"), "Remaining Resources", remain, true);
    var actions = $("remain-readout").querySelector(".cd-row");
    actions.appendChild(button("Apply deduction", "cd-btn" + (ok ? "" : " is-disabled"), function () {
      if (CD.sufficient(CD.expeditionRemain(state.clan, state.runs))) openDeduction();
    }, { disabled: ok ? null : true }));
    actions.appendChild(button("Share", "cd-btn cd-btn-quiet" + (ok ? "" : " is-disabled"), function () {
      if (!CD.sufficient(CD.expeditionRemain(state.clan, state.runs))) return;
      shareOrCopy(CD.expeditionShare(state.clan.name, state.runs, new Date()), "Expedition Run Summary");
    }, { disabled: ok ? null : true }));
    var list = $("run-list");
    clear(list);
    var bossesInOrder = CD.EXPEDITION.slice();
    if (!state.runs.sortAsc) bossesInOrder.reverse();
    bossesInOrder.forEach(function (boss) { list.appendChild(runCard(boss)); });
    var undo = $("undo-slot");
    clear(undo);
    if (undoDeduction) {
      undo.appendChild(button("Undo deduction", "cd-btn cd-btn-quiet", function () {
        state.clan.gold = undoDeduction.clan.gold;
        state.clan.copper = undoDeduction.clan.copper;
        state.clan.darksteel = undoDeduction.clan.darksteel;
        state.clan.energy = undoDeduction.clan.energy;
        state.runs.run1 = undoDeduction.run1;
        state.runs.run2 = undoDeduction.run2;
        undoDeduction = null;
        save();
        syncResourceInputs();
        paintExpedition();
        paintToday(Date.now());
        status("Deduction undone.");
      }));
    }
  }

  function fillResources(node, title, values, colored) {
    clear(node);
    var row = el("div", { class: "cd-row cd-spread" }, [el("h3", { text: title })]);
    node.appendChild(row);
    ["Gold", "Copper", "Darksteel", "Energy"].forEach(function (label, index) {
      var key = ["g", "c", "ds", "e"][index];
      var line = el("div", { class: "cd-line" }, [
        el("span", { text: label }),
        el("strong", { class: colored ? (values[key] >= 0 ? "is-ok" : "is-bad") : "", text: CD.comma(values[key]) })
      ]);
      node.appendChild(line);
    });
  }

  function runCard(boss) {
    var key = String(boss.sn);
    var on1 = state.runs.run1[key] === true;
    var on2 = state.runs.run2[key] === true;
    return el("article", { class: "cd-card" }, [
      el("div", { class: "cd-row cd-spread" }, [
        el("h3", { text: boss.name }),
        el("div", { class: "cd-row" }, [
          button("1st Run", "cd-chip" + (on1 ? " is-on" : ""), function () {
            state.runs.run1[key] = !on1;
            if (!state.runs.run1[key]) state.runs.run2[key] = false;
            save();
            paintExpedition();
          }, { "aria-pressed": on1 ? "true" : "false" }),
          button("2nd Run", "cd-chip" + (on2 ? " is-on" : "") + (on1 ? "" : " is-disabled"), function () {
            if (state.runs.run1[key] !== true) return;
            state.runs.run2[key] = !on2;
            save();
            paintExpedition();
          }, { "aria-pressed": on2 ? "true" : "false", disabled: on1 ? null : true })
        ])
      ]),
      el("p", { class: "cd-fine", text: "Gold: " + CD.comma(boss.g) + " · Copper: " + CD.comma(boss.c) }),
      el("p", { class: "cd-fine", text: "Darksteel: " + CD.comma(boss.ds) + " · Energy: " + CD.comma(boss.e) })
    ]);
  }

  function clearRuns() {
    state.runs.run1 = {};
    state.runs.run2 = {};
    save();
    paintExpedition();
    status("Run selections have been reset.");
  }

  function toggleRunSort() {
    state.runs.sortAsc = !state.runs.sortAsc;
    save();
    paintExpedition();
  }

  function openDeduction() {
    var totals = CD.expeditionTotals(state.runs);
    var dialog = $("cd-deduct");
    $("deduct-copy").textContent = "Deduct the selected run costs from your stored clan resources and clear the plan?\n\nGold: " + CD.comma(totals.g) + "\nCopper: " + CD.comma(totals.c) + "\nDarksteel: " + CD.comma(totals.ds) + "\nEnergy: " + CD.comma(totals.e);
    if (dialog.showModal) dialog.showModal();
    else applyDeduction();
  }

  function applyDeduction() {
    var totals = CD.expeditionTotals(state.runs);
    var remain = CD.expeditionRemain(state.clan, state.runs);
    if (!CD.sufficient(remain)) return;
    undoDeduction = {
      clan: {
        gold: state.clan.gold,
        copper: state.clan.copper,
        darksteel: state.clan.darksteel,
        energy: state.clan.energy
      },
      run1: Object.assign({}, state.runs.run1),
      run2: Object.assign({}, state.runs.run2)
    };
    state.clan.gold = CD.comma(remain.g);
    state.clan.copper = CD.comma(remain.c);
    state.clan.darksteel = CD.comma(remain.ds);
    state.clan.energy = CD.comma(remain.e);
    state.runs.run1 = {};
    state.runs.run2 = {};
    save();
    syncResourceInputs();
    paintExpedition();
    status("Resources deducted. Plan cleared.");
    var dialog = $("cd-deduct");
    if (dialog.open && dialog.close) dialog.close();
  }

  function syncResourceInputs() {
    ["gold", "copper", "darksteel", "energy"].forEach(function (key) {
      var node = $("res-" + key);
      if (node) node.value = state.clan[key];
    });
  }

  function renderClan() {
    var mount = $("clan-mount");
    clear(mount);
    mount.appendChild(el("div", { class: "cd-card cd-stack" }, [
      el("h3", { text: "Clan setup" }),
      el("p", { class: "cd-fine", text: "Optional. Stored on this device." }),
      clanField("Clan name", "clan-name", "name"),
      clanField("Leader", "clan-leader", "leader"),
      clanField("Level", "clan-level", "level"),
      clanField("Max members", "clan-max", "maxMembers")
    ]));
    mount.appendChild(el("div", { class: "cd-card cd-stack", id: "resources" }, [
      el("h3", { text: "Clan resources" }),
      resourceField("Gold", "gold"),
      resourceField("Copper", "copper"),
      resourceField("Darksteel", "darksteel"),
      resourceField("Energy", "energy"),
      el("p", { class: "cd-fine", text: "Commas are kept. The expedition calculator reads the digits." })
    ]));
    mount.appendChild(el("div", { class: "cd-stack", id: "members" }, [
      el("h3", { text: "Members" }),
      el("p", { class: "cd-fine", text: "Add members by hand. This page does not scan screenshots." }),
      el("div", { class: "cd-grid-2" }, [
        field("Search", el("input", { id: "member-search", type: "search", value: state.memberQuery })),
        field("Sort", select({ id: "member-sort" }, CD.MEMBER_SORTS, state.memberSort)),
        field("Class", select({ id: "member-class" }, ["All"].concat(CD.CLASSES), state.memberClass)),
        field("Role", select({ id: "member-role" }, ["All"].concat(CD.ROLES), state.memberRole))
      ]),
      el("form", { id: "member-form", class: "cd-card cd-grid-2" }, [
        field("Name", el("input", { id: "member-name", type: "text", required: true, maxlength: "40" })),
        field("Class", select({ id: "member-new-class" }, CD.CLASSES, CD.CLASSES[0])),
        field("Role", select({ id: "member-new-role" }, CD.ROLES, "New Member")),
        button("Add member", "cd-btn", null, { type: "submit" })
      ]),
      el("p", { class: "cd-fine", id: "member-error" }),
      el("div", { id: "member-list" })
    ]));
    mount.appendChild(donationBoard("daily", "Daily donations", "Daily Donation Report"));
    mount.appendChild(donationBoard("gold", "Gold donations", "Gold Donation Report"));
    mount.appendChild(el("p", { class: "cd-fine", text: "Clan records are stored on this device." }));
    $("clan-name").addEventListener("input", function () {
      state.clan.name = $("clan-name").value;
      save();
      paintToday(Date.now());
    });
    ["leader", "level", "maxMembers"].forEach(function (key) {
      var idName = key === "maxMembers" ? "clan-max" : "clan-" + key;
      $(idName).addEventListener("input", function (event) {
        state.clan[key] = event.target.value;
        save();
      });
    });
    ["gold", "copper", "darksteel", "energy"].forEach(function (key) {
      $("res-" + key).addEventListener("input", function (event) {
        state.clan[key] = event.target.value;
        save();
        paintExpedition();
      });
    });
    $("member-search").addEventListener("input", function (event) {
      state.memberQuery = event.target.value;
      save();
      renderMembers();
    });
    $("member-sort").addEventListener("change", function (event) {
      state.memberSort = event.target.value;
      save();
      renderMembers();
    });
    $("member-class").addEventListener("change", function (event) {
      state.memberClass = event.target.value;
      save();
      renderMembers();
    });
    $("member-role").addEventListener("change", function (event) {
      state.memberRole = event.target.value;
      save();
      renderMembers();
    });
    $("member-form").addEventListener("submit", function (event) {
      event.preventDefault();
      addMember();
    });
    renderMembers();
    renderDonation("daily");
    renderDonation("gold");
  }

  function clanField(label, idName, key) {
    return field(label, el("input", { id: idName, type: "text", value: state.clan[key], maxlength: "60" }));
  }

  function resourceField(label, key) {
    return field(label, el("input", { id: "res-" + key, type: "text", value: state.clan[key], inputmode: "numeric", maxlength: "20" }));
  }

  function addMember() {
    var name = $("member-name").value.trim();
    var error = $("member-error");
    if (!name) {
      error.textContent = "Enter a name.";
      return;
    }
    if (CD.duplicateName(state.members, name)) {
      error.textContent = "That name is already on the board.";
      return;
    }
    state.members.push({
      id: CD.id(),
      name: name,
      className: $("member-new-class").value,
      role: $("member-new-role").value,
      added: Date.now()
    });
    $("member-name").value = "";
    error.textContent = "";
    save();
    renderMembers();
    renderDonation("daily");
    renderDonation("gold");
  }

  function renderMembers() {
    var list = CD.sortMembers(CD.filterMembers(state.members, state.memberQuery, state.memberClass, state.memberRole), state.memberSort);
    var mount = $("member-list");
    clear(mount);
    if (!list.length) mount.appendChild(el("p", { class: "cd-fine", text: state.members.length ? "No members match these filters." : "No members yet." }));
    list.forEach(function (member) {
      var name = el("input", { type: "text", value: member.name, maxlength: "40", "aria-label": "Name" });
      var className = select({ "aria-label": "Class" }, CD.CLASSES, member.className);
      var role = select({ "aria-label": "Role" }, CD.ROLES, member.role);
      mount.appendChild(el("article", { class: "cd-card cd-member", "data-member": member.id }, [
        el("div", { class: "cd-grid-2" }, [name, className, role]),
        el("div", { class: "cd-row" }, [
          button("Save", "cd-btn", function () {
            var next = name.value.trim();
            if (!next) {
              $("member-error").textContent = "Enter a name.";
              return;
            }
            if (CD.duplicateName(state.members, next, member.id)) {
              $("member-error").textContent = "That name is already on the board.";
              return;
            }
            member.name = next;
            member.className = className.value;
            member.role = role.value;
            $("member-error").textContent = "";
            save();
            renderMembers();
            renderDonation("daily");
            renderDonation("gold");
          }),
          button("Remove", "cd-btn cd-btn-quiet", function () {
            state.members = state.members.filter(function (item) { return item.id !== member.id; });
            delete state.daily.flags[member.id];
            delete state.gold.flags[member.id];
            save();
            renderMembers();
            renderDonation("daily");
            renderDonation("gold");
          })
        ])
      ]));
    });
  }

  function donationBoard(key, title, reportTitle) {
    return el("div", { class: "cd-stack", id: key + "-board" }, [
      el("h3", { text: title }),
      field("Note", el("textarea", { id: key + "-intro", rows: "3" })),
      el("div", { class: "cd-grid-2" }, [
        field("Search", el("input", { id: key + "-search", type: "search" })),
        field("Sort", select({ id: key + "-sort" }, CD.DONATION_SORTS.map(function (item) {
          return { value: item.id, label: item.label };
        }), state[key].sort))
      ]),
      el("div", { class: "cd-row" }, [
        button("Select visible", "cd-btn cd-btn-quiet", function () { toggleVisible(key); }, { id: key + "-all" }),
        button("Clear ticks", "cd-btn cd-btn-quiet", function () {
          state[key].flags = {};
          save();
          renderDonation(key);
        }),
        button("Share", "cd-btn", function () {
          state[key].intro = $(key + "-intro").value;
          save();
          shareOrCopy(CD.donationReport(reportTitle, state.members, state[key]), reportTitle);
        })
      ]),
      el("p", { id: key + "-count" }),
      el("div", { id: key + "-list" })
    ]);
  }

  function renderDonation(key) {
    var board = state[key];
    var intro = $(key + "-intro");
    var search = $(key + "-search");
    if (document.activeElement !== intro) intro.value = board.intro;
    if (document.activeElement !== search) search.value = board.query;
    $(key + "-sort").value = board.sort;
    if (!intro.dataset.bound) {
      intro.dataset.bound = "1";
      intro.addEventListener("input", function () {
        board.intro = intro.value;
        save();
      });
      $(key + "-search").addEventListener("input", function (event) {
        board.query = event.target.value;
        save();
        renderDonation(key);
      });
      $(key + "-sort").addEventListener("change", function (event) {
        board.sort = event.target.value;
        save();
        renderDonation(key);
      });
    }
    var donated = state.members.filter(function (member) { return board.flags[member.id] === true; }).length;
    $(key + "-count").textContent = "Donated " + donated + " / " + state.members.length;
    var mount = $(key + "-list");
    clear(mount);
    var visible = CD.donationList(state.members, board);
    if (!visible.length) mount.appendChild(el("p", { class: "cd-fine", text: "No members to show." }));
    visible.forEach(function (member) {
      var input = el("input", { type: "checkbox" });
      input.checked = board.flags[member.id] === true;
      input.addEventListener("change", function () {
        if (input.checked) board.flags[member.id] = true;
        else delete board.flags[member.id];
        save();
        renderDonation(key);
      });
      mount.appendChild(el("label", { class: "cd-check cd-card", "data-donation": member.id }, [
        input,
        el("span", {}, [
          el("strong", { text: member.name }),
          document.createTextNode(" · " + member.className + " · " + member.role)
        ])
      ]));
    });
  }

  function toggleVisible(key) {
    var visible = CD.donationList(state.members, state[key]);
    var allOn = visible.length > 0 && visible.every(function (member) { return state[key].flags[member.id] === true; });
    visible.forEach(function (member) {
      if (allOn) delete state[key].flags[member.id];
      else state[key].flags[member.id] = true;
    });
    save();
    renderDonation(key);
  }

  function renderPlanner() {
    var mount = $("planner-mount");
    clear(mount);
    var grid = el("div", { class: "cd-week", id: "planner-grid" });
    for (var day = 1; day <= 7; day++) {
      grid.appendChild(el("article", { class: "cd-card", "data-day": String(day) }, [
        el("h3", { text: CD.weekdayName(day) }),
        el("div", { class: "cd-day-bosses", "data-day-bosses": String(day) }),
        el("textarea", { rows: "4", "data-note": String(day), "aria-label": CD.weekdayName(day) + " notes" })
      ]));
    }
    mount.appendChild(grid);
    mount.querySelectorAll("[data-note]").forEach(function (area) {
      var day = area.getAttribute("data-note");
      area.value = state.planner.notes[day] || "";
      area.addEventListener("input", function () {
        state.planner.notes[day] = area.value;
        save();
      });
    });
    paintPlannerTimes(Date.now());
  }

  function paintPlannerTimes(now) {
    var offset = region().offsetHours;
    for (var day = 1; day <= 7; day++) {
      var mount = document.querySelector('[data-day-bosses="' + day + '"]');
      if (!mount) return;
      clear(mount);
      var found = bosses.filter(function (boss) { return boss.weekday === day; });
      if (!found.length) {
        mount.appendChild(el("p", { class: "cd-fine", text: "No weekly world boss on this day in the schedule." }));
        continue;
      }
      found.forEach(function (boss) {
        var slot = CD.currentSlot(boss, now, offset);
        mount.appendChild(el("p", {}, [
          el("strong", { text: boss.name }),
          document.createTextNode(" · " + boss.location + " · " + CD.asiaScheduleLabel(boss) + " · " + CD.formatOffsetInstant(slot.spawnUtc, offset) + " " + region().name)
        ]));
        if (slot) {
          mount.appendChild(el("p", { class: "cd-fine", "data-spawn": String(slot.spawnUtc), "data-live": slot.live ? "1" : "0", text: (slot.live ? "Spawn window" : CD.formatCountdown(slot.spawnUtc - now)) + " · " + CD.formatLocalInstant(slot.spawnUtc) }));
        }
      });
    }
  }

  function renderNotices() {
    var mount = $("notices-mount");
    clear(mount);
    if (!notices.length) {
      mount.appendChild(el("p", { text: "No notices are listed." }));
      return;
    }
    notices.forEach(function (item) {
      mount.appendChild(el("article", { class: "cd-card" }, [
        el("p", { class: "cd-fine", text: item.date || "" }),
        el("h3", {}, [el("a", { href: item.url, rel: "noopener noreferrer", text: item.title })]),
        el("p", { text: item.summary || "" })
      ]));
    });
  }

  function renderSettings() {
    var mount = $("settings-mount");
    clear(mount);
    mount.appendChild(el("div", { class: "cd-row" }, [
      button("Export JSON", "cd-btn", exportData),
      button("Import JSON", "cd-btn cd-btn-quiet", function () { $("import-file").click(); })
    ]));
    var file = el("input", { id: "import-file", type: "file", accept: "application/json,.json" });
    file.hidden = true;
    file.addEventListener("change", importData);
    mount.appendChild(file);
    mount.appendChild(el("p", { class: "cd-fine", text: "Export and import cover bosses you starred, the checklist, clan records, expedition runs, planner notes, and comparison entries. They stay in this browser until you clear site data." }));
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var link = el("a", { href: URL.createObjectURL(blob), download: "crazy-dragon-web.json" });
    document.body.appendChild(link);
    link.click();
    link.remove();
    status("Export downloaded.");
  }

  function importData(event) {
    var file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
        state = CD.normalizeState(parsed);
        save();
        renderAll();
        status("Import replaced the saved data in this browser.");
      } catch (error) {
        status("That file could not be read as Crazy Dragon data.");
      }
    };
    reader.readAsText(file);
  }

  function boot() {
    loadState();
    bindFeedback();
    renderSettings();
    $("deduct-cancel").addEventListener("click", function () {
      var dialog = $("cd-deduct");
      if (dialog.close) dialog.close();
    });
    $("deduct-apply").addEventListener("click", applyDeduction);
    Promise.all([
      fetch("data/bosses.json").then(function (response) { return response.json(); }),
      fetch("data/notices.json").then(function (response) { return response.json(); })
    ]).then(function (parts) {
      bosses = parts[0].bosses || [];
      notices = (parts[1] && parts[1].items) || [];
      if (bosses.length !== 53) status("The boss table did not load completely.");
      renderAll();
      setInterval(tick, 1000);
    }).catch(function () {
      status("The schedule could not be loaded.");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
