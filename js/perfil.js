// =====================================================================
// PERFIL.JS
// =====================================================================

async function cargarPerfil() {
    const perfil = await protegerPagina();
    if (!perfil) return;

    document.getElementById("perfil-nombre").value = perfil.nombre || "";
    document.getElementById("perfil-apellido").value = perfil.apellido || "";
    document.getElementById("perfil-email").textContent = perfil.email;
    document.getElementById("perfil-rol").textContent = perfil.rol;
    document.getElementById("perfil-fecha-alta").textContent = formatearFecha(perfil.fecha_alta);

    const formDatos = document.getElementById("form-datos-perfil");
    formDatos.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nombre = formDatos.nombre.value.trim();
        const apellido = formDatos.apellido.value.trim();
        const boton = formDatos.querySelector("button[type=submit]");
        boton.disabled = true;
        boton.textContent = "Guardando...";

        const { error } = await supabaseClient
            .from("perfiles")
            .update({ nombre, apellido })
            .eq("id", perfil.id);

        boton.disabled = false;
        boton.textContent = "Guardar cambios";

        if (error) {
            mostrarToast("No se pudieron guardar los cambios.", "error");
            return;
        }
        mostrarToast("Datos actualizados correctamente.", "exito");
        inicializarNavbar();
    });

    const formPassword = document.getElementById("form-cambiar-password");
    formPassword.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nueva = formPassword.password_nueva.value;
        const confirmacion = formPassword.password_confirmacion.value;
        const boton = formPassword.querySelector("button[type=submit]");

        if (nueva !== confirmacion) {
            mostrarToast("Las contraseñas no coinciden.", "error");
            return;
        }
        if (nueva.length < 8) {
            mostrarToast("La contraseña debe tener al menos 8 caracteres.", "error");
            return;
        }

        boton.disabled = true;
        boton.textContent = "Actualizando...";

        const { error } = await supabaseClient.auth.updateUser({ password: nueva });

        boton.disabled = false;
        boton.textContent = "Cambiar contraseña";

        if (error) {
            mostrarToast(`No se pudo cambiar la contraseña: ${error.message}`, "error");
            return;
        }
        mostrarToast("Contraseña actualizada correctamente.", "exito");
        formPassword.reset();
    });
}

document.addEventListener("DOMContentLoaded", cargarPerfil);
