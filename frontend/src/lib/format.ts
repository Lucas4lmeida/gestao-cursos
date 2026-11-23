export function data(v?: string | null) {
  if (!v) return "—";
  const [a, m, d] = v.slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : v;
}

export function nota(v?: number | string | null) {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function numero(v?: number | string | null) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("pt-BR");
}

export function iniciais(nome?: string) {
  if (!nome) return "?";
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export function hoje() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

const PALAVRAS = [
  "LEFT JOIN", "JOIN", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT", "VALUES",
  "SET", "RETURNING", "UNION ALL",
];

/** Quebra o SQL em linhas nas cláusulas principais, para leitura na demonstração. */
export function formatarSQL(sql: string) {
  let s = sql;
  for (const p of PALAVRAS) {
    const re = new RegExp(`\\s(${p.replace(" ", "\\s+")})\\s`, "g");
    s = s.replace(re, (_m, g) => `\n${g.toUpperCase()} `);
  }
  s = s.replace(/\n(JOIN|LEFT JOIN)/g, "\n  $1");
  return s.trim();
}

const RESERVADAS = /\b(SELECT|FROM|WHERE|JOIN|LEFT|ON|AND|OR|NOT|IN|AS|GROUP|BY|ORDER|HAVING|LIMIT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|RETURNING|BEGIN|COMMIT|ROLLBACK|DISTINCT|FILTER|COUNT|SUM|AVG|MIN|MAX|ROUND|COALESCE|EXISTS|NULL|TRUE|FALSE|ILIKE|LIKE|DESC|ASC|CASE|WHEN|THEN|ELSE|END|UNION|ALL|IS|USING|string_agg|count|sum|avg|min|max|round)\b/g;

/** Realce simples de sintaxe (retorna HTML escapado). */
export function realcarSQL(sql: string) {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Separa literais de texto ('...') do restante para não realçar dentro deles.
  return sql
    .split(/('(?:[^']|'')*')/g)
    .map((parte, i) =>
      i % 2 === 1
        ? `<span class="sql-str">${esc(parte)}</span>`
        : esc(parte)
            .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-num">$1</span>')
            .replace(RESERVADAS, (m) => `<span class="sql-kw">${m}</span>`),
    )
    .join("");
}
