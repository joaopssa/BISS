// src/components/app/HomeScreen.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import ExpandableMatchCard from "@/components/ui/expandable-match-card";
import LiveTab from "@/components/app/LiveTab";
import { useUpcomingData } from "@/data/matchData";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { resolveLeagueName } from "@/utils/resolveLeagueName";


type UIMatch = import("@/data/matchData").UIMatch;

type TicketSelection = {
  match: string;
  market: string;
  pick: string;
  odd: number;
};

type Ticket = {
  id: string;
  createdAt: string;
  stake: number;
  potentialReturn: number;
  status?: string;
  selections: TicketSelection[];
};

type BetSelection = {
  matchId: string | number;
  partida: string;
  campeonato: string;
  time_casa: string;
  time_fora: string;
  mercado: string;
  selecao: string;
  odd: number;
};

const Badge = ({ children }: React.PropsWithChildren) => (
  <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold dark:bg-blue-800/30 dark:text-blue-200">
    {children}
  </span>
);

export const HomeScreen: React.FC = () => {
  const [tab, setTab] = useState<"favoritos" | "ao-vivo" | "em-alta" | "bilhetes">("em-alta");
  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const { matches: upcoming, lastUpdated, loading, error } = useUpcomingData();
  const [logos] = useState<Record<string, string>>({});
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [stake, setStake] = useState<number>(0);
  const [saldo, setSaldo] = useState<number>(0);
  const [placingBet, setPlacingBet] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userLeagues, setUserLeagues] = useState<string[]>([]);

  // ========= Helpers =========

  const fetchSaldo = async () => {
    try {
      const res = await api.get("/financeiro/saldo");
      const s = typeof res.data?.saldo === "number" ? res.data.saldo : 0;
      setSaldo(s);
    } catch {
      // silencioso na Home; tela financeira trata melhor
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await api.get("/apostas/bilhetes");
      const data = Array.isArray(res.data) ? res.data : [];

      const mapped: Ticket[] = data.map((raw: any, idx: number) => {
        const id =
          String(raw.id_bilhete ??
          raw.id ??
          raw.bilheteId ??
          `B${idx + 1}`);

        const createdAt =
          raw.data_criacao ??
          raw.createdAt ??
          raw.data_registro ??
          new Date().toISOString();

        const stake =
          Number(
            raw.stake_total ??
            raw.stake ??
            raw.valor_apostado ??
            0
          ) || 0;

        const potentialReturn =
          Number(
            raw.possivel_retorno ??
            raw.potentialReturn ??
            0
          ) || 0;

        const status =
          raw.status ??
          raw.status_bilhete ??
          undefined;

        const selecoesRaw: any[] =
          Array.isArray(raw.selecoes) ? raw.selecoes : [];

        const selections: TicketSelection[] = selecoesRaw.map((s, i) => ({
          match:
            s.partida ??
            `${s.time_casa || "Time A"} x ${s.time_fora || "Time B"}`,
          market: s.mercado || "Mercado",
          pick: s.selecao || "Seleção",
          odd: Number(s.odd) || 0,
        }));

        return {
          id,
          createdAt,
          stake,
          potentialReturn,
          status,
          selections,
        };
      });

      setTickets(mapped);
    } catch {
      // se der erro, mantemos lista vazia silenciosamente
    }
  };

  const fetchUserLeagues = async () => {
    try {
      const res = await api.get("/user/preferences");
      if (Array.isArray(res.data?.ligasFavoritas)) {
        setUserLeagues(res.data.ligasFavoritas);
      }
    } catch (err) {
      console.log("Erro ao carregar ligas favoritas:", err);
    }
  };

  useEffect(() => {
  fetchTickets();
  fetchSaldo();
  fetchUserLeagues();

  const interval = setInterval(() => {
    fetchSaldo();
  }, 5000); // atualiza a cada 5s

  return () => clearInterval(interval);
}, []);



  useEffect(() => {
    fetchTickets();
    fetchSaldo();
  }, []);

  // ========= Filtro de Partidas =========

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (upcoming ?? []).filter((m) =>
      [m.homeTeam, m.awayTeam, m.competition].some((t) =>
        t?.toLowerCase().includes(q)
      )
    );
  }, [query, upcoming]);

  const updatedTime =
    lastUpdated != null
      ? new Date(lastUpdated).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "—";

  // ========= Lógica do Bilhete =========

  const canAddSelection = (
    current: BetSelection[],
    candidate: BetSelection
  ): string | null => {
    const sameMatch = current.filter(
      (s) =>
        s.matchId === candidate.matchId ||
        s.partida === candidate.partida
    );

    for (const s of sameMatch) {
      // Regra 1: não permitir 1X2 conflitante
      if (
        s.mercado === "1X2" &&
        candidate.mercado === "1X2" &&
        s.selecao !== candidate.selecao
      ) {
        return "Você já selecionou outro resultado 1X2 para este jogo.";
      }

      // Regra 2: Over x Under no mesmo jogo
      const isOver = /over/i.test(s.selecao) || /over/i.test(candidate.selecao);
      const isUnder =
        /under/i.test(s.selecao) || /under/i.test(candidate.selecao);

      if (isOver && isUnder) {
        return "Não é permitido combinar Over e Under do mesmo jogo no mesmo bilhete.";
      }
    }

    return null;
  };

  const handleAddSelection = (sel: BetSelection) => {
    setFeedback(null);
    setSelections((prev) => {
      const err = canAddSelection(prev, sel);
      if (err) {
        setFeedback(err);
        return prev;
      }

      // evita duplicata exata
      const exists = prev.some(
        (p) =>
          p.matchId === sel.matchId &&
          p.mercado === sel.mercado &&
          p.selecao === sel.selecao &&
          p.odd === sel.odd
      );
      if (exists) {
        setFeedback("Essa seleção já está no seu bilhete.");
        return prev;
      }

      return [...prev, sel];
    });
  };

  const handleRemoveSelection = (index: number) => {
    setSelections((prev) => prev.filter((_, i) => i !== index));
    setFeedback(null);
  };

  const oddTotal =
    selections.length > 0
      ? selections.reduce((acc, s) => acc * (s.odd || 1), 1)
      : 0;

  const possibleReturn =
    selections.length > 0 && stake > 0
      ? Number((oddTotal * stake).toFixed(2))
      : 0;

  const resetSlip = () => {
    setSelections([]);
    setStake(0);
    setFeedback(null);
    setIsSlipOpen(false);
  };

  const handleConfirmBet = async () => {
    setFeedback(null);

    if (selections.length === 0) {
      setFeedback("Adicione pelo menos uma seleção ao bilhete.");
      return;
    }

    if (!stake || stake <= 0) {
      setFeedback("Informe um valor de aposta maior que R$ 0,00.");
      return;
    }

    if (saldo < stake) {
      setFeedback(
        `Saldo insuficiente. Seu saldo é de R$ ${saldo.toFixed(
          2
        )}. Ajuste o valor da aposta.`
      );
      return;
    }

    setPlacingBet(true);
    try {
      const payload = {
        stake,
        apostas: selections.map((s) => ({
          campeonato: s.campeonato,
          partida: s.partida,
          time_casa: s.time_casa,
          time_fora: s.time_fora,
          data_hora_partida: new Date().toISOString(), // ajuste se tiver o horário real no UIMatch
          mercado: s.mercado,
          selecao: s.selecao,
          odd: s.odd,
        })),
      };

      const res = await api.post("/apostas/bilhetes", payload);

      if (res.data?.error) {
        setFeedback(res.data.error);
      } else {
        setFeedback("Bilhete registrado com sucesso! ✅");
        await fetchTickets();
        await fetchSaldo();
        resetSlip();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        "Erro ao registrar o bilhete. Tente novamente.";
      setFeedback(msg);
    } finally {
      setPlacingBet(false);
    }
  };

  // ========= View das Abas =========

  const viewMatches = useMemo(() => {
    switch (tab) {
      case "favoritos": {
      // Exibe apenas jogos das ligas favoritas do usuário
      // Converter ligas favoritas em nomes oficiais da Betano
      const mappedLeagues = userLeagues
        .map(resolveLeagueName)
        .filter(Boolean) as string[];

      // Mostrar apenas partidas da liga oficial mapeada
      const favMatches = filtered.filter(m =>
        mappedLeagues.includes(m.competition)
      );

      return (
        <Section
          title="Ligas Favoritas"
          subtitle="Partidas das suas ligas escolhidas"
        >
          {loading ? (
            <EmptyState text="Carregando partidas…" />
          ) : error ? (
            <EmptyState text={`Erro: ${error}`} />
          ) : favMatches.length > 0 ? (
            <ExpandableMatchCard
              matches={favMatches}
              onSelectOdd={(params) => {
                const sel: BetSelection = {
                  matchId: params.matchId,
                  partida: `${params.homeTeam} x ${params.awayTeam}`,
                  campeonato: params.competition,
                  time_casa: params.homeTeam,
                  time_fora: params.awayTeam,
                  mercado: params.market,
                  selecao: params.selection,
                  odd: params.odd,
                };
                handleAddSelection(sel);
              }}
            />
          ) : (
            <EmptyState text="Nenhuma partida das suas ligas favoritas no momento." />
          )}
        </Section>
      );
    }

      case "ao-vivo":
        return (
          <Section
            title="Jogos Ao Vivo"
            subtitle="Acompanhe em tempo real"
          >
            {/* Ajuste LiveTab futuramente para receber onSelectOdd se necessário */}
            <LiveTab
              logos={logos}
              setLogos={() => {}}
              fetchTeamLogo={async () => null}
            />
          </Section>
        );

      case "em-alta": {
        const trending = filtered.slice(0, 30);
        return (
          <Section
            title="Em Alta"
            subtitle="Partidas com maior interesse"
          >
            {loading ? (
              <EmptyState text="Carregando partidas…" />
            ) : error ? (
              <EmptyState text={`Erro: ${error}`} />
            ) : trending.length > 0 ? (
              <ExpandableMatchCard
                matches={trending}
                onSelectOdd={(params) => {
                  const sel: BetSelection = {
                    matchId: params.matchId,
                    partida: `${params.homeTeam} x ${params.awayTeam}`,
                    campeonato: params.competition,
                    time_casa: params.homeTeam,
                    time_fora: params.awayTeam,
                    mercado: params.market,
                    selecao: params.selection,
                    odd: params.odd,
                  };
                  handleAddSelection(sel);
                }}
              />

            ) : (
              <EmptyState text="Sem partidas em alta no momento." />
            )}
          </Section>
        );
      }

      case "bilhetes":
      default:
        return (
          <Section
            title="Bilhetes"
            subtitle="Seus bilhetes registrados no sistema"
          >
            {tickets.length === 0 ? (
              <EmptyState text="Você ainda não possui bilhetes." />
            ) : (
              <ul className="space-y-4">
                {tickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border bg-white dark:bg-neutral-900 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          Bilhete #{t.id}
                        </span>
                        {t.status && (
                          <span className="text-xs mt-0.5">
                            Status:{" "}
                            <span className="font-medium uppercase">
                              {t.status}
                            </span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(t.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      Aposta:{" "}
                      <b>R$ {t.stake.toFixed(2)}</b> • Retorno
                      potencial:{" "}
                      <b>
                        R$ {t.potentialReturn.toFixed(2)}
                      </b>
                    </div>
                    {t.selections?.length > 0 && (
                      <div className="mt-3">
                        <ul className="list-disc pl-5 text-xs sm:text-sm">
                          {t.selections.map((s, i) => (
                            <li key={i}>
                              {s.match} — {s.market}:{" "}
                              <b>{s.pick}</b> @{" "}
                              {s.odd.toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        );
    }
  }, [tab, filtered, loading, error, tickets, logos, handleAddSelection]);

  // ========= Render =========

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#014a8f] text-white shadow">
        <div className="flex flex-wrap gap-2">
          <TopTab
            label="Jogos Favoritos"
            active={tab === "favoritos"}
            onClick={() => setTab("favoritos")}
          />
          <TopTab
            label="Jogos Ao Vivo"
            active={tab === "ao-vivo"}
            onClick={() => setTab("ao-vivo")}
          />
          <TopTab
            label="Em Alta"
            active={tab === "em-alta"}
            onClick={() => setTab("em-alta")}
          />
          <TopTab
            label="Bilhetes"
            active={tab === "bilhetes"}
            onClick={() => setTab("bilhetes")}
          />
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-3">
          <span className="text-xs sm:text-sm">
            Saldo:{" "}
            <b>R$ {saldo.toFixed(2)}</b>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Encontre aqui seu jogo"
            className="w-52 sm:w-64 h-9 px-3 py-2 text-xs sm:text-sm font-medium text-white placeholder-white bg-[#014a8f] border border-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Partidas do Dia
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Acompanhe aqui os melhores jogos
          </p>
          <div className="mt-2">
            <Badge>Atualizado em {updatedTime}</Badge>
          </div>
        </div>

        {/* Feedback de regras / erros */}
        {feedback && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs sm:text-sm text-blue-800">
            {feedback}
          </div>
        )}

        {viewMatches}
      </div>

      {/* Botão flutuante "Ver Bilhete" */}
      {selections.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            className="bg-[#014a8f] hover:bg-[#003b70] text-white shadow-xl rounded-full px-5 py-2 text-sm"
            onClick={() => setIsSlipOpen(true)}
          >
            Ver Bilhete ({selections.length}) • Odd {oddTotal.toFixed(2)}
          </Button>
        </div>
      )}

      {/* Modal simples do Bilhete */}
      {isSlipOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Seu Bilhete
              </h2>
              <button
                className="text-sm text-gray-500 hover:text-gray-800"
                onClick={() => setIsSlipOpen(false)}
              >
                Fechar
              </button>
            </div>

            {selections.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma seleção no bilhete.
              </p>
            ) : (
              <>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {selections.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 border-b pb-2 text-xs sm:text-sm"
                    >
                      <div>
                        <div className="font-semibold">
                          {s.partida}
                        </div>
                        <div className="text-gray-500">
                          {s.mercado} • {s.selecao}
                        </div>
                        <div className="text-gray-700">
                          Odd: {s.odd.toFixed(2)}
                        </div>
                      </div>
                      <button
                        className="text-red-500 text-[10px] hover:underline"
                        onClick={() =>
                          handleRemoveSelection(i)
                        }
                      >
                        remover
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Odd Total</span>
                    <span className="font-semibold">
                      {oddTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Valor da aposta (R$)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={stake || ""}
                      onChange={(e) =>
                        setStake(
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-28 border rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span>Retorno potencial</span>
                    <span className="font-semibold">
                      R$ {possibleReturn.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Saldo disponível:</span>
                    <span>
                      R$ {saldo.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    className="w-1/3 text-xs"
                    onClick={resetSlip}
                    disabled={placingBet}
                  >
                    Limpar
                  </Button>
                  <Button
                    className="w-2/3 bg-[#014a8f] hover:bg-[#003b70] text-xs"
                    onClick={handleConfirmBet}
                    disabled={placingBet}
                  >
                    {placingBet
                      ? "Registrando..."
                      : "Apostar agora"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function TopTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`text-white ${
        active
          ? "bg.white/15 bg-white/15 hover:bg-white/20"
          : "hover:bg-white/10"
      }`}
    >
      {label}
    </Button>
  );
}

function Section({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
}>) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-gray-600 dark:text-gray-300">
      {text}
    </div>
  );
}

export default HomeScreen;
