/* Crazy Dragon web helpers. Schedule math follows lib/boss_hunt. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CD = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var REGIONS = [
    { id: "asia", name: "Asia", offsetHours: 8 },
    { id: "inmena", name: "INMENA", offsetHours: 6 },
    { id: "eu", name: "EU", offsetHours: 2 },
    { id: "sa", name: "SA", offsetHours: -3 },
    { id: "na", name: "NA", offsetHours: -4 }
  ];
  var SOON_MS = 30 * 60 * 1000;
  var LIVE_MS = 10 * 60 * 1000;
  var PURGATORY_LIVE_MS = 5 * 60 * 1000;
  var WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var TASKS = ["Daily missions", "Raid & boss raid", "Magic Square", "Secret Peak", "Clan donation"];
  var CLASSES = ["Warrior", "Sorcerer", "Taoist", "Lancer", "Arbalist", "Darkist", "Lionheart", "Spirit Summoner"];
  var ROLES = ["Leader", "Elder", "Master Protector", "Member", "New Member"];
  var MEMBER_SORTS = [
    "Name (A–Z)",
    "Name (Z–A)",
    "Class (A–Z)",
    "Role Priority",
    "Added (Oldest First)",
    "Added (Newest First)"
  ];
  var DONATION_SORTS = [
    { id: "Default", label: "Default order" },
    { id: "NotDonatedFirst", label: "No Donation" },
    { id: "NameAZ", label: "Name A–Z" },
    { id: "NameZA", label: "Name Z–A" }
  ];
  var LEADS = [0, 2, 5, 10];
  var EXPEDITION = [
    { sn: 1, name: "Fox Spirit Beast", c: 2500, ds: 125000, e: 125000, g: 1000 },
    { sn: 2, name: "Demon Bull God", c: 5000, ds: 250000, e: 250000, g: 1200 },
    { sn: 3, name: "Hell Rock Fiend", c: 7500, ds: 375000, e: 375000, g: 1400 },
    { sn: 4, name: "Redmoon Devil", c: 10000, ds: 500000, e: 500000, g: 1600 },
    { sn: 5, name: "Infernal Abomination", c: 12500, ds: 625000, e: 625000, g: 1800 },
    { sn: 6, name: "Blue Thunder Dragon", c: 15000, ds: 750000, e: 750000, g: 2000 },
    { sn: 7, name: "Azure Flame Emperor", c: 17500, ds: 875000, e: 875000, g: 2200 },
    { sn: 8, name: "Sanguinary Serpent Scorpion", c: 20000, ds: 1000000, e: 1000000, g: 2400 },
    { sn: 9, name: "Soul-absorbing Demon Beast", c: 22500, ds: 1125000, e: 1125000, g: 2600 },
    { sn: 10, name: "Chakravarti Darkmaur", c: 25000, ds: 1250000, e: 1250000, g: 2800 },
    { sn: 11, name: "Ice Demon Deity MAJ", c: 27500, ds: 1375000, e: 1375000, g: 3000 }
  ];
  var COMPARE_SECTIONS = [
    { key: "stats", title: "Combat stats", highlight: true },
    { key: "skills", title: "Skills", highlight: "same-class" },
    { key: "training", title: "Training & Constitution", highlight: true },
    { key: "buildings", title: "Conquest buildings", highlight: true },
    { key: "potential", title: "Potential", highlight: false },
    { key: "codex", title: "Codex completion", highlight: false }
  ];

  function regionById(id) {
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].id === id) return REGIONS[i];
    }
    return REGIONS[0];
  }

  function offsetLabel(hours) {
    return hours >= 0 ? "UTC+" + hours : "UTC" + hours;
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function comma(v) {
    var n = Math.trunc(v);
    var neg = n < 0;
    var s = String(Math.abs(n));
    var buf = "";
    for (var i = 0; i < s.length; i++) {
      var pos = s.length - i;
      buf += s[i];
      if (pos > 1 && pos % 3 === 1) buf += ",";
    }
    return neg ? "-" + buf : buf;
  }

  function parseResource(value) {
    var t = String(value == null ? "" : value).replace(/,/g, "").trim();
    if (!/^-?\d+$/.test(t)) return 0;
    var n = Number(t);
    return Number.isSafeInteger(n) ? n : 0;
  }

  function localDay(date) {
    var d = date || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function weekdayName(weekday) {
    return WEEKDAYS[weekday - 1] || "";
  }

  function dartWeekdayFromUtc(ms) {
    var day = new Date(ms).getUTCDay();
    return day === 0 ? 7 : day;
  }

  function wallOf(utcMs, offsetHours) {
    return utcMs + offsetHours * 3600000;
  }

  function wallToUtc(year, month, day, hour, minute, offsetHours) {
    return Date.UTC(year, month - 1, day, hour, minute) - offsetHours * 3600000;
  }

  function formatClock(hour, minute) {
    return pad(hour) + ":" + pad(minute);
  }

  function formatCountdown(ms) {
    var positive = ms < 0 ? 0 : ms;
    var total = Math.floor(positive / 1000);
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor(total / 60) % 60;
    var seconds = total % 60;
    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
  }

  function formatLocalInstant(utcMs) {
    var local = new Date(utcMs);
    var js = local.getDay();
    var dart = js === 0 ? 7 : js;
    return weekdayName(dart) + " " + formatClock(local.getHours(), local.getMinutes());
  }

  function gapLabel(minutes) {
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    if (hours > 0 && mins > 0) return hours + "h " + mins + "m";
    if (hours > 0) return hours + "h";
    return mins + "m";
  }

  function sortedTimes(boss) {
    return boss.times.slice().sort(function (a, b) {
      return a.hour * 60 + a.minute - (b.hour * 60 + b.minute);
    });
  }

  function equalGaps(slots) {
    if (slots.length < 2) return null;
    var gaps = [];
    for (var i = 1; i < slots.length; i++) {
      gaps.push(slots[i].hour * 60 + slots[i].minute - (slots[i - 1].hour * 60 + slots[i - 1].minute));
    }
    var wrap = slots[0].hour * 60 + slots[0].minute + 1440 - (slots[slots.length - 1].hour * 60 + slots[slots.length - 1].minute);
    for (var g = 0; g < gaps.length; g++) {
      if (gaps[g] !== gaps[0] || wrap !== gaps[0]) return null;
    }
    return gaps[0];
  }

  function cadenceLabel(boss) {
    if (!boss.times.length) return "No fixed spawn";
    if (boss.weekday != null) return "Weekly";
    var slots = sortedTimes(boss);
    var gap = equalGaps(slots);
    if (gap != null) return "Every " + gapLabel(gap);
    if (slots.length === 2) return "Twice a day";
    return "Scheduled";
  }

  function asiaScheduleLabel(boss) {
    if (!boss.times.length) return "No fixed spawn";
    var slots = sortedTimes(boss);
    if (boss.weekday != null) {
      return weekdayName(boss.weekday) + " " + formatClock(slots[0].hour, slots[0].minute) + " Asia";
    }
    var gap = equalGaps(slots);
    if (gap != null) {
      return "Every " + gapLabel(gap) + " from " + formatClock(slots[0].hour, slots[0].minute) + " Asia";
    }
    return slots.map(function (slot) { return formatClock(slot.hour, slot.minute); }).join(" · ") + " Asia";
  }

  function liveWindow(boss) {
    return boss.id === "purgatory-quest-bosses" ? PURGATORY_LIVE_MS : LIVE_MS;
  }

  function nextSpawnUtc(boss, nowMs, offsetHours) {
    if (!boss.times.length) return null;
    var wall = wallOf(nowMs, offsetHours);
    var wallDate = new Date(wall);
    var today = Date.UTC(wallDate.getUTCFullYear(), wallDate.getUTCMonth(), wallDate.getUTCDate());
    var horizon = boss.weekday == null ? 2 : 8;
    var best = null;
    for (var i = 0; i <= horizon; i++) {
      var day = today + i * 86400000;
      if (boss.weekday != null && dartWeekdayFromUtc(day) !== boss.weekday) continue;
      var parts = new Date(day);
      for (var s = 0; s < boss.times.length; s++) {
        var slot = boss.times[s];
        var utc = wallToUtc(parts.getUTCFullYear(), parts.getUTCMonth() + 1, parts.getUTCDate(), slot.hour, slot.minute, offsetHours);
        if (utc <= nowMs) continue;
        if (best == null || utc < best) best = utc;
      }
      if (best != null && boss.weekday == null) break;
    }
    return best;
  }

  function previousSpawnUtc(boss, nowMs, offsetHours) {
    if (!boss.times.length) return null;
    var wall = wallOf(nowMs, offsetHours);
    var wallDate = new Date(wall);
    var today = Date.UTC(wallDate.getUTCFullYear(), wallDate.getUTCMonth(), wallDate.getUTCDate());
    var lookback = boss.weekday == null ? 1 : 7;
    var best = null;
    for (var i = 0; i <= lookback; i++) {
      var day = today - i * 86400000;
      if (boss.weekday != null && dartWeekdayFromUtc(day) !== boss.weekday) continue;
      var parts = new Date(day);
      for (var s = 0; s < boss.times.length; s++) {
        var slot = boss.times[s];
        var utc = wallToUtc(parts.getUTCFullYear(), parts.getUTCMonth() + 1, parts.getUTCDate(), slot.hour, slot.minute, offsetHours);
        if (utc > nowMs) continue;
        if (best == null || utc > best) best = utc;
      }
    }
    return best;
  }

  function currentSlot(boss, nowMs, offsetHours) {
    if (!boss.times.length) return null;
    var previous = previousSpawnUtc(boss, nowMs, offsetHours);
    if (previous != null && nowMs - previous < liveWindow(boss)) {
      return { boss: boss, spawnUtc: previous, live: true };
    }
    var next = nextSpawnUtc(boss, nowMs, offsetHours);
    if (next == null) return null;
    return { boss: boss, spawnUtc: next, live: false };
  }

  function isSoon(slot, nowMs) {
    if (slot.live) return true;
    var until = slot.spawnUtc - nowMs;
    return until >= 0 && until <= SOON_MS;
  }

  function upcomingSpawnsUtc(boss, nowMs, offsetHours, limit, horizonMs) {
    if (!boss.times.length || limit <= 0) return [];
    var found = [];
    var cursor = nowMs - 1000;
    for (var i = 0; i < 48 && found.length < limit; i++) {
      var next = nextSpawnUtc(boss, cursor, offsetHours);
      if (next == null) break;
      var wait = next - nowMs;
      if (wait > horizonMs && found.length) break;
      if (wait > horizonMs && boss.weekday == null) break;
      found.push(next);
      cursor = next;
    }
    return found;
  }

  function blankCharacter() {
    return {
      name: "",
      server: "",
      className: "Warrior",
      level: "",
      power: "",
      stats: [],
      equipment: [],
      skills: [],
      training: [],
      buildings: [],
      potential: [],
      codex: [],
      spirits: []
    };
  }

  function emptyState() {
    return {
      version: 1,
      region: "asia",
      favorites: [],
      muted: [],
      leadMinutes: 0,
      remindersOn: false,
      checklistDay: localDay(),
      completed: [],
      setupDismissed: false,
      clan: {
        name: "",
        leader: "",
        level: "",
        maxMembers: "50",
        gold: "0",
        copper: "0",
        darksteel: "0",
        energy: "0"
      },
      members: [],
      memberSort: "Name (A–Z)",
      memberQuery: "",
      memberClass: "All",
      memberRole: "All",
      daily: { intro: "", sort: "Default", query: "", flags: {} },
      gold: { intro: "", sort: "Default", query: "", flags: {} },
      runs: { run1: {}, run2: {}, sortAsc: true },
      planner: { notes: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "" } },
      compare: { a: blankCharacter(), b: blankCharacter() }
    };
  }

  function normalizeState(raw) {
    var base = emptyState();
    if (!raw || typeof raw !== "object") return base;
    base.region = regionById(raw.region).id;
    base.favorites = arrayOfStrings(raw.favorites);
    base.muted = arrayOfStrings(raw.muted);
    base.leadMinutes = LEADS.indexOf(raw.leadMinutes) >= 0 ? raw.leadMinutes : 0;
    base.remindersOn = raw.remindersOn === true;
    base.checklistDay = typeof raw.checklistDay === "string" ? raw.checklistDay : localDay();
    base.completed = arrayOfStrings(raw.completed).filter(function (task) {
      return TASKS.indexOf(task) >= 0;
    });
    base.setupDismissed = raw.setupDismissed === true;
    if (raw.clan && typeof raw.clan === "object") {
      ["name", "leader", "level", "maxMembers", "gold", "copper", "darksteel", "energy"].forEach(function (key) {
        if (typeof raw.clan[key] === "string") base.clan[key] = raw.clan[key];
      });
      if (!base.clan.maxMembers) base.clan.maxMembers = "50";
    }
    if (Array.isArray(raw.members)) {
      raw.members.forEach(function (member) {
        if (!member || typeof member.name !== "string" || !member.name.trim()) return;
        base.members.push({
          id: typeof member.id === "string" && member.id ? member.id : id(),
          name: member.name.trim(),
          className: CLASSES.indexOf(member.className) >= 0 ? member.className : CLASSES[0],
          role: ROLES.indexOf(member.role) >= 0 ? member.role : "New Member",
          added: typeof member.added === "number" ? member.added : Date.now()
        });
      });
    }
    if (MEMBER_SORTS.indexOf(raw.memberSort) >= 0) base.memberSort = raw.memberSort;
    base.memberQuery = typeof raw.memberQuery === "string" ? raw.memberQuery : "";
    base.memberClass = raw.memberClass === "All" || CLASSES.indexOf(raw.memberClass) >= 0 ? raw.memberClass : "All";
    base.memberRole = raw.memberRole === "All" || ROLES.indexOf(raw.memberRole) >= 0 ? raw.memberRole : "All";
    copyBoard(base.daily, raw.daily);
    copyBoard(base.gold, raw.gold);
    if (raw.runs && typeof raw.runs === "object") {
      base.runs.sortAsc = raw.runs.sortAsc !== false;
      copyFlags(base.runs.run1, raw.runs.run1);
      copyFlags(base.runs.run2, raw.runs.run2);
    }
    if (raw.planner && raw.planner.notes && typeof raw.planner.notes === "object") {
      for (var day = 1; day <= 7; day++) {
        if (typeof raw.planner.notes[day] === "string") base.planner.notes[day] = raw.planner.notes[day];
        if (typeof raw.planner.notes[String(day)] === "string") base.planner.notes[day] = raw.planner.notes[String(day)];
      }
    }
    base.compare.a = normalizeCharacter(raw.compare && raw.compare.a);
    base.compare.b = normalizeCharacter(raw.compare && raw.compare.b);
    if (base.checklistDay !== localDay()) {
      base.checklistDay = localDay();
      base.completed = [];
    }
    return base;
  }

  function arrayOfStrings(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (item) { return typeof item === "string"; });
  }

  function copyBoard(target, source) {
    if (!source || typeof source !== "object") return;
    if (typeof source.intro === "string") target.intro = source.intro;
    if (DONATION_SORTS.some(function (item) { return item.id === source.sort; })) target.sort = source.sort;
    if (typeof source.query === "string") target.query = source.query;
    if (source.flags && typeof source.flags === "object") {
      Object.keys(source.flags).forEach(function (key) {
        if (source.flags[key] === true) target.flags[key] = true;
      });
    }
  }

  function copyFlags(target, source) {
    if (!source || typeof source !== "object") return;
    Object.keys(source).forEach(function (key) {
      if (source[key] === true) target[key] = true;
    });
  }

  function normalizeCharacter(raw) {
    var character = blankCharacter();
    if (!raw || typeof raw !== "object") return character;
    ["name", "server", "level", "power"].forEach(function (key) {
      if (typeof raw[key] === "string") character[key] = raw[key].slice(0, 80);
    });
    if (CLASSES.indexOf(raw.className) >= 0) character.className = raw.className;
    COMPARE_SECTIONS.forEach(function (section) {
      character[section.key] = pairRows(raw[section.key]);
    });
    if (Array.isArray(raw.equipment)) {
      character.equipment = raw.equipment.filter(function (row) {
        return row && typeof row.name === "string";
      }).slice(0, 40).map(function (row) {
        return {
          name: String(row.name).slice(0, 80),
          tier: String(row.tier || "").slice(0, 20),
          enhance: String(row.enhance || "").slice(0, 20)
        };
      });
    }
    if (Array.isArray(raw.spirits)) {
      character.spirits = raw.spirits.filter(function (row) {
        return row && typeof row.name === "string";
      }).slice(0, 40).map(function (row) {
        return {
          name: String(row.name).slice(0, 80),
          grade: String(row.grade || "").slice(0, 40),
          transcend: String(row.transcend || "").slice(0, 20)
        };
      });
    }
    return character;
  }

  function pairRows(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (row) {
      return row && typeof row.name === "string";
    }).slice(0, 40).map(function (row) {
      return { name: String(row.name).slice(0, 80), value: String(row.value || "").slice(0, 40) };
    });
  }

  function id() {
    return "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function duplicateName(members, name, exceptId) {
    var lower = name.trim().toLowerCase();
    return members.some(function (member) {
      return member.id !== exceptId && member.name.toLowerCase() === lower;
    });
  }

  function sortMembers(members, mode) {
    var list = members.slice();
    function roleIndex(role) {
      var index = ROLES.indexOf(role);
      return index === -1 ? 999 : index;
    }
    list.sort(function (a, b) {
      if (mode === "Name (Z–A)") return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
      if (mode === "Class (A–Z)") return a.className.toLowerCase().localeCompare(b.className.toLowerCase());
      if (mode === "Role Priority") return roleIndex(a.role) - roleIndex(b.role) || a.added - b.added;
      if (mode === "Added (Oldest First)") return a.added - b.added;
      if (mode === "Added (Newest First)") return b.added - a.added;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    return list;
  }

  function filterMembers(members, query, className, role) {
    var q = (query || "").trim().toLowerCase();
    return members.filter(function (member) {
      if (q && member.name.toLowerCase().indexOf(q) === -1) return false;
      if (className && className !== "All" && member.className !== className) return false;
      if (role && role !== "All" && member.role !== role) return false;
      return true;
    });
  }

  function donationList(members, board) {
    var list = members.map(function (member) { return member; });
    var q = (board.query || "").trim().toLowerCase();
    if (q) {
      list = list.filter(function (member) {
        return member.name.toLowerCase().indexOf(q) !== -1;
      });
    }
    list.sort(function (a, b) {
      if (board.sort === "NotDonatedFirst") {
        var ad = board.flags[a.id] === true ? 1 : 0;
        var bd = board.flags[b.id] === true ? 1 : 0;
        return ad - bd || a.added - b.added;
      }
      if (board.sort === "NameAZ") return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      if (board.sort === "NameZA") return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
      return a.added - b.added;
    });
    return list;
  }

  function donationReport(title, members, board) {
    var visible = donationList(members, board);
    var notDonated = visible.filter(function (member) { return board.flags[member.id] !== true; });
    var donatedCount = members.filter(function (member) { return board.flags[member.id] === true; }).length;
    var lines = [
      "📊 **" + title + "**",
      "━━━━━━━━━━━━━━",
      "✅ Donated: **" + donatedCount + " / " + members.length + "**",
      ""
    ];
    if (board.intro.trim()) {
      lines.push("📝 **Note**");
      lines.push(board.intro.trim());
      lines.push("");
    }
    if (!notDonated.length) {
      lines.push("🎉 **All members have donated today!**");
    } else {
      lines.push("❌ **Not Donated Yet (" + notDonated.length + ")**");
      notDonated.forEach(function (member) { lines.push("• " + member.name); });
    }
    lines.push("");
    lines.push("🐉 _Sent by **Crazy Dragon App**_");
    return lines.join("\n");
  }

  function clanResources(clan) {
    return {
      g: parseResource(clan.gold),
      c: parseResource(clan.copper),
      ds: parseResource(clan.darksteel),
      e: parseResource(clan.energy)
    };
  }

  function expeditionTotals(runs) {
    var totals = { c: 0, ds: 0, e: 0, g: 0 };
    EXPEDITION.forEach(function (boss) {
      var key = String(boss.sn);
      if (runs.run1[key] === true) {
        totals.c += boss.c;
        totals.ds += boss.ds;
        totals.e += boss.e;
      }
      if (runs.run2[key] === true) totals.g += boss.g;
    });
    return totals;
  }

  function expeditionRemain(clan, runs) {
    var have = clanResources(clan);
    var totals = expeditionTotals(runs);
    return {
      g: have.g - totals.g,
      c: have.c - totals.c,
      ds: have.ds - totals.ds,
      e: have.e - totals.e
    };
  }

  function sufficient(remain) {
    return remain.g >= 0 && remain.c >= 0 && remain.ds >= 0 && remain.e >= 0;
  }

  function expeditionShare(clanName, runs, when) {
    var totals = expeditionTotals(runs);
    var selected = [];
    var bosses = EXPEDITION.slice();
    if (runs.sortAsc === false) bosses.reverse();
    bosses.forEach(function (boss) {
      var key = String(boss.sn);
      var parts = [];
      if (runs.run1[key] === true) parts.push("1st Run");
      if (runs.run2[key] === true) parts.push("2nd Run");
      if (parts.length) selected.push(boss.name + " — " + parts.join(" & "));
    });
    var date = when || new Date();
    var ts = date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
    var lines = [
      "📜 Expedition Run Summary",
      "Clan: " + (clanName || "Unknown Clan"),
      "Date: " + ts,
      "",
      "🔥 Selected Boss Runs:"
    ];
    if (!selected.length) lines.push("No bosses selected");
    else selected.forEach(function (line) { lines.push("• " + line); });
    lines.push("");
    lines.push("💰 Total Cost");
    lines.push("Gold: " + comma(totals.g));
    lines.push("Copper: " + comma(totals.c));
    lines.push("Darksteel: " + comma(totals.ds));
    lines.push("Energy: " + comma(totals.e));
    lines.push("");
    lines.push("Sent by Crazy Dragon App");
    return lines.join("\n");
  }

  function higher(a, b) {
    if (String(a).endsWith("%") !== String(b).endsWith("%")) return false;
    var x = Number(String(a).replace(/,/g, "").replace("%", ""));
    var y = Number(String(b).replace(/,/g, "").replace("%", ""));
    return Number.isFinite(x) && Number.isFinite(y) && x > y;
  }

  function reminderTitle(boss, leadMinutes) {
    return leadMinutes === 0 ? boss.name + ": scheduled spawn" : boss.name + " in " + leadMinutes + " minutes";
  }

  function reminderBody(boss, spawnUtc) {
    return boss.location + " · " + formatLocalInstant(spawnUtc);
  }

  return {
    REGIONS: REGIONS,
    TASKS: TASKS,
    CLASSES: CLASSES,
    ROLES: ROLES,
    MEMBER_SORTS: MEMBER_SORTS,
    DONATION_SORTS: DONATION_SORTS,
    LEADS: LEADS,
    EXPEDITION: EXPEDITION,
    COMPARE_SECTIONS: COMPARE_SECTIONS,
    SOON_MS: SOON_MS,
    regionById: regionById,
    offsetLabel: offsetLabel,
    comma: comma,
    parseResource: parseResource,
    localDay: localDay,
    weekdayName: weekdayName,
    formatCountdown: formatCountdown,
    formatLocalInstant: formatLocalInstant,
    cadenceLabel: cadenceLabel,
    asiaScheduleLabel: asiaScheduleLabel,
    liveWindow: liveWindow,
    nextSpawnUtc: nextSpawnUtc,
    previousSpawnUtc: previousSpawnUtc,
    currentSlot: currentSlot,
    isSoon: isSoon,
    upcomingSpawnsUtc: upcomingSpawnsUtc,
    blankCharacter: blankCharacter,
    emptyState: emptyState,
    normalizeState: normalizeState,
    id: id,
    duplicateName: duplicateName,
    sortMembers: sortMembers,
    filterMembers: filterMembers,
    donationList: donationList,
    donationReport: donationReport,
    clanResources: clanResources,
    expeditionTotals: expeditionTotals,
    expeditionRemain: expeditionRemain,
    sufficient: sufficient,
    expeditionShare: expeditionShare,
    higher: higher,
    reminderTitle: reminderTitle,
    reminderBody: reminderBody
  };
});
