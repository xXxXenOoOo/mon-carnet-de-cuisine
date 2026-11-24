'use strict';
const main=document.getElementById('main');
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
let recipes=[],view='home',category='Toutes',query='',current=null,portions=2;
let favorites=read('carnet-favorites-v1',[]),shopping=read('carnet-shopping-v1',[]);
if(!Array.isArray(favorites))favorites=[];
if(!Array.isArray(shopping))shopping=[];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urlSafe=x=>{if(typeof x==='string'&&/^\.\/images\/[0-9]{3}\.webp$/.test(x))return x;try{const u=new URL(x);return u.protocol==='https:'?u.href:''}catch{return ''}};
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const number=x=>Number(x).toLocaleString('fr-FR',{maximumFractionDigits:2});
function fraction(x){const whole=Math.floor(x);return x%1===.5?(whole?whole+' et ½':'½'):number(x)}
function amount(i,n,b=2){
 if(i.rule==='unknown')return 'Non précisée';
 if(i.rule==='taste'||i.qty==null)return 'Selon le goût';
 const raw=Number(i.qty)*n/b;
 let value=raw;
 if(i.rule==='half')value=Math.max(.5,Math.round(raw*2)/2);
 if(i.rule==='whole')value=Math.max(1,Math.round(raw));
 if(i.rule==='weight'){const step=Number(i.step)||1;value=Math.max(step,Math.round(raw/step)*step)}
 if(i.unit==='pièce'||i.unit==='gousse')return fraction(value)+' '+(i.unit==='gousse'?(value>1?'gousses':'gousse'):(value>1?'pièces':'pièce'))+(i.grams?' ('+number(value*i.grams)+' g env.)':'');
 return fraction(value)+' '+(i.unit||'');
}
function fav(id){return favorites.includes(id)}
function toggleFav(id){favorites=fav(id)?favorites.filter(x=>x!==id):[...favorites,id];save('carnet-favorites-v1',favorites);render();pickSuggestions();playSuggestions()}

