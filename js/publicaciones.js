// =====================================================================
// PUBLICACIONES.JS — listado, filtros, búsqueda y creación
// =====================================================================

let PERFIL_ACTUAL = null;

async function cargarPublicaciones() {
    const contenedor = document.getElementById("lista-publicaciones");
    mostrarCargando(contenedor);

    const texto = document.getElementById("filtro-buscar")?.value.trim() || "";
    const categoriaId = document.getElementById("filtro-categoria")?.value || "";
    const cursoId = document.getElementById("filtro-curso")?.value || obtenerParametro("curso_id") || "";
    const orden = document.getElementById("filtro-orden")?.value || "desc";

    let consulta = supabaseClient
        .from("publicaciones")
        .select("id, titulo, contenido, fecha_creacion, publicado, autor:autor_id(nombre, apellido), categoria:categoria_id(nombre), curso:curso_id(nombre)")
        .order("fecha_creacion", { ascending: orden === "asc" });

    if (categoriaId) consulta = consulta.eq("categoria_id", categoriaId);
    if (cursoId) consulta = consulta.eq("curso_id", cursoId);
    if (texto) consulta = consulta.or(`titulo.ilike.%${texto}%,contenido.ilike.%${texto}%`);

    const { data, error } = await consulta;

    if (error) {
        mostrarError(contenedor, "No se pudieron cargar las publicaciones.");
        console.error(error);
        return;
    }
    if (!data.length) {
        mostrarVacio(contenedor, "No hay publicaciones todavía.");
        return;
    }

    contenedor.innerHTML = data.map((pub) => `
        <article class="tarjeta tarjeta-publicacion">
            <div class="tarjeta-encabezado">
                <span class="badge">${escapeHTML(pub.categoria?.nombre || "Sin categoría")}</span>
                ${!pub.publicado ? '<span class="badge badge-borrador">Borrador</span>' : ""}
            </div>
            <h3>${escapeHTML(pub.titulo)}</h3>
            <p class="texto-resumen">${escapeHTML(resumirTexto(pub.contenido))}</p>
            <div class="tarjeta-meta">
                <span>${escapeHTML(pub.curso?.nombre || "Todos los cursos")}</span>
                <span>${escapeHTML(nombreAutor(pub.autor))}</span>
                <span>${formatearFecha(pub.fecha_creacion)}</span>
            </div>
            <a class="btn btn-secundario btn-sm" href="publicacion.html?id=${pub.id}">Leer más</a>
        </article>
    `).join("");
}

function resumirTexto(html) {
    const texto = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return texto.length > 180 ? texto.slice(0, 180) + "…" : texto;
}

function nombreAutor(autor) {
    if (!autor) return "Autor desconocido";
    return `${autor.nombre || ""} ${autor.apellido || ""}`.trim() || "Autor desconocido";
}

async function inicializarFiltros() {
    await poblarSelect(document.getElementById("filtro-categoria"), "categorias");
    await poblarSelect(document.getElementById("filtro-curso"), "cursos");

    const cursoIdUrl = obtenerParametro("curso_id");
    if (cursoIdUrl) document.getElementById("filtro-curso").value = cursoIdUrl;

    ["filtro-buscar", "filtro-categoria", "filtro-curso", "filtro-orden"].forEach((id) => {
        document.getElementById(id)?.addEventListener("input", debounce(cargarPublicaciones, 300));
        document.getElementById(id)?.addEventListener("change", cargarPublicaciones);
    });
}

function debounce(fn, espera) {
    let temporizador;
    return (...args) => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => fn(...args), espera);
    };
}

