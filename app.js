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

const APPS={
  recipe:{name:'The Recipe',emoji:'\u{1F4DC}',w:430,h:400,status:'serves 2, or 1 hungry hacker',build:buildRecipe}
};

function focusWin(w){
  state.z++;
  w.root.style.zIndex=state.z;
  state.windows.forEach(x=>{x.root.classList.toggle('active',x===w);});
  state.active=w;
  updateTasks();
}

function updateTasks(){
  const bar=document.getElementById('tasks');
  bar.innerHTML='';
  state.windows.forEach(w=>{
    const b=el('button','btn task',APPS[w.app].emoji+' '+APPS[w.app].name);
    b.setAttribute('aria-pressed',String(w===state.active&&!w.root.classList.contains('min')));
    b.addEventListener('click',()=>{
      if(w.root.classList.contains('min')){w.root.classList.remove('min');focusWin(w);}
      else if(state.active===w){w.root.classList.add('min');state.active=null;updateTasks();}
      else focusWin(w);
    });
    bar.appendChild(b);
  });
}

function openApp(id){
  const spec=APPS[id];
  if(!spec)return null;
  for(const w of state.windows.values()){
    if(w.app===id){w.root.classList.remove('min');focusWin(w);return w;}
  }
  state.count++;
  const root=el('div','win bevel');
  const offset=(state.count%7)*24;
  const maxW=Math.min(spec.w,window.innerWidth-30);
  const maxH=Math.min(spec.h,window.innerHeight-panelH-30);
  root.style.width=maxW+'px';
  root.style.height=maxH+'px';
  root.style.left=Math.max(8,Math.min(120+offset,window.innerWidth-maxW-8))+'px';
  root.style.top=Math.max(panelH+8,Math.min(panelH+18+offset,window.innerHeight-maxH-8))+'px';

  const bar=el('div','titlebar');
  bar.innerHTML='<span class="emoji">'+spec.emoji+'</span><span class="name">'+spec.name+'</span>';
  const bMin=el('button','btn tb','_');
  bMin.title='Minimize';
  bMin.setAttribute('aria-label','Minimize '+spec.name);
  const bMax=el('button','btn tb','▣');
  bMax.title='Maximize';
  bMax.setAttribute('aria-label','Maximize '+spec.name);
  const bCls=el('button','btn tb close','✕');
  bCls.title='Close';
  bCls.setAttribute('aria-label','Close '+spec.name);
  bar.append(bMin,bMax,bCls);

  const body=el('div','body');
  const status=el('div','statusbar','<span>'+spec.status+'</span>');
  root.append(bar,body,status);
  ['n','s','w','e','nw','ne','sw','se'].forEach(d=>{
    const h=el('div','rz '+d);
    h.dataset.dir=d;
    root.appendChild(h);
  });
  desktop.appendChild(root);

  const w={app:id,root:root,body:body,bar:bar,prev:null};
  state.windows.set(root,w);

  bCls.addEventListener('click',()=>{
    state.windows.delete(root);
    root.remove();
    if(state.active===w)state.active=null;
    updateTasks();
  });
  bMin.addEventListener('click',()=>{root.classList.add('min');state.active=null;updateTasks();});
  bMax.addEventListener('click',()=>toggleMax(w));
  bar.addEventListener('dblclick',e=>{if(e.target.closest('.tb'))return;toggleMax(w);});
  root.addEventListener('pointerdown',()=>focusWin(w),true);
  dragWin(w,bar);
  spec.build(body,w);
  focusWin(w);
  return w;
}

function toggleMax(w){
  if(w.prev){
    Object.assign(w.root.style,w.prev);
    w.prev=null;
  }else{
    w.prev={left:w.root.style.left,top:w.root.style.top,width:w.root.style.width,height:w.root.style.height};
    Object.assign(w.root.style,{left:'0px',top:panelH+'px',width:window.innerWidth+'px',height:(window.innerHeight-panelH)+'px'});
  }
}

