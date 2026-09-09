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

APPS.terminal={name:'Nacho Terminal',emoji:'\u{1F5A5}️',w:520,h:330,status:'type help for the menu',build:buildTerminal};
APPS.paint={name:'Tortilla Paint',emoji:'\u{1F3A8}',w:600,h:430,status:'one tortilla, endless toppings',build:buildPaint};

LAUNCHERS.unshift('terminal','paint');
DESK.unshift('terminal','paint');
renderMenu();
renderIcons();

const INGREDIENTS=[
  {id:'guac',name:'Guacamole',color:'#5C8A32',spread:1.25},
  {id:'salsa',name:'Salsa',color:'#C0392B',spread:1.0},
  {id:'tomato',name:'Tomato',color:'#E14B3B',spread:.7},
  {id:'queso',name:'Queso',color:'#F0B429',spread:1.4},
  {id:'crema',name:'Crema',color:'#FBF6E6',spread:.9},
  {id:'jalapeno',name:'Jalapeño',color:'#6FA83C',spread:.6},
  {id:'beans',name:'Black beans',color:'#3B2B22',spread:.6},
  {id:'olive',name:'Olives',color:'#4A4438',spread:.5}
];

function buildPaint(body){
  body.innerHTML='<div class="paint">'+
    '<div class="tray">'+
    '<div class="lab">TOPPINGS</div><div id="pIng"></div>'+
    '<div class="lab">SPOON SIZE</div><input id="pSize" type="range" min="6" max="34" value="16" aria-label="Spoon size">'+
    '<div class="lab">ACTIONS</div>'+
    '<button class="btn" id="pServe">Serve it</button>'+
    '<button class="btn" id="pClear">New tortilla</button>'+
    '<div class="verdict" id="pVerdict"></div>'+
    '</div>'+
    '<div class="stage"><canvas id="pCanvas" width="360" height="360" aria-label="Tortilla canvas"></canvas></div>'+
    '</div>';
  const cvs=body.querySelector('#pCanvas');
  const ctx=cvs.getContext('2d',{willReadFrequently:true});
  const size=body.querySelector('#pSize');
  const verdict=body.querySelector('#pVerdict');
  const list=body.querySelector('#pIng');
  let active=INGREDIENTS[0];
  const R=168,CX=180,CY=180;

  INGREDIENTS.forEach(ing=>{
    const b=el('button','btn ing','<span class="sw" style="background:'+ing.color+'"></span>'+ing.name);
    b.addEventListener('click',()=>{
      active=ing;
      list.querySelectorAll('.ing').forEach(x=>x.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true');
    });
    if(ing===active)b.setAttribute('aria-pressed','true');
    list.appendChild(b);
  });

  function tortilla(){
    ctx.clearRect(0,0,360,360);
    const g=ctx.createRadialGradient(CX-30,CY-40,20,CX,CY,R);
    g.addColorStop(0,'#F3E0B4');
    g.addColorStop(.75,'#E7CE96');
    g.addColorStop(1,'#CDAF6E');
    ctx.beginPath();
    ctx.arc(CX,CY,R,0,Math.PI*2);
    ctx.fillStyle=g;
    ctx.fill();
    ctx.lineWidth=5;
    ctx.strokeStyle='#B8945A';
    ctx.stroke();
    for(let i=0;i<70;i++){
      const a=Math.random()*Math.PI*2,d=Math.sqrt(Math.random())*(R-14);
      ctx.beginPath();
      ctx.arc(CX+Math.cos(a)*d,CY+Math.sin(a)*d,1+Math.random()*4,0,Math.PI*2);
      ctx.fillStyle='rgba(150,110,58,'+(0.05+Math.random()*0.16)+')';
      ctx.fill();
    }
    verdict.textContent='';
  }
  tortilla();

  function blob(x,y){
    const s=parseFloat(size.value)*active.spread;
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX,CY,R-6,0,Math.PI*2);
    ctx.clip();
    for(let i=0;i<4;i++){
      const ox=(Math.random()-.5)*s,oy=(Math.random()-.5)*s;
      ctx.beginPath();
      ctx.ellipse(x+ox,y+oy,s*(.4+Math.random()*.5),s*(.4+Math.random()*.5),Math.random()*Math.PI,0,Math.PI*2);
      ctx.fillStyle=active.color;
      ctx.globalAlpha=.6+Math.random()*.4;
      ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }

  let painting=false;
  const pos=e=>{
    const r=cvs.getBoundingClientRect();
    return[(e.clientX-r.left)*(cvs.width/r.width),(e.clientY-r.top)*(cvs.height/r.height)];
  };
  cvs.addEventListener('pointerdown',e=>{painting=true;cvs.setPointerCapture(e.pointerId);const[x,y]=pos(e);blob(x,y);});
  cvs.addEventListener('pointermove',e=>{if(!painting)return;const[x,y]=pos(e);blob(x,y);});
  cvs.addEventListener('pointerup',()=>{painting=false;});
  cvs.addEventListener('pointerleave',()=>{painting=false;});

  body.querySelector('#pClear').addEventListener('click',tortilla);
  body.querySelector('#pServe').addEventListener('click',()=>{
    const d=ctx.getImageData(0,0,360,360).data;
    let topped=0,total=0;
    for(let y=0;y<360;y+=4){
      for(let x=0;x<360;x+=4){
        const dx=x-CX,dy=y-CY;
        if(dx*dx+dy*dy>(R-8)*(R-8))continue;
        total++;
        const i=(y*360+x)*4;
        const r=d[i],g=d[i+1],b=d[i+2];
        if(!(r>190&&g>150&&b>90&&Math.abs(r-g)<70&&b<r))topped++;
      }
    }
    const pct=Math.round(topped/total*100);
    const line=pct<8?'Bare masa. Even the plate looks disappointed.'
      :pct<30?'Restrained. The chef calls this "elegant", the table calls it "where is the rest".'
      :pct<62?'Balanced. Every bite gets something.'
      :pct<88?'Generous. You will need a fork and a napkin.'
      :'Structurally unsound and completely correct.';
    verdict.textContent=pct+'% covered. '+line;
  });
}

const FORTUNES=[
  'The chip at the bottom of the bowl was the best one. It always is.',
  'Do not stack the chips. Ever.',
  'Guacamole browns because you left it alone. So does a good idea.',
  'A jalapeño has no opinion about your tolerance.',
  'Cheese first, then heat, then everything cold.'
];

function buildTerminal(body){
  body.innerHTML='<div class="term"><div class="out" id="tOut"></div><div class="line"><span class="ps">chef@nachos:~$</span><input id="tIn" autocomplete="off" spellcheck="false" aria-label="Terminal input"></div></div>';
  const out=body.querySelector('#tOut');
  const input=body.querySelector('#tIn');
  const history=[];
  let hi=0;

  function write(text,cls){
    const n=el('div',cls||'');
    n.textContent=text;
    out.appendChild(n);
    out.scrollTop=out.scrollHeight;
  }

  write('NachOS shell, build Crunchy Layer.','h');
  write('Type help to see what this thing does.\n');

  const COMMANDS={
    help(){
      write('Commands:','h');
      write([
        '  help            this list',
        '  ls              show the pantry',
        '  open <app>      launch terminal, paint, calc, recipe, about',
        '  cheese          check the melt',
        '  fortune         one line of chip wisdom',
        '  echo <text>     say it back',
        '  date            what time is it',
        '  whoami          identity crisis, resolved',
        '  clear           wipe the screen'
      ].join('\n'));
    },
    ls(){write('chips/  cheese/  guacamole/  salsa/  jalapenos/  regrets.log');},
    open(args){
      const key=(args[0]||'').toLowerCase();
      if(APPS[key]){openApp(key);write('Opening '+APPS[key].name+'.');}
      else write('No app called "'+(args[0]||'')+'". Try: '+Object.keys(APPS).join(', '),'e');
    },
    cheese(){
      const pct=60+Math.floor(Math.random()*41);
      const bars=Math.round(pct/5);
      write('['+'#'.repeat(bars)+'-'.repeat(20-bars)+'] '+pct+'% melted','h');
      write(pct>92?'Peak pull. Serve now.':'Give it another minute.');
    },
    fortune(){write(FORTUNES[Math.floor(Math.random()*FORTUNES.length)]);},
    echo(args){write(args.join(' '));},
    date(){write(new Date().toString());},
    whoami(){write('chef. You are always the chef here.');},
    clear(){out.innerHTML='';},
    sudo(args){
      if(args.join(' ').includes('make me a sandwich'))write('No. This is a nacho establishment.','e');
      else write('chef is not in the sudoers file. This incident has been sprinkled with paprika.','e');
    }
  };

  function run(raw){
    const line=raw.trim();
    write('chef@nachos:~$ '+line,'u');
    if(!line)return;
    history.push(line);
    hi=history.length;
    const parts=line.split(/\s+/);
    const cmd=parts[0].toLowerCase();
    const args=parts.slice(1);
    if(COMMANDS[cmd])COMMANDS[cmd](args);
    else write('nsh: '+cmd+': command not found. Try help.','e');
  }

  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){run(input.value);input.value='';}
    else if(e.key==='ArrowUp'){if(hi>0){hi--;input.value=history[hi]||'';}e.preventDefault();}
    else if(e.key==='ArrowDown'){
      if(hi<history.length-1){hi++;input.value=history[hi]||'';}
      else{hi=history.length;input.value='';}
      e.preventDefault();
    }
  });
  body.addEventListener('pointerup',()=>{if(!window.getSelection().toString())input.focus();});
  setTimeout(()=>input.focus(),60);
}

