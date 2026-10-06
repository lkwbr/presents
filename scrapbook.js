import * as THREE from './vendor/three.module.js';

const $ = id => document.getElementById(id);
const surface = $('book-scene'), canvas = $('book-canvas'), hotspots = $('photo-hotspots');
const previous = $('previous-page'), next = $('next-page'), dialog = $('photo-dialog');
const mobileQuery = matchMedia('(max-width:700px)'), reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
const P = 4.2, H = 5.8, TW = 1024, TH = 1414;
let seed = 1962;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const photos = [...window.cardPhotos];
for (let i = photos.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [photos[i], photos[j]] = [photos[j], photos[i]]; }
const closingPhotos=[3,35].map(index=>photos.find(p=>p.index===index)).filter(Boolean);
for(const photo of closingPhotos)photos.splice(photos.indexOf(photo),1);
photos.push(...closingPhotos);
const groups = Array.from({length:Math.ceil(photos.length/4)}, (_, i) => photos.slice(i * 4, i * 4 + 4));
const captions = ['Everybody wishes they had our mom.', 'We’re the three lucky ones who do.', 'The best stories have you in them.', 'Always the coolest mom on the block.', 'Here’s to more adventures.', 'More great books.', 'More weeks to get knocked back into', 'More me-mes to share.', 'And more time together.', 'There’s nobody quite like you.', 'Our favorite person to make memories with.', 'We love you, Mom.'];
const faces = groups.map((p,i) => ({kind:'photos',photos:p,boxes:[],number:i+1,caption:captions[i]||'We love you, Mom.',final:i===groups.length-1}));
const readingOrder=faces.map((face,i)=>face.kind!=='blank'?i:-1).filter(i=>i>=0);
const lastSpread=faces.length/2-1,lastFace=readingOrder.length;
let renderer, scene, camera, book, leftPage, rightPage, coverPage, turningFront, turningBack, turningGroup;
let ambientLight,keyLight,fillLight,spotLight,groundMesh,presentation=0;
let spread = -1, mobileFace = 0, busy = false, initialized = false, fallback = false, galleryIndex = 0, lastPhoto = null;
let animation = null, frame = 0, cameraX = P / 2, cameraSpan = 7, pointerStart = null, suppressClick = false;
const raycaster = new THREE.Raycaster();

function paper() {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#f5ecd5'; ctx.fillRect(0,0,TW,TH);
  const data = ctx.getImageData(0,0,TW,TH);
  for (let i=0;i<data.data.length;i+=4) { const v=(random()-.5)*10; data.data[i]+=v; data.data[i+1]+=v; data.data[i+2]+=v; }
  ctx.putImageData(data,0,0);
  for(let i=0;i<190;i++) { ctx.strokeStyle='rgba(114,95,66,.07)';ctx.lineWidth=.7;ctx.beginPath();const x=random()*TW,y=random()*TH;ctx.moveTo(x,y);ctx.lineTo(x+random()*25,y+random()*3);ctx.stroke(); }
  const edge=ctx.createLinearGradient(0,0,42,0);edge.addColorStop(0,'rgba(120,88,42,.13)');edge.addColorStop(1,'transparent');ctx.fillStyle=edge;ctx.fillRect(0,0,42,TH);
  return c;
}

async function imageBitmap(photo) {
  const response=await fetch(photo.thumb); if(!response.ok) throw new Error('A family photo could not be loaded.');
  return createImageBitmap(await response.blob());
}

