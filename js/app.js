// =====================================================================
// APP.JS — inicialización común a todas las páginas
// (sesión, navbar, menú responsive, protección de rutas)
// =====================================================================

/** Devuelve la sesión activa (o null) */
async function obtenerSesion() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error("Error obteniendo sesión:", error);
        return null;
    }
    return data.session;
}

/** Devuelve el perfil (tabla perfiles) del usuario autenticado, o null */
async function obtenerPerfilActual() {
    const sesion = await obtenerSesion();
    if (!sesion) return null;
    const { data, error } = await supabaseClient
        .from("perfiles")
        .select("*")
        .eq("id", sesion.user.id)
        .single();
    if (error) {
        console.error("Error obteniendo perfil:", error);
        return null;
    }
    return data;
}

/**
 * Protege una página: exige sesión iniciada (y opcionalmente
 * cuenta activa y un conjunto de roles permitidos).
 * Redirige si no se cumplen las condiciones.
 * Devuelve el perfil si todo está OK, o null si redirigió.
 */
async function protegerPagina({ rolesPermitidos = null } = {}) {
    const sesion = await obtenerSesion();
    if (!sesion) {
        window.location.href = "login.html";
        return null;
    }
    const perfil = await obtenerPerfilActual();
    if (!perfil || !perfil.activo) {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html?motivo=inactivo";
        return null;
    }
    if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
        window.location.href = "index.html?motivo=sin-permiso";
        return null;
    }
    return perfil;
}

/** Cierra sesión y redirige al login */
async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

/** Renderiza la barra de navegación superior según el estado de sesión */
async function inicializarNavbar() {
    const nav = document.getElementById("navbar");
    if (!nav) return;

    const sesion = await obtenerSesion();
    const perfil = sesion ? await obtenerPerfilActual() : null;

    const linksPublicos = `
        <a href="index.html">Inicio</a>
    `;

    const linksPrivados = perfil ? `
        <a href="index.html">Inicio</a>
        <a href="publicaciones.html">Publicaciones</a>
        <a href="recursos.html">Recursos</a>
        <a href="curso.html">Cursos</a>
        ${["admin", "coordinador"].includes(perfil.rol) ? '<a href="admin.html">Administración</a>' : ""}
    ` : linksPublicos;

    const areaUsuario = perfil ? `
        <div class="nav-usuario">
            <a href="perfil.html" class="nav-usuario-nombre">${escapeHTML(perfil.nombre || perfil.email)}
                <span class="badge badge-rol">${escapeHTML(perfil.rol)}</span>
            </a>
            <button id="btn-cerrar-sesion" class="btn btn-secundario btn-sm">Cerrar sesión</button>
        </div>
    ` : `
        <div class="nav-usuario">
            <a href="login.html" class="btn btn-primario btn-sm">Iniciar sesión</a>
        </div>
    `;

    nav.innerHTML = `
        <div class="nav-inner">
            <a href="index.html" class="nav-marca">Aula Virtual EPET 1 · AREA: Informática y Matemática</a>
            <button id="btn-menu-movil" class="btn-menu-movil" aria-label="Abrir menú">☰</button>
            <div id="nav-links" class="nav-links">${linksPrivados}</div>
            ${areaUsuario}
        </div>
    `;

    const btnMenu = document.getElementById("btn-menu-movil");
    const navLinks = document.getElementById("nav-links");
    btnMenu?.addEventListener("click", () => navLinks.classList.toggle("abierto"));

    document.getElementById("btn-cerrar-sesion")?.addEventListener("click", cerrarSesion);

    // resalta el link activo
    const paginaActual = window.location.pathname.split("/").pop() || "index.html";
    nav.querySelectorAll("#nav-links a").forEach((a) => {
        if (a.getAttribute("href") === paginaActual) a.classList.add("activo");
    });

    return perfil;
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarNavbar();
});
