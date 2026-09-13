// =====================================================================
// ADMIN.JS — panel de administración (usuarios, cursos, categorías)
// =====================================================================

let PERFIL_ADMIN = null;

async function cargarUsuarios() {
    const contenedor = document.getElementById("tabla-usuarios");
    mostrarCargando(contenedor);

    const { data, error } = await supabaseClient
        .from("perfiles")
        .select("*")
        .order("fecha_alta", { ascending: false });

    if (error) {
        mostrarError(contenedor, "No se pudieron cargar los usuarios.");
        return;
    }

    contenedor.innerHTML = `
        <table class="tabla">
            <thead>
                <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                ${data.map((u) => `
                    <tr>
                        <td>${escapeHTML(u.nombre)} ${escapeHTML(u.apellido)}</td>
                        <td>${escapeHTML(u.email)}</td>
                        <td>
                            <select class="select-rol" data-id="${u.id}" ${u.id === PERFIL_ADMIN.id ? "disabled" : ""}>
                                ${["profesor", "coordinador", "admin"].map((r) => `
                                    <option value="${r}" ${u.rol === r ? "selected" : ""}>${r}</option>
                                `).join("")}
                            </select>
                        </td>
                        <td>
                            <span class="badge ${u.activo ? "badge-exito" : "badge-borrador"}">
                                ${u.activo ? "Activo" : "Pendiente"}
                            </span>
                        </td>
                        <td>${formatearFecha(u.fecha_alta)}</td>
                        <td>
                            <button class="btn btn-sm btn-toggle-activo" data-id="${u.id}" data-activo="${u.activo}"
                                ${u.id === PERFIL_ADMIN.id ? "disabled" : ""}>
                                ${u.activo ? "Desactivar" : "Activar"}
                            </button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    contenedor.querySelectorAll(".select-rol").forEach((select) => {
        select.addEventListener("change", async () => {
            const { error: errorRol } = await supabaseClient
                .from("perfiles").update({ rol: select.value }).eq("id", select.dataset.id);
            if (errorRol) {
                mostrarToast("No se pudo cambiar el rol.", "error");
                return;
            }
            mostrarToast("Rol actualizado correctamente.", "exito");
        });
    });

    contenedor.querySelectorAll(".btn-toggle-activo").forEach((boton) => {
        boton.addEventListener("click", async () => {
            const nuevoEstado = boton.dataset.activo !== "true";
            const { error: errorEstado } = await supabaseClient
                .from("perfiles").update({ activo: nuevoEstado }).eq("id", boton.dataset.id);
            if (errorEstado) {
                mostrarToast("No se pudo actualizar el estado del usuario.", "error");
                return;
            }
            mostrarToast(nuevoEstado ? "Usuario activado." : "Usuario desactivado.", "exito");
            await cargarUsuarios();
        });
    });
}

// ---------- CURSOS ----------
async function cargarCursosAdmin() {
    const contenedor = document.getElementById("tabla-cursos");
    mostrarCargando(contenedor);

    const { data, error } = await supabaseClient.from("cursos").select("*").order("materia").order("nombre");
    if (error) {
        mostrarError(contenedor, "No se pudieron cargar los cursos.");
        return;
    }

    contenedor.innerHTML = `
        <table class="tabla">
            <thead><tr><th>Nombre</th><th>Materia</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                ${data.map((c) => `
                    <tr>
                        <td>${escapeHTML(c.nombre)}</td>
                        <td>${escapeHTML(c.materia)}</td>
                        <td><span class="badge ${c.activo ? "badge-exito" : "badge-borrador"}">${c.activo ? "Activo" : "Inactivo"}</span></td>
                        <td><button class="btn btn-sm btn-toggle-curso" data-id="${c.id}" data-activo="${c.activo}">
                            ${c.activo ? "Desactivar" : "Activar"}
                        </button></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    contenedor.querySelectorAll(".btn-toggle-curso").forEach((boton) => {
        boton.addEventListener("click", async () => {
            const nuevoEstado = boton.dataset.activo !== "true";
            await supabaseClient.from("cursos").update({ activo: nuevoEstado }).eq("id", boton.dataset.id);
            await cargarCursosAdmin();
        });
    });
}