let selected=[],selectedIndex=0,heroTicker=null,photoSerial=0,seenRecipes=read('carnet-visites-v1',[]);
if(!Array.isArray(seenRecipes))seenRecipes=[];
const banner=document.getElementById('recipe-hero'),bannerPhoto=document.getElementById('hero-photo');
function favoriteCategory(){return recipes.find(r=>r.id===seenRecipes[0])?.category}
function seasonFit(r){const m=new Date().getMonth();return [10,11,0,1,2].includes(m)&&['Plats mijotés','Plats au four','Soupes et bouillons'].includes(r.category)}
function suggestionScore(r){
 const daily=Array.from(r.id+new Date().toLocaleDateString('fr-FR')).reduce((n,c)=>(n*31+c.charCodeAt(0))%997,0)/997;
 return (fav(r.id)?10:0)+(favoriteCategory()===r.category?6:0)+(seasonFit(r)?4:0)-(seenRecipes[0]===r.id?8:0)+(r.status==='Validée'?3:0)+daily;
}
function pickSuggestions(){
 const ordered=recipes.filter(r=>r.photo?.featured===true&&r.photo?.src&&r.status!=='À compléter').sort((a,b)=>suggestionScore(b)-suggestionScore(a));
 const categories=new Set(),first=[],next=[];
 ordered.forEach(r=>{if(categories.has(r.category))next.push(r);else{categories.add(r.category);first.push(r)}});
 const prev=selected[selectedIndex]?.id;
 selected=[...first,...next].slice(0,9);
 const kept=selected.findIndex(r=>r.id===prev);
 selectedIndex=kept>=0?kept:0;
 paintSuggestion();
}
function reasonFor(r){
 if(fav(r.id))return '★ Parmi vos favoris';
 if(favoriteCategory()===r.category&&seenRecipes[0]!==r.id)return 'Dans le même style que vos dernières recettes';
 if(seasonFit(r))return 'Une idée de saison';
 if(r.status==='Validée')return 'Une recette validée';
 return 'Découverte sélectionnée pour vous';
}
function setBannerImage(r){
 const credit=document.getElementById('hero-photo-credit'),link=document.getElementById('hero-credit-link');
 const serial=++photoSerial,photo=r?.photo;
 if(!photo){bannerPhoto.style.display='none';credit.hidden=true;return}
 bannerPhoto.style.display='block';
 bannerPhoto.classList.add('is-switching');
 bannerPhoto.onload=()=>{if(serial===photoSerial)bannerPhoto.classList.remove('is-switching')};
 bannerPhoto.onerror=()=>{if(serial===photoSerial){bannerPhoto.style.display='none';credit.hidden=true}};
 bannerPhoto.style.objectPosition=photo.heroPosition||'center center';
 const src=urlSafe(photo.src);
 if(!src){bannerPhoto.style.display='none';credit.hidden=true;return}
 bannerPhoto.src=src;
 if(bannerPhoto.complete&&bannerPhoto.naturalWidth)bannerPhoto.classList.remove('is-switching');
 link.href=photo.generated?'#':(urlSafe(photo.page)||'https://commons.wikimedia.org/');
 link.textContent=photo.generated?'Image créée pour le carnet (illustration IA)':(photo.author||'Wikimedia Commons')+' · '+(photo.license||'Licence libre');
 link.style.pointerEvents=photo.generated?'none':'auto';
 link.style.textDecoration=photo.generated?'none':'underline';
 credit.hidden=false;
}
function paintSuggestion(){
 const r=selected[selectedIndex],open=document.getElementById('hero-open');
 if(!r){open.disabled=true;return}
 document.getElementById('hero-reason').textContent=reasonFor(r);
 document.getElementById('hero-pick-title').textContent=r.title;
 document.getElementById('hero-counter').textContent=(selectedIndex+1)+' / '+selected.length;
 open.disabled=false;
 open.onclick=()=>openRecipe(r.id);
 if(view!=='recipe')setBannerImage(r);
}
function pauseSuggestions(){if(heroTicker){clearInterval(heroTicker);heroTicker=null}}
function playSuggestions(){
 pauseSuggestions();
 if(['home','favorites'].includes(view)&&selected.length>1&&!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  heroTicker=setInterval(()=>changeSuggestion(1,false),6500);
}
function changeSuggestion(n,restart=true){
 if(selected.length<2)return;
 selectedIndex=(selectedIndex+n+selected.length)%selected.length;
 paintSuggestion();
 if(restart)playSuggestions();
}
document.getElementById('hero-next').addEventListener('click',()=>changeSuggestion(1));
document.getElementById('hero-prev').addEventListener('click',()=>changeSuggestion(-1));
banner.addEventListener('mouseenter',pauseSuggestions);
banner.addEventListener('mouseleave',playSuggestions);
banner.addEventListener('focusin',pauseSuggestions);
banner.addEventListener('focusout',()=>setTimeout(()=>{if(!banner.contains(document.activeElement))playSuggestions()},0));
document.addEventListener('visibilitychange',()=>document.hidden?pauseSuggestions():playSuggestions());
let touchStart=null;
banner.addEventListener('touchstart',e=>{touchStart=e.touches[0]?.clientX??null},{passive:true});
banner.addEventListener('touchend',e=>{if(touchStart===null)return;const d=(e.changedTouches[0]?.clientX??touchStart)-touchStart;touchStart=null;if(Math.abs(d)>50)changeSuggestion(d<0?1:-1)},{passive:true});

function nav(v){view=v;current=null;history.replaceState(null,'',location.pathname+location.search);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));render();pickSuggestions();playSuggestions();window.scrollTo(0,0)}
function openRecipe(id){const r=recipes.find(x=>String(x.id)===String(id));if(!r)return;current=r;view='recipe';portions=r.base||2;seenRecipes=[r.id,...seenRecipes.filter(x=>x!==r.id)].slice(0,12);save('carnet-visites-v1',seenRecipes);setBannerImage(r);pauseSuggestions();history.replaceState(null,'','#recette='+encodeURIComponent(r.id));document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));render();window.scrollTo(0,0)}
function bind(sel,fn){main.querySelectorAll(sel).forEach(el=>el.addEventListener('click',()=>fn(el)))}

function photoMedia(r){
 const p=r.photo;
 if(!p||!urlSafe(p.src))return '';
 const page=urlSafe(p.page);
 const credit=p.generated?'Image originale générée pour le carnet':page?'<a href="'+esc(page)+'" target="_blank" rel="noopener noreferrer">'+esc(p.author||'Wikimedia Commons')+' · '+esc(p.license||'Licence libre')+'</a>':esc(p.author||'Wikimedia Commons');
 const position=/^(center|left|right|\d{1,3}%)( (center|top|bottom|\d{1,3}%))?$/.test(p.cardPosition||'')?p.cardPosition:'center center';
 return '<div class="recipe-media"><img class="recipe-cover" loading="lazy" referrerpolicy="no-referrer" alt="Illustration de '+esc(r.title)+'" style="object-position:'+esc(position)+'" src="'+esc(urlSafe(p.src))+'"><small class="recipe-media-credit">Illustration : '+credit+'</small></div>';
}
function photoInside(r){
 const p=r.photo;
 if(!p||!urlSafe(p.src))return '';
 const credit=p.generated?'Image générée pour le carnet':urlSafe(p.page)?'<a target="_blank" rel="noopener noreferrer" href="'+esc(urlSafe(p.page))+'">'+esc(p.author||'Wikimedia Commons')+' · '+esc(p.license||'Licence libre')+'</a>':esc(p.author||'Wikimedia Commons');
 return '<figure class="recipe-figure"><img class="recipe-photo" loading="lazy" referrerpolicy="no-referrer" alt="Photo d’illustration du plat '+esc(r.title)+'" src="'+esc(urlSafe(p.src))+'"><figcaption class="photo-note">Photo d’illustration, pas le résultat de cette recette · '+credit+'</figcaption></figure>';
}

