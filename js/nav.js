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

  function currentId() {
    return idFromHash() || "today";
  }

  function pinTop() {
    var root = document.documentElement;
    var previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  }

  function pinSoon() {
    pinTop();
    window.requestAnimationFrame(function () {
      pinTop();
      window.requestAnimationFrame(pinTop);
    });
  }

  function showCurrent(scrollTop) {
    var raw = location.hash.replace("#", "");
    if (raw === "main") return;
    document.documentElement.setAttribute("data-section", currentId());
    mark(currentId());
    if (scrollTop) pinSoon();
  }

  showCurrent(false);
  if (idFromHash()) {
    pinSoon();
    window.addEventListener("load", pinSoon);
  }

  window.addEventListener("hashchange", function () {
    var raw = location.hash.replace("#", "");
    showCurrent(raw !== "main");
  });

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      var hash = (link.getAttribute("href") || "").split("#")[1];
      if (hash && hash === location.hash.replace("#", "")) pinSoon();
    });
  });
})();