function polaroid(ctx, img, box) {
  const w=box.w, border=16, imageW=w-border*2;
  const imageH=Math.min(imageW*.98,imageW*img.height/img.width), height=imageH+border+64;
  box.h=height;
  ctx.save();ctx.translate(box.x,box.y);ctx.rotate(box.angle);
  ctx.shadowColor='rgba(34,26,17,.28)';ctx.shadowBlur=15;ctx.shadowOffsetX=4;ctx.shadowOffsetY=9;
  ctx.fillStyle='#fffcf3';ctx.fillRect(-w/2,-height/2,w,height);ctx.shadowColor='transparent';
  const top=-height/2+border;ctx.fillStyle='#eeeae2';ctx.fillRect(-imageW/2,top,imageW,imageH);
  const scale=Math.min(imageW/img.width,imageH/img.height),dw=img.width*scale,dh=img.height*scale;
  ctx.drawImage(img,-dw/2,top+(imageH-dh)/2,dw,dh);
  if(box.photo?.caption){
    ctx.font='23px "Permanent Marker"';ctx.fillStyle='#000';ctx.textAlign='center';ctx.textBaseline='middle';const lines=[];let line='';
    for(const word of box.photo.caption.split(' ')){const candidate=line?`${line} ${word}`:word;if(line&&ctx.measureText(candidate).width>imageW*.98){lines.push(line);line=word}else line=candidate;}if(line)lines.push(line);
    lines.forEach((text,i)=>ctx.fillText(text,0,top+imageH+32+(i-(lines.length-1)/2)*23));
  }
  ctx.strokeStyle='rgba(66,47,25,.09)';ctx.lineWidth=1;ctx.strokeRect(-w/2,-height/2,w,height);
  ctx.save();ctx.translate(w*.16,-height/2+3);ctx.rotate(-.05);ctx.fillStyle='rgba(221,196,139,.43)';ctx.fillRect(-w*.13,-12,w*.26,28);ctx.restore();
  ctx.restore();
}

async function photoFace(face) {
  const c=paper(),ctx=c.getContext('2d');
  const positions=face.photos.length===2 ? [[.33,.23],[.67,.79]] : face.photos.length===3 ? [[.26,.23],[.73,.24],[.49,.79]] : [[.26,.22],[.74,.23],[.26,.79],[.72,.78]];
  for(let i=0;i<face.photos.length;i++) {
    const p=face.photos[i],img=await imageBitmap(p),pos=positions[i];
    const box={x:TW*pos[0]+(random()-.5)*28,y:TH*pos[1]+(random()-.5)*40,w:TW*(.415+(random()-.5)*.028),angle:(random()-.5)*.25,photo:p};
    polaroid(ctx,img,box);img.close();face.boxes.push(box);
  }
  if(face.final){
    lettering(ctx,'Happy 64th birthday, Mom!',575,48,-.018);
    lettering(ctx,'We’re the lucky three.',643,51,.012);
    lettering(ctx,'We love you.',710,56,-.012);
    lettering(ctx,'All our love,',773,38,.016);
    for(const [name,x,angle] of [['Luke',TW*.25,-.06],['Logan',TW*.50,.025],['Ben',TW*.76,-.025]]){ctx.save();ctx.translate(x,840);ctx.rotate(angle);ctx.font='64px "Permanent Marker"';ctx.fillStyle='#000';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,0,0);ctx.restore();}
  }else{
    ctx.font='56px "Permanent Marker"';const lines=[];let line='';
    for(const word of face.caption.split(' ')){const candidate=line?`${line} ${word}`:word;if(line&&ctx.measureText(candidate).width>TW*.83){lines.push(line);line=word}else line=candidate;}
    if(line)lines.push(line);
    const angle=(random()-.5)*.025;
    lines.forEach((text,i)=>lettering(ctx,text,TH*.50+(i-(lines.length-1)/2)*76,56,angle));
  }
  return c;
}

