// =====================================================================
// CURSOS.JS — listado de cursos agrupados por materia
// =====================================================================

async function cargarCursos() {
    const perfil = await protegerPagina();
    if (!perfil) return;

    const contenedor = document.getElementById("lista-cursos");
    mostrarCargando(contenedor, "Cargando cursos...");

    const { data: cursos, error } = await supabaseClient
        .from("cursos")
        .select("*")
        .eq("activo", true)
        .order("materia")
        .order("nombre");

    if (error) {
        mostrarError(contenedor, "No se pudieron cargar los cursos.");
        return;
    }
    if (!cursos.length) {
        mostrarVacio(contenedor, "Todavía no hay cursos cargados.");
        return;
    }

    const porMateria = cursos.reduce((acc, curso) => {
        const clave = curso.materia || "Otros";
        acc[clave] = acc[clave] || [];
        acc[clave].push(curso);
        return acc;
    }, {});

    contenedor.innerHTML = Object.entries(porMateria).map(([materia, listaCursos]) => `
        <div class="grupo-materia">
            <h2>${escapeHTML(materia)}</h2>
            <div class="grid-tarjetas">
                ${listaCursos.map((curso) => `
                    <a class="tarjeta tarjeta-curso" href="publicaciones.html?curso_id=${curso.id}">
                        <h3>${escapeHTML(curso.nombre)}</h3>
                        <p>${escapeHTML(curso.descripcion || "Ver publicaciones y recursos del curso")}</p>
                    </a>
                `).join("")}
            </div>
        </div>
    `).join("");
}

document.addEventListener("DOMContentLoaded", cargarCursos);
