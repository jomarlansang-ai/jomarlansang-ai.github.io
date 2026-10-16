(function () {
  "use strict";

  var WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var WEEKDAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function phtParts(date) {
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23"
    });
    var out = {};
    fmt.formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") out[part.type] = part.value;
    });
    var hour = out.hour === "24" ? 0 : Number(out.hour);
    return {
      year: Number(out.year),
      month: Number(out.month),
      day: Number(out.day),
      hour: hour,
      minute: Number(out.minute),
      second: Number(out.second),
      weekday: WEEKDAY_INDEX[out.weekday]
    };
  }

  function dateKey(parts) {
    return parts.year + "-" + pad(parts.month) + "-" + pad(parts.day);
  }

  function phtInstant(year, month, day, hour, minute, second) {
    return new Date(
      year + "-" + pad(month) + "-" + pad(day) + "T" +
      pad(hour) + ":" + pad(minute) + ":" + pad(second || 0) + "+08:00"
    );
  }

  function addDays(year, month, day, days) {
    var t = new Date(Date.UTC(year, month - 1, day));
    t.setUTCDate(t.getUTCDate() + days);
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
  }

  function parseHM(value) {
    var bits = String(value).split(":");
    return { hour: Number(bits[0]), minute: Number(bits[1]) };
  }

  function mondayOf(date) {
    var parts = phtParts(date);
    var back = (parts.weekday + 6) % 7;
    return addDays(parts.year, parts.month, parts.day, -back);
  }

  function formatLong(date) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).format(date);
  }

  function formatDay(year, month, day) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "long",
      day: "numeric"
    }).format(phtInstant(year, month, day, 12, 0, 0));
  }

  function formatDuration(ms) {
    var seconds = Math.max(0, Math.floor(ms / 1000));
    var days = Math.floor(seconds / 86400);
    seconds -= days * 86400;
    var hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    var minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    if (days > 0) return days + "d " + pad(hours) + "h " + pad(minutes) + "m " + pad(seconds) + "s";
    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
  }

  function loadStore(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function saveStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function setSaveStatus(ok) {
    var el = document.getElementById("mir4-save");
    if (!el) return;
    el.textContent = ok
      ? "Saved in this browser."
      : "This browser blocked local storage, so changes will not be kept.";
  }

  function showError(message) {
    var el = document.getElementById("mir4-error");
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
  }

  function httpsLink(url, label) {
    if (!/^https:\/\//.test(url)) return "";
    return '<a href="' + esc(url) + '" rel="noopener noreferrer">' + esc(label) + "</a>";
  }

  function badge(status) {
    if (status === "verified") return '<span class="mir4-badge mir4-badge-verified">Verified</span>';
    return '<span class="mir4-badge mir4-badge-confirm">to confirm</span>';
  }

  function nextMidnight(now) {
    var parts = phtParts(now);
    var next = addDays(parts.year, parts.month, parts.day, 1);
    return phtInstant(next.year, next.month, next.day, 0, 0, 0);
  }

  function nextPoint(now, weekday, hm) {
    var parts = phtParts(now);
    var day = { year: parts.year, month: parts.month, day: parts.day };
    if (weekday != null) {
      var delta = (weekday - parts.weekday + 7) % 7;
      day = addDays(parts.year, parts.month, parts.day, delta);
    }
    var at = phtInstant(day.year, day.month, day.day, hm.hour, hm.minute, 0);
    if (at.getTime() <= now.getTime()) {
      var step = weekday == null ? 1 : 7;
      var next = addDays(day.year, day.month, day.day, step);
      at = phtInstant(next.year, next.month, next.day, hm.hour, hm.minute, 0);
    }
    return at;
  }

  function windowInfo(now, weekday, startHM, endHM) {
    var parts = phtParts(now);
    var startSec = startHM.hour * 3600 + startHM.minute * 60;
    var endSec = endHM.hour * 3600 + endHM.minute * 60;
    var nowSec = parts.hour * 3600 + parts.minute * 60 + parts.second;
    var crosses = endSec <= startSec;

    if (weekday == null) {
      if (crosses) {
        if (nowSec >= startSec || nowSec < endSec) {
          var endDay = nowSec < endSec
            ? { year: parts.year, month: parts.month, day: parts.day }
            : addDays(parts.year, parts.month, parts.day, 1);
          return {
            open: true,
            at: phtInstant(endDay.year, endDay.month, endDay.day, endHM.hour, endHM.minute, 0),
            label: "Closes in"
          };
        }
        var startDay = nowSec < startSec
          ? { year: parts.year, month: parts.month, day: parts.day }
          : addDays(parts.year, parts.month, parts.day, 1);
        return {
          open: false,
          at: phtInstant(startDay.year, startDay.month, startDay.day, startHM.hour, startHM.minute, 0),
          label: "Opens in"
        };
      }
      if (nowSec >= startSec && nowSec < endSec) {
        return {
          open: true,
          at: phtInstant(parts.year, parts.month, parts.day, endHM.hour, endHM.minute, 0),
          label: "Closes in"
        };
      }
      if (nowSec < startSec) {
        return {
          open: false,
          at: phtInstant(parts.year, parts.month, parts.day, startHM.hour, startHM.minute, 0),
          label: "Opens in"
        };
      }
      var tomorrow = addDays(parts.year, parts.month, parts.day, 1);
      return {
        open: false,
        at: phtInstant(tomorrow.year, tomorrow.month, tomorrow.day, startHM.hour, startHM.minute, 0),
        label: "Opens in"
      };
    }

    var delta = (weekday - parts.weekday + 7) % 7;
    var day = addDays(parts.year, parts.month, parts.day, delta);
    var startAt = phtInstant(day.year, day.month, day.day, startHM.hour, startHM.minute, 0);
    var endBase = crosses ? addDays(day.year, day.month, day.day, 1) : day;
    var endAt = phtInstant(endBase.year, endBase.month, endBase.day, endHM.hour, endHM.minute, 0);
    if (now.getTime() >= startAt.getTime() && now.getTime() < endAt.getTime()) {
      return { open: true, at: endAt, label: "Closes in" };
    }
    if (now.getTime() >= endAt.getTime()) {
      var next = addDays(day.year, day.month, day.day, 7);
      return {
        open: false,
        at: phtInstant(next.year, next.month, next.day, startHM.hour, startHM.minute, 0),
        label: "Opens in"
      };
    }
    return { open: false, at: startAt, label: "Opens in" };
  }

  function nextCitedHour(now, hours) {
    var parts = phtParts(now);
    var nowSec = parts.hour * 3600 + parts.minute * 60 + parts.second;
    var best = null;
    hours.forEach(function (hour) {
      var hm = parseHM(hour);
      var sec = hm.hour * 3600 + hm.minute * 60;
      var day = sec > nowSec
        ? { year: parts.year, month: parts.month, day: parts.day }
        : addDays(parts.year, parts.month, parts.day, 1);
      var at = phtInstant(day.year, day.month, day.day, hm.hour, hm.minute, 0);
      if (!best || at.getTime() < best.getTime()) best = at;
    });
    return { open: false, at: best, label: "Next cited time in" };
  }

  function occurrence(event, now) {
    if (event.recurrence === "unscheduled") return null;
    if (event.recurrence === "once") {
      var at = new Date(event.at);
      if (at.getTime() <= now.getTime()) return { open: false, past: true, at: at, label: "This date has passed" };
      return { open: false, past: false, at: at, label: "Time remaining" };
    }
    if (event.recurrence === "daily-hours") return nextCitedHour(now, event.hours);
    var start = parseHM(event.start);
    if (event.end) return windowInfo(now, event.weekday == null ? null : event.weekday, start, parseHM(event.end));
    return {
      open: false,
      at: nextPoint(now, event.weekday == null ? null : event.weekday, start),
      label: event.pointLabel || (event.status === "to-confirm" ? "Next cited time in" : "Starts in")
    };
  }

  function whenText(event) {
    if (event.recurrence === "unscheduled") return "No countdown";
    if (event.recurrence === "once") return event.when + " PHT";
    if (event.recurrence === "daily-hours") return "Cited hours " + event.hours.join(", ") + " PHT";
    var day = event.weekday == null ? "Every day" : WEEKDAY_NAME[event.weekday];
    if (event.end) return day + " " + event.start + "–" + event.end + " PHT";
    return day + " at " + event.start + " PHT";
  }

  function eventCard(event, info) {
    var badges = badge(event.status);
    if (event.hourStatus === "to-confirm") badges += badge("to-confirm").replace("to confirm", "Hour to confirm");
    var count = "";
    if (!info) {
      count = '<p class="mir4-count-label">No countdown</p><p class="mir4-count">—</p>';
    } else if (info.past) {
      count = '<p class="mir4-count-label">This date has passed</p><p class="mir4-count">—</p>';
    } else {
      count = '<p class="mir4-count-label">' + esc(info.label) + '</p><p class="mir4-count">' + esc(formatDuration(info.at - new Date())) + "</p>";
    }
    var note = event.note ? "<p>" + esc(event.note) + "</p>" : "";
    var source = event.source ? '<p class="fineprint">' + httpsLink(event.source, event.sourceLabel || "Source") + "</p>" : "";
    var also = event.also ? '<p class="fineprint">Also ' + httpsLink(event.also, "the event schedule") + "</p>" : "";
    return (
      '<article class="mir4-card' + (info && info.open ? " is-open" : "") + '" id="event-' + esc(event.id) + '">' +
      '<div class="mir4-card-top"><h3>' + esc(event.name) + '</h3><div class="mir4-badges">' + badges + "</div></div>" +
      '<p class="mir4-when">' + esc(whenText(event)) + "</p>" +
      count +
      "<p>" + esc(event.summary) + "</p>" +
      note + source + also +
      "</article>"
    );
  }

  function paintCounts(events, now) {
    var expired = false;
    events.forEach(function (event) {
      var info = occurrence(event, now);
      var card = document.getElementById("event-" + event.id);
      if (!card || !info || info.past) return;
      var ms = info.at.getTime() - now.getTime();
      if (ms <= 0) expired = true;
      card.classList.toggle("is-open", !!info.open);
      var label = card.querySelector(".mir4-count-label");
      var count = card.querySelector(".mir4-count");
      if (label) label.textContent = info.label;
      if (count) count.textContent = formatDuration(ms);
    });
    return expired;
  }

  function initClock() {
    var nowEl = document.getElementById("mir4-now");
    var verifiedEl = document.getElementById("mir4-verified");
    var confirmEl = document.getElementById("mir4-confirm");
    fetch("/mir4/data/schedule.json")
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (data) {
        var events = data.events || [];
        function render() {
          var now = new Date();
          if (nowEl) nowEl.textContent = "Now in PHT: " + formatLong(now);
          var verified = [];
          var confirm = [];
          events.forEach(function (event) {
            var info = occurrence(event, now);
            var html = eventCard(event, info);
            if (event.status === "verified") verified.push(html);
            else confirm.push(html);
          });
          verifiedEl.innerHTML = verified.join("");
          confirmEl.innerHTML = confirm.join("");
        }
        render();
        window.setInterval(function () {
          var now = new Date();
          if (nowEl) nowEl.textContent = "Now in PHT: " + formatLong(now);
          if (paintCounts(events, now)) render();
        }, 1000);
      })
      .catch(function () {
        showError("The schedule file did not load. Reload this page.");
      });
  }

  function taskCount(groups) {
    return groups.reduce(function (sum, group) {
      return sum + group.tasks.length;
    }, 0);
  }

  function initChecklist() {
    var root = document.getElementById("mir4-tasks");
    var label = document.getElementById("mir4-progress-label");
    var bar = document.querySelector(".mir4-bar > span");
    var resetEl = document.getElementById("mir4-reset-count");
    var noteEl = document.getElementById("mir4-reset-note");
    fetch("/mir4/data/checklist.json")
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (data) {
        var total = taskCount(data.groups);
        if (noteEl) noteEl.textContent = data.reset.note;
        var store = loadStore("mir4-checklist-v1") || { period: "", checked: {} };
        function period() {
          return dateKey(phtParts(new Date()));
        }
        function normalize() {
          var today = period();
          if (store.period !== today) {
            store = { period: today, checked: {} };
            setSaveStatus(saveStore("mir4-checklist-v1", store));
          }
        }
        function paint() {
          normalize();
          var done = 0;
          root.querySelectorAll("input[type=checkbox]").forEach(function (input) {
            var on = !!store.checked[input.getAttribute("data-task")];
            input.checked = on;
            if (on) done += 1;
          });
          if (label) label.textContent = done + " of " + total + " ticked";
          if (bar) bar.style.width = (total ? (done / total) * 100 : 0) + "%";
          var progress = document.getElementById("mir4-progress");
          if (progress) {
            progress.setAttribute("aria-valuemax", String(total));
            progress.setAttribute("aria-valuenow", String(done));
          }
          if (resetEl) resetEl.textContent = formatDuration(nextMidnight(new Date()) - new Date());
        }
        root.innerHTML = data.groups.map(function (group) {
          var source = group.source
            ? '<p class="fineprint">' + httpsLink(group.source, "Official task guide") + "</p>"
            : "";
          var tasks = group.tasks.map(function (task) {
            return (
              '<li><label class="mir4-task"><input type="checkbox" data-task="' + esc(task.id) + '"><span>' +
              esc(task.label) + "</span></label></li>"
            );
          }).join("");
          return (
            '<section class="mir4-group"><h2>' + esc(group.title) + "</h2><p>" + esc(group.note) + "</p>" +
            source + '<ul class="mir4-tasks">' + tasks + "</ul></section>"
          );
        }).join("");
        root.addEventListener("change", function (event) {
          var input = event.target;
          if (!input || input.type !== "checkbox") return;
          normalize();
          var id = input.getAttribute("data-task");
          if (input.checked) store.checked[id] = true;
          else delete store.checked[id];
          setSaveStatus(saveStore("mir4-checklist-v1", store));
          paint();
        });
        paint();
        window.setInterval(function () {
          var before = store.period;
          paint();
          if (store.period !== before) setSaveStatus(saveStore("mir4-checklist-v1", store));
        }, 1000);
      })
      .catch(function () {
        showError("The checklist file did not load. Reload this page.");
      });
  }

  function initPlanner() {
    var picksEl = document.getElementById("mir4-picks");
    var daysEl = document.getElementById("mir4-days");
    var weekEl = document.getElementById("mir4-week-label");
    fetch("/mir4/data/schedule.json")
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (data) {
        var byId = {};
        (data.events || []).forEach(function (event) { byId[event.id] = event; });
        var monday = mondayOf(new Date());
        var week = dateKey(monday);
        var sunday = addDays(monday.year, monday.month, monday.day, 6);
        if (weekEl) {
          weekEl.textContent = "Week of " + formatDay(monday.year, monday.month, monday.day) +
            "–" + formatDay(sunday.year, sunday.month, sunday.day) + ", " + monday.year + " PHT";
        }
        var store = loadStore("mir4-planner-v1") || { week: "", notes: {}, checked: {} };
        if (store.week !== week) store = { week: week, notes: {}, checked: {} };

        picksEl.innerHTML = (data.plannerPicks || []).map(function (pick) {
          return (
            '<label class="mir4-task"><input type="checkbox" data-pick="' + esc(pick.id) + '"' +
            (store.checked[pick.id] ? " checked" : "") + "><span>" + esc(pick.label) +
            " (" + (pick.status === "verified" ? "verified" : "to confirm") + ")</span></label>" +
            (pick.note ? "<p class=\"fineprint\">" + esc(pick.note) + "</p>" : "")
          );
        }).join("");

        daysEl.innerHTML = (data.plannerDays || []).map(function (day) {
          var date = addDays(monday.year, monday.month, monday.day, (day.weekday + 6) % 7);
          var events = (day.eventIds || []).map(function (id) {
            var event = byId[id];
            if (!event) return "";
            return "<li>" + esc(event.name) + " — " + esc(whenText(event)) + " (" +
              (event.status === "verified" ? "verified" : "to confirm") + ")</li>";
          }).join("");
          var note = store.notes[String(day.weekday)] || "";
          return (
            '<article class="mir4-card"><h3>' + WEEKDAY_NAME[day.weekday] + "</h3>" +
            '<p class="mir4-when">' + esc(formatDay(date.year, date.month, date.day)) + "</p>" +
            (events ? "<ul>" + events + "</ul>" : "<p>No weekly event in the schedule.</p>") +
            '<label class="mir4-field">Note<textarea class="mir4-note" data-day="' + day.weekday + '">' +
            esc(note) + "</textarea></label></article>"
          );
        }).join("");

        function persist() {
          setSaveStatus(saveStore("mir4-planner-v1", store));
        }
        picksEl.addEventListener("change", function (event) {
          var input = event.target;
          if (!input || !input.getAttribute("data-pick")) return;
          if (input.checked) store.checked[input.getAttribute("data-pick")] = true;
          else delete store.checked[input.getAttribute("data-pick")];
          persist();
        });
        daysEl.addEventListener("input", function (event) {
          var box = event.target;
          if (!box || !box.getAttribute("data-day")) return;
          store.notes[box.getAttribute("data-day")] = box.value;
          persist();
        });
        persist();
      })
      .catch(function () {
        showError("The schedule file did not load. Reload this page.");
      });
  }

  function initNotices() {
    var list = document.getElementById("mir4-notices");
    fetch("/mir4/data/notices.json")
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (data) {
        var about = document.getElementById("mir4-notices-about");
        if (about) about.textContent = data.about;
        list.innerHTML = (data.items || []).map(function (item) {
          if (!/^https:\/\//.test(item.url)) return "";
          return (
            "<li class=\"mir4-card\"><h3>" + httpsLink(item.url, item.title) + "</h3>" +
            (item.date ? '<p class="mir4-when">' + esc(item.date) + "</p>" : "") +
            "<p>" + esc(item.summary) + "</p></li>"
          );
        }).join("");
      })
      .catch(function () {
        showError("The notice file did not load. Reload this page.");
      });
  }

  function initClan() {
    var form = document.getElementById("mir4-clan-form");
    if (!form) return;
    var store = loadStore("mir4-clan-v1") || { name: "", server: "", note: "" };
    ["name", "server", "note"].forEach(function (key) {
      if (form.elements[key]) form.elements[key].value = store[key] || "";
    });
    form.addEventListener("input", function () {
      var next = {
        name: form.elements.name.value,
        server: form.elements.server.value,
        note: form.elements.note.value
      };
      setSaveStatus(saveStore("mir4-clan-v1", next));
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });
  }

  var page = document.body.getAttribute("data-mir4");
  if (page === "clock") initClock();
  if (page === "checklist") initChecklist();
  if (page === "planner") initPlanner();
  if (page === "notices") initNotices();
  if (page === "clan") initClan();
})();