function lettering(ctx,text,y,size=64,angle=0) {
  ctx.save();ctx.translate(TW/2,y);ctx.rotate(angle);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${size}px "Permanent Marker"`;ctx.fillStyle='#000';ctx.fillText(text,0,0);ctx.restore();
}

async function coverFace() {
  const c=document.createElement('canvas');c.width=TW;c.height=TH;const ctx=c.getContext('2d');
  const img=await imageBitmap({thumb:'mom-renaissance.jpg'});
  const scale=Math.max(TW/img.width,TH/img.height),w=img.width*scale,h=img.height*scale;
  ctx.drawImage(img,(TW-w)/2,(TH-h)/2,w,h);img.close();
  const shade=ctx.createLinearGradient(0,0,0,TH);shade.addColorStop(0,'rgba(21,12,7,.10)');shade.addColorStop(.22,'rgba(21,12,7,.04)');shade.addColorStop(.68,'rgba(21,12,7,.02)');shade.addColorStop(1,'rgba(21,12,7,.9)');ctx.fillStyle=shade;ctx.fillRect(0,0,TW,TH);
  const gold=ctx.createLinearGradient(0,0,TW,TH);gold.addColorStop(0,'#efd4a0');gold.addColorStop(.35,'#af813b');gold.addColorStop(.62,'#f3daa0');gold.addColorStop(1,'#b78b48');
  ctx.strokeStyle=gold;ctx.lineWidth=5;ctx.strokeRect(25,25,TW-50,TH-50);ctx.lineWidth=1.5;ctx.strokeRect(38,38,TW-76,TH-76);
  const antique=(text,y,size,family='Cormorant Garamond',weight=400,spacing=0)=>{ctx.save();ctx.font=`${weight} ${size}px "${family}"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ecd39a';ctx.shadowColor='#160d05';ctx.shadowBlur=3;ctx.shadowOffsetY=2;if(spacing){ctx.textAlign='left';let x=(TW-[...text].reduce((sum,char)=>sum+ctx.measureText(char).width,0)-spacing*(text.length-1))/2;for(const char of text){ctx.fillText(char,x,y);x+=ctx.measureText(char).width+spacing}}else ctx.fillText(text,TW/2,y);ctx.restore()};
  antique('THE 64TH BIRTHDAY OF',1035,35,'Cormorant Garamond',600,3.5);
  antique('DEANNE ELAINE',1113,76,'Cormorant Garamond',600,3.5);
  antique('WEBER',1202,86,'Cormorant Garamond',600,6);
  for(const [x,y,angle] of [[71,72,-Math.PI/4],[TW-71,72,Math.PI/4],[71,TH-72,-Math.PI*3/4],[TW-71,TH-72,Math.PI*3/4]]){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#dbc18a';ctx.font='55px "Cormorant Garamond"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('❦',0,0);ctx.restore()}
  antique('Created by Luke, Logan, and Ben',1320,35,'Cormorant Garamond');
  return c;
}

function texture(c) { const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t; }
function material(map,side=THREE.FrontSide) { return new THREE.MeshStandardMaterial({map,side,roughness:.96,metalness:0}); }
function pageMesh(map,x) { const m=new THREE.Mesh(new THREE.PlaneGeometry(P,H,1,1),material(map));m.position.set(x,0,.05);m.castShadow=true;m.receiveShadow=true;book.add(m);return m; }

function setupThree() {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.1,100);
  ambientLight=new THREE.AmbientLight(0xfff7e8,1.7);scene.add(ambientLight);
  keyLight=new THREE.DirectionalLight(0xfff5db,2.6);keyLight.position.set(-5,7,10);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.camera.left=-9;keyLight.shadow.camera.right=9;keyLight.shadow.camera.top=7;keyLight.shadow.camera.bottom=-7;keyLight.shadow.bias=-.0005;keyLight.shadow.normalBias=.016;scene.add(keyLight);
  fillLight=new THREE.DirectionalLight(0xdbe6ff,.7);fillLight.position.set(5,-2,5);scene.add(fillLight);
  spotLight=new THREE.SpotLight(0xfff1d8,0,40,Math.PI/3,.7,2);spotLight.position.set(0,3,9);scene.add(spotLight,spotLight.target);
  groundMesh=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.28}));groundMesh.position.z=-.28;groundMesh.receiveShadow=true;scene.add(groundMesh);
  book=new THREE.Group();book.rotation.set(-.095,-.1,-.014);scene.add(book);
  const boardMat=new THREE.MeshStandardMaterial({color:0xd5b667,roughness:1});
  for(const side of [-1,1]) {const m=new THREE.Mesh(new THREE.BoxGeometry(P+.12,H+.15,.09),boardMat);m.position.set(side*P/2,0,-.17);m.castShadow=true;m.receiveShadow=true;m.userData.left=side===-1;m.userData.board=true;book.add(m);
    for(let i=0;i<8;i++){const edge=new THREE.Mesh(new THREE.BoxGeometry(P-.035,H-.025,.01),new THREE.MeshStandardMaterial({color:i%2?0xede1c6:0xf8efdb,roughness:1}));edge.position.set(side*P/2,0,-.105+i*.014);edge.rotation.z=(i%3-1)*.0009;edge.userData.left=side===-1;edge.userData.edge=true;book.add(edge);}
  }
  const spine=new THREE.Mesh(new THREE.CylinderGeometry(.068,.068,H+.1,12),boardMat);spine.position.z=-.135;spine.castShadow=true;book.add(spine);
}

