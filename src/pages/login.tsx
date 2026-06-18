import { type NextPage } from "next";
import Head from "next/head";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";

const LoginPage: NextPage = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      void router.push("/dashboard");
    } else {
      setError("Credenciales incorrectas.");
    }
  };

  return (
    <>
      <Head>
        <title>Iniciar sesión — FinanzasFácil</title>
        <meta name="description" content="Accede a tu dashboard financiero" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl shadow-md">
                💰
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                Finanzas<span className="text-blue-600">Fácil</span>
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              Gestión financiera para tu negocio
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <h1 className="text-lg font-bold text-slate-900 mb-5">
              Iniciar sesión
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Correo electrónico
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue="demo@finanzasfacil.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Contraseña
                </label>
                <input
                  name="password"
                  type="password"
                  defaultValue="demo123"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Entrando..." : "Entrar al Dashboard →"}
              </button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-5 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-1">
                Demo MVP — Credenciales de acceso:
              </p>
              <p className="text-xs text-slate-600 font-mono">
                demo@finanzasfacil.com / demo123
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            🎯 ODS 8: Trabajo Decente y Crecimiento Económico
          </p>
        </div>
      </main>
    </>
  );
};

export default LoginPage;