function dragWin(w,handle){
  handle.addEventListener('pointerdown',e=>{
    if(e.target.closest('.tb'))return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.style.cursor='grabbing';
    state.dragging=w;
    const r=w.root.getBoundingClientRect();
    const dx=e.clientX-r.left,dy=e.clientY-r.top;
    const move=ev=>{
      if(w.prev){
        w.prev=null;
        w.root.style.width=Math.min(APPS[w.app].w,window.innerWidth-30)+'px';
        w.root.style.height=Math.min(APPS[w.app].h,window.innerHeight-panelH-30)+'px';
      }
      const ww=w.root.offsetWidth;
      let x=ev.clientX-dx,y=ev.clientY-dy;
      x=Math.max(-ww+70,Math.min(x,window.innerWidth-70));
      y=Math.max(panelH,Math.min(y,window.innerHeight-30));
      w.root.style.left=x+'px';
      w.root.style.top=y+'px';
    };
    const up=()=>{
      handle.releasePointerCapture(e.pointerId);
      handle.style.cursor='grab';
      handle.removeEventListener('pointermove',move);
      handle.removeEventListener('pointerup',up);
      state.dragging=null;
    };
    handle.addEventListener('pointermove',move);
    handle.addEventListener('pointerup',up);
  });
}

function buildRecipe(body){
  body.innerHTML='<div class="pad">'+
    '<h2>Sheet-Pan Nachos</h2>'+
    '<p>The only system requirement NachOS actually enforces.</p>'+
    '<h3>You need</h3>'+
    '<ul><li>1 bag tortilla chips, thick cut</li><li>200 g cheese, grated by hand</li><li>1 tin black beans, rinsed</li><li>2 jalape&ntilde;os, sliced thin</li><li>Guacamole, salsa, crema to finish</li></ul>'+
    '<h3>You do</h3>'+
    '<ol><li>Heat the oven to 200 &deg;C.</li><li>Spread chips in one shallow layer. Stacking is how you get a soggy centre.</li><li>Scatter beans and half the cheese, then repeat.</li><li>Bake 8 minutes, until the cheese pulls when you lift a chip.</li><li>Add the cold toppings after baking, never before.</li></ol>'+
    '<h3>Notes</h3>'+
    '<p>Pre-grated cheese carries anti-caking starch and melts badly. Grate your own and the whole tray improves.</p>'+
    '</div>';
}

APPS.calc={name:'Queso Calc',emoji:'\u{1F9EE}',w:280,h:340,status:'math, but cheesier',build:buildCalc};
APPS.about={name:'About NachOS',emoji:'ℹ️',w:400,h:330,status:'version 1.0',build:buildAbout};

const LAUNCHERS=['recipe','calc','about'];
const DESK=['recipe','calc'];

const menu=el('nav','bevel','<div class="rail">NachOS 1.0</div><ul id="menuList"></ul>');
menu.id='menu';
menu.setAttribute('aria-label','Main menu');
desktop.appendChild(menu);

const icons=el('div');
icons.id='icons';
icons.setAttribute('role','group');
icons.setAttribute('aria-label','Desktop');
desktop.appendChild(icons);

const startBtn=document.getElementById('startBtn');

function openMenu(){menu.classList.add('open');startBtn.setAttribute('aria-expanded','true');}
function closeMenu(){menu.classList.remove('open');startBtn.setAttribute('aria-expanded','false');}

function renderMenu(){
  const list=document.getElementById('menuList');
  list.innerHTML='';
  LAUNCHERS.forEach(id=>{
    const li=el('li');
    const b=el('button','','<span class="ico">'+APPS[id].emoji+'</span>'+APPS[id].name);
    b.addEventListener('click',()=>{closeMenu();openApp(id);});
    li.appendChild(b);
    list.appendChild(li);
  });
}

function renderIcons(){
  icons.innerHTML='';
  DESK.forEach(id=>{
    const b=el('button','dicon','<span class="ico">'+APPS[id].emoji+'</span><span>'+APPS[id].name+'</span>');
    b.addEventListener('dblclick',()=>openApp(id));
    b.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();openApp(id);}
    });
    icons.appendChild(b);
  });
}