function liftBook(t) {
  presentation=t;book.position.z=t*.60;
  book.rotation.set(-.095+t*.045,-.1+t*.07,-.014+t*.014);
  ambientLight.intensity=1.7-t*.75;keyLight.intensity=2.6-t*.45;fillLight.intensity=.7-t*.45;spotLight.intensity=t*95;
  groundMesh.material.opacity=.28*(1-t*.72);book.updateWorldMatrix(true,true);
}

function makeTurningPages(coverTexture) {
  turningGroup=new THREE.Group();turningGroup.position.z=.09;turningGroup.visible=false;book.add(turningGroup);
  const g=new THREE.PlaneGeometry(P,H,42,10);g.translate(P/2,0,0);
  turningFront=new THREE.Mesh(g,material(coverTexture));turningFront.castShadow=true;turningFront.receiveShadow=true;turningGroup.add(turningFront);
  const bg=g.clone(),uv=bg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
  turningBack=new THREE.Mesh(bg,material(faces[0].texture,THREE.BackSide));turningBack.position.z=-.005;turningBack.castShadow=true;turningBack.receiveShadow=true;turningGroup.add(turningBack);
}

function bend(progress) {
  const curl=Math.sin(Math.PI*progress)*.68;
  for(const mesh of [turningFront,turningBack]){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i);a.setZ(i,Math.sin(Math.PI*x/P)*curl+(x/P)**3*curl*.22);}a.needsUpdate=true;mesh.geometry.computeVertexNormals();}
  turningGroup.rotation.y=-Math.PI*progress;
}

function faceIndex() {return readingOrder[mobileFace-1];}
function currentSide() {return mobileFace>0 && faceIndex()%2===0?'left':'right';}
function targetCamera() {
  const r=surface.getBoundingClientRect(),aspect=r.width/r.height;
  const open=spread>=0,wantedWidth=mobileQuery.matches||!open?P*1.16:P*2.3;
  return {x:!open?P/2:mobileQuery.matches?(currentSide()==='left'?-P/2:P/2):0,span:Math.max(H*1.16,wantedWidth/aspect)};
}

function adjustCamera(x,span) {
  const r=surface.getBoundingClientRect(),center=book.localToWorld(new THREE.Vector3(x,0,.05));camera.aspect=r.width/r.height;camera.position.set(center.x,center.y+.15,.05+span/(2*Math.tan(THREE.MathUtils.degToRad(37/2))));camera.lookAt(center);camera.updateProjectionMatrix();
}

function visibleFaces() {
  if(spread<0)return [];
  return (mobileQuery.matches?[{face:faces[faceIndex()],side:currentSide()}]:[{face:faces[spread*2],side:'left'},{face:faces[spread*2+1],side:'right'}]).filter(({face})=>face.kind!=='blank');
}

function updateHotspots() {
  hotspots.replaceChildren(); if(busy||fallback||spread<0)return;
  book.updateWorldMatrix(true,true);const r=surface.getBoundingClientRect();
  for(const {face,side} of visibleFaces())for(const box of face.boxes){
    const x=side==='left'?-P+(box.x/TW)*P:(box.x/TW)*P,y=H/2-(box.y/TH)*H;
    const center=new THREE.Vector3(x,y,.06);book.localToWorld(center);center.project(camera);
    const edge=new THREE.Vector3(x+box.w/TW*P/2,y+box.h/TH*H/2,.06);book.localToWorld(edge);edge.project(camera);
    const b=document.createElement('button');b.className='photo-hotspot';b.type='button';b.dataset.photo=String(box.photo.index);b.setAttribute('aria-label',`View photo: ${box.photo.alt}${box.photo.caption?`. Caption: ${box.photo.caption}`:''}`);b.style.left=`${(center.x*.5+.5)*r.width}px`;b.style.top=`${(-center.y*.5+.5)*r.height}px`;b.style.width=`${Math.max(24,Math.abs(edge.x-center.x)*r.width*.82)}px`;b.style.height=`${Math.max(24,Math.abs(edge.y-center.y)*r.height*.82)}px`;b.addEventListener('click',()=>openPhoto(box.photo,b));hotspots.append(b);
  }
}

