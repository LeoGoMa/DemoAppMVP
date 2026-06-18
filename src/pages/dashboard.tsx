import { type NextPage } from "next";
import Head from "next/head";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { api, type RouterOutputs } from "~/utils/api";

// ── Types ──────────────────────────────────────────────────────────
type Transaction = RouterOutputs["transaction"]["getByMonth"][number];
type TxType = "ingreso" | "gasto";
type FilterType = "all" | TxType;

// ── Constants ──────────────────────────────────────────────────────
const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const CATEGORIES: Record<TxType, string[]> = {
  ingreso: ["Venta directa","Servicio de entrega","Cobro pendiente","Otro ingreso"],
  gasto:   ["Insumos / Mercancía","Transporte","Renta","Servicios (luz/agua)","Herramientas","Otro gasto"],
};

const TX_ICONS: Record<string, string> = {
  "Venta directa": "🛒", "Servicio de entrega": "🚚", "Cobro pendiente": "💳",
  "Otro ingreso": "💰", "Insumos / Mercancía": "📦", "Transporte": "🚌",
  "Renta": "🏠", "Servicios (luz/agua)": "💡", "Herramientas": "🔧",
  "Otro gasto": "📝",
};

// ── Helpers ────────────────────────────────────────────────────────
function mxn(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
}

function getWeeksForMonth(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return [
    { label: "Sem 1\n1–7",         s: 1,  e: 7 },
    { label: "Sem 2\n8–14",        s: 8,  e: 14 },
    { label: "Sem 3\n15–21",       s: 15, e: 21 },
    { label: `Sem 4\n22–${lastDay}`, s: 22, e: lastDay },
  ].map(w => ({
    label: w.label,
    start: new Date(year, month - 1, w.s),
    end:   new Date(year, month - 1, w.e, 23, 59, 59),
  }));
}

// ── Sub-components ─────────────────────────────────────────────────

function KpiCard({
  label, value, sub, barPct, color,
}: {
  label: string; value: string; sub: string; barPct: number; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:-translate-y-0.5 transition-transform">
      <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${color}`}>{label}</p>
      <p className={`text-2xl font-black tracking-tight mb-1 ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mb-3">{sub}</p>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, barPct)}%`, background: "currentColor" }}
        />
      </div>
    </div>
  );
}

function WeeklyChart({
  transactions, year, month,
}: {
  transactions: Transaction[]; year: number; month: number;
}) {
  const weeks = useMemo(() => {
    return getWeeksForMonth(year, month).map(w => {
      const income  = transactions
        .filter(t => t.type === "ingreso" && new Date(t.date) >= w.start && new Date(t.date) <= w.end)
        .reduce((s, t) => s + t.amount, 0);
      const expense = transactions
        .filter(t => t.type === "gasto" && new Date(t.date) >= w.start && new Date(t.date) <= w.end)
        .reduce((s, t) => s + t.amount, 0);
      return { label: w.label, income, expense };
    });
  }, [transactions, year, month]);

  const maxVal = Math.max(...weeks.flatMap(w => [w.income, w.expense]), 1);

  return (
    <div>
      <div className="flex items-end gap-4 h-44">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-1 w-full" style={{ height: "160px" }}>
              <div
                className="flex-1 bg-emerald-400 rounded-t transition-all duration-700 cursor-pointer"
                style={{ height: w.income > 0 ? `${Math.max(4, (w.income / maxVal) * 160)}px` : "2px", opacity: w.income > 0 ? 1 : 0.25 }}
                title={`Ingresos: ${mxn(w.income)}`}
              />
              <div
                className="flex-1 bg-red-400 rounded-t transition-all duration-700 cursor-pointer"
                style={{ height: w.expense > 0 ? `${Math.max(4, (w.expense / maxVal) * 160)}px` : "2px", opacity: w.expense > 0 ? 1 : 0.25 }}
                title={`Gastos: ${mxn(w.expense)}`}
              />
            </div>
            <span className="text-[10px] text-slate-400 text-center whitespace-pre-line leading-tight">
              {w.label}
            </span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
          <span className="text-xs text-slate-500 font-medium">Ingresos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          <span className="text-xs text-slate-500 font-medium">Gastos</span>
        </div>
      </div>
    </div>
  );
}

