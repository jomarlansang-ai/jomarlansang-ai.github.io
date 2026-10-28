/* Featured download box: PumpMap PH + Crazy Dragon. Injected on pages that don't carry it statically. */
(function () {
  if (document.querySelector(".promo-box")) return;
  var box = document.createElement("aside");
  box.className = "promo-box";
  box.setAttribute("aria-label", "Get our apps");
  box.innerHTML =
    '<div class="promo-inner"><p class="promo-title">Get our apps</p>' +
    '<div class="promo-app"><span class="promo-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg></span>' +
    '<div><strong>PumpMap PH</strong><span>Gas stations &amp; fuel prices. Free, no ads.</span></div>' +
    '<a class="button" href="https://playtechcorner.com/pumpmap/get">Get PumpMap</a></div>' +
    '<div class="promo-app"><img src="/assets/crazy-dragon-icon.webp" alt="" width="52" height="52">' +
    '<div><strong>Crazy Dragon</strong><span>Unofficial MIR4 clan manager.</span></div>' +
    '<a class="button" href="https://play.google.com/store/apps/details?id=com.playtechcorner.crazydragon">Google Play</a></div></div>';
  var footer = document.querySelector(".site-footer");
  if (footer && footer.parentNode) footer.parentNode.insertBefore(box, footer);
  else (document.querySelector("main") || document.body).appendChild(box);
})();
