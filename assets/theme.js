// theme.js — loaded in <head> before the CSS so the page never flashes the wrong theme.
// The reader's choice (the toggle in the nav, saved in this browser) wins; otherwise the system setting.
(function () {
  var t = null;
  try { t = localStorage.getItem('theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();
