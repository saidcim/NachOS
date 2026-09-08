const desktop=document.getElementById('desktop');
const panelH=34;
const state={z:100,active:null,dragging:null,windows:new Map(),count:0};

function el(tag,cls,html){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(html!=null)n.innerHTML=html;
  return n;
}

const panel=el('div','bevel');
panel.id='panel';
panel.innerHTML='<button id="startBtn" class="btn" aria-haspopup="true" aria-expanded="false"><span class="chip">&#127790;</span>NACHOS</button>'+
  '<div id="tasks" role="group" aria-label="Open windows"></div>'+
  '<div id="tray" class="bevel-in"><span class="heat" id="heat" title="Spice level">&#127798;&#127798;&#127798;</span><span id="clock">--:--:--</span></div>';
desktop.appendChild(panel);

function clock(){
  const d=new Date();
  const p=n=>String(n).padStart(2,'0');
  document.getElementById('clock').textContent=p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
}

setInterval(clock,1000);
clock();