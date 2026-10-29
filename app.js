/* Beágyazás elleni védelem (GitHub Pages nem küld frame-ancestors fejlécet) */
try{if(window.top!==window.self){try{window.top.location=window.location}catch(e){document.documentElement.hidden=true}}}catch(e){}
/* =====================================================================
   VAGYONADÓ-KALAUZ – app.js
   ---------------------------------------------------------------------
   Fülek + vagyonadó-kalkulátor. Nincs hálózati hívás, nincs külső
   függőség, CSP-kompatibilis (nincs inline style / inline script).

   JOGSZABÁLYI PARAMÉTEREK: a RULES objektum (lent). Ha a kihirdetett
   törvény eltér a tervezettől, itt kell módosítani – és kézzel az
   index.html I. fülének táblázatát és a fejléc kulcsadatait is.

   A tiszta számítási függvények a fájl végén tesztelhetően exportálva:
   window.VagyonadoSzabalyok (csak olvasható, állapotot nem érint).
   ===================================================================== */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};

/* ---------- Jogszabályi paraméterek ---------- */
var RULES=Object.freeze({
  YEAR:2026,          /* első tárgyév */
  LIMIT:1000,         /* mentes sáv, M Ft (9. §) */
  TOP:100000,         /* 1,5 %-os sáv kezdete, M Ft adóalap (12. § (1)) */
  RATE1:0.01,         /* alapkulcs */
  RATE2:0.015,        /* felső kulcs */
  FEE_SHARE:0.5,      /* értékelési díj levonható hányada (12. § (2) a)) */
  FEE_CAP:2,          /* értékelési díj levonás maximuma, M Ft */
  MOV_ART:3,          /* műtárgy, ékszer, gyűjtemény értékhatár, M Ft (9. § (3)) */
  MOV_VEH:10,         /* jármű értékhatár, M Ft (9. § (3)) */
  HIDDEN_ST:500,      /* rejtett tartalék figyelembevétele e saját tőke felett, M Ft (1. mell. IV.) */
  CAP_RATE:0.15       /* tőkésítési ráta a cégképletben (1. mell. I.) */
});

/* ---------- Jogszabályi hivatkozások → élő források ----------
   A .ref elemek kattinthatóvá válnak. Törvény-§ → T/930 PDF (parlament.hu); Itv./Ptk./Szja → njt.hu.
   KIHIRDETÉS UTÁN: a LAWS.draft.url-t az njt.hu-s címre kell cserélni (pl. https://njt.hu/jogszabaly/2026-XX-00-00),
   és anchor:true-ra állítani, hogy a §-horgonyok is működjenek. */
var LAWS={
  draft:{url:'https://www.parlament.hu/irom43/00930/00930.pdf',name:'T/930 törvényjavaslat a vagyonadóról – benyújtva 2026. 10. 27. (parlament.hu, PDF)',anchor:false},
  bill:{re:/^T\/930\s*/i,url:'https://www.parlament.hu/irom43/00930/00930.pdf',name:'törvényjavaslat a vagyonadóról – benyújtva 2026. 10. 27. (parlament.hu, PDF)',anchor:false},
  itv:{re:/^Itv\.?\s*/i,url:'https://njt.hu/jogszabaly/1990-93-00-00',name:'1990. évi XCIII. törvény az illetékekről (njt.hu)',anchor:true},
  ptk:{re:/^Ptk\.?\s*/i,url:'https://njt.hu/jogszabaly/2013-5-00-00',name:'2013. évi V. törvény a Polgári Törvénykönyvről (njt.hu)',anchor:true},
  szja:{re:/^Szja\s*tv\.?\s*/i,url:'https://njt.hu/jogszabaly/1995-117-00-00',name:'1995. évi CXVII. törvény a személyi jövedelemadóról (njt.hu)',anchor:true}
};
function refUrl(part){
  var law=LAWS.draft,rest=part;
  ['bill','itv','ptk','szja'].forEach(function(k){if(LAWS[k].re.test(part)){law=LAWS[k];rest=part.replace(LAWS[k].re,'')}});
  var u=law.url;
  if(law.anchor){var m=/^(\d+(?::\d+)?)\.?\s*§/.exec(rest);if(m)u+='#SZ'+m[1].replace(':','_')}
  return {url:u,name:law.name};
}
function escA(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function refHTML(text){
  /* több hivatkozás vesszővel: részenként külön link */
  return String(text).split(/,\s+/).map(function(part,i,arr){
    var r=refUrl(part.trim());
    return '<a class="reflink" href="'+escA(r.url)+'" target="_blank" rel="noopener noreferrer" title="'+escA(r.name)+' – megnyitás új lapon">'+escA(part.trim())+'</a>'+(i<arr.length-1?', ':'');
  }).join('');
}
function linkRefs(root){
  (root||document).querySelectorAll('span.ref').forEach(function(el){
    if(el.dataset.linked||el.closest('a'))return;
    el.innerHTML=refHTML(el.textContent);el.dataset.linked='1';
  });
}
linkRefs(document);
try{window.VagyonadoLinkRefs=linkRefs}catch(e){}

/* ---------- Megjelenési animáció ---------- */
document.body.classList.add('js');
(function(){
  if(!('IntersectionObserver' in window))return;
  var els=document.querySelectorAll('.prose > *, .statband, .band, .sqn-head, .sqn-statement, fieldset, .result, .kdetail, .kbar, .k-intro > *');
  els.forEach(function(e){e.classList.add('reveal')});
  var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -6% 0px',threshold:0.05});
  els.forEach(function(e){io.observe(e)});
  /* ami fül-váltáskor már a képernyőn van, azonnal jelenjen meg */
  document.querySelectorAll('.tabs [role="tab"]').forEach(function(t){t.addEventListener('click',function(){setTimeout(function(){document.querySelectorAll('.reveal:not(.in)').forEach(function(e){var r=e.getBoundingClientRect();if(r.top<window.innerHeight&&r.bottom>0)e.classList.add('in')})},30)})});
})();

/* ---------- Fülek ---------- */
(function(){
  var tabs=[].slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  if(!tabs.length)return;
  var ids=tabs.map(function(t){return t.dataset.target});
  window.addEventListener('hashchange',function(){var h=location.hash.slice(1);if(ids.indexOf(h)>=0)show(h,true)});
  function show(id,scroll,init){
    if(ids.indexOf(id)<0) id=ids[0];
    var all=id==='all';
    document.body.classList.toggle('all-view',all);
    tabs.forEach(function(t){
      var on=t.dataset.target===id;
      t.setAttribute('aria-selected',on?'true':'false');
      t.tabIndex=on?0:-1;
      var p=$(t.dataset.target);if(p)p.hidden=all?(t.dataset.target==='teszt'):!on;
    });
    document.body.classList.toggle('on-bvk',id==='bvk');
    if(!init){try{history.replaceState(null,'',id===ids[0]?location.pathname+location.search:'#'+id)}catch(e){}}
    if(scroll){var nav=document.querySelector('.tabbar'),bar=$('brandbar'),pn=$(id);if(nav&&pn){try{var top=pn.getBoundingClientRect().top+window.pageYOffset-nav.offsetHeight-(bar?bar.offsetHeight:0);window.scrollTo({top:Math.max(0,top),behavior:'auto'})}catch(e){}}}
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){show(t.dataset.target,true)});
    t.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        var k=(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        tabs[k].focus();show(tabs[k].dataset.target,false);
      }
    });
  });
  document.querySelectorAll('[data-goto]').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.goto,true)})});
  show((location.hash||'').replace('#',''),false,true);
  var bar=$('brandbar');if(bar){var st=function(){bar.classList.toggle('stuck',window.pageYOffset>4)};window.addEventListener('scroll',st,{passive:true});st()}
})();