// ---------- CREACIÓN DE PUBLICACIÓN ----------
async function inicializarFormularioCrear() {
    const boton = document.getElementById("btn-nueva-publicacion");
    const panel = document.getElementById("panel-nueva-publicacion");
    if (!boton || !panel) return;

    boton.classList.remove("oculto");
    boton.addEventListener("click", () => panel.classList.toggle("oculto"));

    await poblarSelect(document.getElementById("nueva-pub-categoria"), "categorias", { incluirTodos: false });
    await poblarSelect(document.getElementById("nueva-pub-curso"), "cursos");

    const form = document.getElementById("form-nueva-publicacion");
    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const titulo = form.titulo.value.trim();
        const editor = document.getElementById("nueva-pub-editor");
        const contenido = sanitizeHTML(editor.innerHTML);
        const categoria_id = form.categoria_id.value || null;
        const curso_id = form.curso_id.value || null;
        const trimestre = form.trimestre.value || null;
        const unidad = form.unidad.value.trim();
        const boton = form.querySelector("button[type=submit]");

        if (!titulo || !contenido || contenido === "<br>") {
            mostrarToast("Completá el título y el contenido.", "error");
            return;
        }

        boton.disabled = true;
        boton.textContent = "Publicando...";

        const { data: pub, error } = await supabaseClient
            .from("publicaciones")
            .insert({
                titulo, contenido, categoria_id, curso_id, trimestre, unidad,
                autor_id: PERFIL_ACTUAL.id, publicado: true,
            })
            .select()
            .single();

        boton.disabled = false;
        boton.textContent = "Publicar";

        if (error) {
            mostrarToast("No se pudo crear la publicación.", "error");
            console.error(error);
            return;
        }

        const etiquetasTexto = form.etiquetas.value.trim();
        if (etiquetasTexto) await asociarEtiquetas("publicacion", pub.id, etiquetasTexto);

        mostrarToast("Publicación creada correctamente.", "exito");
        window.location.href = `publicacion.html?id=${pub.id}`;
    });
}

/** Crea (si no existen) y asocia etiquetas de texto separadas por coma o # */
async function asociarEtiquetas(tipo, entidadId, textoEtiquetas) {
    const nombres = [...new Set(
        textoEtiquetas.split(/[,#]/).map((e) => e.trim().toLowerCase()).filter(Boolean)
    )];
    if (!nombres.length) return;

    const tabla = tipo === "publicacion" ? "publicacion_etiquetas" : "recurso_etiquetas";
    const columnaId = tipo === "publicacion" ? "publicacion_id" : "recurso_id";

    for (const nombre of nombres) {
        let { data: etiqueta } = await supabaseClient
            .from("etiquetas").select("id").eq("nombre", nombre).maybeSingle();

        if (!etiqueta) {
            const { data: nueva, error: errorCrear } = await supabaseClient
                .from("etiquetas").insert({ nombre }).select().single();
            if (errorCrear) continue;
            etiqueta = nueva;
        }

        await supabaseClient.from(tabla).insert({ [columnaId]: entidadId, etiqueta_id: etiqueta.id });
    }
}

// =====================================================================
// DETALLE DE PUBLICACIÓN (publicacion.html)
// =====================================================================

async function cargarDetallePublicacion() {
    const contenedor = document.getElementById("detalle-publicacion");
    const id = obtenerParametro("id");
    if (!id) {
        mostrarError(contenedor, "Publicación no especificada.");
        return;
    }
    mostrarCargando(contenedor);

    const { data: pub, error } = await supabaseClient
        .from("publicaciones")
        .select(`id, titulo, contenido, fecha_creacion, fecha_actualizacion, publicado, autor_id,
                 autor:autor_id(nombre, apellido), categoria:categoria_id(nombre), curso:curso_id(nombre),
                 publicacion_etiquetas(etiquetas(nombre))`)
        .eq("id", id)
        .single();

    if (error || !pub) {
        mostrarError(contenedor, "No se encontró la publicación o no tenés permiso para verla.");
        return;
    }

    const esAutor = pub.autor_id === PERFIL_ACTUAL.id;
    const puedeEditar = esAutor || ["admin", "coordinador"].includes(PERFIL_ACTUAL.rol);
    const etiquetas = (pub.publicacion_etiquetas || []).map((e) => e.etiquetas?.nombre).filter(Boolean);

    contenedor.innerHTML = `
        <div class="tarjeta-encabezado">
            <span class="badge">${escapeHTML(pub.categoria?.nombre || "Sin categoría")}</span>
            ${!pub.publicado ? '<span class="badge badge-borrador">Borrador</span>' : ""}
        </div>
        <h1>${escapeHTML(pub.titulo)}</h1>
        <div class="tarjeta-meta">
            <span>${escapeHTML(nombreAutor(pub.autor))}</span>
            <span>${escapeHTML(pub.curso?.nombre || "Todos los cursos")}</span>
            <span>Publicado: ${formatearFecha(pub.fecha_creacion)}</span>
            ${pub.fecha_actualizacion !== pub.fecha_creacion ? `<span>Actualizado: ${formatearFecha(pub.fecha_actualizacion)}</span>` : ""}
        </div>
        ${etiquetas.length ? `<div class="lista-etiquetas">${etiquetas.map((e) => `<span class="etiqueta">#${escapeHTML(e)}</span>`).join(" ")}</div>` : ""}
        <div class="contenido-publicacion">${sanitizeHTML(pub.contenido)}</div>
        ${puedeEditar ? `
            <div class="acciones-publicacion">
                <button id="btn-eliminar-publicacion" class="btn btn-peligro btn-sm">Eliminar publicación</button>
            </div>
        ` : ""}
        <hr>
        <h2>Comentarios</h2>
        <div id="lista-comentarios"></div>
        <form id="form-comentario" class="form-comentario">
            <textarea name="contenido" placeholder="Escribí un comentario..." required></textarea>
            <button type="submit" class="btn btn-primario btn-sm">Comentar</button>
        </form>
    `;

    document.getElementById("btn-eliminar-publicacion")?.addEventListener("click", async () => {
        if (!confirmarAccion("¿Estás seguro de que deseas eliminar esta publicación?")) return;
        const { error: errorEliminar } = await supabaseClient.from("publicaciones").delete().eq("id", id);
        if (errorEliminar) {
            mostrarToast("No se pudo eliminar la publicación.", "error");
            return;
        }
        mostrarToast("Publicación eliminada correctamente.", "exito");
        window.location.href = "publicaciones.html";
    });

    await cargarComentarios(id);

    document.getElementById("form-comentario").addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const form = evento.target;
        const contenido = form.contenido.value.trim();
        if (!contenido) return;
        const boton = form.querySelector("button[type=submit]");
        boton.disabled = true;

        const { error: errorComentario } = await supabaseClient.from("comentarios").insert({
            publicacion_id: id, autor_id: PERFIL_ACTUAL.id, contenido: escapeHTML(contenido),
        });

        boton.disabled = false;
        if (errorComentario) {
            mostrarToast("No se pudo publicar el comentario.", "error");
            return;
        }
        form.reset();
        await cargarComentarios(id);
    });
}

