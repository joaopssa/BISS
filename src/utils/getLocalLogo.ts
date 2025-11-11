// src/utils/getLocalLogo.ts

/**
 * Retorna o caminho público para um logo.
 * Assume que o 'path' (ex: "logos/Brasileirao Serie A/Cruzeiro.png") 
 * é relativo à pasta 'public/'.
 */
export const getLocalLogo = (path: string | null | undefined): string | null => {
  if (!path) return null;

  // Adiciona uma barra '/' no início.
  // O navegador vai requisitar: http://[seu-site.com]/logos/Brasileirao Serie A/Cruzeiro.png
  // Certifique-se que o JSON não tem uma barra no começo.
  if (path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
};