function positionControls() {
  const host=$('ink-controls');host.hidden=!initialized;host.classList.toggle('turning',busy);
  if(!initialized)return;
  const closed=spread<0;
  if(fallback){
    const r=$('flat-album').getBoundingClientRect(),s=surface.getBoundingClientRect();
    for(const [button,x] of [[previous,r.left-s.left+22],[next,closed?r.left-s.left+r.width/2:r.right-s.left-22]]){button.style.left=`${x}px`;button.style.top=`${r.top-s.top+r.height/2}px`;button.style.width=closed&&button===next?`${r.width}px`:'44px';button.style.height=`${r.height}px`;}
    return;
  }
  book.updateWorldMatrix(true,true);const r=surface.getBoundingClientRect();
  const left=closed?0:mobileQuery.matches?(currentSide()==='left'?-P:0):-P;
  const right=closed?P:mobileQuery.matches?(currentSide()==='left'?0:P):P;
  const outerTop=new THREE.Vector3(right,H/2,.16),outerBottom=new THREE.Vector3(right,-H/2,.16);book.localToWorld(outerTop);outerTop.project(camera);book.localToWorld(outerBottom);outerBottom.project(camera);
  const pageHeight=Math.abs(outerTop.y-outerBottom.y)*r.height/2;
  const start=new THREE.Vector3(left,0,.16),end=new THREE.Vector3(right,0,.16);book.localToWorld(start);start.project(camera);book.localToWorld(end);end.project(camera);
  const width=Math.abs(end.x-start.x)*r.width/2;
  for(const [button,x] of [[previous,left+.14],[next,closed?P/2:right-.14]]){
    const point=new THREE.Vector3(x,0,.16);book.localToWorld(point);point.project(camera);
    button.style.left=`${(point.x*.5+.5)*r.width}px`;button.style.top=`${(-point.y*.5+.5)*r.height}px`;
    button.style.width=closed&&button===next?`${width*.97}px`:`${Math.max(36,pageHeight*.065)}px`;button.style.height=`${pageHeight*.96}px`;
  }
}

function controls() {
  previous.disabled=busy||!initialized||(mobileQuery.matches?mobileFace===0:spread<0);
  next.disabled=busy||!initialized||(mobileQuery.matches?mobileFace>=lastFace:spread>=lastSpread);
  previous.hidden=spread<0;next.hidden=mobileQuery.matches?mobileFace>=lastFace:spread>=lastSpread;
  next.setAttribute('aria-label',spread<0?'Open birthday card':'Next page');
  $('page-count').textContent=spread<0?'Cover':mobileQuery.matches?(faces[faceIndex()].kind==='note'?'Birthday note':`${faces[faceIndex()].number} / ${groups.length}`):`${spread+1} / ${lastSpread+1}`;
  const descriptions=visibleFaces().map(({face})=>`Photo page ${face.number} of ${groups.length}. ${face.final?$('birthday-note').textContent:face.caption} ${face.photos.map(p=>`${p.alt}${p.caption?`. Caption: ${p.caption}`:''}`).join('; ')}.`);
  $('page-description').textContent=descriptions.join(' ');
  surface.dataset.spread=String(spread);surface.dataset.face=String(mobileFace);surface.dataset.busy=String(busy);
  canvas.setAttribute('aria-label',spread<0?'The 64th Birthday of Deanne Elaine Weber. Created by Luke, Logan, and Ben. Tap the cover to open; tap page edges or swipe to turn pages.':`Open birthday scrapbook. ${descriptions.join(' ')} Tap page edges or swipe to turn pages.`);
  canvas.style.cursor=spread<0?'pointer':'default';
  document.body.classList.toggle('book-open',spread>=0);positionControls();
}

function staticPages() {
  if(fallback)return;
  const open=spread>=0;leftPage.visible=open;rightPage.visible=open;coverPage.visible=!open;
  for(const m of book.children)if(m.userData.board||m.userData.edge)m.visible=!m.userData.left||open;
  if(open){leftPage.material.map=faces[spread*2].texture;rightPage.material.map=faces[spread*2+1].texture;}
}

function draw() { if(!fallback){adjustCamera(cameraX,cameraSpan);renderer.render(scene,camera);positionControls();} }