const boot=el('div','','<div class="mark">Nach<span>OS</span></div><div class="bar"><i id="bootBar"></i></div><div class="sub" id="bootMsg">warming the oven</div>');
boot.id='boot';
boot.setAttribute('role','status');
boot.setAttribute('aria-live','polite');
document.body.appendChild(boot);

const ghost=el('div');
ghost.id='snap';
desktop.appendChild(ghost);

const toasts=el('div');
toasts.id='toasts';
toasts.setAttribute('aria-live','polite');
desktop.appendChild(toasts);

function toast(title,text,ms){
  const t=el('div','toast bevel','<b>'+title+'</b>'+text);
  toasts.appendChild(t);
  setTimeout(()=>t.remove(),ms||5200);
}

function snapRect(zone){
  const W=window.innerWidth,H=window.innerHeight-panelH;
  if(zone==='left')return{left:0,top:panelH,width:Math.round(W/2),height:H};
  if(zone==='right')return{left:Math.round(W/2),top:panelH,width:Math.round(W/2),height:H};
  if(zone==='top')return{left:0,top:panelH,width:W,height:H};
  return null;
}

function applyRect(w,rect){
  w.prev={left:w.root.style.left,top:w.root.style.top,width:w.root.style.width,height:w.root.style.height};
  Object.assign(w.root.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
}

let snapTarget=null,snapZone=null;

document.addEventListener('pointermove',e=>{
  if(!state.dragging){
    if(snapZone){snapZone=null;ghost.classList.remove('on');}
    return;
  }
  snapTarget=state.dragging;
  snapZone=e.clientX<=6?'left':e.clientX>=window.innerWidth-6?'right':e.clientY<=panelH+6?'top':null;
  const rect=snapRect(snapZone);
  if(rect){
    ghost.classList.add('on');
    Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
  }else ghost.classList.remove('on');
});

document.addEventListener('pointerup',()=>{
  const rect=snapRect(snapZone);
  if(rect&&snapTarget)applyRect(snapTarget,rect);
  snapZone=null;
  snapTarget=null;
  ghost.classList.remove('on');
});

desktop.addEventListener('pointerdown',e=>{
  const h=e.target.closest('.rz');
  if(!h)return;
  const w=state.windows.get(h.closest('.win'));
  if(!w)return;
  e.preventDefault();
  e.stopPropagation();
  h.setPointerCapture(e.pointerId);
  w.prev=null;
  const dir=h.dataset.dir;
  const r=w.root.getBoundingClientRect();
  const sx=e.clientX,sy=e.clientY;
  const move=ev=>{
    const ddx=ev.clientX-sx,ddy=ev.clientY-sy;
    let L=r.left,T=r.top,W=r.width,H=r.height;
    if(dir.includes('e'))W=r.width+ddx;
    if(dir.includes('s'))H=r.height+ddy;
    if(dir.includes('w')){W=r.width-ddx;L=r.left+ddx;}
    if(dir.includes('n')){H=r.height-ddy;T=r.top+ddy;}
    W=Math.max(240,W);
    H=Math.max(150,H);
    T=Math.max(panelH,T);
    w.root.style.width=W+'px';
    w.root.style.height=H+'px';
    w.root.style.left=L+'px';
    w.root.style.top=T+'px';
  };
  const up=()=>{
    h.releasePointerCapture(e.pointerId);
    h.removeEventListener('pointermove',move);
    h.removeEventListener('pointerup',up);
  };
  h.addEventListener('pointermove',move);
  h.addEventListener('pointerup',up);
});

const heat=document.getElementById('heat');
setInterval(()=>{
  const n=1+Math.floor(Math.random()*4);
  heat.textContent='�️'.repeat(n);
  heat.title='Spice level '+n+' of 4';
},9000);

const bootBar=document.getElementById('bootBar');
const bootMsg=document.getElementById('bootMsg');
const STEPS=['warming the oven','grating cheese','mounting /pantry','checking guacamole freshness','plating'];
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function finishBoot(){
  boot.style.display='none';
  openApp('terminal');
  setTimeout(()=>toast('Kitchen note','Drag a window to a screen edge to snap it. Double-click a title bar to fill the screen.'),700);
}

if(reduce)finishBoot();
else{
  let p=0,s=0;
  const timer=setInterval(()=>{
    p+=8+Math.random()*14;
    if(p>=100){p=100;clearInterval(timer);setTimeout(finishBoot,320);}
    bootBar.style.width=p+'%';
    const idx=Math.min(STEPS.length-1,Math.floor(p/100*STEPS.length));
    if(idx!==s){s=idx;bootMsg.textContent=STEPS[idx];}
  },170);
}

window.addEventListener('resize',()=>{
  state.windows.forEach(w=>{
    const r=w.root.getBoundingClientRect();
    if(r.left>window.innerWidth-70)w.root.style.left=(window.innerWidth-120)+'px';
    if(r.top>window.innerHeight-30)w.root.style.top=(window.innerHeight-120)+'px';
  });
});