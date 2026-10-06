(() => {
  const audio=document.getElementById('card-audio');
  const button=document.getElementById('music-switch');
  const label=document.getElementById('music-label');
  const status=document.getElementById('music-status');
  let enabled=true, blocked=false;
  audio.volume=.35;
  function update() {
    const playing=!audio.paused&&enabled&&document.body.classList.contains('book-open');
    const action=blocked&&enabled?'Play music':enabled?'Turn music off':'Turn music on';
    button.setAttribute('aria-pressed',String(enabled));
    button.setAttribute('aria-label',action);
    label.textContent=action;
    button.dataset.state=playing?'playing':blocked?'blocked':'paused';
    document.body.classList.toggle('music-playing',playing);
  }
  async function play() {
    if(!enabled||!document.body.classList.contains('book-open')||!audio.paused)return;
    try {
      await audio.play();
      if(!enabled||!document.body.classList.contains('book-open')){audio.pause();return;}
      blocked=false;status.textContent='Autumn Leaves by Nat King Cole is playing.';update();
    }
    catch(error) {
      if(!enabled||!document.body.classList.contains('book-open'))return;
      if(error.name==='AbortError')return;
      blocked=true;status.textContent='Tap the musical note to start the song.';update();
    }
  }
  button.addEventListener('click',()=>{enabled=blocked?true:!enabled;blocked=false;if(enabled)play();else audio.pause();update()});
  audio.addEventListener('playing',update);
  audio.addEventListener('pause',update);
  audio.addEventListener('error',()=>{status.textContent='The song could not load. Please refresh the card.';update()});
  document.addEventListener('scrapbook-open',update);
  document.addEventListener('scrapbook-close',()=>{blocked=false;audio.pause();update()});
  // Start directly in a native gesture, after the book's document handlers open it.
  // Safari may reject playback started by the custom open event or pointerup.
  const playFromBookGesture=event=>{if(event.target.closest?.('#book-scene'))play()};
  window.addEventListener('click',playFromBookGesture);
  window.addEventListener('touchend',playFromBookGesture,{passive:true});
  window.addEventListener('keydown',event=>{if(['ArrowRight','Enter',' '].includes(event.key))play()});
  update();
})();
