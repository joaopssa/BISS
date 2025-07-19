import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Star, Trophy, Target, TrendingUp, Brain, X } from 'lucide-react';

interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  time: string;
  date: string;
  competition: string;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  aiRecommendation: {
    type: string;
    confidence: number;
    suggestion: string;
    reasoning: string;
  };
  isFavorite: boolean;
  detailedStats?: {
    homeStats: {
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
    awayStats: {
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
    headToHead: string[];
  };
}

interface ExpandableMatchCardProps {
  matches: Match[];
  logos: Record<string, string>;
}


export const ExpandableMatchCard: React.FC<ExpandableMatchCardProps> = ({ matches, logos }) => {
  const [active, setActive] = useState<Match | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(null);
      }
    }

    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'value_bet': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'high_value': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'safe_bet': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'value_bet': return <Target className="w-3 h-3" />;
      case 'high_value': return <TrendingUp className="w-3 h-3" />;
      case 'safe_bet': return <Star className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 h-full w-full z-10"
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 grid place-items-center z-[100] p-4">
            <motion.button
              key={`button-${active.id}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-2 right-2 lg:hidden items-center justify-center bg-white dark:bg-neutral-800 rounded-full h-8 w-8 z-50"
              onClick={() => setActive(null)}
            >
              <X className="h-4 w-4 text-black dark:text-white" />
            </motion.button>
            
            <motion.div
              layoutId={`card-${active.id}-${id}`}
              ref={ref}
              className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {active.competition}
                    </Badge>
                    {active.isFavorite && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    {active.date} • {active.time}
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center gap-4 mb-6">
  <div className="text-center flex flex-col items-center">
    <img src={logos[active.homeTeam]} alt="logo home" className="w-8 h-8 mb-2 object-contain" />
    <motion.h3 layoutId={`home-team-${active.id}-${id}`} className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
      {active.homeTeam}
    </motion.h3>
    <Button variant="outline" size="sm" className="text-xs">
      {active.odds.home}
    </Button>
  </div>

  <div className="text-center">
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">VS</p>
    <Button variant="outline" size="sm" className="text-xs">
      {active.odds.draw}
    </Button>
  </div>

  <div className="text-center flex flex-col items-center">
    <img src={logos[active.awayTeam]} alt="logo away" className="w-8 h-8 mb-2 object-contain" />
    <motion.h3 layoutId={`away-team-${active.id}-${id}`} className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
      {active.awayTeam}
    </motion.h3>
    <Button variant="outline" size="sm" className="text-xs">
      {active.odds.away}
    </Button>
  </div>
</div>


                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className={`rounded-lg p-3 ${getRecommendationColor(active.aiRecommendation.type)}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {getRecommendationIcon(active.aiRecommendation.type)}
                      <span className="font-semibold text-sm">
                        Sugestão IA ({active.aiRecommendation.confidence}%)
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {active.aiRecommendation.suggestion}
                    </p>
                    <p className="text-xs mt-1 opacity-80">
                      {active.aiRecommendation.reasoning}
                    </p>
                  </div>

                  {active.detailedStats && (
                    <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Estatísticas Detalhadas</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">{active.homeTeam}</p>
                          <p>V: {active.detailedStats.homeStats.wins} E: {active.detailedStats.homeStats.draws} D: {active.detailedStats.homeStats.losses}</p>
                          <p>Gols: {active.detailedStats.homeStats.goalsFor}/{active.detailedStats.homeStats.goalsAgainst}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">{active.awayTeam}</p>
                          <p>V: {active.detailedStats.awayStats.wins} E: {active.detailedStats.awayStats.draws} D: {active.detailedStats.awayStats.losses}</p>
                          <p>Gols: {active.detailedStats.awayStats.goalsFor}/{active.detailedStats.awayStats.goalsAgainst}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Trophy className="w-4 h-4 mr-2" />
                    Apostar Agora
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {matches.map((match) => (
          <motion.div
            layoutId={`card-${match.id}-${id}`}
            key={`card-${match.id}-${id}`}
            onClick={() => setActive(match)}
            className="p-4 bg-white dark:bg-neutral-900 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-neutral-700"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {match.competition}
                </Badge>
                {match.isFavorite && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                {match.date} • {match.time}
              </div>
            </div>

            <div className="grid grid-cols-3 items-center gap-4 mb-3">
  <div className="text-center flex flex-col items-center">
    <img src={logos[match.homeTeam]} alt="logo home" className="w-6 h-6 mb-1 object-contain" />
    <motion.p layoutId={`home-team-${match.id}-${id}`} className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
      {match.homeTeam}
    </motion.p>
    <Button variant="outline" size="sm" className="mt-1 text-xs">
      {match.odds.home}
    </Button>
  </div>

  <div className="text-center">
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">VS</p>
    <Button variant="outline" size="sm" className="text-xs">
      {match.odds.draw}
    </Button>
  </div>

  <div className="text-center flex flex-col items-center">
    <img src={logos[match.awayTeam]} alt="logo away" className="w-6 h-6 mb-1 object-contain" />
    <motion.p layoutId={`away-team-${match.id}-${id}`} className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
      {match.awayTeam}
    </motion.p>
    <Button variant="outline" size="sm" className="mt-1 text-xs">
      {match.odds.away}
    </Button>
  </div>
</div>


            <div className={`rounded-lg p-2 ${getRecommendationColor(match.aiRecommendation.type)}`}>
              <div className="flex items-center gap-2">
                {getRecommendationIcon(match.aiRecommendation.type)}
                <span className="font-semibold text-xs">
                  IA: {match.aiRecommendation.suggestion} ({match.aiRecommendation.confidence}%)
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
};
