(() => {
  const audio=document.getElementById('card-audio');
  const button=document.getElementById('music-switch');
  const label=document.getElementById('music-label');
  const status=document.getElementById('music-status');
  let enabled=true;
  audio.volume=.35;
  function update() {
    const playing=!audio.paused;
    button.setAttribute('aria-pressed',String(enabled));
    button.setAttribute('aria-label',enabled?'Turn music off':'Turn music on');
    label.textContent=enabled?'Turn music off':'Turn music on';
    button.dataset.state=playing?'playing':'paused';
    document.body.classList.toggle('music-playing',playing);
  }
  async function play() {
    if(!enabled||!document.body.classList.contains('book-open'))return;
    try { await audio.play(); status.textContent='Autumn Leaves by Nat King Cole is playing.'; }
    catch { status.textContent='Tap the musical note to start the song.';enabled=false;update(); }
  }
  button.addEventListener('click',()=>{enabled=!enabled;if(enabled)play();else audio.pause();update()});
  audio.addEventListener('playing',update);
  audio.addEventListener('pause',update);
  audio.addEventListener('error',()=>{status.textContent='The song could not load. Please refresh the card.';update()});
  document.addEventListener('scrapbook-open',play);
  document.addEventListener('scrapbook-close',()=>audio.pause());
  update();
})();
