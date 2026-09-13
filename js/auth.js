// =====================================================================
// AUTH.JS — login, registro, recuperación de contraseña
// =====================================================================

// ---------- LOGIN ----------
function inicializarFormularioLogin() {
    const form = document.getElementById("form-login");
    if (!form) return;

    const motivo = obtenerParametro("motivo");
    const cajaMensaje = document.getElementById("mensaje-login");
    if (motivo === "inactivo" && cajaMensaje) {
        cajaMensaje.textContent = "Tu cuenta todavía no fue activada por un administrador.";
        cajaMensaje.classList.remove("oculto");
    }

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const email = form.email.value.trim();
        const password = form.password.value;
        const boton = form.querySelector("button[type=submit]");

        boton.disabled = true;
        boton.textContent = "Iniciando sesión...";

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            mostrarToast("No se pudo iniciar sesión: credenciales inválidas.", "error");
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
            return;
        }

        const { data: perfil } = await supabaseClient
            .from("perfiles")
            .select("activo")
            .eq("id", data.user.id)
            .single();

        if (!perfil || !perfil.activo) {
            await supabaseClient.auth.signOut();
            mostrarToast("Tu cuenta está pendiente de activación por un administrador.", "error");
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
            return;
        }

        mostrarToast("Sesión iniciada correctamente.", "exito");
        window.location.href = "index.html";
    });
}

// ---------- REGISTRO ----------
function inicializarFormularioRegistro() {
    const form = document.getElementById("form-registro");
    if (!form) return;

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nombre = form.nombre.value.trim();
        const apellido = form.apellido.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmacion = form.confirmacion.value;
        const boton = form.querySelector("button[type=submit]");

        if (password !== confirmacion) {
            mostrarToast("Las contraseñas no coinciden.", "error");
            return;
        }
        if (password.length < 8) {
            mostrarToast("La contraseña debe tener al menos 8 caracteres.", "error");
            return;
        }

        boton.disabled = true;
        boton.textContent = "Creando cuenta...";

        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { nombre, apellido } },
        });

        if (error) {
            mostrarToast(`No se pudo crear la cuenta: ${error.message}`, "error");
            boton.disabled = false;
            boton.textContent = "Crear cuenta";
            return;
        }

        document.getElementById("registro-exito").classList.remove("oculto");
        form.classList.add("oculto");
    });
}

// ---------- RECUPERAR CONTRASEÑA ----------
function inicializarFormularioRecuperar() {
    const form = document.getElementById("form-recuperar");
    if (!form) return;

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const email = form.email.value.trim();
        const boton = form.querySelector("button[type=submit]");
        boton.disabled = true;
        boton.textContent = "Enviando...";

        // IMPORTANTE: configurá esta URL exacta en Supabase > Authentication > URL Configuration
        // como "Redirect URL" permitida (por ej. https://tu-usuario.github.io/tu-repo/perfil.html)
        const redirectTo = new URL("perfil.html", window.location.href).toString();

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });

        boton.disabled = false;
        boton.textContent = "Enviar enlace de recuperación";

        if (error) {
            mostrarToast(`No se pudo enviar el correo: ${error.message}`, "error");
            return;
        }
        mostrarToast("Si el correo existe, vas a recibir un enlace de recuperación.", "exito");
        form.reset();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarFormularioLogin();
    inicializarFormularioRegistro();
    inicializarFormularioRecuperar();
});