/* ---------- Vagyonadó-kalkulátor ---------- */
(function(){
  if(!$('kf')) return;
  var YEAR=RULES.YEAR, LIMIT=RULES.LIMIT, TOP=RULES.TOP;
  var STORE='vagyonado-kalkulator-v3', REMEMBER='vagyonado-kalkulator-megjegyez', MAX_FILE=512*1024;
  var f0=new Intl.NumberFormat('hu-HU',{maximumFractionDigits:0,useGrouping:'always'});
  var f1=new Intl.NumberFormat('hu-HU',{maximumFractionDigits:1,useGrouping:'always'});
  var f2=new Intl.NumberFormat('hu-HU',{maximumFractionDigits:2,useGrouping:'always'});
  function fin(x){return (typeof x==='number'&&isFinite(x))?x:0}
  function M(v){v=fin(+v);if(Math.abs(v)<0.0005)v=0;var a=Math.abs(v);if(a>=999.5)return f2.format(v/1000)+' Mrd Ft';if(a>=100)return f0.format(v)+' M Ft';if(a>=10)return f1.format(v)+' M Ft';return f2.format(v)+' M Ft'}
  function FT(m){return f0.format(Math.round(fin(+m)*1000)*1000)+' Ft'}
  function EFT(m){return f0.format(Math.round(fin(+m)*1e6))+' Ft'}
  function P(x){return f1.format(fin(x))+'%'}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function n(v){var t=String(v==null?'':v).replace(/\s/g,'');if(t.indexOf('.')>=0&&t.indexOf(',')>=0)t=t.replace(/\./g,'');var x=parseFloat(t.replace(',','.'));return isFinite(x)?Math.max(-1e9,Math.min(1e9,x)):0}
  function nn(v){return Math.max(0,n(v))}
  function has(v){return String(v==null?'':v).trim()!==''}
  function tax(b){b=Math.max(0,fin(b));return Math.min(b,TOP)*RULES.RATE1+Math.max(0,b-TOP)*RULES.RATE2}
  function sum(a,b){return a+b}
  function niceStep(x){if(!(x>0))return 1;var e=Math.pow(10,Math.floor(Math.log10(x))),f=x/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
  var ID_RE=/^[a-z][a-z0-9]{3,40}$/;
  function idOk(id){return ID_RE.test(id)&&id!=='constructor'&&!(id in Object.prototype)}
  function nid(p){var r;try{r=crypto.randomUUID().replace(/-/g,'').slice(0,12)}catch(e){r=Math.random().toString(36).slice(2,14)}return p+r}
  function ref(s){return ' <span class="ref">'+esc(s)+'</span>'}

  /* ---------- Állapot ---------- */
  function blank(){return {v:3,src:'user',p:{cit:'y',ab:'n',fst:'res',mar:false,cust:false,spres:'same'},fx:{EUR:395,USD:345,CHF:425,GBP:460},g:{re:5,fin:4,co:5,oth:0,yrs:5},fee:{me:'',sp:'',ch:''},assets:[],debts:[],bvks:[]}}
  var S=blank();
  var CURS=[['HUF','HUF'],['EUR','EUR'],['USD','USD'],['CHF','CHF'],['GBP','GBP']];
  function fx(c){return !c||c==='HUF'?1:(nn(S.fx[c])||0)}
  function U(a){return a&&a.cur&&a.cur!=='HUF'?'M '+a.cur:'M Ft'}
  function curTxt(v,c,r){return !c||c==='HUF'?M(v):f2.format(v)+' M '+c+' × '+f0.format(r)+' = '+M(v*r)}
  var CLS={re:'Ingatlan',co:'Cégrészesedés, vállalkozás',fin:'Pénzügyi vagyon',mov:'Értékes ingóság',oth:'Jogok és egyéb'};

  /* ---------- Típusok és mezők ---------- */
  function isM(k){return function(a){return a.m===k}}
  var REM=[['tx12','Ügylet a fordulónapot megelőző 12 hónapban'],['idx','Korábbi ügylet (legfeljebb 10 éve), indexálva'],['model','NAV tömeges modell / becsült piaci érték'],['expert','Független szakértői forgalmi érték']];
  var UFF=[
    {k:'ufm',l:'A jog időtartama',t:'s',o:[['life','Élethosszig'],['term','Határozott időre']],rr:1,w:function(a){return a.uf}},
    {k:'ufa',l:'A jogosult életkora',u:'év',w:function(a){return a.uf&&a.ufm!=='term'}},
    {k:'uft',l:'Hátralévő időtartam',u:'év',w:function(a){return a.uf&&a.ufm==='term'}}
  ];
  function reF(kind){return [
    {k:'m',l:'Értékelési módszer',t:'s',o:kind==='egy'?REM.filter(function(o){return o[0]!=='model'}):REM,rr:1},
    {k:'tx',l:'Ügyleti érték (100%)',u:'mft',s:'adásvételi ár, illetékérték vagy hagyatéki érték',w:isM('tx12')},
    {k:'iv',l:'Korábbi ügyleti érték (100%)',u:'mft',w:isM('idx')},
    {k:'iy',l:'Az ügylet éve',u:'év',w:isM('idx')},
    {k:'ir',l:'Becsült éves árváltozás',u:'%',neg:1,s:kind==='lak'?'az MNB-lakásárindex helyett':kind==='fold'?'a KSH termőföldár helyett':'a KSH-árindex helyett',w:isM('idx')},
    {k:'mv',l:'NAV-modell / becsült piaci érték (100%)',u:'mft',w:isM('model')},
    {k:'ev',l:'Szakértői forgalmi érték (100%)',u:'mft',w:isM('expert')},
    {k:'mand',l:'Az értékelés kötelező: nincs 12 hónapon belüli ügyleti, 10 éven belüli indexált és NAV-modell szerinti érték',t:'c',s:'ekkor a díj 50%-a (max. 2 M Ft) levonható (12. § (2) a), 21. § (4))',w:isM('expert')},
    {k:'lt',l:'Megfizetett építmény- vagy telekadó',u:'mft',s:'éves összeg a tulajdoni hányadra'},
    {k:'chg',l:'Az ügylet óta lényeges állapotváltozás (pl. az ügyleti érték 20%-át elérő felújítás) történt',t:'c',rr:1,w:function(a){return a.m==='tx12'||a.m==='idx'}},
    {k:'uf',l:'Haszonélvezet vagy használati jog terheli',t:'c',rr:1}
  ].concat(UFF)}
  function fyOf(a){return has(a.fy)?Math.min(YEAR+1,Math.max(1990,Math.round(n(a.fy)))):YEAR}
  function coF(kulf){var r=kulf?function(a){return fx(a.cur)}:function(){return 1};return [
    {k:'st',l:'Saját tőke',u:'m',neg:1,rr:1,s:'az utolsó lezárt beszámoló szerint'},
    {k:'fy',l:'A beszámoló üzleti éve',u:'év',rr:1,s:'2026-os adónál naptári évnél jellemzően 2026'},
    {k:'ae1',l:function(a){return 'Adózott eredmény – '+fyOf(a)},u:'m',neg:1},
    {k:'ae2',l:function(a){return 'Adózott eredmény – '+(fyOf(a)-1)},u:'m',neg:1},
    {k:'ae3',l:function(a){return 'Adózott eredmény – '+(fyOf(a)-2)},u:'m',neg:1},
    {k:'rt',l:'Rejtett tartalék',u:'m',s:'befektetett ingatlan, részesedés, értékpapír: piaci − könyv szerinti érték',w:function(a){return n(a.st)*r(a)>RULES.HIDDEN_ST}},
    {k:'dtl',l:'Kapcsolódó halasztott adókötelezettség',u:'m',s:'üresen hagyva a rejtett tartalék 15%-a (5. § 15. pont)',w:function(a){return n(a.st)*r(a)>RULES.HIDDEN_ST}},
    {k:'div',l:'Mérlegfordulónap után jóváhagyott osztalék',u:'m',s:'ha a saját tőke még tartalmazza'},
    {k:'fd',l:'Jogelőd nélküli alapítás éve',u:'év',s:'csak ha az elmúlt 3 évben alapították'},
    kulf?{k:'T',l:'Tőkésítési ráta',u:'%',s:'15%, vagy az ország kockázatmentes kamata + felár'}:null,
    kulf?{k:'ivt',l:'Belföldi ingatlanvagyonnal rendelkező társaság (Itv. 102. § (1) o): a belföldi ingatlanok a mérleg szerinti eszközök – pénzeszköz és követelés nélkül – több mint 75%-a)',t:'c',rr:1}:null,
    kulf?{k:'hre',l:'A társaság magyarországi ingatlanai',u:'m',s:'csak külföldi illetőségűnél számít (100%)',w:function(a){return a.ivt}}:null,
    kulf?{k:'hdebt',l:'Az ingatlanokhoz közvetlenül kapcsolódó tartozások',u:'m',s:'szerzés, fenntartás, fejlesztés hitele – levonható (18. §)',w:function(a){return a.ivt&&has(a.hre)}}:null,
    {k:'simp',l:'Egyszerűsített értékelés: a saját tőke tulajdoni hányadra jutó része (választható, ha a saját tőke legfeljebb 100 M Ft)',t:'c',w:function(a){return has(a.st)&&n(a.st)*r(a)<=100}},
    {k:'hold',l:'Holding (elsődleges célja részesedések birtoklása és irányítása; a részesedések, értékpapírok, egyéb befektetett pénzügyi eszközök, pénzeszközök, saját célra használt ingatlanok és a tulajdonolt cégekkel szembeni követelések az eszközök legalább 90%-a)',t:'c'},
    {k:'ish',l:'Közvetett tulajdoni hányad',u:'%',s:'más társaságon keresztül; a kisebbségi teszthez (közvetlen + közvetett + közeli hozzátartozói hányad < 50%)',w:function(a){return shareOf(a)<0.5}},
    {k:'rel',l:'Közeli hozzátartozók együttes részesedése',u:'%',s:'házastárs, szülő, gyermek, testvér stb. (Ptk. közeli hozzátartozó) hányada – a kisebbségi teszthez össze kell számítani; az élettársé nem (1. mell. V. d))',w:function(a){return shareOf(a)<0.5}},
    {k:'disc',l:'Kisebbségi diszkontot alkalmazok (választható)',t:'c',w:function(a){return qtOf(a)<0.5}},
    {k:'tx',l:'Az elmúlt évben 10% feletti részesedést adtak el független félnek',t:'c',rr:1},
    {k:'txv',l:'Tranzakciós érték 100%-ra vetítve',u:'m',w:function(a){return a.tx}},
    {k:'val',l:'Független cégértékelést alkalmazok',t:'c',rr:1},
    {k:'vv',l:'Cégértékelés szerinti érték (a részesedésre)',u:'m',w:function(a){return a.val}}
  ].filter(Boolean)}
  function amt(l,s){return [{k:'am',l:l,u:'m',s:s}]}
  var TYPES={
    re_lak:{g:'Ingatlan',l:'Belföldi lakás, ház',ph:'pl. budapesti lakás',cls:'re',sh:1,f:reF('lak'),d:{m:'tx12',ir:10,ufm:'life'},val:function(a){return vReHu(a,'lak')}},
    re_udulo:{g:'Ingatlan',l:'Belföldi üdülő, nyaraló, telek',ph:'pl. balatoni nyaraló',cls:'re',sh:1,f:reF('udulo'),d:{m:'model',ir:5,ufm:'life'},val:function(a){return vReHu(a,'udulo')}},
    re_egy:{g:'Ingatlan',l:'Belföldi egyéb ingatlan (iroda, üzlet, ipari, beépített mezőgazdasági)',ph:'pl. bérbe adott iroda',cls:'re',sh:1,f:reF('egy'),d:{m:'tx12',ir:5,ufm:'life'},val:function(a){return vReHu(a,'egy')}},
    re_fold:{g:'Ingatlan',l:'Termőföld',ph:'pl. szántó',cls:'re',sh:1,f:reF('fold'),d:{m:'model',ir:8,ufm:'life'},val:function(a){return vReHu(a,'fold')}},
    re_kulf:{g:'Ingatlan',l:'Külföldi ingatlan',ph:'pl. horvát apartman',cls:'re',sh:1,cur:1,tr:1,f:[
      {k:'m',l:'Értékelési módszer',t:'s',o:[['acq','Szerzési érték, évente továbbvezetve'],['off','Helyi hatósági (adó-, kataszteri) érték'],['exp','Helyi szakértői forgalmi érték']],rr:1},
      {k:'av',l:'Szerzési érték (100%)',u:'m',s:'vételár, ingyenes szerzésnél hatósági érték',w:isM('acq')},
      {k:'ay',l:'A szerzés éve',u:'év',w:isM('acq')},
      {k:'gm',l:'Éves továbbvezetés',t:'s',o:[['3','Évi 3%'],['idx','Helyi hivatalos árindex']],rr:1,w:isM('acq')},
      {k:'gi',l:'A helyi árindex éves változása',u:'%',neg:1,w:function(a){return a.m==='acq'&&a.gm==='idx'}},
      {k:'inv',l:'Értéknövelő beruházás',u:'m',w:isM('acq')},
      {k:'invy',l:'A beruházás éve',u:'év',w:isM('acq')},
      {k:'ov',l:'Hatósági érték (100%)',u:'m',w:isM('off')},
      {k:'ev',l:'Szakértői forgalmi érték (100%)',u:'m',w:isM('exp')},
      {k:'mand',l:'Az értékelés kötelező: a szerzési, továbbvezetett és hatósági érték egyike sem állapítható meg',t:'c',s:'ekkor a díj 50%-a (max. 2 M Ft) levonható (12. § (2) a), 20. § (5))',w:isM('exp')},
      {k:'lt',l:'Fizetett helyi ingatlanadó',u:'mft',s:'a fekvés államában, éves'}
    ],d:{m:'acq',gm:'3',cur:'EUR'},val:vReKulf},
    co_hu:{g:'Cég és vállalkozás',l:'Nem tőzsdei magyar társaság',ph:'pl. Kft. üzletrész',cls:'co',sh:1,f:coF(false),d:{fy:YEAR,disc:true},val:function(a){return vCo(a,false)}},
    co_kulf:{g:'Cég és vállalkozás',l:'Nem tőzsdei külföldi társaság',ph:'pl. osztrák GmbH',cls:'co',sh:1,cur:1,tr:1,f:coF(true),d:{fy:YEAR,disc:true,cur:'EUR',T:15},val:function(a){return vCo(a,true)}},
    co_val:{g:'Cég és vállalkozás',l:'Magyar cégrészesedés – kiszámított érték (cégérték-kalkulátorból)',ph:'pl. Kft. üzletrész (kiszámított)',cls:'co',cur:1,f:amt('Számított érték az Ön hányadára','a cégérték-kalkulátor eredménye vagy független cégértékelés'),val:function(a){var x=vSimple(a,'15. § (3), 1. melléklet',0.1,0,'Kiszámított érték');x.vHu=x.v;return x}},
    ev:{g:'Cég és vállalkozás',l:'Egyéni vállalkozás (vállalkozói jövedelem szerint)',ph:'pl. egyéni vállalkozás',cls:'co',f:[
      {k:'st',l:'Nettó vállalkozási vagyon',u:'mft',rr:1},
      {k:'fy',l:'Az utolsó lezárt év',u:'év',rr:1},
      {k:'ae1',l:function(a){return 'Vállalkozói jövedelem adózás után – '+fyOf(a)},u:'mft',neg:1},
      {k:'ae2',l:function(a){return 'Vállalkozói jövedelem adózás után – '+(fyOf(a)-1)},u:'mft',neg:1},
      {k:'ae3',l:function(a){return 'Vállalkozói jövedelem adózás után – '+(fyOf(a)-2)},u:'mft',neg:1},
      {k:'rt',l:'Rejtett tartalék',u:'mft',w:function(a){return n(a.st)>RULES.HIDDEN_ST}},
      {k:'dtl',l:'Kapcsolódó halasztott adó',u:'mft',s:'üresen hagyva a rejtett tartalék 15%-a',w:function(a){return n(a.st)>RULES.HIDDEN_ST}}
    ],d:{fy:YEAR},val:vEv},
    listed:{g:'Pénzügyi vagyon',l:'Tőzsdei részvény',ph:'pl. OTP, Richter, külföldi részvények',cls:'fin',cur:1,f:[
      {k:'cl',l:'Érték a záróárfolyamon',u:'m',s:'az év utolsó kereskedési napján'},
      {k:'avg',l:'Érték az átlagárfolyamon',u:'m',s:'a tárgyév utolsó 180 napjának forgalommal súlyozott átlaga; elhagyható (a 2026-os külön átlagár-választást a benyújtott javaslat elhagyta)'},
      {k:'huco',l:'Magyar társaság részvénye',t:'c'}
    ],val:vListed},
    cash:{g:'Pénzügyi vagyon',l:'Bankszámla, betét, készpénz',ph:'pl. bankszámlák',cls:'fin',cur:1,f:amt('Záró egyenleg','december 31-én'),val:function(a){return vSimple(a,'25. § (1)',0,1,'Záró egyenleg / névérték')}},
    bond:{g:'Pénzügyi vagyon',l:'Állampapír, kötvény',ph:'pl. MÁP Plusz',cls:'fin',cur:1,f:amt('Számított érték','tőzsdei: utolsó 20 kereskedési nap záróár-átlaga; nem forgalmazott: névérték'),val:function(a){return vSimple(a,'25. § (2)–(5), 39. § (2)',0.02,1,'20 napos záróár-átlag / névérték')}},
    fund:{g:'Pénzügyi vagyon',l:'Befektetési alap, ETF',ph:'pl. befektetési alapok',cls:'fin',cur:1,f:amt('Érték nettó eszközértéken','december 31-i nettó eszközérték × darabszám'),val:function(a){return vSimple(a,'25. § (4)',0.1,1,'Nettó eszközérték')}},
    crypto:{g:'Pénzügyi vagyon',l:'Kriptoeszköz',ph:'pl. bitcoin',cls:'fin',cur:1,f:amt('Érték a platform záróárfolyamán'),val:function(a){return vSimple(a,'25. § (12)',0.3,1,'Platform záróárfolyam')}},
    metal:{g:'Pénzügyi vagyon',l:'Befektetési arany, ezüst',ph:'pl. aranyrúd',cls:'fin',cur:1,f:amt('Érték a referenciaáron','színfém × nemzetközi referenciaár'),val:function(a){return vSimple(a,'25. § (13)',0.1,1,'Referenciaár')}},
    ins:{g:'Pénzügyi vagyon',l:'Biztosítás visszavásárlási értéke',ph:'pl. unit-linked',cls:'fin',cur:1,f:amt('Visszavásárlási érték','a szerződő vagyonában'),val:function(a){return vSimple(a,'25. § (8)',0.03,0,'Visszavásárlási érték')}},
    pens:{g:'Pénzügyi vagyon',l:'Nyugdíjbiztosítás',ph:'pl. nyugdíjbiztosítás',cls:'fin',cur:1,f:amt('Visszavásárlási érték','a biztosított vagyonában'),val:function(a){return vSimple(a,'25. § (9)',0.03,0,'Visszavásárlási érték')}},
    recv:{g:'Pénzügyi vagyon',l:'Adott kölcsön, követelés',ph:'pl. tagi kölcsön',cls:'fin',cur:1,f:[{k:'am',l:'Fennálló tőkeösszeg',u:'m'},{k:'bad',l:'Ebből behajthatatlan',u:'m'}],val:vRecv},
    deriv:{g:'Pénzügyi vagyon',l:'Származtatott ügylet (nyitott pozíció)',ph:'pl. CFD-pozíció',cls:'fin',cur:1,f:amt('Pozitív piaci érték','a szolgáltató december 31-i kimutatása'),val:function(a){return vSimple(a,'25. § (7)',0.2,1,'Pozitív piaci érték')}},
    opt:{g:'Pénzügyi vagyon',l:'Opciós jog',ph:'pl. munkavállalói opció',cls:'fin',cur:1,f:[{k:'mk',l:'Szokásos piaci érték',u:'m'},{k:'iv',l:'Belső érték',u:'m',s:'mögöttes érték − gyakorlási ár'},{k:'perf',l:'Jövőbeli személyes teljesítménytől függ, addig nem gyakorolható és nem ruházható át',t:'c'}],val:vOpt},
    art:{g:'Értékes ingóság',l:'Műtárgy, ékszer (egyedi darab)',ph:'pl. festmény',cls:'mov',cur:1,f:[{k:'am',l:'Szokásos piaci érték',u:'m'},{k:'biz',l:'Vállalkozásban (egyéni vállalkozó, őstermelő, adószámos magánszemély) használt, vagy költséget számol el utána',t:'c'}],val:function(a){return vMov(a,RULES.MOV_ART,'műtárgy, ékszer')}},
    coll:{g:'Értékes ingóság',l:'Gyűjtemény (együtt értékelve)',ph:'pl. bélyeggyűjtemény',cls:'mov',cur:1,f:[{k:'am',l:'A gyűjtemény együttes értéke',u:'m'},{k:'biz',l:'Vállalkozásban (egyéni vállalkozó, őstermelő, adószámos magánszemély) használt',t:'c'}],val:function(a){return vMov(a,RULES.MOV_ART,'gyűjtemény')}},
    veh:{g:'Értékes ingóság',l:'Jármű (autó, hajó, repülő)',ph:'pl. személyautó',cls:'mov',cur:1,f:[{k:'am',l:'Szokásos piaci érték',u:'m'},{k:'gt',l:'Fizetett gépjárműadó',u:'mft',s:'éves'},{k:'biz',l:'Vállalkozásban (egyéni vállalkozó, őstermelő, adószámos magánszemély) használt, vagy költséget számol el utána',t:'c'}],val:function(a){return vMov(a,RULES.MOV_VEH,'jármű')}},
    uf:{g:'Jogok és egyéb',l:'Haszonélvezeti vagy használati jog (Ön a jogosult)',ph:'pl. haszonélvezet a szülői házon',cls:'oth',f:[
      {k:'pv',l:'A terhelt vagyonelem számított értéke (100%)',u:'mft'},
      {k:'ufm',l:'A jog időtartama',t:'s',o:[['life','Élethosszig'],['term','Határozott időre']],rr:1},
      {k:'ufa',l:'Az Ön életkora',u:'év',w:function(a){return a.ufm!=='term'}},
      {k:'uft',l:'Hátralévő időtartam',u:'év',w:function(a){return a.ufm==='term'}},
      {k:'hup',l:'Magyarországi ingatlanon áll fenn',t:'c'}
    ],d:{ufm:'life',hup:true},val:vUf},
    mrp:{g:'Jogok és egyéb',l:'MRP-részesedés',ph:'pl. munkavállalói résztulajdonosi program',cls:'oth',f:[{k:'am',l:'A részesedés értéke',u:'mft'},{k:'spec',l:'Különleges MRP (nem a „sima” MRP)',t:'c'}],val:vMrp},
    other:{g:'Jogok és egyéb',l:'Egyéb vagyonelem (szokásos piaci érték)',ph:'pl. önkéntes pénztári számla',cls:'oth',cur:1,f:amt('Szokásos piaci érték','a törvény által nem nevesített elem: 13. §'),val:function(a){return vSimple(a,'13. §',0.15,0,'Szokásos piaci érték')}}
  };
  var COMMON=[['own'],['reg'],['alloc'],['sh'],['cur'],['name'],['tr'],['col']];

  /* ---------- Értékelési szabályok ---------- */
  function shareOf(a){return TYPES[a.t]&&TYPES[a.t].sh?(has(a.sh)?Math.min(100,Math.max(0,n(a.sh))):100)/100:1}
  function pct(v){return Math.max(0,Math.min(100,n(v)))/100}
  function qtOf(a){return shareOf(a)+pct(a.ish)+pct(a.rel)}
  function itv72(V,mode,age,term){
    V=fin(V);var y=V/20,k,t;
    if(mode==='term'){k=Math.min(Math.max(fin(term),0),20);t='évi érték '+M(y)+' × '+f1.format(k)+' év'}
    else{age=fin(age);k=age<25?10:age<=50?8:age<=65?6:4;t='évi érték '+M(y)+' × '+k+' ('+f0.format(age)+' éves jogosult)'}
    return {v:y*k,t:'Itv. 72. §: '+t};
  }
  function vReHu(a,kind){
    var st=[],fl=[],unc=0,V=0,rf,meth,m=a.m||'tx12';
    if(m==='tx12'){V=n(a.tx);meth='12 hónapon belüli ügyleti érték';rf='19. § (1) a), 21. § (1)';st.push('Ügyleti érték: '+M(V))}
    else if(m==='idx'){
      var b=n(a.iv),y=Math.round(n(a.iy)),r=Math.max(-0.99,n(a.ir)/100),yrs=!y||y>=YEAR?0:(kind==='lak'||kind==='fold'?YEAR-y+0.5:YEAR-y);
      V=fin(b*Math.pow(1+r,yrs));unc=0.08;meth='Indexált ügyleti érték';rf='19. § (1) b), (3)–(5), 2. melléklet';
      st.push('Indexálás: '+M(b)+' × (1 '+(r<0?'−':'+')+' '+f1.format(Math.abs(r*100))+'%)^'+f1.format(yrs)+' év = '+M(V)+(kind==='lak'||kind==='fold'?' (negyedéves/éves ármutató-hányados közelítése fél évvel)':' (az ügylet évét követő évtől, egész évek)'));
      if(!y) fl.push(['w','Adja meg az ügylet évét.']);
      else if(y<YEAR-9) fl.push(['c','Az ügylet több mint 10 éve volt: indexált érték nem alkalmazható, NAV-modell vagy szakértői érték kell.'+ref('19. § (1) b)')]);
      else if(y>=YEAR) fl.push(['w','Idei ügyletnél az ügyleti érték indexálás nélkül alkalmazandó.'+ref('21. § (1)')]);
      fl.push(['i','A végleges indexált értéket a NAV kalkulátorával kell számolni '+(kind==='lak'?'(MNB-lakásárindex)':kind==='fold'?'(KSH termőföldár)':'(KSH-árindex)')+'; itt becsült éves változással számolunk; az indexált értéket ezer forintra kerekítve kell megállapítani.'+ref('19. § (4), (7)')]);
      if(kind==='fold') fl.push(['i','Termőföld csak szántó, rét, legelő, szőlő, gyümölcsös vagy erdő művelési ágban indexálható, és csak ha a művelési ág az ügylet óta nem változott; egyébként NAV-modell vagy szakértői érték kell.'+ref('2. mell. 3.2., 3.6.')]);
      if(kind==='egy'||kind==='udulo') fl.push(['i','Nem lakás és nem termőföld: az indexálás a KSH ingatlantípusra alkalmazható éves árindexével, a NAV kalkulátorával történik (a 2. melléklet MNB-, illetve KSH-termőföld-indexe itt nem alkalmazható).'+ref('19. § (4)–(5), 2. mell. 1.4.')]);
    }
    else if(m==='model'){V=n(a.mv);unc=0.15;meth='NAV tömeges modell / becsült érték';rf='19. § (1) c), 21. § (3), 22. §';st.push('NAV-modell vagy becsült piaci érték: '+M(V));
      fl.push(['i','A NAV-modell ott alkalmazandó, ahol nincs 10 éven belüli ügyleti érték; lakásra, üdülőre, telekre és felépítmény nélküli mezőgazdasági ingatlanra létezik. Helyette független szakértői érték is választható, ami bírságvédelmet ad; valós adatokkal használt modellnél a NAV csak az adatok valótlanságának bizonyításával térhet el.'+ref('5. § 31. pont, 21. § (3)–(4), 31. § (2), (4)')])}
    else{V=n(a.ev);unc=0.05;meth='Független szakértői forgalmi érték';rf='21. § (4), 23. §';st.push('Szakértői forgalmi érték: '+M(V));
      if(V>=500) fl.push(['w',kind==='fold'?'500 M Ft-ot elérő (kiemelt értékű) termőföldet termőföld-értékbecslő igazságügyi szakértő értékelhet, legalább két módszerrel.'+ref('23. § (1) b), (11)'):'500 M Ft-ot elérő (kiemelt értékű) ingatlant csak igazságügyi ingatlanforgalmi szakértő értékelhet, legalább két módszerrel.'+ref('23. § (3), (11)')]);
      fl.push(['i','Az értékelésnek a tárgyév utolsó napjára kell szólnia; legfeljebb 12 hónappal korábbi értéknap is elfogadható, ha azóta nem volt lényeges változás; 10 évig a NAV kalkulátorával indexálható.'+ref('23. § (8)–(9)')]);
      fl.push(['i','Szabályszerű szakértői értéknél a NAV magasabb értéke után sem jár bírság és pótlék.'+ref('31. § (2)–(3)')]);
      fl.push(['i',a.mand?'Kötelezően igénybe vett értékelés: díjának 50%-a (legfeljebb 2 M Ft, áfával) levonható az adóból – írja be az 5. pontban.'+ref('12. § (2) a), 21. § (4)'):'Ha az ingatlanra van ügyleti, indexált vagy NAV-modell szerinti érték, a szakértő önként választott, és díja nem vonható le: a levonás csak a kötelezően igénybe vett értékelőre jár. Ha nincs ilyen érték, jelölje be a fenti négyzetet.'+ref('12. § (2) a), 21. § (4)')]);
      fl.push(['w','Ha a fordulónapot megelőző 12 hónapban adásvétel vagy öröklés történt, a szakértői érték csak kivételesen, az ügylet sajátos körülményeinek igazolásával alkalmazható az ügyleti érték helyett.'+ref('21. § (4)')])}
    if(a.chg&&(m==='tx12'||m==='idx')) fl.push(['c',m==='tx12'?'Lényeges állapotváltozás után az ügyleti érték nem alkalmazható: szakértői forgalmi érték kell.'+ref('21. § (1)'):'Lényeges állapotváltozás után az indexált érték nem alkalmazható: a NAV-modell szerinti érték, ennek hiányában szakértői forgalmi érték kell.'+ref('19. § (3), 21. § (3)–(4)')]);
    var sh=shareOf(a),v=V*sh;if(sh!==1) st.push('Tulajdoni hányad '+P(sh*100)+': '+M(v));
    if(a.uf){var u=itv72(V,a.ufm,n(a.ufa),n(a.uft)),d=Math.min(v,u.v*sh);v-=d;st.push('Haszonélvezet levonása: − '+M(d)+' ('+u.t+')');rf+=', 26. § (5)';
      if(a.ufm!=='term'&&!has(a.ufa)) fl.push(['w','Adja meg a haszonélvező életkorát.']);
      if(a.ufm==='term'&&!has(a.uft)) fl.push(['w','Adja meg a jog hátralévő időtartamát.']);
      fl.push(['i','A jog értéke akkor vonható le, ha a számított érték a jog figyelmen kívül hagyásával készült (pl. a jogot az ügylet után alapították, vagy NAV-modell).'+ref('26. § (5)')])}
    return {v:v,vHu:v,inc:true,liq:0,cls:'re',unc:unc,st:st,ref:rf,cr:nn(a.lt),fl:fl,meth:meth};
  }
  function vReKulf(a){
    var r=fx(a.cur),m=a.m||'acq',V=0,st=[],fl=[],unc=0,rf,meth;
    if(m==='acq'){
      var g=a.gm==='idx'?n(a.gi)/100:0.03,y=Math.round(n(a.ay)),yrs=y?Math.max(0,YEAR-y):0,b=n(a.av)*r;
      V=fin(b*Math.pow(1+g,yrs));meth='Szerzési érték továbbvezetve ('+(a.gm==='idx'?'helyi index':'évi 3%')+')';rf='20. § (1)–(3)';
      st.push('Szerzési érték: '+curTxt(n(a.av),a.cur,r));
      st.push('Továbbvezetés '+yrs+' évre '+(a.gm==='idx'?'('+P(g*100)+'/év)':'(3%/év)')+': '+M(V));
      if(n(a.inv)){var iy=has(a.invy)?Math.round(n(a.invy)):YEAR,iv=fin(n(a.inv)*r*Math.pow(1+g,Math.max(0,YEAR-iy)));V+=iv;st.push('Értéknövelő beruházás ('+iy+'): + '+M(iv))}
      if(!y) fl.push(['w','Adja meg a szerzés évét.']);
      fl.push(['i','Ha az ingatlan valós értéke alacsonyabb a továbbvezetett értéknél, helyi szakértői értékkel igazolható.'+ref('20. § (6)')]);
    } else if(m==='off'){V=n(a.ov)*r;unc=0.05;meth='Helyi hatósági érték';rf='20. § (4)';st.push('Hatósági érték: '+curTxt(n(a.ov),a.cur,r))}
    else{V=n(a.ev)*r;unc=0.05;meth='Helyi szakértői forgalmi érték';rf='20. § (5)–(6), 23. § (2)';st.push('Szakértői érték: '+curTxt(n(a.ev),a.cur,r));
      fl.push(['i',a.mand?'Kötelezően igénybe vett értékelés: díjának 50%-a (legfeljebb 2 M Ft) levonható az adóból.'+ref('12. § (2) a), 20. § (5)'):'Ha a szerzési vagy hatósági érték megállapítható, a szakértői érték a 20. § (6) szerinti választás, és a díj nem vonható le; ha egyik sem, jelölje be a fenti négyzetet.'+ref('12. § (2) a), 20. § (5)–(6)')])}
    var sh=shareOf(a),v=V*sh;if(sh!==1) st.push('Tulajdoni hányad '+P(sh*100)+': '+M(v));
    if(a.cur&&a.cur!=='HUF') fl.push(['i','Az átszámítás az MNB december 31-i hivatalos árfolyamán történik.'+ref('14. §')]);
    return {v:v,vHu:0,inc:true,liq:0,cls:'re',unc:unc,st:st,ref:rf,cr:nn(a.lt),fl:fl,meth:meth,tr:1};
  }
  function coCore(a,kulf,ev){
    var r=kulf?fx(a.cur):1,st=[],fl=[],rf=ev?'16. §, 1. melléklet':kulf?'15. § (3), (8), 1. melléklet':'15. § (3), 1. melléklet';
    var ST=n(a.st)*r,RT=n(a.rt)*r,DT=has(a.dtl)?n(a.dtl)*r:0.15*RT,DIV=ev?0:n(a.div)*r;
    var ae=['ae1','ae2','ae3'].filter(function(k){return has(a[k])}).map(function(k){return n(a[k])*r});
    var Tc=kulf&&has(a.T)&&n(a.T)>0?n(a.T)/100:RULES.CAP_RATE;
    var avg=ae.length?ae.reduce(sum,0)/ae.length:0,STa=ST<0?0:ST;
    if(ST<0) st.push((ev?'Negatív nettó vállalkozási vagyon ':'Negatív saját tőke ')+M(ST)+' → nullának tekintendő, a hozamértéket nem csökkenti (1. mell. V. a))');
    if(ST>RULES.HIDDEN_ST){var hr=Math.max(0,RT-DT);STa=ST+hr;st.push((ev?'Nettó vállalkozási vagyon ':'Saját tőke ')+M(ST)+' > 500 M Ft → + rejtett tartalék ('+M(RT)+' − halasztott adó '+M(DT)+(has(a.dtl)?'':' [becslés hiányában a rejtett tartalék 15%-a, 5. § 15. pont]')+') = '+M(STa));
      if(!has(a.rt)) fl.push(['w','500 M Ft feletti '+(ev?'nettó vállalkozási vagyonnál':'saját tőkénél')+' a rejtett tartalékkal növelt érték számít: adja meg a befektetett ingatlanok, részesedések és értékpapírok piaci és könyv szerinti értékének különbözetét.'+ref('1. melléklet IV. b)–c)')])}
    else st.push((ev?'Nettó vállalkozási vagyon: ':'Saját tőke: ')+M(ST));
    if(DIV>0){STa=Math.max(0,STa-DIV);st.push('Mérlegfordulónap után jóváhagyott osztalék: − '+M(DIV)+' → '+M(STa))}
    var H=avg<0?0:avg/Tc,mode='I. pont';
    if(!ae.length) fl.push(['w','Adjon meg legalább egy lezárt év adózott eredményét.']);
    st.push('Átlagos adózott eredmény '+M(avg)+(ae.length&&ae.length<3?' ('+ae.length+' év adatából)':'')+(avg<0?' negatív → H = 0':' → H = '+M(avg)+' ÷ '+f1.format(Tc*100)+'% = '+M(H)));
    var fy=fyOf(a),fd=has(a.fd)?Math.round(n(a.fd)):0,V100;
    if(a.simp&&!ev&&ST<=100){V100=Math.max(0,ST);mode='egyszerűsített (saját tőke)';st.push('Egyszerűsített értékelés (ST ≤ 100 M Ft): V = a beszámoló szerinti saját tőke = '+M(V100)+' (15. § (9))')}
    else if(a.hold&&!ev){V100=STa;mode='II. pont (holding)';st.push('Holding: V = ST = '+M(V100))}
    else{
      if(fd&&fy-fd<=2&&fy-fd>=0){if(ST<=RULES.HIDDEN_ST&&!(H>0.25*ST)){H=0;mode='III. pont (induló cég)';st.push('Alapítás '+fd+', beszámoló '+fy+' → induló időszak, H = 0')}
        else fl.push(['i','Jogelőd nélkül alapított cég, de az induló kedvezmény nem jár, mert '+(ST>RULES.HIDDEN_ST?'a saját tőke meghaladja az 500 M Ft-ot':'a hozamérték meghaladja a saját tőke 25%-át')+'.'+ref('1. melléklet III.')])}
      V100=(STa+2*H)/3;st.push('V = ('+M(STa)+' + 2 × '+M(H)+') ÷ 3 = '+M(V100));
    }
    return {r:r,st:st,fl:fl,rf:rf,ST:ST,V100:fin(V100),mode:mode,fy:fy};
  }
  function vCo(a,kulf){
    var c=coCore(a,kulf,false),st=c.st,fl=c.fl,rf=c.rf,V100=c.V100,meth='Törvényi képlet, '+c.mode,r=c.r;
    if(a.tx&&!(n(a.txv)>0)) fl.push(['w','Adja meg a tranzakciós értéket (100%-ra vetítve), különben a képlet szerinti érték számít.']);
    if(a.tx&&n(a.txv)>0){V100=n(a.txv)*r;meth='Tranzakciós ár';st.push('Független felek közötti, 10% feletti eladás ára (100%-ra): '+M(V100));rf+=', V. e)'}
    var q=shareOf(a),v=V100*q,disc=0;
    if(q!==1) st.push('Tulajdoni hányad '+P(q*100)+': '+M(v));
    var qt=qtOf(a);
    var discOK=!a.simp&&!(a.tx&&n(a.txv)>0);
    if(q>0&&qt<0.5&&a.disc&&!discOK) fl.push(['i','Kisebbségi diszkont csak az 1. melléklet I–III. pontja szerinti értékre alkalmazható – az egyszerűsített (15. § (9)) és a tranzakciós áron alapuló (V. e)) értéknél nem.'+ref('1. mell. V. d)')]);
    if(q>0&&qt<0.5&&a.disc&&discOK){disc=qt>=0.33?0.25:0.30;v*=1-disc;st.push('Kisebbségi diszkont − '+f0.format(disc*100)+'% (közvetlen + közvetett + közeli hozzátartozói hányad '+P(qt*100)+'; a 33%-os küszöböt az összeszámított hányadra mérjük): '+M(v));rf+=', V. d)'}
    else if(q>0&&qt<0.5&&discOK) fl.push(['i','50% alatti (közvetlen + közvetett + közeli hozzátartozói) részesedésnél '+(qt>=0.33?'25':'30')+'%-os kisebbségi diszkont választható.'+ref('1. melléklet V. d)')]);
    else if(q>0&&q<0.5&&qt>=0.5) fl.push(['i','A közvetett és a közeli hozzátartozói hányaddal együtt a részesedés eléri az 50%-ot, ezért kisebbségi diszkont nem alkalmazható (a benyújtott javaslat a Ptk. szerinti közeli hozzátartozók részesedését összeszámítja; az élettársét nem).'+ref('1. mell. V. d)')]);
    if(!a.simp&&!a.hold&&!a.val&&!a.tx&&has(a.st)&&c.ST*r<=100) fl.push(['i','Legfeljebb 100 M Ft saját tőkénél a képlet helyett választható az egyszerűsített értékelés: a saját tőke tulajdoni hányadra jutó része.'+ref('15. § (9)')]);
    if(a.val){v=n(a.vv)*r;meth='Független cégértékelés';st=['Független cégértékelés (legalább két módszer): '+M(v)];rf='15. § (4)–(7)'}
    if(kulf) fl.push(['i','Nem a magyar számviteli törvény szerinti beszámolónál saját tőke = eszközök és kötelezettségek különbözete (nettó eszközérték), adózott eredmény = a bevételek és ráfordítások jövedelemadóval csökkentett különbözete.'+ref('1. mell. IV. d)')]);
    if(kulf&&c.ST>RULES.HIDDEN_ST&&!has(a.rt)&&!a.val) fl.push(['c','Külföldi társaságnál, ha a rejtett tartalék adatai nem állnak rendelkezésre, független cégértékelés kötelező.'+ref('15. § (8)')]);
    if(!kulf&&c.ST>RULES.HIDDEN_ST) fl.push(['i','Az 500 M Ft feletti saját tőkéjű belföldi társaság a tulajdonos kérésére közli a rejtett tartalék adatait; könyvvizsgálói felülvizsgálat nem szükséges, ha a piaci értéket a törvény szerinti számítással állapítják meg.'+ref('34. § (1)–(2), 1. mell. IV. c)')]);
    if(c.fy>=YEAR&&!a.val&&!a.tx) fl.push(['i','A 2026-os adóhoz a bevalláskor elérhető utolsó lezárt beszámoló számít – naptári üzleti évnél már a 2026-os. A 2026-os eredmény és osztalékdöntés tehát még alakítja az értéket.'+ref('5. § 40. pont')]);
    var hd=kulf&&a.ivt&&has(a.hdebt)?Math.min(n(a.hre)*r,n(a.hdebt)*r):0,vHu=kulf?(a.ivt&&has(a.hre)?Math.max(0,n(a.hre)*r-hd)*q:0):v;
    if(kulf&&!a.ivt) fl.push(['i','Külföldi illetőségű adóalanynál a külföldi társaság részesedése csak akkor adóköteles, ha a társaság belföldi ingatlanvagyonnal rendelkező társaság (Itv. 102. § (1) o)); belföldi illetőségűnél a teljes számított érték adóköteles.'+ref('7. § (2) d), 5. § 5. pont, 18. §')]);
    if(kulf&&a.ivt&&has(a.hre)) st.push('Külföldi illetőségűnél: belföldi ingatlanok '+M(n(a.hre)*r)+(hd?' − kapcsolódó tartozás '+M(hd):'')+' × '+P(q*100)+' = '+M(vHu)+' (18. §)');
    var unc=(a.val||a.tx)?0.03:(c.fy>=YEAR?0.10:0.02);
    return {v:Math.max(0,fin(v)),vHu:Math.max(0,fin(vHu)),inc:true,liq:0,cls:'co',unc:unc,st:st,ref:rf,cr:0,fl:fl,meth:meth,tr:kulf?1:0};
  }
  function vEv(a){
    var c=coCore(a,false,true);
    c.fl.push(['i','Csak a vállalkozói jövedelem szerint adózó egyéni vállalkozónál; átalányadózónál és őstermelőnél elemenként kell értékelni.'+ref('16. § (4)')]);
    return {v:Math.max(0,c.V100),vHu:0,inc:true,liq:0,cls:'co',unc:c.fy>=YEAR?0.1:0.02,st:c.st,ref:c.rf,cr:0,fl:c.fl,meth:'Törvényi képlet, '+c.mode};
  }
  function vListed(a){
    var r=fx(a.cur),cl=n(a.cl)*r,av=has(a.avg)?n(a.avg)*r:0,v=cl,st=['Záróárfolyamon: '+curTxt(n(a.cl),a.cur,r)],meth='Záróárfolyam';
    if(av>0&&Math.abs(cl-av)/av>0.10){v=av;meth='Átlagárfolyam';st.push('A záróár több mint 10%-kal eltér az átlagtól → átlagárfolyamon: '+M(av))}
    return {v:v,vHu:a.huco?v:0,inc:true,liq:1,cls:'fin',unc:0.15,st:st,ref:'15. § (1)–(2)',cr:0,fl:[],meth:meth};
  }
  function vSimple(a,rf,unc,liq,meth){var r=fx(a.cur),v=nn(a.am)*r;return {v:v,vHu:0,inc:true,liq:liq,cls:TYPES[a.t].cls,unc:unc,st:[meth+': '+curTxt(n(a.am),a.cur,r)],ref:rf,cr:0,fl:[],meth:meth}}
  function vRecv(a){var r=fx(a.cur),p=nn(a.am)*r,b=nn(a.bad)*r,v=Math.max(0,p-b);return {v:v,vHu:0,inc:true,liq:0,cls:'fin',unc:0,st:['Tőkeösszeg '+M(p)+(b?' − behajthatatlan '+M(b):'')+' = '+M(v)],ref:'25. § (6)',cr:0,fl:[],meth:'Tőkeösszeg'}}
  function vOpt(a){var r=fx(a.cur),mk=nn(a.mk)*r,iv=nn(a.iv)*r,v=a.perf?0:Math.max(mk,iv);
    return {v:v,vHu:0,inc:!a.perf,why:'teljesítményhez kötött, nem gyakorolható opció – nem kell figyelembe venni (27. § (7))',liq:0,cls:'fin',unc:0.2,st:a.perf?['Teljesítményhez kötött, nem gyakorolható és nem átruházható → 0']:['Piaci érték '+M(mk)+' és belső érték '+M(iv)+' közül a magasabb: '+M(v)],ref:'27. §',cr:0,fl:[],meth:'Piaci és belső érték közül a magasabb'}}
  function vMov(a,lim,what){var r=fx(a.cur),v=nn(a.am)*r,inc=v>lim||!!a.biz;
    return {v:v,vHu:0,inc:inc,why:'személyes használati tárgy, '+what+' '+lim+' M Ft-os értékhatár alatt (9. § (3))',liq:0,cls:'mov',unc:0.2,st:['Szokásos piaci érték: '+curTxt(n(a.am),a.cur,r)+(inc?(a.biz&&v<=lim?' – vállalkozásban használt, teljes értéken (9. § (4))':''):' – értékhatár alatt, nem adóköteles')],ref:'9. § (3)–(4), 24. §',cr:nn(a.gt),fl:inc&&!a.biz?[['i','Ingóságnál az elsődleges érték a 12 hónapon belüli vételár, majd összehasonlító ár, végül piaci biztosítási érték; szakértői érték választható.'+ref('24. § (2)–(3)')]]:[],meth:'Szokásos piaci érték'}}
  function vUf(a){var u=itv72(n(a.pv),a.ufm,n(a.ufa),n(a.uft)),fl=[];if(a.ufm!=='term'&&!has(a.ufa)) fl.push(['w','Adja meg az életkorát.']);
    return {v:u.v,vHu:a.hup?u.v:0,inc:true,liq:0,cls:'oth',unc:0.1,st:['Terhelt vagyonelem '+M(n(a.pv))+' → '+u.t+' = '+M(u.v)],ref:'26. § (1)–(2), Itv. 72. §',cr:0,fl:fl,meth:'Illetéktörvény 72. § szerinti érték'}}
  function vMrp(a){var v=n(a.am);return {v:v,vHu:0,inc:!!a.spec,why:'nem különleges MRP – nem kell figyelembe venni (9. § (5))',liq:0,cls:'oth',unc:0.1,st:['Részesedés értéke: '+M(v)+(a.spec?'':' – sima MRP, kimarad')],ref:'9. § (5), 17. § (9)',cr:0,fl:[],meth:'MRP'}}
  function valOf(a){try{if(!TYPES[a.t])throw new Error('type');var r=TYPES[a.t].val(a);r.v=fin(r.v);r.vHu=fin(r.vHu);r.cr=fin(r.cr);return r}catch(e){return {v:0,vHu:0,inc:false,why:'hibás adat',liq:0,cls:'oth',unc:0,st:[],ref:'',cr:0,fl:[['w','Hiányos adat.']],meth:'—'}}}
  function typeLabel(a){return TYPES[a.t]?TYPES[a.t].l:'Vagyonelem'}

  /* ---------- Adóalanyok, tulajdon ---------- */
  function residency(){var p=S.p;if(p.cit==='y')return p.ab==='y'?{bel:false,code:'kul10'}:{bel:true,code:'bel'};return p.fst==='res'?{bel:true,code:'bel_kulf'}:{bel:false,code:'kul_'+p.fst}}
  function bvkRes(b,res){if(b.law!=='kulf')return {bel:true,why:'magyar jogú: mindig belföldi illetőségű (5. § 4. pont)'};if(b.ctrl!=='kulf')return {bel:true,why:'a tényleges irányítás Magyarországon van (5. § 38. pont)'};return {bel:false,why:'külföldi jog, külföldi irányítás'+(res.bel?' – belföldi vagyonrendelőnél a vélelmet meg kell dönteni':'')}}
  function ownerOpts(){var o=[['me','Ön']];if(S.p.mar)o.push(['sp','Házastárs'],['joint','Házastársi közös – fele-fele'],['jointc','Közös, egyikük nevén nyilvántartva']);o.push(['minor','Kiskorú gyermek (szülőnél adózik)'],['minorinh','Kiskorú gyermek öröksége / keresménye']);S.bvks.forEach(function(b){o.push(['bvk:'+b.id,'BVK: '+(b.name||'névtelen')])});return o}
  function ownerName(own){var o=ownerOpts().filter(function(x){return x[0]===own})[0];return o?o[1]:'Ön'}
  function alloc(own,a,ctx){
    if(own&&own.indexOf('bvk:')===0){if(ctx.flat)return [['me',1]];return ctx.tp[own]?[[own,1]]:[['me',1]]}
    var mar=S.p.mar;
    switch(own){
      case 'sp':return mar?[['sp',1]]:[['me',1]];
      case 'joint':return mar?[['me',0.5],['sp',0.5]]:[['me',1]];
      case 'jointc':if(!mar)return [['me',1]];var ch=ctx.choice&&ctx.choice[a.id]?ctx.choice[a.id]:(a.alloc==='reg'?'reg':'half');return ch==='reg'?[[a.reg==='sp'?'sp':'me',1]]:[['me',0.5],['sp',0.5]];
      case 'minor':if(!S.p.cust)return [['me',1]];return mar?[['me',0.5],['sp',0.5]]:[['me',0.5]];
      case 'minorinh':return [['ch',1]];
      default:return [['me',1]];
    }
  }

  /* Megjegyzés: a fl[][1] figyelmeztető szövegek konstansok (+ ref() escape-elve) és escape nélkül kerülnek innerHTML-be –
     felhasználói eredetű szöveget (név stb.) csak esc()-pel szabad beléjük fűzni. */
  /* ---------- Számítás ---------- */
  var VC=Object.create(null);
  function compute(ctx){
    ctx=ctx||{};var res=residency(),tp={},order=[];
    function add(id,name,kind,bel,x){var t={id:id,name:name,kind:kind,res:bel,gross:0,treaty:0,tdebt:0,tcr:0,debt:0,cr:0,fee:0,allow:LIMIT,items:[],debts:[],liq:0,illiq:0};for(var k in x)t[k]=x[k];tp[id]=t;order.push(id)}
    add('me','Ön','ind',res.bel);
    if(S.p.mar) add('sp','Házastárs','ind',S.p.spres==='bel'?true:S.p.spres==='kul'?false:res.bel);
    if(S.assets.some(function(a){return a.own==='minorinh'})) add('ch','Kiskorú gyermek','ind',res.bel);
    if(!ctx.flat) S.bvks.forEach(function(b){var br=bvkRes(b,res);add('bvk:'+b.id,b.name||'BVK','bvk',br.bel,{b:b,br:br})});
    S.assets.forEach(function(a){
      var r=VC[a.id]||(VC[a.id]=valOf(a)),sc=ctx.scale?fin(ctx.scale(a,r)):1;
      alloc(a.own,a,{tp:tp,choice:ctx.choice,flat:ctx.flat}).forEach(function(pf){
        var t=tp[pf[0]]||tp.me,f=pf[1],base=fin((t.res?r.v:r.vHu)*f*sc),incl=r.inc&&base>0;
        var why=!r.inc?r.why:(!t.res&&!(r.vHu>0)?'külföldi illetőségű adóalanynál nem adóköteles (7. § (2))':'');
        t.items.push({a:a,r:r,f:f,amt:incl?base:0,incl:incl,why:why,gross:fin(r.v*f*sc)});
        if(incl){t.gross+=base;t.cr+=(r.cr||0)*f;if(t.res&&a.tr&&r.tr){t.treaty+=base;t.tcr+=(r.cr||0)*f}if(r.liq)t.liq+=base;else t.illiq+=base}
      });
    });
    S.debts.forEach(function(d){
      var am=fin(nn(d.am)*fx(d.cur)),la=d.link?S.assets.filter(function(x){return x.id===d.link})[0]:null;
      var parts=(d.own==='jointc'&&la&&la.own==='jointc')?alloc(la.own,la,{tp:tp,choice:ctx.choice,flat:ctx.flat}):alloc(d.own,d,{tp:tp,choice:ctx.choice,flat:ctx.flat});
      parts.forEach(function(pf){
        var t=tp[pf[0]]||tp.me,x=am*pf[1],ok=true,why='';
        if(d.kind==='inf'){ok=false;why='nem okiratolt – nem vonható le (9. § (1))'}
        else if(!t.res){var li=d.link&&t.items.some(function(it){return it.a.id===d.link&&it.incl});if(!li){ok=false;why='külföldi illetőségűnél csak az adóköteles magyar vagyonelemhez közvetlenül kapcsolódó tartozás vonható le (9. § (2))'}}
        t.debts.push({d:d,amt:x,ok:ok,why:why});if(ok)t.debt+=x;
        if(ok&&d.link&&t.items.some(function(it){return it.a.id===d.link&&it.incl&&it.a.tr&&it.r.tr}))t.tdebt+=x;
      });
    });
    ['me','sp','ch'].forEach(function(id){if(tp[id])tp[id].fee=Math.min(nn(S.fee[id])*RULES.FEE_SHARE,RULES.FEE_CAP)});
    if(!ctx.flat){
      S.bvks.forEach(function(b){tp['bvk:'+b.id].fee=Math.min(nn(b.fee)*RULES.FEE_SHARE,RULES.FEE_CAP)});
      var rem=LIMIT;
      S.bvks.filter(function(b){return b.lnk}).slice().sort(function(x,y){return n(x.ord)-n(y.ord)}).forEach(function(b){var t=tp['bvk:'+b.id],net=Math.max(0,t.gross-t.debt),g=Math.min(net,rem);t.allow=g;t.shared=1;rem-=g});
    }
    var total=0;
    order.forEach(function(id){var t=tp[id];t.net=Math.max(0,t.gross-t.debt);t.base=Math.max(0,t.net-t.allow);t.raw=tax(t.base);t.trd=t.treaty>0?Math.max(0,Math.min(t.raw,tax(Math.max(0,t.treaty-t.tdebt-LIMIT)))-t.tcr):0;var av=Math.max(0,t.raw-t.trd);t.cred=Math.min(av,t.cr+t.fee);t.tax=Math.round((av-t.cred)*1000)/1000;total+=t.tax});
    return {tp:tp,order:order,total:fin(total),res:res};
  }
  function indTax(r){return ['me','sp'].reduce(function(s,id){return s+(r.tp[id]?r.tp[id].tax:0)},0)}
  function optimize(){
    var fixed=Object.create(null),ids=[];
    S.assets.forEach(function(a){if(a.own==='jointc'){if(a.alloc==='reg'||a.alloc==='half')fixed[a.id]=a.alloc;else{fixed[a.id]='half';ids.push(a.id)}}});
    var r0=compute({choice:fixed}),t0=indTax(r0),best=fixed,bt=t0;
    if(S.p.mar&&ids.length){
      if(ids.length<=10){for(var mask=1;mask<(1<<ids.length);mask++){var ch=Object.assign({},fixed);ids.forEach(function(id,i){ch[id]=(mask>>i)&1?'reg':'half'});var t=indTax(compute({choice:ch}));if(t<bt-1e-9){bt=t;best=ch}}}
      else{ids.forEach(function(id){var ch=Object.assign({},best);ch[id]='reg';var t=indTax(compute({choice:ch}));if(t<bt-1e-9){bt=t;best=ch}})}
    }
    return {choice:best,saving:Math.max(0,t0-bt),ids:ids};
  }
  function growthScale(k){var g=S.g,G=function(p){return Math.pow(1+n(p)/100,k)};
    return function(a,r){if(a.t==='re_kulf'&&(a.m||'acq')==='acq')return Math.pow(1+(a.gm==='idx'?n(a.gi)/100:0.03),k);var c=r.cls;return c==='re'?G(g.re):c==='co'?G(g.co):c==='fin'?G(g.fin):G(g.oth)}}

  /* ---------- Figyelmeztetések ---------- */
  function globalFlags(r,opt,diff){
    var f=[],res=r.res,p=S.p;
    if(res.code==='bel') f.push(['i','Belföldi illetőségű: a teljes világvagyona adózik – külföldön élve is, kettős állampolgárként is, amíg nem él legalább 10 éve külföldön.'+ref('5. § 3. pont')]);
    if(res.code==='bel_kulf') f.push(['i','Magyarországon élő külföldi állampolgár: belföldi illetőségű, a világvagyona adózik.'+ref('5. § 3. pont')]);
    if(!res.bel) f.push(['i','Külföldi illetőségű: csak a magyarországi ingatlan, az ahhoz kapcsolódó jog, a magyar társasági részesedés és a magyar ingatlanos társaság részesedése adózik; tartozásból csak az ezekhez közvetlenül kapcsolódó vonható le.'+ref('7. § (2), 9. § (2)')]);
    if(res.code==='kul_post') f.push(['w','A kiküldetési kivétel csak a munkavégzés kezdetétől 5 évig él; a már itt dolgozóknál a hatálybalépéstől számít.'+ref('5. § 3. pont a), 38. § (1)')]);
    if(res.code==='kul_ltr') f.push(['w','A huzamos tartózkodási kivétel évente vizsgálandó: 183 nap felett belföldi illetőségűvé válik.'+ref('5. § 3. pont c)')]);
    if(res.code==='kul10') f.push(['w','A 10 éves külföldi életvitelt a tárgyév utolsó napjára kell igazolni (lakóhely, munka, család, illetőségigazolás).'+ref('5. § 3. pont b)')]);
    r.order.forEach(function(id){var t=r.tp[id];if(t.kind==='ind'&&t.allow-t.net>0&&t.allow-t.net<=200&&t.net>0) f.push(['w',esc(t.name)+': a nettó vagyon csak '+M(t.allow-t.net)+'-tal van a mentes sáv alatt – egy erős tőzsdei év vagy átértékelés átbillentheti.'])});
    if(r.total>0) f.push(['c','Bevallás és befizetés: 2027. augusztus 31., kötelezően elektronikusan, ezer forintra kerekítve. Bevallani csak fizetendő adó esetén kell.'+ref('29. §')]);
    r.order.forEach(function(id){var t=r.tp[id];if(t.tax>0&&t.gross>0&&t.illiq/t.gross>=0.5) f.push(['w',esc(t.name)+': a vagyon legalább fele nem likvid – ez fizetési könnyítésnél kedvező szempont (legfeljebb 12, kivételesen, különösen lakóingatlan vagy cégrészesedés után 24 hónap). Automatikus részletfizetés nincs.'+ref('30. §')])});
    if(opt&&opt.saving>0.0005) f.push(['c','Házastársi megosztás: a névre szóló közös elemek választható megosztásával évente '+FT(opt.saving)+' takarítható meg (a kalkulátor ezzel számol). Feltétel: azonos tartalmú nyilatkozat 2027. augusztus 31-ig.'+ref('10. § (2)–(3)')]);
    if(p.mar) f.push(['i','Házassági vagyonjogi szerződésnél annak megosztása irányadó; enélkül a névre szóló elemeknél választhatnak, a többi fele-fele adózik.'+ref('10. § (2)')]);
    if(S.assets.some(function(a){return a.own==='minor'})) f.push(['i','A kiskorú gyermek nem örökölt vagyona a szülői felügyeletet gyakorló szülőnél adózik, közös felügyeletnél a két szülőnél fele-fele – házasságtól függetlenül.'+(p.cust&&!p.mar?' A másik szülőre eső felét a kalkulátor nem számolja.':'')+ref('10. § (4)')]);
    if(p.mar&&p.spres!=='same') f.push(['i','A házastárs illetőségét külön adta meg: '+(p.spres==='bel'?'belföldi illetőségű, a ráeső teljes vagyon adózik.':'külföldi illetőségű, a ráeső hányadból csak a belföldi ingatlan és a magyar társasági részesedés adózik.')+ref('5. § 3. pont, 7. § (2), 10. §')]);
    if(S.assets.some(function(a){return a.own==='minorinh'})) f.push(['i','Az örökölt és a saját keresményből szerzett vagyon a gyermek saját adóalapjába tartozik, saját 1 Mrd Ft-os sávval.'+ref('10. § (5)')]);
    if(S.bvks.length){
      f.push(['c','A 2026. december 15-én már működő vagyonkezelési adóalanyt 2027. január 14-ig be kell jelenteni a NAV-hoz.'+ref('39. § (3)')]);
      f.push(['i','A BVK adóját a vagyonkezelő vallja be és a kezelt vagyonból fizeti meg; a kedvezményezett a kiadásig nem adózik utána.'+ref('33. §')]);
      if(diff>0.0005) f.push(['c','A BVK-szerkezet miatt évente kb. '+FT(diff)+'-tal több adó keletkezik, mint ha ugyanez a vagyon közvetlenül a vagyonrendelőé lenne'+(res.bel?'.':' – a magyar jogú BVK belföldi illetőségű, ezért a külföldi kezelt vagyon is adóköteles.')+ref('5. § 4. pont, 7. §')]);
      if(diff<-0.0005) f.push(['w','A BVK külön mentes sávja miatt a teher kb. '+FT(-diff)+'-tal kisebb, mint közvetlen tulajdonnál. Ez csak akkor tartható, ha nincs kapcsolt BVK, és a létrehozásnak adótól független, dokumentált indoka van.'+ref('4. § (1)–(3), 28. § (3)')]);
      S.bvks.forEach(function(b){if(b.law==='kulf'&&b.ctrl==='kulf'&&res.bel) f.push(['w',esc(b.name||'BVK')+': belföldi illetőségű vagyonrendelőnél a magyarországi irányítást vélelmezni kell; a külföldi döntéshozatalt iratokkal kell bizonyítani.'+ref('5. § 38. pont')])});
      if(S.bvks.filter(function(b){return b.lnk}).length>1) f.push(['i','Kapcsolt BVK-k: az 1 Mrd Ft-os sávot együtt egyszer alkalmazhatják; megosztásukhoz azonos tartalmú nyilatkozat kell, ennek hiányában a létrejöttük sorrendje dönt – a kalkulátor így számol.'+ref('28. § (4)–(6)')]);
      f.push(['w','Ha a BVK év közben megszűnik vagy teljesen kiadja a vagyont, ugyanaz a vagyon a BVK-nál és a kedvezményezettnél is adózhat.'+ref('5. § 35. pont c), 3. §')]);
    }
    (function(){var miss=[];['EUR','USD','CHF','GBP'].forEach(function(c){if(!(nn(S.fx[c])>0)&&(S.assets.some(function(a){return a.cur===c})||S.debts.some(function(d){return d.cur===c})))miss.push(c)});if(miss.length)f.push(['c','Hiányzó vagy nulla árfolyam: '+miss.join(', ')+' – a devizás tételek 0 Ft-tal szerepelnek. Adja meg az MNB december 31-i árfolyamot a 6. pontban.'+ref('14. §')])})();
    if(S.p.mar&&S.p.spres==='kul'&&S.assets.some(function(a){return a.own==='jointc'})) f.push(['w','Külföldi illetőségű házastársnál a névre nyilvántartott közös vagyonelem hozzá rendelése a magyar adóalapot csökkentheti; ez a 4. § szerinti rendeltetésszerű joggyakorlás vizsgálata alá eshet, ha nincs adótól független indoka.'+ref('4. § (1)–(3), 10. § (2) b)')]);
    if(res.bel&&S.assets.some(function(a){return a.tr&&TYPES[a.t]&&TYPES[a.t].tr})) f.push(['w','Egyezményi mentesítés: a levonás a mentesített külföldi vagyonra – a hozzá kapcsolódó tartozások és az 1 Mrd Ft-os sáv levonása után – jutó, a külföldön e vagyon után fizetett helyi adóval csökkentett adó; a kalkulátor így számol (példa: 3 Mrd belföldi + 2 Mrd mentesített külföldi vagyon → 40 M − 10 M = 30 M Ft). Ha az egyezmény a figyelembevételt sem engedi, a vagyonelemet ne vegye fel. Egyezményenként ellenőrizni kell, kiterjed-e a vagyonadóra.'+ref('11. § (2)–(3), 12. § (2) c)')]);
    if(r.total>0) f.push(['c','Vagyonátrendezés előtt: a NAV a vagyonadó köztudomásúvá válásától (az indokolás szerint 2026. május 14-től) vizsgálja, van-e az ügyletnek adótól független, valós gazdasági indoka.'+ref('4. § (1)–(3)')]);
    return f;
  }

  /* ---------- Megjelenítés: űrlap ---------- */
  function fieldHTML(kind,id,o,fd){
    var lab=typeof fd.l==='function'?fd.l(o):fd.l,sub=fd.s?'<span class="sub">'+esc(fd.s)+'</span>':'',sid=esc(id),fid='k'+kind+'_'+sid+'_'+esc(fd.k);
    var attr=' data-'+kind+'="'+sid+'" data-k="'+esc(fd.k)+'"'+(fd.rr?' data-rr="1"':'');
    if(fd.t==='c') return '<label class="chk"><input type="checkbox"'+attr+(o[fd.k]?' checked':'')+'> '+esc(lab)+'</label>';
    if(fd.t==='s') return '<div class="fld"><label for="'+fid+'">'+esc(lab)+'</label>'+sub+'<select class="sel" id="'+fid+'"'+attr+'>'+fd.o.map(function(x){return '<option value="'+esc(x[0])+'"'+(String(o[fd.k])===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>'}).join('')+'</select></div>';
    var unit=fd.u==='m'?U(o):fd.u==='mft'?'M Ft':fd.u;
    return '<div class="fld"><label for="'+fid+'">'+esc(lab)+'</label>'+sub+'<div class="inp"><input type="number" step="any" id="'+fid+'"'+attr+(fd.neg?'':' min="0"')+' inputmode="decimal" value="'+esc(o[fd.k]==null?'':o[fd.k])+'"><span>'+esc(unit)+'</span></div></div>';
  }
  function assetCard(a){
    var T=TYPES[a.t];if(!T)return '';
    var com=[{k:'own',l:'Tulajdonos',t:'s',o:ownerOpts(),rr:1}];
    if(a.own==='jointc'&&S.p.mar){com.push({k:'reg',l:'Kinek a nevén van nyilvántartva',t:'s',o:[['me','Ön'],['sp','Házastárs']]});com.push({k:'alloc',l:'Megosztás a házastársak között',t:'s',o:[['auto','A legkedvezőbb (a kalkulátor választja)'],['reg','Csak a nyilvántartott házastársnál'],['half','Fele-fele']]})}
    if(T.sh) com.push({k:'sh',l:'Tulajdoni hányad',u:'%',rr:1});
    if(T.cur) com.push({k:'cur',l:'Pénznem',t:'s',o:CURS,rr:1});
    var fs=com.concat(T.f).filter(function(fd){return !fd.w||fd.w(a)});
    var grid=fs.filter(function(fd){return fd.t!=='c'}).map(function(fd){return fieldHTML('a',a.id,a,fd)}).join('');
    var chks=fs.filter(function(fd){return fd.t==='c'}).map(function(fd){return fieldHTML('a',a.id,a,fd)}).join('');
    if(T.tr&&residency().bel) chks+=fieldHTML('a',a.id,a,{k:'tr',l:'Egyezmény szerint a fekvés állama adóztathatja, és az egyezmény kiterjed a vagyonadóra',t:'c'});
    var id=esc(a.id);
    return '<div class="kitem'+(a.col?' collapsed':'')+'" data-id="'+id+'" data-cls="'+esc(T.cls)+'">'+
      '<div class="ka-head"><span class="ka-type">'+esc(T.l)+'</span><input class="ka-name" id="kn_'+id+'" data-a="'+id+'" data-k="name" maxlength="80" value="'+esc(a.name||'')+'" placeholder="'+esc(T.ph||'Megnevezés')+'" aria-label="Megnevezés"><span class="ka-val" id="kv_'+id+'">—</span>'+
      '<button type="button" class="btn small" data-tog="'+id+'" aria-expanded="'+(a.col?'false':'true')+'">'+(a.col?'Megnyit':'Összecsuk')+'</button><button type="button" class="btn small" data-del="'+id+'">Törlés</button></div>'+
      '<div class="ka-body"><div class="grid3">'+grid+'</div>'+(chks?'<div class="kopts">'+chks+'</div>':'')+'<div class="ka-steps" id="ks_'+id+'"></div><div class="ka-flags" id="kfl_'+id+'"></div></div></div>';
  }
  var DKIND=[['loan','Okiratba foglalt hitel / kölcsön'],['legal','Jogszabályon, határozaton alapuló'],['opt','Opciós kötelezettség (a jogosult adatainak bevallásával)'],['inf','Nem okiratolt (nem vonható le)']];
  function debtCard(d){
    var links=[['','— nincs megjelölve —']].concat(S.assets.map(function(a){return [a.id,(a.name||typeLabel(a))]}));
    var fs=[{k:'own',l:'Adós',t:'s',o:ownerOpts().filter(function(x){return x[0]!=='minorinh'}),rr:1},{k:'am',l:'Fennálló összeg',u:'m'},{k:'cur',l:'Pénznem',t:'s',o:CURS,rr:1},{k:'kind',l:'Jogcím',t:'s',o:DKIND,rr:1},{k:'link',l:'Kapcsolódó vagyonelem',t:'s',o:links,s:'külföldi illetőségűnél kötelező'}];
    var id=esc(d.id);
    return '<div class="kitem" data-did="'+id+'" data-cls="debt"><div class="ka-head"><span class="ka-type">Tartozás</span><input class="ka-name" id="kdn_'+id+'" data-d="'+id+'" data-k="name" maxlength="80" value="'+esc(d.name||'')+'" placeholder="pl. lakáshitel" aria-label="Megnevezés"><span class="ka-val" id="kdv_'+id+'"></span><button type="button" class="btn small" data-ddel="'+id+'">Törlés</button></div><div class="ka-body"><div class="grid3">'+fs.map(function(fd){return fieldHTML('d',d.id,d,fd)}).join('')+'</div><div class="ka-flags" id="kdf_'+id+'"></div></div></div>';
  }
  function bvkCard(b){
    var fs=[{k:'law',l:'Irányadó jog',t:'s',o:[['hu','Magyar jog (Ptk. 6:310. §)'],['kulf','Külföldi jog (trust vagy hasonló)']],rr:1}];
    if(b.law==='kulf') fs.push({k:'ctrl',l:'Hol hozzák a meghatározó döntéseket?',t:'s',o:[['hu','Magyarországon'],['kulf','Külföldön, és ez iratokkal bizonyítható']],rr:1});
    fs.push({k:'ord',l:'Létrejöttének sorrendje',u:'#',s:'kapcsolt BVK-k sávmegosztásához (1 = legkorábbi)'},{k:'fee',l:'Kötelező értékelés díja',u:'M Ft',s:'50%-a, legfeljebb 2 M Ft vonható le'});
    var chk=fieldHTML('b',b.id,b,{k:'lnk',l:'Kapcsolt más BVK-val (azonos vagy hozzátartozó vagyonrendelő)',t:'c',rr:1});
    var id=esc(b.id);
    return '<div class="kitem" data-bid="'+id+'" data-cls="bvk"><div class="ka-head"><span class="ka-type">Bizalmi vagyonkezelés – önálló adóalany</span><input class="ka-name" id="kbn_'+id+'" data-b="'+id+'" data-k="name" data-rr="1" maxlength="80" value="'+esc(b.name||'')+'" placeholder="pl. Családi BVK" aria-label="Megnevezés"><span class="ka-val" id="kbv_'+id+'"></span><button type="button" class="btn small" data-bdel="'+id+'">Törlés</button></div><div class="ka-body"><div class="grid3">'+fs.map(function(fd){return fieldHTML('b',b.id,b,fd)}).join('')+'</div><div class="kopts">'+chk+'</div><div class="ka-steps" id="kbs_'+id+'"></div></div></div>';
  }
  function renderAddType(){var groups={},h='';Object.keys(TYPES).forEach(function(k){var g=TYPES[k].g;(groups[g]=groups[g]||[]).push(k)});Object.keys(groups).forEach(function(g){h+='<optgroup label="'+esc(g)+'">'+groups[g].map(function(k){return '<option value="'+k+'">'+esc(TYPES[k].l)+'</option>'}).join('')+'</optgroup>'});$('kAddType').innerHTML=h}
  function renderProfile(){
    var p=S.p;
    document.querySelectorAll('#kf [data-p]').forEach(function(el){var k=el.dataset.p;if(el.type==='radio')el.checked=String(p[k])===el.value;else if(el.type==='checkbox')el.checked=!!p[k]});
    $('kq-ab').hidden=p.cit!=='y';$('kq-fst').hidden=p.cit!=='n';$('kq-spres').hidden=!p.mar;
  }
  function renderAssets(){
    $('kAssets').innerHTML=S.assets.length?S.assets.map(assetCard).join(''):'<div class="kstart"><h3>Kezdjük: válassza ki az első vagyonelemet</h3><p>Lakás, cégrészesedés, bankszámla, értékpapír – minden elemet a törvényjavaslat saját szabálya szerint értékelünk, és azonnal látja a becsült adót. Ha csak körülnézne, töltsön be egy példát a fenti menüből.</p><div class="ksteps"><span><b>1</b>Vagyonelem hozzáadása</span><span><b>2</b>Értékek megadása</span><span><b>3</b>Tartozások, BVK</span><span><b>4</b>Eredmény és jelentés</span></div></div>';
    var add=document.querySelector('#kAssets + .kadd');if(add)add.classList.toggle('primary',!S.assets.length);
  }
  function renderDebts(){$('kDebts').innerHTML=S.debts.map(debtCard).join('')}
  function renderBvks(){$('kBvks').innerHTML=S.bvks.map(bvkCard).join('')}
  function renderFees(){
    var fs=[{k:'me',l:'Ön'}];if(S.p.mar)fs.push({k:'sp',l:'Házastárs'});if(S.assets.some(function(a){return a.own==='minorinh'}))fs.push({k:'ch',l:'Kiskorú gyermek'});
    $('kFees').innerHTML=fs.map(function(f){return fieldHTML('fee',f.k,S.fee,{k:f.k,l:'Értékelési díj – '+f.l,u:'M Ft',s:'számlával igazolt, kötelező értékelés'})}).join('');
  }
  function renderFx(){
    $('kFx').innerHTML=['EUR','USD','CHF','GBP'].map(function(c){return fieldHTML('fx',c,S.fx,{k:c,l:c+' árfolyam',u:'Ft'})}).join('');
    var G=[{k:'re',l:'Ingatlanok értékváltozása'},{k:'fin',l:'Pénzügyi vagyon hozama'},{k:'co',l:'Cégérték változása'},{k:'oth',l:'Ingóságok, egyéb'},{k:'yrs',l:'Előrejelzés hossza',u:'év'}];
    $('kProj').innerHTML=G.map(function(g){return fieldHTML('g',g.k,S.g,{k:g.k,l:g.l,u:g.u||'%/év',neg:g.k!=='yrs'})}).join('');
  }
  function renderAll(){VC=Object.create(null);renderProfile();renderAssets();renderDebts();renderBvks();renderFees();renderFx();renderRemember();recalc()}

  /* ---------- Megjelenítés: eredmény ---------- */
  var LAST=null;
  function recalc(){
    try{
      VC=Object.create(null);
      var opt=optimize(),r=compute({choice:opt.choice});
      var lo=compute({choice:opt.choice,scale:function(a,x){return 1-(x.unc||0)}}).total,hi=compute({choice:opt.choice,scale:function(a,x){return 1+(x.unc||0)}}).total;
      var diff=0;if(S.bvks.length){diff=r.total-compute({choice:opt.choice,flat:true}).total}
      var yrs=Math.max(1,Math.min(10,Math.round(n(S.g.yrs))||5)),proj=[];
      for(var k=0;k<yrs;k++){var pr=compute({choice:opt.choice,scale:growthScale(k)});proj.push({y:YEAR+k,tax:pr.total,net:fin(pr.order.reduce(function(s,id){return s+pr.tp[id].net},0))})}
      var sens=[-0.2,-0.1,0,0.1,0.2].map(function(d){return {d:d,tax:compute({choice:opt.choice,scale:function(){return 1+d}}).total}});
      var gf=globalFlags(r,opt,diff);
      LAST={r:r,opt:opt,lo:lo,hi:hi,diff:diff,proj:proj,sens:sens,gf:gf};
      paintItems(r,opt);paintSummary();paintDetail();linkRefs($('teszt'));save();
      $('kBar').classList.remove('err');
    }catch(e){
      if(window.console)console.error(e);
      $('kBar').classList.add('err');
      $('kStatus').innerHTML='<strong>Hiba a számításban.</strong> Próbálja az „Üres űrlap” vagy az „Adatok törlése” gombot, majd töltse be újra az oldalt.';
    }
  }
  function paintItems(r,opt){
    S.assets.forEach(function(a){
      var R=VC[a.id]||valOf(a),el=$('kv_'+a.id);if(!el)return;
      var taxable=0;r.order.forEach(function(id){r.tp[id].items.forEach(function(it){if(it.a===a)taxable+=it.amt})});
      el.textContent=M(R.v);el.className='ka-val'+(R.inc&&taxable>0?'':' out');el.title=R.inc&&taxable>0?'Adóköteles: '+M(taxable):(R.why||'nem adóköteles');
      var st=R.st.slice();
      if(a.own==='jointc'&&S.p.mar){var ch=opt.choice[a.id]||'half';st.push('Házastársi megosztás: '+(ch==='reg'?'csak '+(a.reg==='sp'?'a házastársnál':'Önnél'):'fele-fele')+((a.alloc||'auto')==='auto'?' (a kalkulátor választása)':''))}
      if(R.inc&&taxable<R.v-0.0005&&taxable>0) st.push('Adóköteles rész: '+M(taxable));
      if(!R.inc||taxable===0) st.push('Nem adóköteles: '+(R.inc?'külföldi illetőségű adóalanynál kimarad (7. § (2))':R.why));
      $('ks_'+a.id).innerHTML=st.map(esc).join('<br>')+(R.ref?'<br><span class="ref">'+esc(R.ref)+'</span>':'');
      $('kfl_'+a.id).innerHTML=R.fl.map(function(x){return '<div class="'+(x[0]==='i'?'':x[0])+'">'+x[1]+'</div>'}).join('');
    });
    S.debts.forEach(function(d){var el=$('kdv_'+d.id);if(!el)return;var am=fin(n(d.am)*fx(d.cur)),ok=0,why=[];r.order.forEach(function(id){r.tp[id].debts.forEach(function(x){if(x.d===d){if(x.ok)ok+=x.amt;else if(why.indexOf(x.why)<0)why.push(x.why)}})});
      el.textContent='− '+M(am);el.className='ka-val'+(ok>0?'':' out');$('kdf_'+d.id).innerHTML=why.map(function(w){return '<div class="w">'+esc(w)+'</div>'}).join('')});
    S.bvks.forEach(function(b){var t=r.tp['bvk:'+b.id],el=$('kbv_'+b.id);if(!t||!el)return;el.textContent=FT(t.tax);
      $('kbs_'+b.id).innerHTML='Illetőség: '+(t.res?'belföldi':'külföldi')+' – '+esc(t.br.why)+'<br>Adóköteles kezelt vagyon '+M(t.gross)+' − tartozás '+M(t.debt)+' = nettó '+M(t.net)+'<br>Mentes sáv: '+M(t.allow)+(t.shared?' (kapcsolt BVK-k közös sávjából)':'')+' → adóalap '+M(t.base)});
  }
  function badge(r){var mx=0,top=false;r.order.forEach(function(id){var t=r.tp[id];if(t.kind==='ind')mx=Math.max(mx,t.net/t.allow);if(t.base>TOP)top=true});
    if(r.total>0) return top?['b-crit','Kiemelten érintett · 1,5%-os sáv']:['b-crit','Érintett'];
    return mx>0.8?['b-warn','Határközelben']:['b-ok','Nem érintett']}
  function paintSummary(){
    var L=LAST,r=L.r,b=badge(r),me=r.tp.me;
    $('kBadge').className='badge '+b[0];$('kBadge').textContent=b[1];
    $('kTax').textContent=FT(r.total);
    var nt=r.order.length;$('kTaxLbl').textContent='becsült fizetendő vagyonadó, '+YEAR+(nt>1?' – '+nt+' adóalany együtt':'');
    var tb=r.order.reduce(function(s,id){return s+r.tp[id].base},0),tn=r.order.reduce(function(s,id){return s+r.tp[id].net},0);$('kBase').innerHTML='Adó alá eső vagyon (adóalap): <b>'+M(tb)+'</b><br>Nettó vagyon összesen: <b>'+M(tn)+'</b>';
    $('kRange').innerHTML=L.hi-L.lo>0.0005?'Becslési sáv: <b>'+FT(L.lo)+'</b> – <b>'+FT(L.hi)+'</b><br>a becsült értékek bizonytalansága alapján':'Az értékek alapján pontos számítás.';
    var gMax=Math.max(2000,me.net*1.25),thr=me.allow/gMax*100;
    $('kgFree').style.width=(Math.min(me.net,me.allow)/gMax*100)+'%';$('kgTax').style.width=(Math.max(0,me.net-me.allow)/gMax*100)+'%';
    $('kgMark').style.left='calc('+thr+'% - 1px)';var tl=$('kgThr');tl.style.left=thr+'%';tl.style.transform=thr<22?'none':'translateX(-50%)';$('kg0').hidden=thr<22;tl.textContent='1 Mrd mentes sáv';$('kgMax').textContent=M(gMax);
    $('kgNote').textContent='Ön: nettó vagyon '+M(me.net)+(me.base>0?', ebből '+M(me.base)+' adózik.':', '+M(me.allow-me.net)+' hiányzik a határig.');
    var rows=r.order.map(function(id){var t=r.tp[id];return '<div class="r-row"><span class="tpn">'+esc(t.name)+'<small>nettó '+M(t.net)+' · adóalap '+M(t.base)+'</small></span><span>'+FT(t.tax)+'</span></div>'});
    if(r.order.length>1) rows.push('<div class="r-row total"><span>Összesen</span><span>'+FT(r.total)+'</span></div>');
    $('kTps').innerHTML=rows.join('');
    var cls={},out={};r.order.forEach(function(id){r.tp[id].items.forEach(function(it){var c=it.r.cls;if(it.incl)cls[c]=(cls[c]||0)+it.amt;else out[c]=(out[c]||0)+it.gross})});
    var rowsM=Object.keys(CLS).filter(function(c){return cls[c]>0}).map(function(c){return {l:CLS[c],v:cls[c],inc:1}}).concat(Object.keys(CLS).filter(function(c){return out[c]>0}).map(function(c){return {l:CLS[c]+' – nem adóköteles',v:out[c],inc:0}})).sort(function(a,b){return b.v-a.v});
    var mx=rowsM.length?rowsM[0].v:1;
    $('kMix').innerHTML=rowsM.length?rowsM.map(function(c){return '<div class="mix-row'+(c.inc?'':' out')+'"><div class="mix-top"><span>'+esc(c.l)+'</span><span>'+M(c.v)+'</span></div><div class="mix-bar"><i data-w="'+Math.max(2,c.v/mx*100).toFixed(1)+'"></i></div></div>'}).join(''):'<p class="empty">Még nincs megadott vagyonelem.</p>';
    $('kMix').querySelectorAll('.mix-bar i').forEach(function(el){el.style.width=el.dataset.w+'%'});
    var all=allFlags(),top=all.filter(function(x){return x[0]==='c'}).concat(all.filter(function(x){return x[0]==='w'})).slice(0,4);
    $('kTop').innerHTML=top.length?top.map(function(x){return '<div class="flag '+(x[0]==='i'?'':x[0])+'">'+x[1]+'</div>'}).join(''):'<p class="empty">Nincs kiemelt teendő.</p>';
    var st=$('kStatus'),pre=S.src&&S.src.indexOf('preset:')===0?PRESETS[S.src.slice(7)]:null;
    st.innerHTML=pre?'<strong>Példaadatok:</strong> '+esc(pre.name)+'. Írja felül a sajátjával.':'<strong>Saját adatok</strong> – '+(remembering()?'ezen az eszközön megjegyezve.':'csak ebben a lapfülben, bezáráskor törlődnek.');
    var mt=$('kMiniTax'),mb=$('kMiniBadge');if(mt){mt.textContent=FT(r.total);mb.textContent=b[1]}
  }
  function allFlags(){var L=LAST,f=[];S.assets.forEach(function(a){var R=VC[a.id];if(!R)return;R.fl.forEach(function(x){if(x[0]!=='i')f.push([x[0],'<strong>'+esc(a.name||typeLabel(a))+':</strong> '+x[1]])})});return L.gf.concat(f)}
  function paintDetail(){
    var L=LAST,r=L.r,ids=r.order,T2=function(id){return r.tp[id]};
    function row(lbl,fn,cls){return '<tr'+(cls?' class="'+cls+'"':'')+'><td>'+lbl+'</td>'+ids.map(function(id){return '<td class="num">'+fn(T2(id))+'</td>'}).join('')+(ids.length>1?'<td class="num">'+(fn.tot?fn.tot():'')+'</td>':'')+'</tr>'}
    function tot(key,f){var g=function(t){return f(t[key])};g.tot=function(){return f(ids.reduce(function(s,id){return s+T2(id)[key]},0))};return g}
    var lev='<h4>Adóalap és adó adóalanyonként</h4><p class="kn">Minden adóalany külön mentes sávval számol. Az adó ezer forintra kerekítve.'+ref('9. §, 12. §, 29. § (7)')+'</p><table class="kt"><thead><tr><th scope="col"><span class="sr-only">Tétel</span></th>'+ids.map(function(id){var t=T2(id);return '<th scope="col" class="num">'+esc(t.name)+'<br><span class="thsub">'+(t.res?'belföldi':'külföldi')+' illetőségű</span></th>'}).join('')+(ids.length>1?'<th scope="col" class="num">Összesen</th>':'')+'</tr></thead><tbody>'+
      row('Adóköteles vagyon (számított érték)',tot('gross',M))+
      (ids.some(function(id){return T2(id).treaty>0})?row('ebből egyezmény alapján mentesítendő',tot('treaty',M),'sub'):'')+
      row('Levonható tartozás',tot('debt',function(v){return '− '+M(v)}))+
      row('Nettó vagyon',tot('net',M))+
      row('Mentes sáv',function(t){return '− '+M(t.allow)})+
      row('Adóalap',tot('base',M),'tot')+
      row('1%-os sávban',function(t){return M(Math.min(t.base,TOP))},'sub')+
      (ids.some(function(id){return T2(id).base>TOP})?row('1,5%-os sávban (100 Mrd Ft felett)',function(t){return M(Math.max(0,t.base-TOP))},'sub'):'')+
      row('Számított adó',tot('raw',EFT))+
      (ids.some(function(id){return T2(id).trd>0})?row('Egyezményi mentesítés – a külföldi vagyonra (kapcsolódó tartozásai és az 1 Mrd Ft-os sáv levonása után) jutó, a külföldön fizetett helyi adóval csökkentett adó (11. § (2), 12. § (2) c))',tot('trd',function(v){return '− '+EFT(v)})):'')+
      row('Helyi adó, gépjárműadó, értékelési díj 50%-a',tot('cred',function(v){return '− '+EFT(v)}))+
      row('Fizetendő vagyonadó',tot('tax',FT),'tot')+
      row('Tényleges teher a nettó vagyonra',function(t){return t.net>0?f2.format(t.tax/t.net*100)+'%':'–'})+
      '</tbody></table>';
    var dl=[];ids.forEach(function(id){T2(id).debts.forEach(function(x){dl.push('<tr><td>'+esc(x.d.name||'Tartozás')+'</td><td>'+esc(T2(id).name)+'</td><td class="num">'+M(x.amt)+'</td><td>'+(x.ok?'levonható':'<span class="out">nem vonható le</span> – '+esc(x.why))+'</td></tr>')})});
    if(dl.length) lev+='<h4>Tartozások</h4><table class="kt"><thead><tr><th scope="col">Tartozás</th><th scope="col">Adóalany</th><th scope="col" class="num">Összeg</th><th scope="col">Levonhatóság</th></tr></thead><tbody>'+dl.join('')+'</tbody></table>';
    $('kp-lev').innerHTML=lev;
    var nl=S.assets.map(function(a){var R=VC[a.id]||valOf(a),tx=0,who=[];ids.forEach(function(id){T2(id).items.forEach(function(it){if(it.a===a){tx+=it.amt;who.push(esc(T2(id).name)+(it.f!==1?' '+f0.format(it.f*100)+'%':''))}})});
      return '<tr><td><strong>'+esc(a.name||typeLabel(a))+'</strong><br><span class="ksub">'+esc(typeLabel(a))+'</span></td><td>'+who.join('<br>')+'</td><td>'+esc(R.meth)+'</td><td class="lv">'+R.st.map(esc).join('<br>')+'</td><td class="num">'+M(R.v)+'</td><td class="num">'+(tx>0?M(tx):'<span class="out">0</span>')+'</td><td><span class="ref">'+esc(R.ref)+'</span></td></tr>'});
    $('kp-naplo').innerHTML='<h4>Értékelési napló</h4><p class="kn">Vagyonelemenként az alkalmazott módszer, a levezetés és a jogszabályhely – a bevalláshoz ezeket kell dokumentálni és az elévülésig megőrizni.'+ref('29. § (9)–(10)')+'</p>'+(nl.length?'<table class="kt"><thead><tr><th scope="col">Vagyonelem</th><th scope="col">Adóalany</th><th scope="col">Módszer</th><th scope="col">Levezetés</th><th scope="col" class="num">Számított érték</th><th scope="col" class="num">Adóköteles</th><th scope="col">Hivatkozás</th></tr></thead><tbody>'+nl.join('')+'</tbody></table>':'<p class="empty">Nincs vagyonelem.</p>');
    // előrejelzés
    var P0=L.proj,mx0=Math.max.apply(null,P0.map(function(p){return p.tax}).concat([0.001])),stp=niceStep(mx0/4),mxT=Math.ceil(mx0/stp)*stp,W=720,H=250,pl=56,pb=34,pt=24,bw=(W-pl-20)/P0.length,svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Előrejelzett vagyonadó évenként">';
    for(var i=0;i<=Math.round(mxT/stp);i++){var yv=stp*i,yy=H-pb-(H-pb-pt)*yv/mxT;svg+='<line class="kax" x1="'+pl+'" x2="'+(W-10)+'" y1="'+yy+'" y2="'+yy+'"/><text class="kaxl" x="'+(pl-6)+'" y="'+(yy+4)+'" text-anchor="end">'+f1.format(yv)+'</text>'}
    P0.forEach(function(p,i){var h=(H-pb-pt)*p.tax/mxT,x=pl+i*bw+bw*0.18,w=bw*0.64;svg+='<rect class="kbar-fill" x="'+x+'" y="'+(H-pb-h)+'" width="'+w+'" height="'+Math.max(0,h)+'" rx="2"/><text class="kvl" x="'+(x+w/2)+'" y="'+(H-pb-h-6)+'" text-anchor="middle">'+f1.format(p.tax)+'</text><text class="kaxl" x="'+(x+w/2)+'" y="'+(H-pb+18)+'" text-anchor="middle">'+p.y+'</text>'});
    svg+='<text class="kaxl" x="'+pl+'" y="14">M Ft / év</text></svg>';
    var cum=0,cross=null;P0.forEach(function(p){if(cross===null&&p.tax>0)cross=p.y});
    var tr=P0.map(function(p){cum+=p.tax;return '<tr><td>'+p.y+'</td><td class="num">'+M(p.net)+'</td><td class="num">'+FT(p.tax)+'</td><td class="num">'+FT(cum)+'</td></tr>'}).join('');
    var elTab=document.querySelector('.ktab[data-kp="elo"]');if(elTab)elTab.textContent='Előrejelzés '+P0[0].y+'–'+P0[P0.length-1].y;
    $('kp-elo').innerHTML='<h4>Előrejelzés '+P0[0].y+'–'+P0[P0.length-1].y+'</h4><p class="kn">A december 31-i vagyon a megadott éves értékváltozással görgetve (ingatlan '+P(n(S.g.re))+', pénzügyi '+P(n(S.g.fin))+', cégérték '+P(n(S.g.co))+', egyéb '+P(n(S.g.oth))+'; a külföldi ingatlan a választott 3%-kal vagy indexszel). A tartozások és a mentes sáv változatlanok. A feltevések a 6. pontban módosíthatók.</p><div class="kgrid"><div class="kcard"><h5>'+P0.length+' év alatt összesen</h5><div class="kbig">'+FT(cum)+'</div></div><div class="kcard"><h5>Első adóköteles év</h5><div class="kbig">'+(cross||'nincs a horizonton')+'</div><p>'+(cross===YEAR?'Már '+YEAR+'-ban érintett.':cross?'A feltevések szerint ekkor lépi át a mentes sávot.':'A feltevések mellett nem éri el a sávot.')+'</p></div></div><div class="kchart">'+svg+'</div><table class="kt"><thead><tr><th scope="col">Év (dec. 31.)</th><th scope="col" class="num">Nettó vagyon (összes adóalany)</th><th scope="col" class="num">Fizetendő adó</th><th scope="col" class="num">Halmozott</th></tr></thead><tbody>'+tr+'</tbody></table>';
    // érzékenység
    var me=r.tp.me,liqInd=0,taxInd=0;ids.forEach(function(id){var t=T2(id);if(t.kind==='ind'){liqInd+=t.liq;taxInd+=t.tax}});
    var cov=taxInd>0?liqInd/taxInd:null;
    var sens='<table class="kt k-sens"><thead><tr><th scope="col">Minden vagyonelem értéke</th><th scope="col" class="num">Fizetendő adó</th><th scope="col" class="num">Eltérés</th></tr></thead><tbody>'+L.sens.map(function(s){var base=L.sens[2].tax;return '<tr'+(s.d===0?' class="tot"':'')+'><td>'+(s.d>0?'+':s.d<0?'−':'')+f0.format(Math.abs(s.d*100))+'%</td><td class="num">'+FT(s.tax)+'</td><td class="num">'+(s.d===0?'–':(s.tax-base>=0?'+ ':'− ')+FT(Math.abs(s.tax-base)))+'</td></tr>'}).join('')+'</tbody></table>';
    var optTxt=!S.p.mar?'Nem házas – nincs megosztási választás.':L.opt.ids.length?(L.opt.saving>0.0005?'A '+L.opt.ids.length+' választható közös elem legkedvezőbb megosztásával évente <strong>'+FT(L.opt.saving)+'</strong> takarítható meg a fele-fele megosztáshoz képest.':'A fele-fele megosztás már a legkedvezőbb.'):'Nincs „egyikük nevén nyilvántartott” közös vagyonelem; ilyen elemnél a kalkulátor kiszámolja a legkedvezőbb jogszerű megosztást.';
    $('kp-erz').innerHTML='<h4>Érzékenység és optimalizálás</h4><div class="kgrid">'+
      '<div class="kcard"><h5>Becslési sáv</h5><div class="kbig">'+FT(L.lo)+' – '+FT(L.hi)+'</div><p>A becsült értékek (NAV-modell, indexálás, még nem zárt '+YEAR+'-os beszámoló, árfolyamfüggő elemek) tipikus bizonytalanságával.</p></div>'+
      '<div class="kcard"><h5>Házastársi megosztás</h5><p>'+optTxt+ref('10. § (2)–(3)')+'</p></div>'+
      (S.bvks.length?'<div class="kcard"><h5>A BVK-szerkezet hatása</h5><div class="kbig">'+(L.diff>=0?'+ ':'− ')+FT(Math.abs(L.diff))+'/év</div><p>Ennyivel '+(L.diff>=0?'több':'kevesebb')+' az együttes adó, mint ha a kezelt vagyon közvetlenül a vagyonrendelőé lenne.</p></div>':'')+
      '<div class="kcard"><h5>Likviditási fedezet</h5><div class="kbig">'+(cov===null?'–':cov>=10?'10+ év':f1.format(cov)+' év')+'</div><p>A likvid vagyon (számla, értékpapír, alap, tőzsdei részvény, kripto, nemesfém) ennyi évnyi magánszemélyi vagyonadót fedez.'+(me.gross>0?' Nem likvid hányad (Ön): '+f0.format(me.illiq/me.gross*100)+'%.':'')+'</p></div>'+
      '</div><h4>Mi történik, ha a vagyon értéke változik?</h4>'+sens;
    var all=allFlags().concat(S.assets.reduce(function(acc,a){var R=VC[a.id];if(R)R.fl.forEach(function(x){if(x[0]==='i')acc.push(['i','<strong>'+esc(a.name||typeLabel(a))+':</strong> '+x[1]])});return acc},[]));
    var grp=[['c','Határidők és kötelező lépések'],['w','Kockázatok és figyelmeztetések'],['i','Tudnivalók']];
    $('kp-tenni').innerHTML=grp.map(function(g){var xs=all.filter(function(x){return x[0]===g[0]});if(!xs.length)return '';var body='<div class="flags k-group">'+xs.map(function(x){return '<div class="flag '+(x[0]==='i'?'':x[0])+'">'+x[1]+'</div>'}).join('')+'</div>';return g[0]==='i'?'<details class="kfold"><summary><h4>'+g[1]+' <span class="kfold-n">('+xs.length+')</span></h4></summary>'+body+'</details>':'<h4>'+g[1]+'</h4>'+body}).join('')||'<p class="empty">Nincs teendő.</p>';
  }

  /* ---------- Jelentés ---------- */
  function buildReport(){
    var L=LAST;if(!L)return;var r=L.r,d=new Date(),ds=d.getFullYear()+'. '+String(d.getMonth()+1).padStart(2,'0')+'. '+String(d.getDate()).padStart(2,'0')+'.';
    var res=r.res,resTxt=res.bel?'belföldi illetőségű':'külföldi illetőségű';
    var h='<h2>Vagyonadó-becslés – '+YEAR+'. tárgyév</h2><div class="rp-meta">Készült: '+ds+' · a '+YEAR+'. évi vagyonadó-törvény tervezete alapján · Ön: '+resTxt+(S.p.mar?', házas':'')+(S.bvks.length?' · '+S.bvks.length+' bizalmi vagyonkezelés':'')+'</div>';
    h+='<p class="rp-big">Becsült fizetendő vagyonadó: '+FT(r.total)+'</p><p>Becslési sáv: '+FT(L.lo)+' – '+FT(L.hi)+'</p>';
    h+='<h3>Adóalanyonként</h3><table><thead><tr><th scope="col">Adóalany</th><th scope="col" class="num">Adóköteles vagyon</th><th scope="col" class="num">Tartozás</th><th scope="col" class="num">Nettó</th><th scope="col" class="num">Mentes sáv</th><th scope="col" class="num">Adóalap</th><th scope="col" class="num">Fizetendő</th></tr></thead><tbody>'+r.order.map(function(id){var t=r.tp[id];return '<tr><td>'+esc(t.name)+' ('+(t.res?'belföldi':'külföldi')+')</td><td class="num">'+M(t.gross)+'</td><td class="num">'+M(t.debt)+'</td><td class="num">'+M(t.net)+'</td><td class="num">'+M(t.allow)+'</td><td class="num">'+M(t.base)+'</td><td class="num">'+FT(t.tax)+'</td></tr>'}).join('')+'</tbody></table>';
    h+='<h3>Értékelési napló</h3><table><thead><tr><th scope="col">Vagyonelem</th><th scope="col">Módszer</th><th scope="col">Levezetés</th><th scope="col" class="num">Számított érték</th><th scope="col">Hivatkozás</th></tr></thead><tbody>'+S.assets.map(function(a){var R=VC[a.id]||valOf(a);return '<tr><td>'+esc(a.name||typeLabel(a))+'<br><small>'+esc(ownerName(a.own))+'</small></td><td>'+esc(R.meth)+'</td><td>'+R.st.map(esc).join('<br>')+'</td><td class="num">'+M(R.v)+(R.inc?'':' (nem adóköteles)')+'</td><td>'+esc(R.ref)+'</td></tr>'}).join('')+'</tbody></table>';
    var cum=0;h+='<h3>Előrejelzés</h3><table><thead><tr><th scope="col">Év</th><th scope="col" class="num">Nettó vagyon</th><th scope="col" class="num">Adó</th><th scope="col" class="num">Halmozott</th></tr></thead><tbody>'+L.proj.map(function(p){cum+=p.tax;return '<tr><td>'+p.y+'</td><td class="num">'+M(p.net)+'</td><td class="num">'+FT(p.tax)+'</td><td class="num">'+FT(cum)+'</td></tr>'}).join('')+'</tbody></table>';
    var fl=allFlags();h+='<h3>Teendők és figyelmeztetések</h3><ul>'+fl.map(function(x){return '<li>'+x[1]+'</li>'}).join('')+'</ul>';
    h+='<p class="rp-meta">A becslés az Országgyűlésnek benyújtott T/930 törvényjavaslaton alapul; nem minősül adótanácsadásnak.</p>';
    $('kReport').innerHTML=h;
  }

  /* ---------- Példák ---------- */
  function A(t,o){var a={id:nid('a'),t:t,own:'me',sh:TYPES[t].sh?100:undefined,cur:TYPES[t].cur?'HUF':undefined,col:true};var d=TYPES[t].d||{};for(var k in d)a[k]=d[k];for(k in o)a[k]=o[k];return a}
  var PRESETS={
    family:{name:'vállalkozó házaspár',make:function(){var s=blank();s.p.mar=true;
      var lak=A('re_lak',{name:'Budapesti lakás',own:'joint',m:'idx',iv:180,iy:2019,ir:10,lt:0.35});
      s.assets=[lak,A('re_udulo',{name:'Balatoni nyaraló',own:'jointc',reg:'me',alloc:'auto',m:'model',mv:240,lt:0.12}),
        A('co_hu',{name:'Családi Kft. (60%)',sh:60,st:900,fy:YEAR,ae1:160,ae2:140,ae3:120,rt:300,dtl:27,div:100,col:false}),
        A('re_kulf',{name:'Horvát apartman',own:'joint',cur:'EUR',m:'acq',av:0.35,ay:2018,gm:'3'}),
        A('fund',{name:'Befektetési alapok',own:'jointc',reg:'sp',alloc:'auto',am:260}),A('cash',{name:'Bankszámlák',own:'joint',am:120}),
        A('listed',{name:'Tőzsdei részvények',cl:90}),A('crypto',{name:'Kripto',am:15}),A('pens',{name:'Nyugdíjbiztosítás',am:40}),
        A('veh',{name:'Személyautó',am:28,gt:0.25}),A('art',{name:'Festmény',own:'joint',am:25})];
      s.debts=[{id:nid('d'),name:'Lakáshitel',own:'joint',am:80,cur:'HUF',kind:'loan',link:lak.id}];return s}},
    bvk:{name:'külföldi állampolgár magyar BVK-val',make:function(){var s=blank();s.p.cit='n';s.p.fst='no';var b={id:nid('b'),name:'Családi BVK',law:'hu',ctrl:'hu',ord:1,lnk:false,fee:''};s.bvks=[b];
      var iroda=A('re_egy',{name:'Bérbe adott irodák',own:'bvk:'+b.id,m:'expert',ev:500});
      s.assets=[A('re_lak',{name:'Budapesti lakás',m:'tx12',tx:300}),iroda,A('co_hu',{name:'Magyar Kft. (100%)',own:'bvk:'+b.id,st:300,fy:YEAR,ae1:45,ae2:45,ae3:45}),
        A('fund',{name:'Külföldi értékpapír-portfólió',own:'bvk:'+b.id,am:1000}),A('cash',{name:'Külföldi bankszámla',own:'bvk:'+b.id,am:500})];
      s.debts=[{id:nid('d'),name:'Irodahitel',own:'bvk:'+b.id,am:100,cur:'HUF',kind:'loan',link:iroda.id}];return s}},
    abroad:{name:'külföldön élő kettős állampolgár',make:function(){var s=blank();
      s.assets=[A('re_kulf',{name:'Londoni lakás',cur:'GBP',m:'acq',av:1.2,ay:2020,gm:'3',col:false}),A('cash',{name:'Angol bankszámla',cur:'GBP',am:0.8}),
        A('listed',{name:'Amerikai részvények',cur:'USD',cl:1.5}),A('re_lak',{name:'Örökölt budapesti lakás',m:'model',mv:150})];return s}}
  };
  function loadPreset(k){var p=Object.prototype.hasOwnProperty.call(PRESETS,k)?PRESETS[k]:PRESETS.family;S=p.make();S.src='preset:'+k;renderAll()}

  /* ---------- Betöltött adatok szűrése (fájl, tároló) ----------
     Minden mezőt fehérlistán, típus és értékkészlet szerint veszünk át.
     Ismeretlen kulcs, rossz azonosító, rossz típus: kimarad. */
  function str(v,max){return (typeof v==='string'||typeof v==='number')?String(v).slice(0,max||40):''}
  function opt(v,o,def){v=str(v);return o.some(function(x){return String(x[0])===v})?v:def}
  function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
  function ownerOk(v,bvkIds,noMinorInh){v=str(v,60);if(v.indexOf('bvk:')===0)return Object.prototype.hasOwnProperty.call(bvkIds,v.slice(4))?v:'me';var ok=['me','sp','joint','jointc','minor','minorinh'];if(noMinorInh)ok.pop();return ok.indexOf(v)>=0?v:'me'}
  function sanitize(o){
    var s=blank();o=obj(o);
    var p=obj(o.p);
    s.p={cit:p.cit==='n'?'n':'y',ab:p.ab==='y'?'y':'n',fst:['res','post','ltr','no'].indexOf(p.fst)>=0?p.fst:'res',mar:!!p.mar,cust:!!p.cust,spres:['same','bel','kul'].indexOf(p.spres)>=0?p.spres:'same'};
    var fxo=obj(o.fx);['EUR','USD','CHF','GBP'].forEach(function(c){if(has(fxo[c]))s.fx[c]=String(nn(fxo[c]))});
    var g=obj(o.g);['re','fin','co','oth','yrs'].forEach(function(k){if(has(g[k]))s.g[k]=String(k==='yrs'?Math.max(1,Math.min(30,Math.round(n(g[k])))):n(g[k]))});
    var fee=obj(o.fee);['me','sp','ch'].forEach(function(k){s.fee[k]=has(fee[k])?String(nn(fee[k])):''});
    var seen=Object.create(null),bvkIds=Object.create(null),assetIds=Object.create(null);
    (Array.isArray(o.bvks)?o.bvks:[]).slice(0,20).forEach(function(b){b=obj(b);var id=str(b.id);if(!idOk(id)||seen[id])return;seen[id]=1;bvkIds[id]=1;
      s.bvks.push({id:id,name:str(b.name,80),law:b.law==='kulf'?'kulf':'hu',ctrl:b.ctrl==='kulf'?'kulf':'hu',ord:has(b.ord)?String(Math.round(n(b.ord))):'',lnk:!!b.lnk,fee:has(b.fee)?String(nn(b.fee)):''})});
    (Array.isArray(o.assets)?o.assets:[]).slice(0,200).forEach(function(a){a=obj(a);var t=str(a.t),id=str(a.id);
      if(!Object.prototype.hasOwnProperty.call(TYPES,t)||!idOk(id)||seen[id])return;seen[id]=1;assetIds[id]=1;
      var T=TYPES[t],c=A(t,{id:id});
      c.name=str(a.name,80);c.col=a.col!==false;c.own=ownerOk(a.own,bvkIds);c.tr=!!a.tr;
      c.reg=a.reg==='sp'?'sp':'me';c.alloc=['auto','reg','half'].indexOf(a.alloc)>=0?a.alloc:'auto';
      if(T.sh)c.sh=has(a.sh)?String(Math.max(0,Math.min(100,n(a.sh)))):100;
      if(T.cur)c.cur=opt(a.cur,CURS,'HUF');
      T.f.forEach(function(fd){var v=a[fd.k];if(v==null)return;if(fd.t==='c')c[fd.k]=!!v;else if(fd.t==='s')c[fd.k]=opt(v,fd.o,c[fd.k]);else c[fd.k]=has(v)?String(fd.neg?n(v):nn(v)):''});
      s.assets.push(c)});
    (Array.isArray(o.debts)?o.debts:[]).slice(0,100).forEach(function(d){d=obj(d);var id=str(d.id);if(!idOk(id)||seen[id])return;seen[id]=1;
      s.debts.push({id:id,name:str(d.name,80),own:ownerOk(d.own,bvkIds,true),am:has(d.am)?String(nn(d.am)):'',cur:opt(d.cur,CURS,'HUF'),kind:opt(d.kind,DKIND,'loan'),link:assetIds[str(d.link)]?str(d.link):''})});
    var src=str(o.src,40);
    s.src=src.indexOf('preset:')===0&&Object.prototype.hasOwnProperty.call(PRESETS,src.slice(7))?src:'user';
    return s;
  }

  /* ---------- Tárolás ----------
     Alapértelmezés: sessionStorage (a lapfül bezárásáig). Opt-in: localStorage. */
  function remembering(){try{return localStorage.getItem(REMEMBER)==='1'}catch(e){return false}}
  function store(){try{return remembering()?localStorage:sessionStorage}catch(e){return null}}
  var saveT=null;
  function isEmpty(){return S.src==='user'&&!S.assets.length&&!S.debts.length&&!S.bvks.length}
  function save(){clearTimeout(saveT);saveT=setTimeout(function(){try{var st=store();if(!st)return;if(isEmpty())st.removeItem(STORE);else st.setItem(STORE,JSON.stringify(S))}catch(e){}},300)}
  function load(){try{var t=(remembering()?localStorage.getItem(STORE):null)||sessionStorage.getItem(STORE);if(!t||t.length>MAX_FILE)return false;var o=JSON.parse(t);if(!o||!Array.isArray(o.assets))return false;S=sanitize(o);return true}catch(e){return false}}
  function wipe(){try{localStorage.removeItem(STORE)}catch(e){}try{sessionStorage.removeItem(STORE)}catch(e){}}
  function renderRemember(){var c=$('kRemember');if(c)c.checked=remembering()}
  function touch(){if(S.src!=='user'){S.src='user'}}

  /* ---------- Események ---------- */
  function findA(id){return S.assets.filter(function(a){return a.id===id})[0]}
  function findD(id){return S.debts.filter(function(a){return a.id===id})[0]}
  function findB(id){return S.bvks.filter(function(a){return a.id===id})[0]}
  var raf=null;function soon(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){raf=null;recalc()})}
  function setVal(el){
    var v=el.type==='checkbox'?el.checked:el.value,d=el.dataset;
    if(d.p){S.p[d.p]=el.type==='radio'?el.value:v;return 'profile'}
    if(d.a){var a=findA(d.a);if(a)a[d.k]=v;return d.rr?'asset':''}
    if(d.d){var x=findD(d.d);if(x)x[d.k]=v;return d.rr?'debt':''}
    if(d.b){var b=findB(d.b);if(b)b[d.k]=v;return d.rr?(d.k==='name'?'all':'bvk'):''}
    if(d.fee){S.fee[d.k]=v;return ''}
    if(d.fx){S.fx[d.k]=v;return ''}
    if(d.g){S.g[d.k]=v;return ''}
    return '';
  }
  function keepFocus(fn){setTimeout(function(){var ae=document.activeElement,id=ae&&ae.id,ss=null;try{ss=[ae.selectionStart,ae.selectionEnd]}catch(e){}fn();if(id){var el=$(id);if(el&&el!==ae){el.focus();try{if(ss&&ss[0]!=null)el.setSelectionRange(ss[0],ss[1])}catch(e){}}}soon()},0)}
  function cssEsc(s){s=String(s);return (window.CSS&&CSS.escape)?CSS.escape(s):s.replace(/[^a-z0-9]/gi,'')}
  function rerenderAsset(id){var a=findA(id),el=document.querySelector('.kitem[data-id="'+cssEsc(id)+'"]');if(a&&el)el.outerHTML=assetCard(a)}
  $('kf').addEventListener('input',function(e){var el=e.target;if(el.type==='checkbox'||el.type==='radio'||el.tagName==='SELECT')return;touch();setVal(el);soon()});
  $('kf').addEventListener('change',function(e){
    var el=e.target;touch();var w=setVal(el);
    var k=el.dataset.k,ai=el.dataset.a,di=el.dataset.d;
    if(w){keepFocus(function(){
      if(w==='profile'){renderProfile();renderAssets();renderDebts();renderFees()}
      else if(w==='asset'){if(k==='own'){renderAssets();renderFees();renderDebts()}else rerenderAsset(ai)}
      else if(w==='debt'){var d=findD(di),c=document.querySelector('.kitem[data-did="'+cssEsc(di)+'"]');if(d&&c)c.outerHTML=debtCard(d)}
      else if(w==='bvk'){renderBvks()}
      else if(w==='all'){renderAssets();renderDebts();renderBvks()}
    })}
    soon();
  });
  $('kf').addEventListener('click',function(e){
    var t=e.target.closest('button');if(!t)return;var d=t.dataset;
    if(d.tog){var a=findA(d.tog);if(a){a.col=!a.col;var el=t.closest('.kitem');if(el)el.classList.toggle('collapsed',a.col);t.textContent=a.col?'Megnyit':'Összecsuk';t.setAttribute('aria-expanded',String(!a.col));save()}return}
    if(d.del){touch();S.assets=S.assets.filter(function(a){return a.id!==d.del});S.debts.forEach(function(x){if(x.link===d.del)x.link=''});renderAssets();renderDebts();renderFees();recalc();return}
    if(d.ddel){touch();S.debts=S.debts.filter(function(a){return a.id!==d.ddel});renderDebts();recalc();return}
    if(d.bdel){touch();S.assets.forEach(function(a){if(a.own==='bvk:'+d.bdel)a.own='me'});S.debts.forEach(function(x){if(x.own==='bvk:'+d.bdel)x.own='me'});S.bvks=S.bvks.filter(function(b){return b.id!==d.bdel});renderAll();return}
  });
  $('kf').addEventListener('submit',function(e){e.preventDefault()});
  $('kAdd').addEventListener('click',function(){touch();var t=$('kAddType').value;if(!Object.prototype.hasOwnProperty.call(TYPES,t))return;S.assets.forEach(function(a){a.col=true});var a=A(t,{col:false});S.assets.push(a);renderAssets();renderDebts();recalc();var el=$('kn_'+a.id);if(el)el.focus()});
  $('kAddDebt').addEventListener('click',function(){touch();S.debts.push({id:nid('d'),name:'',own:'me',am:'',cur:'HUF',kind:'loan',link:''});renderDebts();recalc()});
  $('kAddBvk').addEventListener('click',function(){touch();S.bvks.push({id:nid('b'),name:'BVK '+(S.bvks.length+1),law:'hu',ctrl:'hu',ord:S.bvks.length+1,lnk:false,fee:''});renderAll()});
  $('kPreset').addEventListener('change',function(){if(this.value){loadPreset(this.value);this.value=''}});
  document.querySelectorAll('.kmenu-list .btn').forEach(function(b){b.addEventListener('click',function(){var d=b.closest('details');if(d)d.open=false})});
  document.addEventListener('click',function(e){var d=document.querySelector('.kmenu[open]');if(d&&!d.contains(e.target))d.open=false});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var d=document.querySelector('.kmenu[open]');if(d){d.open=false;var sm=d.querySelector('summary');if(sm)sm.focus()}}});
  $('kMini').addEventListener('click',function(){$('kSum').scrollIntoView({behavior:'smooth',block:'start'})});
  document.body.classList.add('has-mini');
  $('kClear').addEventListener('click',function(){S=blank();S.src='user';renderAll()});
  $('kWipe').addEventListener('click',function(){wipe();try{localStorage.removeItem(REMEMBER)}catch(e){}S=blank();S.src='user';renderAll();msg('A tárolt adatok törölve.')});
  $('kRemember').addEventListener('change',function(){
    try{if(this.checked){localStorage.setItem(REMEMBER,'1')}else{localStorage.removeItem(REMEMBER);localStorage.removeItem(STORE)}}catch(e){}
    save();paintSummary();
  });
  function msg(t){var m=$('kMsg');if(m){m.textContent=t;clearTimeout(msg.t);msg.t=setTimeout(function(){m.textContent=''},6000)}}
  function blobSave(name,data,type){try{var blob=new Blob([data],{type:type}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},800)}catch(e){msg('A mentés ebben a böngészőben nem érhető el.')}}
  $('kSave').addEventListener('click',function(){blobSave('vagyonado-kalkulacio.json',JSON.stringify(S,null,1),'application/json')});
  $('kReportDl').addEventListener('click',function(){buildReport();var css='body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:900px;margin:24px auto;padding:0 16px;font-size:14px;line-height:1.45}h2{font-size:24px;margin:0 0 4px}h3{font-size:16px;margin:22px 0 8px;border-bottom:1px solid #999;padding-bottom:3px}table{width:100%;border-collapse:collapse;font-size:12.5px}th,td{border-bottom:1px solid #ccc;padding:5px 6px;text-align:left;vertical-align:top}td.num,th.num{text-align:right;white-space:nowrap}.rp-meta{font-size:12.5px;color:#444}.rp-big{font-size:20px;font-weight:700;margin-top:12px}.ref{font-family:monospace;font-size:11px;background:#eef;padding:0 4px;border-radius:3px}ul{padding-left:18px}@media print{body{margin:0}}';
    blobSave('vagyonado-becsles-'+YEAR+'.html','<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><title>Vagyonadó-becslés '+YEAR+'</title><style>'+css+'</style></head><body>'+$('kReport').innerHTML+'</body></html>','text/html')});
  $('kFileBtn').addEventListener('click',function(){$('kFile').click()});
  $('kFile').addEventListener('change',function(){
    var f=this.files&&this.files[0];this.value='';if(!f)return;
    if(f.size>MAX_FILE){msg('A fájl túl nagy (max. 512 KB).');return}
    var rd=new FileReader();
    rd.onload=function(){try{var o=JSON.parse(rd.result);if(!o||!Array.isArray(o.assets))throw new Error('format');S=sanitize(o);S.src='user';renderAll();msg('Fájl betöltve.')}catch(e){msg('A fájl nem olvasható be.')}};
    rd.onerror=function(){msg('A fájl nem olvasható be.')};
    rd.readAsText(f);
  });
  $('kPrint').addEventListener('click',function(){buildReport();document.body.classList.add('kprint');window.print()});
  window.addEventListener('afterprint',function(){document.body.classList.remove('kprint')});
  $('kToDetail').addEventListener('click',function(){$('kDetail').scrollIntoView({behavior:'smooth',block:'start'})});
  (function(){var kt=Array.prototype.slice.call(document.querySelectorAll('.ktab'));function pick(b){kt.forEach(function(x){var on=x===b;x.setAttribute('aria-selected',on?'true':'false');x.tabIndex=on?0:-1;var pn=$('kp-'+x.dataset.kp);if(pn)pn.hidden=!on})}
    kt.forEach(function(b,i){b.setAttribute('aria-controls','kp-'+b.dataset.kp);var pn=$('kp-'+b.dataset.kp);if(pn){pn.setAttribute('role','tabpanel');pn.setAttribute('aria-labelledby',b.id||(b.id='ktab-'+b.dataset.kp))}b.tabIndex=b.getAttribute('aria-selected')==='true'?0:-1;
      b.addEventListener('click',function(){pick(b)});b.addEventListener('keydown',function(e){var k=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:e.key==='Home'?0:e.key==='End'?kt.length-1:-1;if(k<0)return;e.preventDefault();var nb=kt[(k+kt.length)%kt.length];nb.focus();pick(nb)})})})();
  document.querySelectorAll('[data-kpreset]').forEach(function(b){b.addEventListener('click',function(){loadPreset(b.dataset.kpreset)})});

  /* Tesztelhető, csak olvasható export – állapotot nem ér el */
  try{Object.defineProperty(window,'VagyonadoSzabalyok',{value:Object.freeze({RULES:RULES,tax:tax,itv72:itv72,cegertek:function(st,avg,hold){var STa=Math.max(0,fin(st)),H=avg<0?0:fin(avg)/RULES.CAP_RATE;return hold?STa:(STa+2*H)/3}}),writable:false,configurable:false})}catch(e){}

  renderAddType();
  if(!load()){S=blank();S.src='user'}renderAll();

  /* ---------- Gyorsbecslő (egysoros + részletes) ---------- */
  (function(){
    var qf=$('qf');if(!qf)return;
    var ids=['q_re','q_co','q_fin','q_oth','q_debt'];
    function detailed(){return $('qDetails').open&&ids.some(function(k){return has($(k).value)})}
    function vals(){var o={};ids.forEach(function(k){o[k]=Math.max(0,n($(k).value))});o.mar=$('q_mar').checked;o.bel=$('q_bel').checked;o.net=Math.max(0,n($('q_net').value));o.det=detailed();return o}
    function est(o,scale){
      var net;
      if(o.det){var gross=(o.bel?(o.q_re+o.q_co+o.q_fin+o.q_oth):(o.q_re+o.q_co))*scale;net=Math.max(0,gross-o.q_debt)}
      else net=o.net*scale;
      if(o.mar){var half=net/2;return {net:net,tax:2*tax(Math.max(0,half-LIMIT))}}
      return {net:net,tax:tax(Math.max(0,net-LIMIT))};
    }
    function paint(){
      var o=vals(),any=o.det||has($('q_net').value);
      var b=$('qBadge'),t=$('qTax'),r=$('qRange');
      $('qGo').disabled=!any;
      $('q_net').readOnly=o.det;
      if(!any){b.className='badge b-info';b.textContent='Adja meg az összeget';t.textContent='';r.textContent='';return}
      var m=est(o,1),lo=est(o,0.85),hi=est(o,1.15);
      $('q_net').readOnly=o.det;if(o.det)$('q_net').value=Math.round(m.net);
      t.textContent=FT(m.tax)+' / év';r.textContent=m.tax>0?'(kb. '+FT(lo.tax)+' – '+FT(hi.tax)+')':'';
      var ratio=(o.mar?m.net/2:m.net)/LIMIT;
      if(m.tax>0){b.className='badge b-crit';b.textContent='Érintett'}
      else if(ratio>0.8){b.className='badge b-warn';b.textContent='Határközelben'}
      else{b.className='badge b-ok';b.textContent='Valószínűleg nem érintett'}
      $('qNote').textContent=(o.mar?'Házastársaknál a közös vagyon fele-fele megosztásával, két mentes sávval számolva. ':'')+(o.det&&!o.bel?'Külföldi illetőségűnél csak a magyar ingatlant és a magyar cégrészesedést vettük figyelembe, és a tartozás csak akkor vonható le, ha ezekhez közvetlenül kapcsolódik. ':'')+'A becslés nem veszi figyelembe a haszonélvezetet, a kisebbségi diszkontot, az egyezményeket és a bizalmi vagyonkezelést; az értékek ±15%-os bizonytalanságával számol.';
    }
    qf.addEventListener('input',paint);qf.addEventListener('change',paint);$('qDetails').addEventListener('toggle',paint);$('qDetails').addEventListener('input',paint);$('qDetails').addEventListener('change',paint);
    qf.addEventListener('submit',function(e){e.preventDefault()});
    qf.querySelectorAll('[data-q]').forEach(function(c){c.addEventListener('click',function(){$('q_net').value=c.dataset.q;paint()})});
    $('qGo').addEventListener('click',function(){
      var o=vals();S=blank();S.src='user';S.p.mar=o.mar;if(o.det&&!o.bel){S.p.cit='n';S.p.fst='no'}
      var own=o.mar?'joint':'me';
      if(o.det){
        if(o.q_re)S.assets.push(A('re_lak',{name:'Ingatlanok (gyorsbecslő)',own:own,m:'model',mv:o.q_re,col:false}));
        if(o.q_co)S.assets.push(A('co_val',{name:'Cégrészesedések – képlet szerinti becsült érték',own:own,am:o.q_co}));
        if(o.q_fin)S.assets.push(A('fund',{name:'Pénzügyi vagyon (gyorsbecslő)',own:own,am:o.q_fin}));
        if(o.q_oth)S.assets.push(A('other',{name:'Egyéb vagyon (gyorsbecslő)',own:own,am:o.q_oth}));
        if(o.q_debt)S.debts.push({id:nid('d'),name:'Tartozások (gyorsbecslő)',own:own,am:o.q_debt,cur:'HUF',kind:'loan',link:(!o.bel&&S.assets.length&&S.assets[0].t==='re_lak')?S.assets[0].id:''});
      } else if(o.net){S.assets.push(A('other',{name:'Nettó vagyon (gyorsbecslő) – bontsa vagyonelemekre',own:own,am:o.net,col:false}))}
      renderAll();msg('A gyorsbecslő adatai betöltve – bontsa vagyonelemekre a pontos számításhoz.');
      var t=document.getElementById('t-teszt');if(t)t.click();
    });
  })();
})();
})();