function inicializarFormularioCurso() {
    const form = document.getElementById("form-nuevo-curso");
    form?.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nombre = form.nombre.value.trim();
        const materia = form.materia.value.trim();
        const descripcion = form.descripcion.value.trim();
        if (!nombre) return;

        const { error } = await supabaseClient.from("cursos").insert({ nombre, materia, descripcion });
        if (error) {
            mostrarToast("No se pudo crear el curso (¿nombre repetido?).", "error");
            return;
        }
        mostrarToast("Curso creado correctamente.", "exito");
        form.reset();
        await cargarCursosAdmin();
    });
}

// ---------- CATEGORÍAS ----------
async function cargarCategoriasAdmin() {
    const contenedor = document.getElementById("tabla-categorias");
    mostrarCargando(contenedor);

    const { data, error } = await supabaseClient.from("categorias").select("*").order("nombre");
    if (error) {
        mostrarError(contenedor, "No se pudieron cargar las categorías.");
        return;
    }

    contenedor.innerHTML = `
        <table class="tabla">
            <thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                ${data.map((c) => `
                    <tr>
                        <td>${escapeHTML(c.nombre)}</td>
                        <td><span class="badge ${c.activo ? "badge-exito" : "badge-borrador"}">${c.activo ? "Activa" : "Inactiva"}</span></td>
                        <td><button class="btn btn-sm btn-toggle-categoria" data-id="${c.id}" data-activo="${c.activo}">
                            ${c.activo ? "Desactivar" : "Activar"}
                        </button></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    contenedor.querySelectorAll(".btn-toggle-categoria").forEach((boton) => {
        boton.addEventListener("click", async () => {
            const nuevoEstado = boton.dataset.activo !== "true";
            await supabaseClient.from("categorias").update({ activo: nuevoEstado }).eq("id", boton.dataset.id);
            await cargarCategoriasAdmin();
        });
    });
}

function inicializarFormularioCategoria() {
    const form = document.getElementById("form-nueva-categoria");
    form?.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nombre = form.nombre.value.trim();
        const descripcion = form.descripcion.value.trim();
        if (!nombre) return;

        const { error } = await supabaseClient.from("categorias").insert({ nombre, descripcion });
        if (error) {
            mostrarToast("No se pudo crear la categoría (¿nombre repetido?).", "error");
            return;
        }
        mostrarToast("Categoría creada correctamente.", "exito");
        form.reset();
        await cargarCategoriasAdmin();
    });
}

// ---------- PESTAÑAS ----------
function inicializarPestanas() {
    const botones = document.querySelectorAll(".pestana-boton");
    botones.forEach((boton) => {
        boton.addEventListener("click", () => {
            botones.forEach((b) => b.classList.remove("activo"));
            document.querySelectorAll(".pestana-panel").forEach((p) => p.classList.add("oculto"));
            boton.classList.add("activo");
            document.getElementById(boton.dataset.panel).classList.remove("oculto");
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!document.getElementById("panel-admin")) return;
    PERFIL_ADMIN = await protegerPagina({ rolesPermitidos: ["admin", "coordinador"] });
    if (!PERFIL_ADMIN) return;

    document.getElementById("aviso-solo-admin")?.classList.toggle("oculto", PERFIL_ADMIN.rol === "admin");

    inicializarPestanas();
    await cargarUsuarios();
    await cargarCursosAdmin();
    await cargarCategoriasAdmin();
    inicializarFormularioCurso();
    inicializarFormularioCategoria();

    if (PERFIL_ADMIN.rol !== "admin") {
        document.getElementById("pestana-usuarios")?.classList.add("oculto");
    }
});