async function cargarComentarios(publicacionId) {
    const contenedor = document.getElementById("lista-comentarios");
    const { data: comentarios, error } = await supabaseClient
        .from("comentarios")
        .select("id, contenido, fecha_creacion, autor_id, autor:autor_id(nombre, apellido)")
        .eq("publicacion_id", publicacionId)
        .order("fecha_creacion", { ascending: true });

    if (error) {
        mostrarError(contenedor, "No se pudieron cargar los comentarios.");
        return;
    }
    if (!comentarios.length) {
        mostrarVacio(contenedor, "Todavía no hay comentarios. ¡Sé el primero en comentar!");
        return;
    }

    contenedor.innerHTML = comentarios.map((c) => `
        <div class="comentario">
            <div class="comentario-encabezado">
                <strong>${escapeHTML(nombreAutor(c.autor))}</strong>
                <span>${formatearFechaHora(c.fecha_creacion)}</span>
            </div>
            <p>${escapeHTML(c.contenido)}</p>
            ${c.autor_id === PERFIL_ACTUAL.id || ["admin", "coordinador"].includes(PERFIL_ACTUAL.rol) ? `
                <button class="btn-eliminar-comentario" data-id="${c.id}">Eliminar</button>
            ` : ""}
        </div>
    `).join("");

    contenedor.querySelectorAll(".btn-eliminar-comentario").forEach((boton) => {
        boton.addEventListener("click", async () => {
            if (!confirmarAccion("¿Estás seguro de que deseas eliminar este comentario?")) return;
            await supabaseClient.from("comentarios").delete().eq("id", boton.dataset.id);
            await cargarComentarios(publicacionId);
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("lista-publicaciones")) {
        PERFIL_ACTUAL = await protegerPagina();
        if (!PERFIL_ACTUAL) return;
        await inicializarFiltros();
        await cargarPublicaciones();
        await inicializarFormularioCrear();
    } else if (document.getElementById("detalle-publicacion")) {
        PERFIL_ACTUAL = await protegerPagina();
        if (!PERFIL_ACTUAL) return;
        await cargarDetallePublicacion();
    }
});