function cards(){const cats=['Toutes',...new Set(recipes.map(r=>r.category))];const filtered=recipes.filter(r=>(view!=='favorites'||fav(r.id))&&(category==='Toutes'||r.category===category)&&norm([r.title,r.category,...r.ingredients.map(i=>i.name)].join(' ')).includes(norm(query)));
main.innerHTML='<div class="eyebrow">'+(view==='favorites'?'Mes incontournables':'Le répertoire')+'</div><h2>'+(view==='favorites'?'Mes favoris':'Sommaire')+'</h2><input class="search" id="search" placeholder="Rechercher un plat ou un ingrédient" aria-label="Rechercher une recette" value="'+esc(query)+'"><div class="filters">'+cats.map(c=>'<button class="'+(category===c?'active':'')+'" data-category="'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div><p class="muted">'+filtered.length+' recette'+(filtered.length===1?'':'s')+'</p><div class="cards">'+filtered.map(r=>'<article class="recipe-card">'+photoMedia(r)+'<button class="card-open" data-open="'+esc(r.id)+'"><div class="eyebrow">'+esc(r.category)+' · Nº '+esc(r.id)+'</div><h2>'+esc(r.title)+'</h2><p class="muted">Cuisson : '+esc(r.cook)+' · '+esc(r.base||2)+' personnes</p><span class="tag">'+esc(r.status)+'</span></button><div class="card-footer"><span class="muted">'+esc(r.cuisine)+'</span><button class="btn" data-fav="'+esc(r.id)+'" aria-label="'+(fav(r.id)?'Retirer des favoris':'Ajouter aux favoris')+'">'+(fav(r.id)?'★':'☆')+'</button></div></article>').join('')+'</div>'+(filtered.length?'':'<p class="empty">Aucune recette correspondante.</p>');
main.querySelectorAll('.recipe-cover').forEach(img=>img.addEventListener('error',()=>img.closest('.recipe-media')?.remove()));
const search=main.querySelector('#search');search.addEventListener('input',e=>{query=e.target.value;const pos=e.target.selectionStart;cards();const field=main.querySelector('#search');field.focus();field.setSelectionRange(pos,pos)});
bind('[data-category]',el=>{category=el.dataset.category;render()});bind('[data-open]',el=>openRecipe(el.dataset.open));bind('[data-fav]',el=>toggleFav(el.dataset.fav))}
function recipe(){const r=current;if(!r)return nav('home');
main.innerHTML='<article class="recipe"><div class="topline"><button class="btn" id="back">← Sommaire</button><div style="display:flex;gap:6px;flex-wrap:wrap"><button id="favorite" class="btn">'+(fav(r.id)?'★ Favori':'☆ Favori')+'</button><button id="share" class="btn">Partager</button><button id="print" class="btn">Imprimer</button></div></div><div class="eyebrow">Nº '+esc(r.id)+' · '+esc(r.category)+'</div><h2>'+esc(r.title)+'</h2><div class="muted">'+esc(r.cuisine)+' · '+esc(r.status)+'</div>'+photoInside(r)+'<div class="meta"><div><strong>Préparation</strong>'+esc(r.prep)+'</div><div><strong>Cuisson</strong>'+esc(r.cook)+'</div><div><strong>Difficulté</strong>'+esc(r.difficulty||'Non renseignée')+'</div></div><div class="portion"><span>Nombre de personnes</span><span class="spacer"></span><button id="minus" aria-label="Retirer une personne" '+(portions<=1?'disabled':'')+'>−</button><output>'+portions+'</output><button id="plus" aria-label="Ajouter une personne" '+(portions>=30?'disabled':'')+'>+</button></div><div class="columns"><div class="section"><h3>Ingrédients</h3>'+r.ingredients.map(i=>'<div class="ingredient"><span class="thumb">'+esc(i.emoji||'🥄')+(urlSafe(i.image)?'<img loading="lazy" referrerpolicy="no-referrer" alt="" src="'+esc(urlSafe(i.image))+'">':'')+'</span><span class="ingredient-name">'+esc(i.name)+'</span><span class="quantity">'+esc(amount(i,portions,r.base))+'</span></div>').join('')+'<p class="small">'+esc(r.portionNote||'')+'</p><button class="btn primary no-print" id="add">Ajouter aux courses</button><h3>Ustensiles</h3><ul class="equipment">'+(r.equipment||[]).map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul></div><div class="section"><h3>Préparation</h3><ol class="steps">'+r.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+(r.tip?'<h3>Astuce du chef</h3><div class="note">'+esc(r.tip)+'</div>':'')+'<h3>Variantes</h3>'+((r.variants||[]).length?r.variants.map(v=>'<div class="note"><strong>'+esc(v.title)+'</strong><p>'+esc(v.description)+'</p></div>').join(''):'<p class="muted">Pas encore de variante recensée.</p>')+(r.source&&urlSafe(r.source.url)?'<p class="small">Source : <a target="_blank" rel="noopener noreferrer" href="'+esc(urlSafe(r.source.url))+'">'+esc(r.source.label)+'</a></p>':'')+'</div></div></article>';
main.querySelector('.recipe-photo')?.addEventListener('error',e=>e.target.closest('.recipe-figure')?.remove());
main.querySelectorAll('.thumb img').forEach(i=>{const remove=()=>i.remove();i.onerror=remove;if(i.complete&&!i.naturalWidth)remove()});
main.querySelector('#back').onclick=()=>nav('home');main.querySelector('#favorite').onclick=()=>toggleFav(r.id);main.querySelector('#minus').onclick=()=>{portions=Math.max(1,portions-1);recipe()};main.querySelector('#plus').onclick=()=>{portions=Math.min(30,portions+1);recipe()};main.querySelector('#print').onclick=()=>window.print();main.querySelector('#add').onclick=()=>{shopping=shopping.filter(x=>x.recipeId!==r.id);r.ingredients.filter(i=>i.rule!=='taste').forEach((i,j)=>shopping.push({recipeId:r.id,recipe:r.title,key:r.id+'-'+j,name:i.name,qty:amount(i,portions,r.base),checked:false}));save('carnet-shopping-v1',shopping);nav('shopping')};
main.querySelector('#share').onclick=async()=>{const link=new URL(location.href);link.hash='recette='+encodeURIComponent(r.id);try{if(navigator.share){await navigator.share({title:r.title,url:link.href})}else if(navigator.clipboard){await navigator.clipboard.writeText(link.href);main.querySelector('#share').textContent='Lien copié'}else{prompt('Lien de la recette',link.href)}}catch(e){if(e.name!=='AbortError')prompt('Lien de la recette',link.href)}};
}
function shop(){const groups=[...new Set(shopping.map(i=>i.recipeId))];main.innerHTML='<h2>Ma liste de courses</h2><p class="muted">Enregistrée sur cet appareil. Pour modifier les quantités, ajoute de nouveau la recette avec les bonnes portions.</p>'+(!shopping.length?'<p class="empty">Ajoute les ingrédients depuis une fiche recette.</p>':groups.map(id=>{const items=shopping.filter(i=>i.recipeId===id);return '<section class="section"><div style="display:flex;align-items:center;gap:8px"><h3 style="flex:1">'+esc(items[0].recipe)+'</h3><button class="btn" data-remove="'+esc(id)+'">Retirer</button></div>'+items.map(i=>'<label class="check"><input type="checkbox" data-check="'+esc(i.key)+'" '+(i.checked?'checked':'')+'><span style="flex:1">'+esc(i.name)+'</span><strong>'+esc(i.qty)+'</strong></label>').join('')+'</section>'}).join('')+'<p><button class="btn" id="clear">Vider la liste</button></p>');main.querySelectorAll('[data-check]').forEach(e=>e.onchange=()=>{const i=shopping.find(x=>x.key===e.dataset.check);if(i)i.checked=e.checked;save('carnet-shopping-v1',shopping)});bind('[data-remove]',e=>{shopping=shopping.filter(x=>x.recipeId!==e.dataset.remove);save('carnet-shopping-v1',shopping);shop()});const clear=main.querySelector('#clear');if(clear)clear.onclick=()=>{if(confirm('Vider la liste de courses ?')){shopping=[];save('carnet-shopping-v1',shopping);shop()}}}
function render(){document.body.dataset.view=view;if(view==='recipe')recipe();else if(view==='shopping')shop();else cards()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{category='Toutes';query='';nav(b.dataset.view)});
window.addEventListener('hashchange',()=>{const id=new URLSearchParams(location.hash.slice(1)).get('recette');if(id)openRecipe(id);else nav('home')});
fetch('./recipes.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Recettes indisponibles');return r.json()}).then(data=>{if(!Array.isArray(data))throw Error('Données invalides');recipes=data;pickSuggestions();const id=new URLSearchParams(location.hash.slice(1)).get('recette');if(id&&recipes.some(r=>r.id===id))openRecipe(id);else{render();playSuggestions()}}).catch(()=>{main.innerHTML='<p class="error">Le carnet ne peut pas charger les recettes. Réessaie en actualisant la page.</p>'});