function transition(targetSpread,targetFace) {
  if(busy||!initialized)return;
  const oldSpread=spread,oldCameraX=cameraX,oldSpan=cameraSpan,oldPresentation=presentation;
  if(fallback){spread=targetSpread;mobileFace=targetFace;renderFlat();controls();if(oldSpread<0&&spread>=0)document.dispatchEvent(new Event('scrapbook-open'));if(oldSpread>=0&&spread<0)document.dispatchEvent(new Event('scrapbook-close'));return;}
  const changingLeaf=oldSpread!==targetSpread;
  if(changingLeaf){
    if(oldSpread<0){turningFront.material.map=coverPage.material.map;turningBack.material.map=faces[0].texture;leftPage.material.map=faces[0].texture;rightPage.material.map=faces[1].texture;}
    else if(targetSpread<0){turningFront.material.map=coverPage.material.map;turningBack.material.map=faces[oldSpread*2].texture;}
    else if(targetSpread>oldSpread){turningFront.material.map=faces[oldSpread*2+1].texture;turningBack.material.map=faces[targetSpread*2].texture;rightPage.material.map=faces[targetSpread*2+1].texture;}
    else{turningFront.material.map=faces[targetSpread*2+1].texture;turningBack.material.map=faces[oldSpread*2].texture;leftPage.material.map=faces[targetSpread*2].texture;}
    coverPage.visible=false;leftPage.visible=oldSpread>=0&&targetSpread>=0;rightPage.visible=true;
    for(const m of book.children)if(m.userData.left)m.visible=oldSpread>=0&&targetSpread>=0;
    turningGroup.visible=true;
  }
  spread=targetSpread;mobileFace=targetFace;const destination=targetCamera();
  busy=true;controls();hotspots.replaceChildren();
  if(oldSpread<0&&spread>=0)document.dispatchEvent(new Event('scrapbook-open'));
  if(oldSpread>=0&&spread<0)document.dispatchEvent(new Event('scrapbook-close'));
  const forward=targetSpread>oldSpread;
  const duration=reducedMotion.matches?0:changingLeaf?950:450;
  const start=performance.now();
  function tick(now){
    const raw=duration?Math.min((now-start)/duration,1):1,e=raw*raw*(3-2*raw);
    liftBook(oldPresentation+((targetSpread>=0?1:0)-oldPresentation)*e);
    cameraX=oldCameraX+(destination.x-oldCameraX)*e;cameraSpan=oldSpan+(destination.span-oldSpan)*e;
    if(changingLeaf)bend(forward?e:1-e);draw();
    if(raw<1)animation=requestAnimationFrame(tick);else{animation=null;turningGroup.visible=false;busy=false;staticPages();controls();draw();updateHotspots();}
  }
  animation=requestAnimationFrame(tick);
}

function go(direction) {
  if(busy||!initialized)return;
  if(mobileQuery.matches){const f=Math.max(0,Math.min(lastFace,mobileFace+direction));if(f===mobileFace)return;transition(f===0?-1:Math.floor(readingOrder[f-1]/2),f);}
  else{const s=Math.max(-1,Math.min(lastSpread,spread+direction));if(s===spread)return;const index=s<0?-1:Math.min(s*2+1,faces.length-1);transition(s,s<0?0:readingOrder.indexOf(index)+1);}
}
previous.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));
document.addEventListener('keydown',event=>{if(dialog.open||event.target.closest('a,input,textarea,select'))return;if(event.key==='ArrowRight'){event.preventDefault();go(1)}if(event.key==='ArrowLeft'){event.preventDefault();go(-1)}});

function showPhoto(i) {galleryIndex=(i+photos.length)%photos.length;const p=photos[galleryIndex];$('full-photo').src=p.src;$('full-photo').alt=p.alt;$('photo-count').textContent=`${galleryIndex+1} / ${photos.length}`;$('full-photo-caption').textContent=p.caption||'';$('full-photo-caption').hidden=!p.caption;}
function openPhoto(photo,button) {lastPhoto=button;showPhoto(photos.findIndex(p=>p.index===photo.index));dialog.showModal();$('close-photo').focus();}
$('previous-photo').addEventListener('click',()=>showPhoto(galleryIndex-1));$('next-photo').addEventListener('click',()=>showPhoto(galleryIndex+1));$('close-photo').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{if(lastPhoto?.isConnected)lastPhoto.focus();else next.focus()});
dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();showPhoto(galleryIndex+1)}if(event.key==='ArrowLeft'){event.preventDefault();showPhoto(galleryIndex-1)}});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});

