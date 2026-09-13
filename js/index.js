// =====================================================================
// INDEX.JS — página principal
// =====================================================================

async function inicializarInicio() {
    const sesion = await obtenerSesion();
    const contenidoPublico = document.getElementById("contenido-publico");
    const contenidoPrivado = document.getElementById("contenido-privado");

    if (!sesion) {
        contenidoPublico.classList.remove("oculto");
        contenidoPrivado.classList.add("oculto");
        return;
    }

    const perfil = await obtenerPerfilActual();
    if (!perfil || !perfil.activo) {
        contenidoPublico.classList.remove("oculto");
        contenidoPrivado.classList.add("oculto");
        return;
    }

    contenidoPublico.classList.add("oculto");
    contenidoPrivado.classList.remove("oculto");

    await cargarNovedades();
    await cargarUltimasPublicaciones();
    await cargarUltimosRecursos();
}

async function cargarNovedades() {
    const contenedor = document.getElementById("lista-novedades");
    mostrarCargando(contenedor);

    const { data, error } = await supabaseClient
        .from("publicaciones")
        .select("id, titulo, fecha_creacion, categorias:categoria_id(nombre)")
        .eq("publicado", true)
        .eq("categoria_id", await obtenerIdCategoriaNovedades())
        .order("fecha_creacion", { ascending: false })
        .limit(5);

    if (error || !data?.length) {
        mostrarVacio(contenedor, "No hay novedades por el momento.");
        return;
    }

    contenedor.innerHTML = data.map((n) => `
        <a class="tarjeta tarjeta-novedad" href="publicacion.html?id=${n.id}">
            <span>📢</span>
            <div>
                <strong>${escapeHTML(n.titulo)}</strong>
                <span class="texto-muted">${formatearFecha(n.fecha_creacion)}</span>
            </div>
        </a>
    `).join("");
}

let ID_CATEGORIA_NOVEDADES = null;
async function obtenerIdCategoriaNovedades() {
    if (ID_CATEGORIA_NOVEDADES) return ID_CATEGORIA_NOVEDADES;
    const { data } = await supabaseClient.from("categorias").select("id").eq("nombre", "Novedades").maybeSingle();
    ID_CATEGORIA_NOVEDADES = data?.id ?? -1;
    return ID_CATEGORIA_NOVEDADES;
}

async function cargarUltimasPublicaciones() {
    const contenedor = document.getElementById("lista-ultimas-publicaciones");
    mostrarCargando(contenedor);

    const { data, error } = await supabaseClient
        .from("publicaciones")
        .select("id, titulo, fecha_creacion, categoria:categoria_id(nombre)")
        .eq("publicado", true)
        .order("fecha_creacion", { ascending: false })
        .limit(6);

    if (error || !data?.length) {
        mostrarVacio(contenedor, "No hay publicaciones todavía.");
        return;
    }

    contenedor.innerHTML = data.map((p) => `
        <a class="tarjeta tarjeta-mini" href="publicacion.html?id=${p.id}">
            <span class="badge">${escapeHTML(p.categoria?.nombre || "General")}</span>
            <strong>${escapeHTML(p.titulo)}</strong>
            <span class="texto-muted">${formatearFecha(p.fecha_creacion)}</span>
        </a>
    `).join("");
}

async function cargarUltimosRecursos() {
    const contenedor = document.getElementById("lista-ultimos-recursos");
    mostrarCargando(contenedor);

    const { data, error } = await supabaseClient
        .from("recursos")
        .select("id, titulo, tipo_archivo, fecha_subida")
        .order("fecha_subida", { ascending: false })
        .limit(6);

    if (error || !data?.length) {
        mostrarVacio(contenedor, "No hay recursos todavía.");
        return;
    }

    contenedor.innerHTML = data.map((r) => `
        <a class="tarjeta tarjeta-mini" href="recursos.html">
            <span class="badge">${escapeHTML(r.tipo_archivo.toUpperCase())}</span>
            <strong>${escapeHTML(r.titulo)}</strong>
            <span class="texto-muted">${formatearFecha(r.fecha_subida)}</span>
        </a>
    `).join("");
}

document.addEventListener("DOMContentLoaded", inicializarInicio);
