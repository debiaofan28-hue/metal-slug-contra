/* Fixed 60 Hz simulation. Input and AABB conventions reused from contra-mario. */
const Engine=(()=>{
  const guns=[{name:'手枪',tag:'PISTOL',delay:15,damage:1,speed:6},{name:'重机枪',tag:'HEAVY MACHINE GUN',delay:5,damage:2,speed:8},{name:'火箭筒',tag:'ROCKET LAUNCHER',delay:38,damage:8,speed:3.6}];
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  function create(level){const s={level,platforms:level.platforms.map(b=>({...b})),p:{x:52,y:80,w:16,h:32,vx:0,vy:0,dir:1,grounded:true,inv:90,drop:0,shot:0,swimming:false},weapon:0,ammo:[Infinity,120,8],grenades:8,cooldown:0,grenadeCooldown:0,score:0,kills:0,lives:3,frame:0,camera:0,phase:'ready',deadTicks:0,bridgeTick:null,events:[],shots:[],enemyShots:[],effects:[],pickups:[{x:405,y:93,kind:'ammo',taken:false},{x:658,y:93,kind:'grenades',taken:false}],enemies:[240,288,368,464,510,640,708,940].map((x,i)=>({x,y:80,w:16,h:32,vx:-.65,vy:0,hp:2,kind:'soldier',cool:60+i*13,active:false})).concat([{x:562,y:80,w:32,h:32,vx:0,vy:0,hp:14,kind:'turret',cool:90,active:false},{x:305,y:176,w:16,h:32,vx:0,vy:0,hp:3,kind:'gunner',cool:75,active:false}])};
 s.bridgeTicks={};s.bossActive=false;s.victoryTicks=0;s.checkpoint=52;
 [[1260,112],[1350,112],[1490,80],[1660,80],[1800,80],[1950,112],[2100,80],[2220,144],[2390,176],[2490,112],[2660,144],[2760,144],[2870,176],[2970,144],[3070,112]].forEach(([x,y],i)=>s.enemies.push({x,y:y-32,w:16,h:32,vx:i%3===0?0:-.55,vy:0,hp:3,kind:i%3===0?'gunner':'soldier',cool:70+i*7,active:false}));
 [[1720,80],[2140,80],[2710,144],[3060,112]].forEach(([x,y])=>s.enemies.push({x,y:y-32,w:32,h:32,vx:0,vy:0,hp:16,kind:'turret',cool:80,active:false}));
 [[1240,93],[1580,61],[2070,61],[2630,93],[3008,189]].forEach(([x,y])=>s.pickups.push({x,y,kind:'ammo',taken:false}));
 [[1810,61],[2420,157],[3070,189]].forEach(([x,y])=>s.pickups.push({x,y,kind:'grenades',taken:false}));
 s.enemies.push({x:3220,y:176,w:24,h:30,hp:100,maxHp:100,kind:'core',cool:100,active:false},{x:3208,y:115,w:20,h:20,hp:24,kind:'bossGun',cool:65,active:false},{x:3208,y:148,w:20,h:20,hp:24,kind:'bossGun',cool:110,active:false});return s;}
 function respawn(old){const s=create(old.level);if(old.lives>0){s.lives=old.lives;s.score=old.score;s.kills=old.kills;s.checkpoint=old.checkpoint;s.p.x=s.checkpoint;s.camera=Math.max(0,s.checkpoint-120);const floor=s.platforms.filter(b=>s.p.x>=b.x&&s.p.x<b.x+b.w).sort((a,b)=>a.y-b.y)[0];s.p.y=(floor?floor.y:112)-32;}return s;}
  function choose(s,n){if(n<0||n>2||s.ammo[n]<=0){s.events.push('empty');return;}if(s.weapon!==n){s.weapon=n;s.events.push('switch');}}
  function cycle(s){for(let i=1;i<=3;i++){const n=(s.weapon+i)%3;if(s.ammo[n]>0){choose(s,n);break;}}}
  function land(body,platforms){const bottom=body.y+body.h;body.x+=body.vx;body.y+=body.vy;body.grounded=false;if(body.vy>=0){const hit=platforms.filter(b=>!b.gone&&(!body.drop||b.y>body.dropY+1)&&body.x+body.w>b.x&&body.x<b.x+b.w&&bottom<=b.y+.5&&body.y+body.h>=b.y).sort((a,b)=>a.y-b.y)[0];if(hit){body.y=hit.y-body.h;body.vy=0;body.grounded=true;}}}
  function hurt(s){if(s.phase!=='playing'||s.p.inv)return;s.phase='dead';s.lives--;s.deadTicks=0;s.p.vy=-3;s.events.push('death');}
  function hit(s,e,damage){if(e.hp<=0)return;e.hp-=damage;e.flash=5;if(e.hp<=0){s.score+=e.kind==='turret'?500:100;s.kills++;s.effects.push({x:e.x+e.w/2,y:e.y+e.h/2,ttl:28,size:38});s.events.push('kill');}}
  function explode(s,b){if(b.gone)return;b.gone=true;const radius=b.kind==='grenade'?55:42;for(const e of s.enemies){const x=Math.max(e.x,Math.min(b.x,e.x+e.w)),y=Math.max(e.y,Math.min(b.y,e.y+e.h));if(Math.hypot(b.x-x,b.y-y)<radius)hit(s,e,b.damage);}s.effects.push({x:b.x,y:b.y,ttl:38,size:radius*1.6});s.events.push('explosion');}
  function shoot(s,k){if(s.cooldown)return;const id=s.weapon,g=guns[id],p=s.p;let dx=p.dir,dy=0;if(k.up){dy=-1;if(!k.left&&!k.right)dx=0;}if(p.swimming){dx=0;dy=-1;}const len=Math.hypot(dx,dy);s.shots.push({x:p.x+p.w/2+dx*15,y:p.y+(p.h===32?13:8),w:id===2?9:5,h:3,vx:dx/len*g.speed,vy:dy/len*g.speed,damage:g.damage,kind:id===2?'rocket':'bullet',ttl:100,weapon:id});s.cooldown=g.delay;p.shot=8;s.events.push(id===0?'pistol':id===1?'machine':'rocket');if(id>0){s.ammo[id]--;if(!s.ammo[id]){s.weapon=0;s.events.push('fallback');}}}
  function tick(s,k={}){
    s.events=[];if(s.phase==='dead'){s.deadTicks++;s.p.vy+=.2;s.p.y+=s.p.vy;return;}if(s.phase==='victory'){s.frame++;s.victoryTicks++;s.effects.forEach(e=>e.ttl--);s.effects=s.effects.filter(e=>e.ttl>0);if(s.victoryTicks%12===0){s.effects.push({x:3205+(s.victoryTicks*7%40),y:65+(s.victoryTicks*11%140),ttl:38,size:65});s.events.push('explosion');}if(s.victoryTicks>=150){s.phase='complete';s.score+=5000;s.events.push('complete');}return;}if(s.phase!=='playing')return;s.frame++;const p=s.p;
    p.inv=Math.max(0,p.inv-1);p.drop=Math.max(0,p.drop-1);p.shot=Math.max(0,p.shot-1);s.cooldown=Math.max(0,s.cooldown-1);s.grenadeCooldown=Math.max(0,s.grenadeCooldown-1);
    if(Number.isInteger(k.select))choose(s,k.select);if(k.cycle)cycle(s);
    const crouch=k.down&&p.grounded&&!p.swimming;
    if(crouch&&p.h===32){p.y+=12;p.h=20;}else if(!crouch&&p.h===20&&!p.swimming){p.y-=12;p.h=32;}
    const d=(k.right?1:0)-(k.left?1:0);if(d)p.dir=d;p.vx=crouch?0:d*(p.swimming?1.2:2.1);
    if(k.jumpPressed&&p.grounded){if(k.down&&!p.swimming){p.drop=18;p.dropY=p.y+p.h;p.y+=1;}else{const water=p.swimming;if(water){p.y-=12;p.h=32;p.swimming=false;}p.vy=water?-8.2:-5.8;s.events.push('jump');}p.grounded=false;}
    if(!k.jump&&p.vy<-2.5)p.vy=-2.5;p.vy=Math.min(6,p.vy+.24);land(p,s.platforms);p.x=Math.max(s.camera,Math.min(p.x,s.level.width-p.w));
    if(p.y>248){p.inv=0;hurt(s);return;}if(p.y+p.h>228&&p.x<s.level.waterEnd){p.h=20;p.y=208;p.vy=0;p.swimming=true;p.grounded=true;}else if(p.grounded&&p.swimming){p.swimming=false;p.y-=12;p.h=32;}
    if(k.fire)shoot(s,k);
    if(k.grenade&&s.grenadeCooldown===0){if(s.grenades>0){s.grenades--;s.grenadeCooldown=28;s.shots.push({x:p.x+8,y:p.y+6,w:6,h:6,vx:p.dir*2.8,vy:-3.4,ttl:80,kind:'grenade',damage:12});s.events.push('throw');}else s.events.push('empty');}
    for(const e of s.enemies){if(e.hp<=0)continue;if(e.kind==='core'||e.kind==='bossGun'){if(s.bossActive)e.active=true;}else if(e.x<s.camera+338)e.active=true;if(!e.active)continue;e.flash=Math.max(0,(e.flash||0)-1);e.cool--;
      if(e.kind==='soldier'){e.vy=Math.min(6,e.vy+.24);land(e,s.platforms);if(e.y>245){e.hp=0;continue;}}
      if(e.cool<=0&&Math.abs(e.x-p.x)<310){const ex=e.x+e.w/2,ey=e.y+13,dx=p.x+8-ex,dy=p.y+p.h*.4-ey,l=Math.hypot(dx,dy)||1;s.enemyShots.push({x:ex,y:ey,w:4,h:4,vx:dx/l*1.8,vy:dy/l*1.8,ttl:200});if(e.kind==='core')for(const spread of [-.35,.35]){const a=Math.atan2(dy,dx)+spread;s.enemyShots.push({x:ex,y:ey,w:4,h:4,vx:Math.cos(a)*1.6,vy:Math.sin(a)*1.6,ttl:200});}e.cool=e.kind==='core'?100:e.kind==='bossGun'?85:e.kind==='turret'?60:115;}
      if(overlap(p,e))hurt(s);
    }
    for(const b of s.shots){if(b.gone)continue;b.ttl--;if(b.kind==='grenade'){b.vy+=.14;const old=b.y+b.h;b.x+=b.vx;b.y+=b.vy;const floor=s.platforms.find(t=>!t.gone&&b.x+b.w>t.x&&b.x<t.x+t.w&&old<=t.y&&b.y+b.h>=t.y&&b.vy>0);if(floor){b.y=floor.y-b.h;b.vy*=-.42;b.vx*=.7;}if(b.ttl<=0||s.enemies.some(e=>e.hp>0&&overlap(b,e)))explode(s,b);}else{
        for(let j=0;j<3&&!b.gone;j++){b.x+=b.vx/3;b.y+=b.vy/3;const e=s.enemies.find(e=>e.active&&e.hp>0&&overlap(b,e));if(e){if(b.kind==='rocket')explode(s,b);else{hit(s,e,b.damage);b.gone=true;}}}if(b.ttl<=0&&b.kind==='rocket')explode(s,b);
      }if(b.x<s.camera-80||b.x>s.camera+440||b.y>250||b.y<-20||b.ttl<=0)b.gone=true;}
    s.shots=s.shots.filter(b=>!b.gone);
    for(const b of s.enemyShots){b.x+=b.vx;b.y+=b.vy;b.ttl--;if(overlap(b,p)){hurt(s);b.ttl=0;}}s.enemyShots=s.enemyShots.filter(b=>b.ttl>0&&b.x>s.camera-60&&b.x<s.camera+400&&b.y<245);
    for(const b of s.pickups)if(!b.taken&&overlap(p,{...b,w:16,h:16})){b.taken=true;if(b.kind==='ammo'){s.ammo[1]+=80;s.ammo[2]+=4;}else s.grenades+=4;s.events.push('pickup');}
    for(const start of [768,1056]){if(s.bridgeTicks[start]===undefined&&p.x>=start)s.bridgeTicks[start]=s.frame;for(const b of s.platforms)if(b.bridge===start&&!b.gone&&s.frame-s.bridgeTicks[start]>24+(b.x-start)/2){b.gone=true;s.effects.push({x:b.x+8,y:b.y+5,ttl:32,size:42});s.events.push('explosion');}}
    if(p.grounded&&!p.swimming){if(p.x>=3008)s.checkpoint=3008;else if(p.x>=2368)s.checkpoint=2368;else if(p.x>=1200)s.checkpoint=1200;}
    if(p.x>=3008&&!s.bossActive){s.bossActive=true;s.checkpoint=3008;s.events.push('boss');}if(s.bossActive)p.x=Math.min(p.x,3190);
    s.effects.forEach(e=>e.ttl--);s.effects=s.effects.filter(e=>e.ttl>0);s.camera=Math.floor(Math.max(s.camera,Math.min(p.x-120,s.level.width-320)));
    if(s.enemies.find(e=>e.kind==='core')?.hp<=0&&s.phase==='playing'){s.phase='victory';s.enemyShots=[];s.shots=[];s.events.push('explosion');}
  }
  return{create,respawn,tick,overlap,land,choose,cycle,shoot,explode,guns};
})();
if(typeof module!=='undefined')module.exports=Engine;