startBtn.addEventListener('click',e=>{
  e.stopPropagation();
  menu.classList.contains('open')?closeMenu():openMenu();
});
document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==startBtn)closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

renderMenu();
renderIcons();

function buildAbout(body){
  body.innerHTML='<div class="pad">'+
    '<h2>NachOS 1.0</h2>'+
    '<p>A desktop that runs entirely in one browser tab, held together by cheese and event listeners.</p>'+
    '<dl class="kv">'+
    '<dt>Build</dt><dd>Crunchy Layer</dd>'+
    '<dt>Kernel</dt><dd>Corn, stone ground</dd>'+
    '<dt>Storage</dt><dd>One sheet pan</dd>'+
    '<dt>Shell</dt><dd>Nacho Terminal</dd>'+
    '</dl>'+
    '</div>';
}

function buildCalc(body){
  body.innerHTML='<div class="calc">'+
    '<div class="screen" id="cScreen">0</div>'+
    '<div class="tape" id="cTape"></div>'+
    '<div class="keys">'+
    '<button class="btn clr" data-k="C">C</button><button class="btn clr" data-k="&plusmn;">&plusmn;</button><button class="btn clr" data-k="%">%</button><button class="btn op" data-k="/">&divide;</button>'+
    '<button class="btn" data-k="7">7</button><button class="btn" data-k="8">8</button><button class="btn" data-k="9">9</button><button class="btn op" data-k="*">&times;</button>'+
    '<button class="btn" data-k="4">4</button><button class="btn" data-k="5">5</button><button class="btn" data-k="6">6</button><button class="btn op" data-k="-">&minus;</button>'+
    '<button class="btn" data-k="1">1</button><button class="btn" data-k="2">2</button><button class="btn" data-k="3">3</button><button class="btn op" data-k="+">+</button>'+
    '<button class="btn" data-k="0" style="grid-column:span 2">0</button><button class="btn" data-k=".">.</button><button class="btn eq" data-k="=">=</button>'+
    '</div></div>';
  const screen=body.querySelector('#cScreen');
  const tape=body.querySelector('#cTape');
  let cur='0',acc=null,op=null,fresh=true;
  const show=v=>{screen.textContent=String(v).slice(0,14);};
  const apply=(a,b,o)=>o==='+'?a+b:o==='-'?a-b:o==='*'?a*b:b===0?'QUESO ERROR':a/b;
  function press(k){
    if(k==='C'){cur='0';acc=null;op=null;fresh=true;tape.textContent='';show(cur);return;}
    if(k==='±'){cur=String(parseFloat(cur)*-1);show(cur);return;}
    if(k==='%'){cur=String(parseFloat(cur)/100);show(cur);return;}
    if('0123456789'.includes(k)){cur=fresh||cur==='0'?k:cur+k;fresh=false;show(cur);return;}
    if(k==='.'){
      if(fresh){cur='0.';fresh=false;}
      else if(!cur.includes('.'))cur+='.';
      show(cur);
      return;
    }
    const val=parseFloat(cur);
    if(k==='='){
      if(op!==null&&acc!==null){
        const r=apply(acc,val,op);
        tape.textContent=acc+' '+op+' '+val+' =';
        cur=String(r);acc=null;op=null;fresh=true;show(cur);
      }
      return;
    }
    if(op!==null&&acc!==null&&!fresh){
      const r=apply(acc,val,op);
      if(typeof r==='string'){show(r);acc=null;op=null;cur='0';fresh=true;return;}
      acc=r;cur=String(r);show(cur);
    }else acc=val;
    op=k;fresh=true;
    tape.textContent=acc+' '+k;
  }
  body.querySelectorAll('[data-k]').forEach(b=>b.addEventListener('click',()=>press(b.dataset.k)));
  body.addEventListener('keydown',e=>{
    const map={Enter:'=',Escape:'C',Backspace:'C',x:'*'};
    const k=map[e.key]||e.key;
    if(k.length===1&&'0123456789.+-*/=%C'.includes(k)){e.preventDefault();press(k);}
  });
  body.tabIndex=0;
}
