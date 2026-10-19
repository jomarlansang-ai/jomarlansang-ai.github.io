/* Shared site settings. Leave a value empty until it is ready. */
var CF_ANALYTICS_TOKEN = "";
var FEEDBACK_ENDPOINT = "";

(function () {
  var token = typeof CF_ANALYTICS_TOKEN === "string" ? CF_ANALYTICS_TOKEN.trim() : "";
  if (!token) return;
  var script = document.createElement("script");
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.defer = true;
  script.setAttribute("data-cf-beacon", JSON.stringify({ token: token }));
  document.head.appendChild(script);
})();
