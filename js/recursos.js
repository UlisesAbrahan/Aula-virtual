// =====================================================================
// RECURSOS.JS — biblioteca de recursos (listado, filtros, subida, descarga)
// =====================================================================

let PERFIL_RECURSOS = null;

async function cargarRecursos() {
    const contenedor = document.getElementById("lista-recursos");
    mostrarCargando(contenedor);

    const texto = document.getElementById("filtro-buscar-recurso")?.value.trim() || "";
    const categoriaId = document.getElementById("filtro-categoria-recurso")?.value || "";
    const cursoId = document.getElementById("filtro-curso-recurso")?.value || "";
    const tipo = document.getElementById("filtro-tipo-recurso")?.value || "";

    let consulta = supabaseClient
        .from("recursos")
        .select("id, titulo, descripcion, nombre_archivo, ruta_archivo, tipo_archivo, tamano_archivo, fecha_subida, autor_id, autor:autor_id(nombre, apellido), categoria:categoria_id(nombre), curso:curso_id(nombre)")
        .order("fecha_subida", { ascending: false });

    if (categoriaId) consulta = consulta.eq("categoria_id", categoriaId);
    if (cursoId) consulta = consulta.eq("curso_id", cursoId);
    if (tipo) consulta = consulta.eq("tipo_archivo", tipo);
    if (texto) consulta = consulta.or(`titulo.ilike.%${texto}%,descripcion.ilike.%${texto}%`);

    const { data, error } = await consulta;

    if (error) {
        mostrarError(contenedor, "No se pudieron cargar los recursos.");
        return;
    }
    if (!data.length) {
        mostrarVacio(contenedor, "No hay recursos todavía.");
        return;
    }

    contenedor.innerHTML = data.map((rec) => `
        <article class="tarjeta tarjeta-recurso">
            <div class="tarjeta-encabezado">
                <span class="badge">${escapeHTML(rec.tipo_archivo.toUpperCase())}</span>
                <span class="badge">${escapeHTML(rec.categoria?.nombre || "General")}</span>
            </div>
            <h3>${escapeHTML(rec.titulo)}</h3>
            <p class="texto-resumen">${escapeHTML(rec.descripcion || "")}</p>
            <div class="tarjeta-meta">
                <span>${escapeHTML(rec.curso?.nombre || "Todos los cursos")}</span>
                <span>${escapeHTML(nombreAutor(rec.autor))}</span>
                <span>${formatearTamano(rec.tamano_archivo)}</span>
                <span>${formatearFecha(rec.fecha_subida)}</span>
            </div>
            <div class="acciones-tarjeta">
                <button class="btn btn-primario btn-sm btn-descargar" data-ruta="${escapeHTML(rec.ruta_archivo)}" data-nombre="${escapeHTML(rec.nombre_archivo)}">
                    Descargar
                </button>
                ${rec.autor_id === PERFIL_RECURSOS.id || ["admin", "coordinador"].includes(PERFIL_RECURSOS.rol) ? `
                    <button class="btn btn-peligro btn-sm btn-eliminar-recurso" data-id="${rec.id}" data-ruta="${escapeHTML(rec.ruta_archivo)}">Eliminar</button>
                ` : ""}
            </div>
        </article>
    `).join("");

    contenedor.querySelectorAll(".btn-descargar").forEach((boton) => {
        boton.addEventListener("click", () => descargarRecurso(boton.dataset.ruta, boton.dataset.nombre));
    });
    contenedor.querySelectorAll(".btn-eliminar-recurso").forEach((boton) => {
        boton.addEventListener("click", () => eliminarRecurso(boton.dataset.id, boton.dataset.ruta));
    });
}

async function descargarRecurso(ruta, nombreArchivo) {
    const { data, error } = await supabaseClient.storage
        .from(BUCKET_RECURSOS)
        .createSignedUrl(ruta, 60); // válido por 60 segundos

    if (error || !data) {
        mostrarToast("No se pudo generar el enlace de descarga.", "error");
        return;
    }
    const enlace = document.createElement("a");
    enlace.href = data.signedUrl;
    enlace.download = nombreArchivo;
    enlace.click();
}

