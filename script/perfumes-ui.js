/* Módulo editorial de perfumes: solo JS nativo, sin servicios externos. */
(function () {
  'use strict';
  const pagina = document.body.dataset.pagina;
  if (typeof PERFUMES === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const nuevo = (tag, clase, contenido) => {
    const el = document.createElement(tag);
    if (clase) el.className = clase;
    if (contenido !== undefined) el.textContent = contenido;
    return el;
  };
  const plano = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const link = (texto, href, clase='') => { const a=nuevo('a',clase,texto);a.href=href;return a; };

  function destacar(contenedor, consulta) {
    const q=plano(consulta.trim());
    if(!q) return;
    const walker=document.createTreeWalker(contenedor,NodeFilter.SHOW_TEXT);
    const nodos=[];
    while(walker.nextNode()) nodos.push(walker.currentNode);
    nodos.forEach(nodo=>{
      const texto=nodo.textContent,base=plano(texto),fragmento=document.createDocumentFragment();
      let inicio=0,pos;
      while((pos=base.indexOf(q,inicio))!==-1){
        fragmento.append(texto.slice(inicio,pos),nuevo('mark','',texto.slice(pos,pos+q.length)));
        inicio=pos+q.length;
      }
      fragmento.append(texto.slice(inicio));nodo.replaceWith(fragmento);
    });
  }

  function tarjeta(p, consulta='') {
    const el=nuevo('article','e-perfume-card');
    const a=link('',p.url);
    const img=nuevo('img'); img.src=p.imagen;img.alt=p.alt;img.loading='lazy';img.width=375;img.height=500;
    a.append(img,nuevo('p','e-kicker',p.marca),nuevo(pagina === 'perfumes' ? 'h2' : 'h3','',p.nombre));
    const dato=nuevo('p','e-perfume-sub',p.version+' · '+p.familia);
    const desc=nuevo('p','e-perfume-summary',p.intro);
    const notas=nuevo('p','e-perfume-notas','Notas: '+p.notas.join(' · '));
    const abre=nuevo('span','e-perfume-more','Leer la ficha →');
    a.setAttribute('aria-label','Leer la ficha de '+p.nombre+' de '+p.marca);
    a.append(dato,desc,notas,abre);
    el.append(a);
    destacar(el,consulta);
    return el;
  }

  if (pagina === 'inicio') {
    const grid=$('destacados-perfumes');
    if (grid) grid.replaceChildren(...[PERFUMES[2],PERFUMES[7],PERFUMES[8]].map(p=>tarjeta(p)));
  }

  if (pagina === 'perfumes') {
    const grid=$('rejilla-perfumes'),buscar=$('buscar-perfumes'),limpiar=$('limpiar-perfumes');
    const filtros=$('filtros-perfumes'),contador=$('contador-perfumes'),vacio=$('vacio-perfumes');
    const estilos=['Todos','cítrico','floral','amaderado','dulce','limpio','ambarado','acuático','oud'];
    const query=new URLSearchParams(location.search);
    let actual=estilos.includes(query.get('estilo'))?query.get('estilo'):'Todos';
    buscar.value=query.get('q')||'';
    estilos.forEach(estilo => {
      const b=nuevo('button','',estilo); b.type='button';b.dataset.estilo=estilo;
      b.addEventListener('click',() => {actual=estilo; pintar();});
      filtros.append(b);
    });
    const pintar=()=>{
      const q=plano(buscar.value.trim());
      const lista=PERFUMES.filter(p=>
        (actual==='Todos'||p.acordes.includes(actual)) &&
        (!q||plano(p.busqueda).includes(q))
      );
      filtros.querySelectorAll('button').forEach(b=>{
        const active=b.dataset.estilo===actual;
        b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
        b.textContent=(active&&actual!=='Todos'?'✓ ':'')+b.dataset.estilo;
      });
      grid.replaceChildren(...lista.map(p=>tarjeta(p,buscar.value)));
      contador.textContent=lista.length+(lista.length===1?' perfume encontrado':' perfumes encontrados')+(actual!=='Todos'?' · '+actual:'');
      limpiar.disabled=!buscar.value;
      grid.hidden=!lista.length;vacio.hidden=!!lista.length;
    };
    buscar.addEventListener('input',pintar);
    limpiar.addEventListener('click',()=>{buscar.value='';pintar();buscar.focus();});
    $('reset-perfumes').addEventListener('click',()=>{buscar.value='';actual='Todos';pintar();});
    $('form-perfumes').addEventListener('submit',e=>e.preventDefault());
    pintar();
  }

  if (pagina==='perfume') {
    const id=new URLSearchParams(location.search).get('id');
    const p=PERFUMES.find(x=>x.id===id);
    const ficha=$('ficha-perfume');
    ficha.replaceChildren();
    if (!p) {
      ficha.append(nuevo('h1','', 'No encontramos este perfume'),nuevo('p','', 'Vuelve al archivo para descubrir una fragancia disponible.'),link('Ir a perfumes →','perfumes.html','e-primary'));
    } else {
      document.title=p.nombre+' '+p.version+' — '+p.marca+' | ESTELA';
      const head=nuevo('div','e-perfume-hero');
      const photo=nuevo('img');photo.src=p.imagen;photo.alt=p.alt;photo.width=375;photo.height=500;
      const info=nuevo('div','e-perfume-info');
      info.append(nuevo('p','e-kicker',p.marca),nuevo('h1','e-perfume-name',p.nombre),nuevo('p','e-perfume-type',p.version+' · '+p.familia),nuevo('p','e-perfume-intro',p.intro));
      const attrs=nuevo('dl','e-perfume-attributes');
      [['Familia',p.familia],['Cuándo probarlo',p.clima],['Encaja en',p.momento]].forEach(([t,v])=>{
        attrs.append(nuevo('dt','',t),nuevo('dd','',v));
      });
      info.append(attrs);head.append(photo,info); ficha.append(head);
      const body=nuevo('div','e-perfume-body');
      const notes=nuevo('section','e-perfume-notes');notes.append(nuevo('p','e-kicker','SU PERFIL'),nuevo('h2','','Acordes y notas destacadas'));
      notes.append(nuevo('p','e-muted','Las marcas destacan estos materiales o acordes; no equivalen a una fórmula completa ni siempre a una pirámide de salida, corazón y fondo.'));
      const ul=nuevo('ul','e-note-list');p.notas.forEach(n=>ul.append(nuevo('li','',n)));notes.append(ul);
      const why=nuevo('section','e-perfume-review');why.append(nuevo('p','e-kicker','LA MIRADA DE ESTELA'),nuevo('h2','','Por qué merece una prueba'),nuevo('p','',p.razon),nuevo('h3','','Un consejo antes de decidir'),nuevo('p','',p.prueba));
      const src=nuevo('p','e-perfume-source');src.append(nuevo('span','', 'Notas indicadas en la '),link('ficha oficial de '+p.marca+' ↗',p.fuente));
      src.querySelector('a').target='_blank';src.querySelector('a').rel='noopener noreferrer';why.append(src);
      const credito=nuevo('p','e-perfume-source');credito.append(link('Fuente de la fotografía: Fragrantica ↗',p.creditoImagen));credito.querySelector('a').target='_blank';credito.querySelector('a').rel='noopener noreferrer';why.append(credito);
      body.append(notes,why);ficha.append(body);
      const related=nuevo('section','e-perfume-related');related.append(nuevo('p','e-kicker','PARA SEGUIR LEYENDO'),nuevo('h2','','Artículos relacionados'));
      const pool=typeof ARTICULOS==='undefined'?[]:ARTICULOS.filter(a=>p.articulos.includes(a.id));
      const ol=nuevo('ul','e-related-list');pool.forEach(a=>{
        const li=nuevo('li');li.append(link(a.titulo,a.url),nuevo('span','',a.categoria));ol.append(li);
      });related.append(ol);ficha.append(related);
      const similar=PERFUMES.filter(x=>x.id!==p.id&&x.acordes.some(n=>p.acordes.includes(n))).slice(0,3);
      if (similar.length) {
        const s=nuevo('section','e-perfume-related');s.append(nuevo('p','e-kicker','OTRAS FORMAS DE EXPLORAR'),nuevo('h2','','Si te interesó este aroma'));
        const g=nuevo('div','e-perfume-grid');g.append(...similar.map(p=>tarjeta(p)));s.append(g);ficha.append(s);
      }
    }
  }

  if (pagina==='articulo') {
    const lectura=$('lectura');
    if (lectura) {
      const a=(typeof ARTICULOS==='undefined'?[]:ARTICULOS).find(item=>item.id===lectura.dataset.id);
      if (a) {
        const matches=PERFUMES.filter(p=>{
          const t=plano(a.titulo+' '+a.resumen+' '+a.etiquetas.join(' '));
          return p.acordes.some(x=>t.includes(plano(x)))||p.articulos.includes(a.id);
        }).slice(0,3);
        if(matches.length){
          const sec=nuevo('section','e-inline-perfumes');sec.append(nuevo('p','e-kicker','DEL ARTÍCULO AL FRASCO'),nuevo('h2','','Perfumes reales relacionados'),nuevo('p','e-muted','Ejemplos para reconocer estas notas en fragancias comerciales; no son anuncios ni productos a la venta.'));
          const ul=nuevo('ul','e-related-list');matches.forEach(p=>{
            const li=nuevo('li');li.append(link(p.marca+' · '+p.nombre+' '+p.version,p.url),nuevo('span','',p.familia));ul.append(li);
          });sec.append(ul);const tags=lectura.querySelector('.e-tags');if(tags)tags.before(sec);
        }
      }
    }
  }
})();