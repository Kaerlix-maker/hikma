/*! Hikma chat widget — <script src="https://YOUR-HIKMA/widget.js" data-assistant="ID" async></script> */
(function () {
  var s = document.currentScript;
  if (!s || window.__hikma) return;
  window.__hikma = true;
  var id = s.getAttribute("data-assistant");
  var color = s.getAttribute("data-color") || "#4f8cff";
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return console.warn("Hikma: missing or invalid data-assistant");
  var origin = new URL(s.src).origin;

  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
  btn.style.cssText = "position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;z-index:2147483646;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.25);transition:transform .2s;background:" + color;
  btn.onmouseenter = function () { btn.style.transform = "scale(1.06)"; };
  btn.onmouseleave = function () { btn.style.transform = ""; };

  var frame;
  function open() {
    if (!frame) {
      frame = document.createElement("iframe");
      frame.src = origin + "/chat/" + id + "?embed=1";
      frame.title = "Chat";
      frame.allow = "clipboard-write";
      frame.style.cssText = "position:fixed;right:20px;bottom:90px;width:min(380px,calc(100vw - 40px));height:min(600px,calc(100vh - 120px));border:0;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.25);z-index:2147483647;background:#fff";
      document.body.appendChild(frame);
    }
    frame.style.display = "block";
  }
  function close() { if (frame) frame.style.display = "none"; }
  btn.onclick = function () { frame && frame.style.display !== "none" ? close() : open(); };
  window.addEventListener("message", function (e) {
    if (e.origin === origin && e.data && e.data.hikma === "close") close();
  });
  document.body.appendChild(btn);
})();
