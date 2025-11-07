// src/utils/getLocalLogo.ts
const logos = import.meta.glob("/src/logos/**/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function getLocalLogo(name: string, leagueName?: string): string | null {
  if (!name) return null;

  const n = normalizeName(name);
  const league = leagueName ? normalizeName(leagueName) : null;

  if (league) {
    for (const path in logos) {
      if (path.toLowerCase().includes(league) && path.toLowerCase().includes(n))
        return logos[path];
    }
  }

  for (const path in logos) {
    if (path.toLowerCase().includes(n)) return logos[path];
  }

  return null;
}