async function eliminarRecurso(id, ruta) {
    if (!confirmarAccion("¿Estás seguro de que deseas eliminar este recurso?")) return;

    const { error: errorStorage } = await supabaseClient.storage.from(BUCKET_RECURSOS).remove([ruta]);
    if (errorStorage) {
        mostrarToast("No se pudo eliminar el archivo del almacenamiento.", "error");
        return;
    }
    const { error: errorTabla } = await supabaseClient.from("recursos").delete().eq("id", id);
    if (errorTabla) {
        mostrarToast("El archivo se eliminó pero no se pudo borrar el registro.", "error");
        return;
    }
    mostrarToast("Recurso eliminado correctamente.", "exito");
    await cargarRecursos();
}

async function inicializarFiltrosRecursos() {
    await poblarSelect(document.getElementById("filtro-categoria-recurso"), "categorias");
    await poblarSelect(document.getElementById("filtro-curso-recurso"), "cursos");

    ["filtro-buscar-recurso", "filtro-categoria-recurso", "filtro-curso-recurso", "filtro-tipo-recurso"].forEach((id) => {
        document.getElementById(id)?.addEventListener("input", debounce(cargarRecursos, 300));
        document.getElementById(id)?.addEventListener("change", cargarRecursos);
    });
}

// ---------- SUBIR RECURSO ----------
async function inicializarFormularioSubir() {
    const boton = document.getElementById("btn-nuevo-recurso");
    const panel = document.getElementById("panel-nuevo-recurso");
    if (!boton || !panel) return;

    boton.classList.remove("oculto");
    boton.addEventListener("click", () => panel.classList.toggle("oculto"));

    await poblarSelect(document.getElementById("nuevo-rec-categoria"), "categorias", { incluirTodos: false });
    await poblarSelect(document.getElementById("nuevo-rec-curso"), "cursos");

    const form = document.getElementById("form-nuevo-recurso");
    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const titulo = form.titulo.value.trim();
        const descripcion = form.descripcion.value.trim();
        const archivo = form.archivo.files[0];
        const categoria_id = form.categoria_id.value || null;
        const curso_id = form.curso_id.value || null;
        const trimestre = form.trimestre.value || null;
        const unidad = form.unidad.value.trim();
        const boton = form.querySelector("button[type=submit]");

        if (!titulo || !archivo) {
            mostrarToast("Completá el título y seleccioná un archivo.", "error");
            return;
        }
        const validacion = validarArchivo(archivo);
        if (!validacion.valido) {
            mostrarToast(validacion.mensaje, "error");
            return;
        }

        boton.disabled = true;
        boton.textContent = "Subiendo archivo...";

        const rutaArchivo = `${PERFIL_RECURSOS.id}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        const { error: errorSubida } = await supabaseClient.storage
            .from(BUCKET_RECURSOS)
            .upload(rutaArchivo, archivo, { cacheControl: "3600", upsert: false });

        if (errorSubida) {
            mostrarToast("No se pudo subir el archivo.", "error");
            boton.disabled = false;
            boton.textContent = "Subir recurso";
            return;
        }

        const { data: recurso, error: errorInsertar } = await supabaseClient
            .from("recursos")
            .insert({
                titulo, descripcion, nombre_archivo: archivo.name, ruta_archivo: rutaArchivo,
                tipo_archivo: validacion.extension, tamano_archivo: archivo.size,
                autor_id: PERFIL_RECURSOS.id, categoria_id, curso_id, trimestre, unidad,
            })
            .select()
            .single();

        boton.disabled = false;
        boton.textContent = "Subir recurso";

        if (errorInsertar) {
            // Archivo huérfano: se subió a Storage pero no se pudo registrar. Lo eliminamos.
            await supabaseClient.storage.from(BUCKET_RECURSOS).remove([rutaArchivo]);
            mostrarToast("No se pudo guardar la información del recurso. Se canceló la subida.", "error");
            return;
        }

        const etiquetasTexto = form.etiquetas.value.trim();
        if (etiquetasTexto) await asociarEtiquetas("recurso", recurso.id, etiquetasTexto);

        mostrarToast("Archivo subido correctamente.", "exito");
        form.reset();
        panel.classList.add("oculto");
        await cargarRecursos();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!document.getElementById("lista-recursos")) return;
    PERFIL_RECURSOS = await protegerPagina();
    if (!PERFIL_RECURSOS) return;
    await inicializarFiltrosRecursos();
    await cargarRecursos();
    await inicializarFormularioSubir();
});
