// app.js shim: forwards to ESM main
console.log('ℹ️ app.js shim loaded — forwarding to ESM /js/main.js');
(function(){
  const s = document.createElement('script');
  s.type = 'module';
  s.src = '/js/main.js';
  document.head.appendChild(s);
})();
