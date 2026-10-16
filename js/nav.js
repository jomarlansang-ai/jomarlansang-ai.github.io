(function () {
  var button = document.querySelector(".nav-button");
  var nav = document.getElementById("site-nav");
  var label = button ? button.querySelector(".sr-only") : null;
  if (!button || !nav || !label) return;

  function setOpen(open) {
    button.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    label.textContent = open ? "Close menu" : "Menu";
  }

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
  });

  button.addEventListener("click", function () {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      button.focus();
    }
  });

  document.addEventListener("click", function (event) {
    if (button.getAttribute("aria-expanded") !== "true") return;
    if (button.contains(event.target) || nav.contains(event.target)) return;
    setOpen(false);
  });

  nav.addEventListener("click", function (event) {
    if (event.target.closest("a")) setOpen(false);
  });

  var sections = document.getElementById("mir4-sections");
  var toggle = document.querySelector(".nav-sections-toggle");
  if (!sections || !toggle) return;

  var sectionIds = ["today", "bosses", "tools", "clan", "planner", "notices", "settings"];

  function setSections(open) {
    sections.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    var label = toggle.querySelector(".sr-only");
    if (label) label.textContent = (open ? "Hide" : "Show") + " Mir4 Manager Tool sections";
  }

  toggle.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    setSections(!sections.classList.contains("is-open"));
  });

  if (!document.getElementById("today")) return;

  var links = sections.querySelectorAll("a");

  function mark(id) {
    links.forEach(function (link) {
      var hash = (link.getAttribute("href") || "").split("#")[1];
      if (hash === id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  function idFromHash() {
    var id = location.hash.replace("#", "");
    return sectionIds.indexOf(id) >= 0 ? id : "";
  }

  var lockToHash = false;
  var lockTimer = 0;

  function holdActive() {
    lockToHash = true;
    window.clearTimeout(lockTimer);
    lockTimer = window.setTimeout(function () { lockToHash = false; }, 700);
  }

  var hashed = idFromHash();
  mark(hashed || "today");
  if (hashed) holdActive();

  window.addEventListener("hashchange", function () {
    var id = idFromHash();
    if (!id) return;
    mark(id);
    holdActive();
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (lockToHash) return;
      var visible = entries.filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
      if (visible) mark(visible.target.id);
    }, { rootMargin: "-15% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] });
    sectionIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }
})();
