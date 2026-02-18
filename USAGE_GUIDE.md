# GUIA DE UTILIZAÇÃO DOS UTILITÁRIOS CENTRALIZADOS

## 📚 Estrutura de Imports

### Frontend (src/utils/)

#### Formatação Numérica
```typescript
import { 
  round2, round1,           // Arredondamento
  formatPercent1,           // "85.5%"
  formatPercent0,           // "85%"
  formatOdd2,               // "2.50"
  clamp, clamp01,           // Limitação de valores
  parseMonetaryValue,       // "R$ 100.50" -> 100.5
  calculateWinRate,         // (wins, total) -> percentage
  calculateProfit,          // (equity, deposits) -> number
} from "@/utils/numberFormatting";
```

#### Manipulação de Strings
```typescript
import {
  normalizeString,          // Remove acentos + lowercase
  toNormalizedString,       // String normalizado
  toTrimmedString,          // String trimado
  normalizeApostStatus,     // Padroniza status de apostas
  normalizeTeamName,        // Limpa nome de time
  normalizeLeagueName,      // Limpa nome de liga
  capitalize,               // Primeira letra maiúscula
  capitalizeWords,          // Todas as palavras capitalizadas
} from "@/utils/stringUtils";
```

#### Formatação de Datas
```typescript
import {
  toISODateOnly,            // "2024-02-18"
  toISODateTime,            // "2024-02-18T14:30:45"
  toSQLDateTime,            // "2024-02-18 14:30:45"
  formatDateBR,             // "18/02/2024"
  formatTimeBR,             // "14:30"
  formatDateTimeBR,         // "18/02/2024 14:30"
  getMonthKey,              // "2024-02"
  getDateKey,               // "2024-02-18"
  daysBetween,              // Diferença em dias
  getTodayISO,              // Data de hoje em ISO
} from "@/utils/dateFormatting";
```

#### Utilitários de Componentes
```typescript
import {
  getTierBadgeSource,       // URL da imagem do tier
  isSustainable,            // Verifica sustentabilidade
  aggregateBetStats,        // Agrega estatísticas
  partition,                // Separa array em 2 baseado em predicate
  groupBy,                  // Agrupa itens por chave
  weightedAverage,          // Calcula média ponderada
} from "@/utils/componentUtils";
```

---

### Backend (Backend/utils/)

#### Formatação de Datas
```javascript
const {
  toISODateOnly,
  toISODateTime,
  toSQLDateTime,
  getTodayISO,
  getMonthKey,
  getDateKey,
  isValidDate,
} = require("../utils/dateFormatting");
```

#### Manipulação de Strings
```javascript
const {
  toNormalizedString,
  toTrimmedString,
  normalizeApostStatus,
  isValidString,
  getFieldValue,
  toNumber,
} = require("../utils/stringUtils");
```

---

## 🔄 EXEMPLOS DE USO

### Antes (Duplicado)
```typescript
// HomeScreen.tsx
const getTierBadgeSrc = (tierKey?: string | null) => {
  const key = String(tierKey || "INI").toLowerCase();
  return `${import.meta.env.BASE_URL}classes/${key}.png`;
};

// ProfileRankingScreen.tsx
const getTierBadgeSrc = (tierKey?: string | null) => {
  const key = String(tierKey || "INI").toLowerCase();
  return `${import.meta.env.BASE_URL}classes/${key}.png`;
};

// Em ambos os arquivos
const fmtPct1 = (v: number) => `${Number(v || 0).toFixed(1)}%`;
const fmtOdd2 = (v: number) => Number(v || 0).toFixed(2);
const fmtPct0 = (v: number) => `${Math.round(Number(v || 0))}%`;
```

### Depois (Centralizado)
```typescript
import { getTierBadgeSource } from "@/utils/componentUtils";
import { formatPercent1, formatOdd2, formatPercent0 } from "@/utils/numberFormatting";

// Seu código fica muito mais limpo
const imageUrl = getTierBadgeSource(tierKey);
const percentText = formatPercent1(85.5); // "85.5%"
const oddText = formatOdd2(2.5);           // "2.50"
```

---

### Antes (Duplicado em múltiplos controllers)
```javascript
// userController.js
const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

// financeController.js
customDate = m.data_final instanceof Date ? m.data_final.toISOString().slice(0,10) : m.data_final;
endDateISO = m.end_date instanceof Date ? m.end_date.toISOString() : m.end_date;
```

### Depois (Centralizado)
```javascript
const { toISODateOnly, toISODateTime } = require("../utils/dateFormatting");

// Muito mais limpo!
const todayStr = getTodayISO();
const dateStr = toISODateOnly(m.data_final);
const dateTime = toISODateTime(m.end_date);
```

---

## ⚠️ BOAS PRÁTICAS

### ✅ DO (Faça)
```typescript
// Use as funções centralizadas
import { round2, formatPercent0 } from "@/utils/numberFormatting";

const profitDisplay = round2(100.5555);           // 100.56
const rateDisplay = formatPercent0(75.3);        // "75%"

// Para novos componentes, importe logo no topo
import { round2, formatOdd2 } from "@/utils/numberFormatting";
import { normalizeString } from "@/utils/stringUtils";
```

### ❌ DON'T (Não faça)
```typescript
// ❌ Não redefina funções localmente
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ❌ Não use padrões inline sem centralizar
Math.round(value * 100) / 100  // Use round2() em vez

// ❌ Não normalize strings de forma diferente em cada lugar
String(status).toLowerCase().trim()  // Use normalizeString() ou toNormalizedString()
```

---

## 🧪 TESTES

Ao refatorar componentes para usar os novos utilitários:

1. **Teste os valores retornados** para garantir que estão corretos
2. **Verifique a formatação** de números, datas e moedas
3. **Teste casos extremos**: valores negativos, zero, null, undefined
4. **Valide em diferentes locales** se aplicável (pt-BR vs en-US)

---

## 📝 CHECKLIST PARA NOVOS COMPONENTES

Quando criar novo componente, sempre:

- [ ] Procure por padrões similares em outros componentes
- [ ] Use funções centralizadas de utils/ 
- [ ] Não redefina funções de formatação/normalização
- [ ] Adicione types ao `componentUtils.ts` se precisar
- [ ] Documente qualquer lógica complexa que não couba em utils

---

**Última atualização**: 18/02/2026
