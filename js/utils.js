// =====================================================================
// UTILIDADES COMPARTIDAS
// =====================================================================

/** Escapa texto plano para insertarlo de forma segura en HTML */
function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/**
 * Sanitiza HTML generado por el editor de contenido (contenteditable),
 * dejando solamente una lista blanca de etiquetas y atributos seguros.
 * Evita XSS al permitir formato básico en publicaciones.
 */
function sanitizeHTML(dirtyHTML) {
    const ETIQUETAS_PERMITIDAS = new Set([
        "P", "BR", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI",
        "H1", "H2", "H3", "A", "BLOCKQUOTE", "CODE", "PRE", "SPAN",
    ]);
    const ATRIBUTOS_PERMITIDOS = { A: ["href", "target", "rel"] };

    const plantilla = document.createElement("template");
    plantilla.innerHTML = dirtyHTML || "";

    const limpiarNodo = (nodo) => {
        [...nodo.childNodes].forEach((hijo) => {
            if (hijo.nodeType === Node.ELEMENT_NODE) {
                if (!ETIQUETAS_PERMITIDAS.has(hijo.tagName)) {
                    // reemplaza el elemento no permitido por su texto
                    const texto = document.createTextNode(hijo.textContent);
                    hijo.replaceWith(texto);
                    return;
                }
                [...hijo.attributes].forEach((attr) => {
                    const permitidos = ATRIBUTOS_PERMITIDOS[hijo.tagName] || [];
                    if (!permitidos.includes(attr.name)) {
                        hijo.removeAttribute(attr.name);
                    }
                });
                if (hijo.tagName === "A") {
                    const href = hijo.getAttribute("href") || "";
                    if (!/^https?:\/\//i.test(href)) hijo.removeAttribute("href");
                    hijo.setAttribute("target", "_blank");
                    hijo.setAttribute("rel", "noopener noreferrer");
                }
                limpiarNodo(hijo);
            }
        });
    };

    limpiarNodo(plantilla.content);
    return plantilla.innerHTML;
}

/** Muestra un mensaje flotante (toast) de éxito/error/info */
function mostrarToast(mensaje, tipo = "info") {
    let contenedor = document.getElementById("toast-container");
    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "toast-container";
        document.body.appendChild(contenedor);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    contenedor.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function mostrarCargando(contenedor, mensaje = "Cargando...") {
    contenedor.innerHTML = `<div class="estado-info estado-cargando">${escapeHTML(mensaje)}</div>`;
}

function mostrarVacio(contenedor, mensaje = "No hay contenido todavía.") {
    contenedor.innerHTML = `<div class="estado-info estado-vacio">${escapeHTML(mensaje)}</div>`;
}

function mostrarError(contenedor, mensaje = "Ocurrió un error. Intentá nuevamente.") {
    contenedor.innerHTML = `<div class="estado-info estado-error">${escapeHTML(mensaje)}</div>`;
}

/** Confirmación simple antes de acciones destructivas */
function confirmarAccion(mensaje) {
    return window.confirm(mensaje);
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return "";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatearFechaHora(fechaISO) {
    if (!fechaISO) return "";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

function formatearTamano(bytes) {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

function obtenerParametro(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}

const EXTENSIONES_PERMITIDAS = [
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "png", "jpg", "jpeg",
];
const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024; // 25 MB

/** Llena un <select> con las opciones de una tabla (cursos/categorias) */
async function poblarSelect(selectEl, tabla, { incluirTodos = true } = {}) {
    if (!selectEl) return;
    const { data, error } = await supabaseClient
        .from(tabla)
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");
    if (error) return;
    selectEl.innerHTML =
        (incluirTodos ? `<option value="">Todos</option>` : `<option value="">Seleccionar...</option>`) +
        data.map((fila) => `<option value="${fila.id}">${escapeHTML(fila.nombre)}</option>`).join("");
}

function validarArchivoPDF(file) {
    const extension = file.name.split(".").pop().toLowerCase();
    if (extension !== "pdf" || file.type && file.type !== "application/pdf") {
        return { valido: false, mensaje: "Solo se permiten archivos PDF." };
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
        return { valido: false, mensaje: "El PDF supera el tamaño máximo permitido (25 MB)." };
    }
    return { valido: true, extension: "pdf" };
}

/** Genera una URL firmada y dispara la descarga de un archivo del bucket 'recursos' */
async function descargarArchivoStorage(ruta, nombreArchivo) {
    const { data, error } = await supabaseClient.storage
        .from(BUCKET_RECURSOS)
        .createSignedUrl(ruta, 60);

    if (error || !data) {
        mostrarToast("No se pudo generar el enlace de descarga.", "error");
        return;
    }
    const enlace = document.createElement("a");
    enlace.href = data.signedUrl;
    enlace.download = nombreArchivo;
    enlace.click();
}

function validarArchivo(file) {
    const extension = file.name.split(".").pop().toLowerCase();
    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
        return { valido: false, mensaje: `Tipo de archivo no permitido: .${extension}` };
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
        return { valido: false, mensaje: "El archivo supera el tamaño máximo permitido (25 MB)." };
    }
    return { valido: true, extension };
}
