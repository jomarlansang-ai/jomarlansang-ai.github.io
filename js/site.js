(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".reveal").forEach(function (el) {
    if (reduce || !("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16 }
    );
    observer.observe(el);
  });

  document.querySelectorAll("[data-expand]").forEach(function (button) {
    button.addEventListener("click", function () {
      var panel = document.getElementById(button.getAttribute("aria-controls"));
      if (!panel) return;
      var open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
    });
  });

  var copy = document.querySelector("[data-copy-email]");
  if (copy) {
    copy.addEventListener("click", function () {
      var email = copy.getAttribute("data-copy-email");
      var status = document.getElementById("copy-status");
      function done(ok) {
        if (status) status.textContent = ok ? "Email copied" : "Copy the address above";
        copy.textContent = ok ? "Copied" : "Copy email";
        window.setTimeout(function () {
          copy.textContent = "Copy email";
        }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () { done(true); }, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var area = document.createElement("textarea");
        area.value = email;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        area.remove();
        done(ok);
      }
    });
  }

  var bar = document.getElementById("get-bar");
  if (bar) {
    if (window.sessionStorage.getItem("ptc-get-bar") === "hidden") {
      document.body.classList.remove("has-get-bar");
      bar.remove();
    } else {
      var dismiss = bar.querySelector("[data-dismiss-bar]");
      if (dismiss) {
        dismiss.addEventListener("click", function () {
          window.sessionStorage.setItem("ptc-get-bar", "hidden");
          document.body.classList.remove("has-get-bar");
          bar.remove();
        });
      }
    }
  }

  var root = document.querySelector("[data-carousel]");
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll("[data-slide]"));
  var dots = Array.prototype.slice.call(root.querySelectorAll("[data-dot]"));
  var status = document.getElementById("carousel-status");
  var index = 0;
  var screen = root.querySelector(".phone-screen");

  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach(function (slide, i) {
      var on = i === index;
      slide.classList.toggle("is-active", on);
      slide.setAttribute("aria-hidden", on ? "false" : "true");
    });
    dots.forEach(function (dot, i) {
      dot.setAttribute("aria-selected", i === index ? "true" : "false");
      dot.tabIndex = i === index ? 0 : -1;
    });
    if (status) status.textContent = slides[index].getAttribute("alt") || "";
  }

  root.querySelector("[data-prev]").addEventListener("click", function () { show(index - 1); });
  root.querySelector("[data-next]").addEventListener("click", function () { show(index + 1); });
  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () { show(i); });
  });
  root.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") { event.preventDefault(); show(index + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); show(index - 1); }
  });

  if (screen) {
    var dragging = false;
    var startX = 0;
    var lastX = 0;
    function begin(x) {
      dragging = true;
      startX = lastX = x;
    }
    function move(x) {
      if (!dragging) return;
      lastX = x;
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      var delta = lastX - startX;
      if (Math.abs(delta) < 40) return;
      show(delta < 0 ? index + 1 : index - 1);
    }
    screen.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      begin(event.clientX);
    });
    window.addEventListener("pointermove", function (event) { move(event.clientX); });
    window.addEventListener("pointerup", end);
    screen.addEventListener("mousedown", function (event) {
      if (event.button !== 0) return;
      begin(event.clientX);
    });
    window.addEventListener("mousemove", function (event) {
      if (!event.buttons) return;
      move(event.clientX);
    });
    window.addEventListener("mouseup", end);
  }

  show(0);
})();