interface TxFormData {
  type: TxType;
  description: string;
  amount: string;
  category: string;
  date: string;
}

function AddTransactionModal({
  open, onClose, onSuccess, defaultType,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void; defaultType?: TxType;
}) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [form, setForm] = useState<TxFormData>({
    type: defaultType ?? "ingreso",
    description: "",
    amount: "",
    category: CATEGORIES.ingreso[0]!,
    date: todayStr,
  });

  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        type: defaultType ?? "ingreso",
        category: CATEGORIES[defaultType ?? "ingreso"][0]!,
        description: "",
        amount: "",
        date: todayStr,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultType]);

  const createTx = api.transaction.create.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const setType = (t: TxType) =>
    setForm(f => ({ ...f, type: t, category: CATEGORIES[t][0]! }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTx.mutate({
      type: form.type,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      date: form.date,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl sm:rounded-2xl rounded-b-none w-full max-w-md shadow-xl">
        {/* Handle bar (mobile) */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-0 sm:hidden" />

        <div className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Nueva Transacción
          </h2>

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setType("ingreso")}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                form.type === "ingreso"
                  ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-400"
                  : "bg-slate-50 text-slate-400 border-2 border-transparent hover:border-slate-200"
              }`}
            >
              📈 Ingreso
            </button>
            <button
              type="button"
              onClick={() => setType("gasto")}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                form.type === "gasto"
                  ? "bg-red-50 text-red-700 border-2 border-red-400"
                  : "bg-slate-50 text-slate-400 border-2 border-transparent hover:border-slate-200"
              }`}
            >
              📉 Gasto
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Descripción
              </label>
              <input
                type="text"
                required
                maxLength={60}
                placeholder="Ej. Venta de frutas"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Monto (MXN)
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {CATEGORIES[form.type].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createTx.isPending}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {createTx.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard Page ────────────────────────────────────────────
const Dashboard: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const now = new Date();
  const [year]  = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  const [filter, setFilter]         = useState<FilterType>("all");
  const [showModal, setShowModal]   = useState(false);
  const [modalType, setModalType]   = useState<TxType>("ingreso");

  // CA-01: redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") void router.push("/login");
  }, [status, router]);

  const { data: transactions = [], refetch } = api.transaction.getByMonth.useQuery(
    { year, month },
    { enabled: !!session },
  );

  const deleteTx = api.transaction.delete.useMutation({
    onSuccess: () => void refetch(),
  });

  // CA-01: computed stats (update instantly on mutation)
  const stats = useMemo(() => {
    const income  = transactions.filter(t => t.type === "ingreso").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === "gasto").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const filtered = useMemo(() =>
    filter === "all" ? transactions : transactions.filter(t => t.type === filter),
    [transactions, filter],
  );

  const openModal = (type: TxType = "ingreso") => {
    setModalType(type);
    setShowModal(true);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-slate-400 text-sm">Cargando FinanzasFácil…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const monthName = MONTHS_ES[month - 1]!;
  const totalTx = transactions.length;
  const incomePct = stats.income > 0
    ? Math.round((stats.income / (stats.income + stats.expense)) * 100)
    : 0;

  return (
    <>
      <Head>
        <title>Dashboard — FinanzasFácil</title>
        <meta name="description" content="Tu balance financiero en tiempo real" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-base shadow-sm">
              💰
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">
              Finanzas<span className="text-blue-600">Fácil</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full">
              {monthName} {year}
            </span>
            <button
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">

        {/* Page title */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Dashboard Financiero
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Hola, <span className="font-semibold text-slate-600">{session.user.name}</span> ·{" "}
              {totalTx} transacción{totalTx !== 1 ? "es" : ""} este mes
            </p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
            🎯 ODS 8
          </span>
        </div>

        {/* ── CA-01: KPI cards (balance en tiempo real) ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <KpiCard
            label="Ingresos"
            value={mxn(stats.income)}
            sub={`${transactions.filter(t => t.type === "ingreso").length} movimientos`}
            barPct={incomePct}
            color="text-emerald-600"
          />
          <KpiCard
            label="Gastos"
            value={mxn(stats.expense)}
            sub={`${transactions.filter(t => t.type === "gasto").length} movimientos`}
            barPct={stats.income > 0 ? Math.round((stats.expense / stats.income) * 100) : 0}
            color="text-red-500"
          />
          <KpiCard
            label="Balance"
            value={mxn(Math.abs(stats.balance))}
            sub={
              stats.balance > 0
                ? `${Math.round((stats.balance / Math.max(stats.income, 1)) * 100)}% disponible`
                : stats.balance < 0
                ? "⚠️ Deficit"
                : "En equilibrio"
            }
            barPct={stats.income > 0 ? Math.round((Math.abs(stats.balance) / stats.income) * 100) : 0}
            color={stats.balance >= 0 ? "text-blue-600" : "text-red-500"}
          />
        </div>

        {/* Chart — hidden when empty */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">
              Ingresos vs Gastos — semana a semana
            </h2>
            <WeeklyChart transactions={transactions} year={year} month={month} />
          </div>
        )}

        {/* Transactions card */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-sm font-bold text-slate-700">Transacciones</h2>
            <button
              onClick={() => openModal("ingreso")}
              className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Agregar
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 px-5 pb-3 overflow-x-auto">
            {(["all", "ingreso", "gasto"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                  filter === f
                    ? f === "ingreso"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : f === "gasto"
                      ? "bg-red-50 text-red-700 border-red-300"
                      : "bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                }`}
              >
                {f === "all" ? "Todos" : f === "ingreso" ? "📈 Ingresos" : "📉 Gastos"}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-50" />

          {/* CA-02: Empty state */}
          {transactions.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-base font-bold text-slate-800 mb-2">
                ¡Bienvenido a FinanzasFácil!
              </h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">
                Aún no tienes transacciones registradas este mes. Registra tu
                primera venta para ver tu balance real.
              </p>
              <button
                onClick={() => openModal("ingreso")}
                className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                ➕ Registrar primera venta
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No hay transacciones de este tipo
            </div>
          ) : (
            <ul>
              {filtered.slice(0, 10).map(tx => {
                const icon = TX_ICONS[tx.category] ?? (tx.type === "ingreso" ? "💰" : "📝");
                const d = new Date(tx.date);
                const dateStr = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
                      tx.type === "ingreso" ? "bg-emerald-50" : "bg-red-50"
                    }`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{dateStr}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          tx.type === "ingreso"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {tx.category}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-black flex-shrink-0 ${
                      tx.type === "ingreso" ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {tx.type === "ingreso" ? "+" : "−"}{mxn(tx.amount)}
                    </span>
                    <button
                      onClick={() => deleteTx.mutate({ id: tx.id })}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none flex-shrink-0"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
              {filtered.length > 10 && (
                <li className="text-center py-3 text-xs text-slate-400 font-medium">
                  Mostrando 10 de {filtered.length} transacciones
                </li>
              )}
            </ul>
          )}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => openModal("ingreso")}
        className="fixed bottom-6 right-5 w-13 h-13 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all text-2xl font-light z-30 flex items-center justify-center"
        style={{ width: 52, height: 52 }}
        title="Nueva transacción"
      >
        +
      </button>

      {/* Modal */}
      <AddTransactionModal
        open={showModal}
        defaultType={modalType}
        onClose={() => setShowModal(false)}
        onSuccess={() => void refetch()}
      />
    </>
  );
};

export default Dashboard;
