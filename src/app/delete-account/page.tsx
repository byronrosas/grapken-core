import { Link } from "react-router-dom";

const LAST_UPDATED = "September 19, 2026";

/** Datos de contacto de la app a la que aplica esta pagina. */
const APP_NAME = "Gummate";
const SUPPORT_EMAIL = "contact@grapken.com";
const SUBJECT = encodeURIComponent(`Eliminación de cuenta — ${APP_NAME}`);

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#050509] text-neutral-400 font-sans">
      {/* Nav */}
      <nav className="border-b border-white/[0.04] px-6 lg:px-16 py-4 flex items-center justify-between">
        <Link to="/landing" className="flex items-center gap-2.5 group">
          <div className="relative">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="16" height="16" rx="4" stroke="#7c3aed" strokeWidth="1.2" opacity="0.6" />
              <circle cx="9" cy="9" r="2.5" fill="#7c3aed" opacity="0.7" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-neutral-300 group-hover:text-white transition-colors">Grapken</span>
        </Link>
        <Link to="/landing" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors font-mono">
          ← Back to site
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-[10px] font-mono text-neutral-700 mb-4 tracking-widest uppercase">Legal</p>
        <h1
          className="text-3xl sm:text-4xl font-bold text-neutral-100 mb-3 leading-tight"
          style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
        >
          Eliminar cuenta — {APP_NAME}
        </h1>
        <p className="text-xs text-neutral-700 font-mono mb-12">Última actualización: {LAST_UPDATED}</p>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <p>
              {APP_NAME} es una aplicación de notas de escritorio rápido para Android, operada por Grapken.
              Esta página permite solicitar la eliminación de tu cuenta de {APP_NAME} y de los datos
              asociados, incluso si ya desinstalaste la aplicación.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">1. Eliminar desde la aplicación</h2>
            <p>
              Si todavía tenés la aplicación instalada, el camino más rápido es hacerlo desde ahí:
              abrí <span className="text-neutral-200">Ajustes → Cuenta → Eliminar cuenta</span> y
              confirmá con tu contraseña. La eliminación es inmediata y no requiere esperar.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">2. Eliminar sin la aplicación</h2>
            <p className="mb-3">
              Si ya no tenés la aplicación, escribinos desde la dirección de correo con la que
              creaste tu cuenta. Para agilizar el trámite, incluí el asunto sugerido:
            </p>
            <p className="mb-6">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${SUBJECT}`}
                className="inline-block bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-3 rounded-lg transition-colors"
              >
                Solicitar la eliminación de mi cuenta
              </a>
            </p>
            <p className="text-neutral-500">
              O escribinos directamente a{" "}
              <span className="text-violet-400">{SUPPORT_EMAIL}</span> con el asunto{" "}
              <code className="text-violet-400 bg-violet-500/10 px-1 rounded text-xs">
                Eliminación de cuenta — {APP_NAME}
              </code>.
              Te vamos a responder pidiendo una confirmación desde la misma dirección de correo
              para evitar que terceros eliminen cuentas ajenas. Las solicitudes se atienden en
              un plazo máximo de 30 días.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">3. Qué datos se eliminan</h2>
            <ul className="list-disc list-inside space-y-2 text-neutral-500 ml-2">
              <li>Tu cuenta: correo electrónico, nombre y contraseña.</li>
              <li>Todas tus notas, gomitas y sesiones guardadas en la nube.</li>
              <li>Tus preferencias de la aplicación.</li>
              <li>El vínculo con tu identificador de suscripción.</li>
            </ul>
            <p className="mt-4">
              La eliminación es permanente: no conservamos una copia y no se puede deshacer.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">4. Qué NO se elimina</h2>
            <p className="mb-3">
              <span className="text-neutral-200 font-medium">
                La suscripción de Google Play no se cancela al eliminar la cuenta.
              </span>{" "}
              El cobro lo administra Google, no nosotros, así que si tenés una suscripción activa
              tenés que cancelarla por separado:
            </p>
            <p className="mb-4">
              <a
                href="https://play.google.com/store/account/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                play.google.com/store/account/subscriptions
              </a>
            </p>
            <p>
              Si preferís, escribinos primero y te ayudamos a cancelarla antes de eliminar la
              cuenta. La aplicación te advierte de esto al eliminar una cuenta con una
              suscripción vigente.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">5. Conservación de datos</h2>
            <p>
              Una vez confirmada la eliminación, los datos se borran de forma inmediata y
              permanente de nuestros sistemas. Sólo podríamos conservar registros mínimos si una
              obligación legal expresa lo exigiera, en cuyo caso quedarían limitados a ese fin.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">6. Contacto</h2>
            <p>
              ¿Dudas sobre tus datos o sobre este proceso? Escribinos a{" "}
              <span className="text-violet-400">{SUPPORT_EMAIL}</span>.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <span className="text-[10px] text-neutral-400 font-mono">© 2026 Grapken — v0.1.0 Beta</span>
          <div className="flex items-center gap-5 text-[10px] font-mono text-neutral-400">
            <Link to="/privacy" className="hover:text-neutral-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-neutral-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
