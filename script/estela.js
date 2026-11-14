/**
 * estela.js - Comportamiento de la revista digital Estela.
 *
 * Requiere datos.js (constante ARTICULOS). Cada página HTML indica cuál es en
 * <body data-pagina="...">, y este script activa solo lo que esa página necesita.
 *
 * Funcionalidades: tres temas, tamaño de letra, barra de progreso, tiempo de
 * lectura, guardados, filtro por etiquetas, índice automático, buscador con
 * resaltado y comentarios.
 */
(function () {
  'use strict';

  /* ================= 1. UTILIDADES ================= */

  const PREFIJO = 'estela.v1.'; // prefijo de las claves en localStorage
  const PALABRAS_POR_MINUTO = 200; // dato fijado por el enunciado

  // Lee un valor de localStorage; si no existe o no está disponible, devuelve el valor por defecto.
  function leer(clave, porDefecto) {
    try {
      const valor = localStorage.getItem(PREFIJO + clave);
      return valor ? JSON.parse(valor) : porDefecto;
    } catch (e) {
      return porDefecto;
    }
  }

  // Guarda un valor en localStorage (si el navegador lo bloquea, la web sigue funcionando).
  function escribir(clave, valor) {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    } catch (e) {
      /* almacenamiento no disponible: se ignora */
    }
  }

  // Minúsculas y sin tildes, conservando la longitud, para buscar "citrico" y encontrar "cítrico".
  function plano(texto) {
    return Array.from(texto)
      .map((c) => c.normalize('NFD').charAt(0))
      .join('')
      .toLocaleLowerCase('es');
  }

  // Crea un elemento con clase y texto opcionales (usa textContent: nunca interpreta HTML).
  function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  }

  // Calculador de tiempo de lectura: palabras / 200, redondeando hacia arriba (mínimo 1 minuto).
  function minutos(texto) {
    const palabras = texto.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(palabras / PALABRAS_POR_MINUTO));
  }

  function minutosArticulo(a) {
    return minutos(a.secciones.map((s) => s.titulo + ' ' + s.texto).join(' '));
  }

  // Devuelve el texto como fragmento, envolviendo cada coincidencia con la consulta en <mark>.
  function resaltar(texto, consulta) {
    const fragmento = document.createDocumentFragment();
    const q = plano(consulta.trim());
    if (!q) {
      fragmento.append(texto);
      return fragmento;
    }
    const base = plano(texto);
    let desde = 0;
    let pos;
    while ((pos = base.indexOf(q, desde)) !== -1) {
      fragmento.append(texto.slice(desde, pos));
      fragmento.append(crear('mark', '', texto.slice(pos, pos + q.length)));
      desde = pos + q.length;
    }
    fragmento.append(texto.slice(desde));
    return fragmento;
  }

  /* ================= 2. TEMA Y TAMAÑO DE LETRA ================= */

  const pagina = document.body.dataset.pagina;

  // Aplica el tema y el tamaño guardados como clases del <body> y marca el botón activo.
  function aplicarPreferencias() {
    const temaGuardado = leer('tema', 'claro');
    const tamanoGuardado = leer('tamaño', 'mediano');
    const tema = ['claro', 'oscuro', 'sepia'].includes(temaGuardado) ? temaGuardado : 'claro';
    const tamano = ['pequeño', 'mediano', 'grande'].includes(tamanoGuardado) ? tamanoGuardado : 'mediano';
    ['claro', 'oscuro', 'sepia'].forEach((t) => document.body.classList.toggle('tema-' + t, t === tema));
    ['pequeño', 'mediano', 'grande'].forEach((t) => document.body.classList.toggle('fuente-' + t, t === tamano));
    document.querySelectorAll('[data-tema]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tema === tema)));
    document.querySelectorAll('[data-tamano]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tamano === tamano)));
  }

  /* ================= 3. ARTÍCULOS GUARDADOS ================= */

  function obtenerGuardados() {
    const valor = leer('guardados', []);
    return Array.isArray(valor) ? valor.filter(id => ARTICULOS.some(a => a.id === id)) : [];
  }

  // Actualiza el contador del menú y el texto/estado de todos los botones "Guardar".
  function actualizarGuardados() {
    const guardados = obtenerGuardados();
    document.getElementById('contador-guardados').textContent = '(' + guardados.length + ')';
    document.querySelectorAll('[data-guardar]').forEach((boton) => {
      const activo = guardados.includes(boton.dataset.guardar);
      boton.setAttribute('aria-pressed', String(activo));
      if (!activo) boton.textContent = 'Guardar artículo';
      else boton.textContent = boton.hasAttribute('data-largo') ? '✓ Guardado · quitar' : '✓ Guardado';
    });
  }

  // Guarda o quita un artículo.
  function alternarGuardado(id) {
    const guardados = obtenerGuardados();
    escribir('guardados', guardados.includes(id) ? guardados.filter((x) => x !== id) : guardados.concat(id));
    actualizarGuardados();
    if (pagina === 'guardados') {
      // En la página Guardados el artículo desaparece: se avisa y se conserva el foco de teclado.
      document.getElementById('aviso').textContent = 'Artículo quitado de guardados.';
      pintarGuardados();
      document.getElementById('contenido').focus();
    }
  }

  /* ================= 4. TARJETAS DE ARTÍCULO ================= */

  // Crea la tarjeta de un artículo. "nivel" es el nivel del encabezado (2 o 3).
  function crearTarjeta(a, nivel, consulta) {
    const tarjeta = crear('article', 'e-card');
    const enlace = crear('a');
    enlace.href = a.url;
    const imagen = crear('img');
    imagen.src = a.imagen;
    imagen.alt = a.alt;
    imagen.width = 1024;
    imagen.height = 768;
    imagen.loading = 'lazy';
    const titulo = crear('h' + nivel);
    titulo.append(resaltar(a.titulo, consulta));
    enlace.append(imagen, crear('p', 'e-kicker', a.categoria + ' · ' + minutosArticulo(a) + ' min de lectura'), titulo);

    const resumen = crear('p');
    resumen.append(resaltar(a.resumen, consulta));
    const boton = crear('button', 'e-textbtn');
    boton.type = 'button';
    boton.dataset.guardar = a.id;

    tarjeta.append(enlace, resumen);
    // Si la coincidencia está solo en el cuerpo o las etiquetas, mostrar un extracto con resaltado.
    if (consulta && ![a.titulo, a.resumen].some(t => plano(t).includes(plano(consulta.trim())))) {
      const origen = [a.categoria, ...a.etiquetas, ...a.secciones.map(s => s.titulo + ' ' + s.texto)]
        .find(t => plano(t).includes(plano(consulta.trim())));
      if (origen) {
        const pos = plano(origen).indexOf(plano(consulta.trim()));
        const inicio = Math.max(0, pos - 55);
        const fin = Math.min(origen.length, pos + consulta.trim().length + 100);
        const extracto = crear('p', 'e-search-match');
        extracto.append(resaltar((inicio ? '… ' : '') + origen.slice(inicio, fin) + (fin < origen.length ? ' …' : ''), consulta));
        tarjeta.append(extracto);
      }
    }
    tarjeta.append(boton);
    return tarjeta;
  }

  function pintarTarjetas(contenedor, lista, nivel, consulta) {
    contenedor.replaceChildren(...lista.map((a) => crearTarjeta(a, nivel, consulta)));
    actualizarGuardados();
  }

  /* ================= 5. PÁGINA DE INICIO ================= */

  function iniciarInicio() {
    pintarTarjetas(document.getElementById('rejilla'), ARTICULOS.slice(0, 6), 3, '');

    // Índice automático: un enlace por cada artículo del catálogo.
    const indice = document.getElementById('indice');
    ARTICULOS.forEach((a) => {
      const elemento = crear('li');
      const enlace = crear('a', '', a.titulo);
      enlace.href = a.url;
      elemento.append(enlace, crear('span', '', a.categoria));
      indice.append(elemento);
    });
  }

  /* ================= 6. EXPLORAR: BUSCADOR Y ETIQUETAS ================= */

  function iniciarExplorar() {
    const parametros = new URLSearchParams(location.search);
    const etiquetas = [...new Set(ARTICULOS.flatMap((a) => a.etiquetas))];
    // Estado inicial: puede venir de la URL (?q=...&etiqueta=...), por ejemplo desde un artículo.
    const estado = {
      q: parametros.get('q') || '',
      etiqueta: etiquetas.includes(parametros.get('etiqueta')) ? parametros.get('etiqueta') : 'Todos',
    };

    const campo = document.getElementById('buscar');
    const limpiar = document.getElementById('limpiar');
    const filtros = document.getElementById('filtros');
    const contador = document.getElementById('contador');
    const rejilla = document.getElementById('rejilla');
    const vacio = document.getElementById('vacio');
    const cargarMas = document.getElementById('cargar-mas');
    let visibles = 9;
    campo.value = estado.q;

    // Un botón por etiqueta, más "Todos" para quitar el filtro.
    ['Todos'].concat(etiquetas).forEach((nombre) => {
      const boton = crear('button', '', nombre);
      boton.type = 'button';
      boton.dataset.etiqueta = nombre;
      boton.addEventListener('click', () => {
        estado.etiqueta = nombre;
        visibles = 9;
        pintar();
      });
      filtros.append(boton);
    });

    // Aplica búsqueda y etiqueta, y actualiza listado, botones y mensajes.
    function pintar() {
      const q = plano(estado.q.trim());
      const lista = ARTICULOS.filter(
        (a) =>
          (estado.etiqueta === 'Todos' || a.etiquetas.includes(estado.etiqueta)) &&
          (!q || [a.titulo, a.resumen, a.categoria].concat(a.etiquetas, a.secciones.map(s => s.titulo + ' ' + s.texto)).some((x) => plano(x).includes(q)))
      );

      filtros.querySelectorAll('button').forEach((boton) => {
        const activo = boton.dataset.etiqueta === estado.etiqueta;
        boton.setAttribute('aria-pressed', String(activo));
        boton.classList.toggle('active', activo);
        // La marca ✓ evita depender solo del color para saber qué filtro está activo.
        boton.textContent = (activo && boton.dataset.etiqueta !== 'Todos' ? '✓ ' : '') + boton.dataset.etiqueta;
      });

      contador.textContent =
        lista.length + (lista.length === 1 ? ' artículo encontrado' : ' artículos encontrados') +
        (estado.etiqueta !== 'Todos' ? ' · ' + estado.etiqueta : '');
      limpiar.disabled = !estado.q;
      rejilla.hidden = lista.length === 0;
      vacio.hidden = lista.length !== 0;
      pintarTarjetas(rejilla, lista.slice(0, visibles), 2, estado.q);
      cargarMas.hidden = lista.length <= visibles;
      cargarMas.textContent = 'Mostrar más artículos (' + Math.max(0, Math.min(9, lista.length - visibles)) + ')';
    }

    campo.addEventListener('input', () => {
      estado.q = campo.value;
      visibles = 9;
      pintar();
    });
    limpiar.addEventListener('click', () => {
      estado.q = '';
      campo.value = '';
      visibles = 9;
      pintar();
      campo.focus();
    });
    document.getElementById('ver-todos').addEventListener('click', () => {
      estado.q = '';
      estado.etiqueta = 'Todos';
      campo.value = '';
      visibles = 9;
      pintar();
    });
    // Con JavaScript no hace falta recargar la página al pulsar Intro en el buscador.
    document.getElementById('form-buscar').addEventListener('submit', (e) => e.preventDefault());
    cargarMas.addEventListener('click', () => {
      const siguiente = visibles;
      visibles += 9;
      pintar();
      rejilla.children[siguiente]?.querySelector('a')?.focus();
    });

    pintar();
  }

  /* ================= 7. PÁGINA DE GUARDADOS ================= */

  function pintarGuardados() {
    const guardados = obtenerGuardados();
    const lista = ARTICULOS.filter((a) => guardados.includes(a.id));
    const rejilla = document.getElementById('rejilla');
    rejilla.hidden = lista.length === 0;
    document.getElementById('vacio').hidden = lista.length !== 0;
    pintarTarjetas(rejilla, lista, 2, '');
  }

  /* ================= 8. PÁGINA DE ARTÍCULO ================= */

  function iniciarArticulo() {
    const lectura = document.getElementById('lectura');
    const cuerpo = document.getElementById('cuerpo');

    // Tiempo de lectura calculado contando las palabras del texto mostrado.
    document.getElementById('tiempo-lectura').textContent = minutos(cuerpo.textContent) + ' min';

    // Tabla de contenidos automática: un enlace por cada sección (h2) del artículo.
    const toc = document.getElementById('toc');
    cuerpo.querySelectorAll('section').forEach((seccion) => {
      const enlace = crear('a', '', seccion.querySelector('h2').textContent);
      enlace.href = '#' + seccion.id;
      const elemento = crear('li');
      elemento.append(enlace);
      toc.append(elemento);
    });

    // Barra de progreso: porcentaje de desplazamiento dentro del artículo.
    const barra = document.querySelector('.e-progress');
    function actualizarProgreso() {
      const inicio = lectura.getBoundingClientRect().top + window.scrollY;
      const total = lectura.offsetHeight - window.innerHeight;
      const porcentaje = total <= 0 ? 100 : Math.max(0, Math.min(100, Math.round(((window.scrollY - inicio) / total) * 100)));
      barra.firstElementChild.style.width = porcentaje + '%';
      barra.setAttribute('aria-valuenow', String(porcentaje));
    }
    actualizarProgreso();
    new ResizeObserver(actualizarProgreso).observe(lectura);
    window.addEventListener('scroll', actualizarProgreso, { passive: true });
    window.addEventListener('resize', actualizarProgreso);

    // Comentarios: se guardan en este navegador, agrupados por artículo.
    const id = lectura.dataset.id;
    const campo = document.getElementById('comentario');
    const aviso = document.getElementById('aviso');
    const lista = document.getElementById('lista-comentarios');

    function pintarComentarios() {
      const todos = leer('comentarios', {});
      lista.replaceChildren(...(Array.isArray(todos?.[id]) ? todos[id].filter(t => typeof t === 'string') : []).map((texto) => crear('p', 'e-comment', texto)));
    }
    document.getElementById('form-comentario').addEventListener('submit', (e) => {
      e.preventDefault();
      const texto = campo.value.trim();
      if (!texto) {
        aviso.textContent = 'Escribe un comentario antes de publicar.';
        campo.focus();
        return;
      }
      const almacenados = leer('comentarios', {});
      const todos = almacenados && typeof almacenados === 'object' && !Array.isArray(almacenados) ? almacenados : {};
      todos[id] = (Array.isArray(todos[id]) ? todos[id] : []).concat(texto);
      escribir('comentarios', todos);
      campo.value = '';
      aviso.textContent = 'Comentario guardado en este navegador.';
      pintarComentarios();
    });
    pintarComentarios();
  }

  /* ================= 9. ARRANQUE ================= */

  // Un único manejador de clics para temas, tamaños y botones de guardar (incluidos los creados dinámicamente).
  document.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-tema], [data-tamano], [data-guardar]');
    if (!boton) return;
    if (boton.dataset.tema) {
      escribir('tema', boton.dataset.tema);
      aplicarPreferencias();
    } else if (boton.dataset.tamano) {
      escribir('tamaño', boton.dataset.tamano);
      aplicarPreferencias();
    } else {
      alternarGuardado(boton.dataset.guardar);
    }
  });

  // El panel Apariencia queda anclado a la cabecera, no ocupa una segunda barra.
  const apariencia = document.querySelector('.e-appearance');
  if (apariencia) {
    apariencia.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !apariencia.contains(event.relatedTarget)) apariencia.open = false;
    });
    document.addEventListener('click', (event) => {
      if (apariencia.open && !apariencia.contains(event.target)) apariencia.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && apariencia.open) {
        apariencia.open = false;
        apariencia.querySelector('summary').focus();
      }
    });
  }

  aplicarPreferencias();
  actualizarGuardados();
  if (pagina === 'inicio') iniciarInicio();
  if (pagina === 'explorar') iniciarExplorar();
  if (pagina === 'guardados') pintarGuardados();
  if (pagina === 'articulo') iniciarArticulo();
})();
