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
})();
