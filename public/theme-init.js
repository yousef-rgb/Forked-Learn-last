// Applies the saved theme before first paint (kept as an external file so the CSP can forbid inline scripts).
(function () {
  try {
    var pref = localStorage.getItem('quest.theme') || 'system';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();