surface.addEventListener('pointerdown',event=>{suppressClick=false;pointerStart={x:event.clientX,y:event.clientY};});
surface.addEventListener('pointerup',event=>{if(!pointerStart)return;const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;pointerStart=null;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)){suppressClick=true;go(dx<0?1:-1)}else if(spread<0&&Math.abs(dx)<8&&Math.abs(dy)<8&&!event.target.closest('.page-turn'))go(1);});
surface.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false}},true);
surface.addEventListener('pointercancel',()=>{pointerStart=null});
let wheelTotal=0,lastWheelTime=0,lastWheelTurn=-Infinity;
surface.addEventListener('wheel',event=>{if(spread<0||fallback)return;event.preventDefault();const now=performance.now();if(now-lastWheelTime>180)wheelTotal=0;lastWheelTime=now;if(busy||now-lastWheelTurn<1200)return;const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;wheelTotal+=delta*(event.deltaMode===1?16:1);if(Math.abs(wheelTotal)>=90){go(wheelTotal>0?1:-1);wheelTotal=0;lastWheelTurn=now}},{passive:false});

function renderFlat() {
  const host=$('flat-album');host.hidden=false;host.classList.toggle('cover',spread<0);host.replaceChildren();
  if(spread<0){const h=document.createElement('h1');h.textContent='The 64th Birthday of Deanne Elaine Weber';const p=document.createElement('p');p.className='cover-signature';p.textContent='Created by Luke, Logan, and Ben';host.append(h,p);return;}
  for(const {face} of visibleFaces()){
    const section=document.createElement('section');section.className='flat-face';const group=document.createElement('div');group.className='flat-photos';for(const photo of face.photos){const b=document.createElement('button');b.className='flat-photo';b.dataset.photo=String(photo.index);b.setAttribute('aria-label',photo.alt);const img=document.createElement('img');img.src=photo.thumb;img.alt=photo.alt;b.append(img);if(photo.caption){const label=document.createElement('span');label.className='flat-photo-caption';label.textContent=photo.caption;b.append(label);}b.addEventListener('click',()=>openPhoto(photo,b));group.append(b);}const caption=document.createElement('p');caption.textContent=face.final?$('birthday-note').textContent:face.caption;section.append(group,caption);host.append(section);
  }
}

function resize() {
  if(!initialized)return;
  if(mobileQuery.matches&&spread>=0&&mobileFace===0)mobileFace=readingOrder.indexOf(spread*2+1)+1;
  if(!fallback){const r=surface.getBoundingClientRect();renderer.setSize(r.width,r.height,false);const target=targetCamera();cameraX=target.x;cameraSpan=target.span;draw();updateHotspots();}else renderFlat();controls();
}
new ResizeObserver(resize).observe(surface);mobileQuery.addEventListener('change',resize);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback=true;cancelAnimationFrame(animation);busy=false;canvas.hidden=true;hotspots.replaceChildren();renderFlat();controls();});

async function initialize() {
  await Promise.all([document.fonts.load('64px "Permanent Marker"'), document.fonts.load('34px Kalam'),document.fonts.load('58px "Cinzel Decorative"'),document.fonts.load('43px "Cormorant Garamond"'),document.fonts.load('600 43px "Cormorant Garamond"')]);
  await document.fonts.ready;
  const pageCanvases=await Promise.all(faces.map(photoFace));
  const coverCanvas=await coverFace();
  try{
    setupThree();faces.forEach((face,i)=>{face.texture=texture(pageCanvases[i])});
    const ct=texture(coverCanvas);leftPage=pageMesh(faces[0].texture,-P/2);rightPage=pageMesh(faces[1].texture,P/2);coverPage=pageMesh(ct,P/2);coverPage.position.z=.13;makeTurningPages(ct);staticPages();
  }catch(error){fallback=true;canvas.hidden=true;}
  initialized=true;surface.dataset.ready='true';surface.dataset.photoCount=String(photos.length);surface.dataset.photoPages=String(groups.length);surface.dataset.renderer=fallback?'flat':'three';$('book-loading').hidden=true;
  if(fallback)renderFlat();resize();controls();
}
initialize().catch(()=>{$('book-loading').textContent='A photo couldn’t load. Please refresh the card.';});
