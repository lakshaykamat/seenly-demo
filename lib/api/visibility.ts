"use client";

import { useQuery } from "@tanstack/react-query";
import {
  KEYWORDS,
  SERP_FEATURE_SUMMARY,
  TOP_MOVERS,
  VISIBILITY_TREND,
  type KeywordRow,
  type SerpFeature,
  type VisibilitySnapshot,
} from "@/lib/mocks/keywords";
import {
  AI_MODELS,
  CITATIONS,
  CITATION_TREND,
  HEAD_TO_HEAD,
  MONITORED_PROMPTS,
  SENTIMENT_SPLIT,
  citationCoverage,
  type AiModel,
  type CitationRow,
  type CitationTrendPoint,
  type CompetitorHeadToHead,
  type MonitoredPrompt,
  type SentimentSplit,
} from "@/lib/mocks/aiCitations";
import {
  CRAWLER_MATRIX,
  ENTITY_CLOUD,
  PAGE_AUDITS,
  SCHEMA_DISTRIBUTION,
  UNDERSTANDING_SUMMARY,
  type CrawlerMatrixSummary,
  type PageAuditRow,
  type UnderstandingSummary,
} from "@/lib/mocks/schemaAudit";
import {
  COMPETITOR_SCORES,
  TOP_GAPS,
  type CompetitorScores,
  type GapInsight,
} from "@/lib/mocks/competitorsExt";

function delay(min = 240, max = 520): Promise<void> {
  return new Promise((r) =>
    setTimeout(r, Math.floor(min + Math.random() * (max - min)))
  );
}

export interface SearchVisibilityPayload {
  trend: VisibilitySnapshot[];
  serpFeatures: typeof SERP_FEATURE_SUMMARY;
  keywords: KeywordRow[];
  topMovers: typeof TOP_MOVERS;
  summary: {
    visibility: number;
    visibilityDelta: number;
    shareOfVoice: number;
    shareOfVoiceDelta: number;
    keywordsTracked: number;
    keywordsTop3: number;
    keywordsTop10: number;
    serpFeaturesOwned: number;
    cannibalized: number;
  };
}

export function useSearchVisibility() {
  return useQuery<SearchVisibilityPayload>({
    queryKey: ["visibility", "search"],
    queryFn: async () => {
      await delay();
      const latest = VISIBILITY_TREND[VISIBILITY_TREND.length - 1];
      const prior = VISIBILITY_TREND[VISIBILITY_TREND.length - 8];
      return {
        trend: VISIBILITY_TREND,
        serpFeatures: SERP_FEATURE_SUMMARY,
        keywords: KEYWORDS,
        topMovers: TOP_MOVERS,
        summary: {
          visibility: latest.visibility,
          visibilityDelta:
            Math.round((latest.visibility - prior.visibility) * 10) / 10,
          shareOfVoice: latest.shareOfVoice,
          shareOfVoiceDelta:
            Math.round((latest.shareOfVoice - prior.shareOfVoice) * 10) / 10,
          keywordsTracked: KEYWORDS.length,
          keywordsTop3: KEYWORDS.filter(
            (k) => k.position != null && k.position <= 3
          ).length,
          keywordsTop10: KEYWORDS.filter(
            (k) => k.position != null && k.position <= 10
          ).length,
          serpFeaturesOwned: SERP_FEATURE_SUMMARY.reduce(
            (s, f) => s + f.owned,
            0
          ),
          cannibalized: KEYWORDS.filter((k) => k.cannibalized).length,
        },
      };
    },
    staleTime: 60_000,
  });
}

export interface AiRecommendationPayload {
  trend: CitationTrendPoint[];
  citations: CitationRow[];
  prompts: MonitoredPrompt[];
  sentiment: SentimentSplit;
  headToHead: CompetitorHeadToHead[];
  models: typeof AI_MODELS;
  summary: {
    citationShare: number;
    citationShareDelta: number;
    firstMentionRate: number;
    promptsCovered: number;
    promptsTotal: number;
    favorableRate: number;
    uncited: number;
  };
}

export function useAiRecommendation() {
  return useQuery<AiRecommendationPayload>({
    queryKey: ["visibility", "ai"],
    queryFn: async () => {
      await delay();
      const cov = citationCoverage();
      const latest = CITATION_TREND[CITATION_TREND.length - 1];
      const prior = CITATION_TREND[CITATION_TREND.length - 8];
      const latestAvg =
        (latest.gpt + latest.claude + latest.gemini + latest.perplexity) / 4;
      const priorAvg =
        (prior.gpt + prior.claude + prior.gemini + prior.perplexity) / 4;
      const sentimentTotal =
        SENTIMENT_SPLIT.favorable +
        SENTIMENT_SPLIT.neutral +
        SENTIMENT_SPLIT.cautious +
        SENTIMENT_SPLIT.unfavorable;
      return {
        trend: CITATION_TREND,
        citations: CITATIONS,
        prompts: MONITORED_PROMPTS,
        sentiment: SENTIMENT_SPLIT,
        headToHead: HEAD_TO_HEAD,
        models: AI_MODELS,
        summary: {
          citationShare: Math.round(latestAvg * 10) / 10,
          citationShareDelta: Math.round((latestAvg - priorAvg) * 10) / 10,
          firstMentionRate:
            Math.round((cov.firstMentions / cov.totalSlots) * 1000) / 10,
          promptsCovered: MONITORED_PROMPTS.length - cov.uncitedPrompts,
          promptsTotal: MONITORED_PROMPTS.length,
          favorableRate:
            Math.round((SENTIMENT_SPLIT.favorable / sentimentTotal) * 1000) /
            10,
          uncited: cov.uncitedPrompts,
        },
      };
    },
    staleTime: 60_000,
  });
}

export interface AiUnderstandingPayload {
  summary: UnderstandingSummary;
  pages: PageAuditRow[];
  crawlerMatrix: CrawlerMatrixSummary[];
  distribution: typeof SCHEMA_DISTRIBUTION;
  entities: typeof ENTITY_CLOUD;
}

export function useAiUnderstanding() {
  return useQuery<AiUnderstandingPayload>({
    queryKey: ["visibility", "understanding"],
    queryFn: async () => {
      await delay();
      return {
        summary: UNDERSTANDING_SUMMARY,
        pages: PAGE_AUDITS,
        crawlerMatrix: CRAWLER_MATRIX,
        distribution: SCHEMA_DISTRIBUTION,
        entities: ENTITY_CLOUD,
      };
    },
    staleTime: 60_000,
  });
}

export interface CompetitorPanelPayload {
  scores: CompetitorScores[];
  gaps: GapInsight[];
}

export function useCompetitorScores() {
  return useQuery<CompetitorPanelPayload>({
    queryKey: ["competitors", "panel"],
    queryFn: async () => {
      await delay();
      return { scores: COMPETITOR_SCORES, gaps: TOP_GAPS };
    },
    staleTime: 60_000,
  });
}

export type { KeywordRow, CitationRow, PageAuditRow, AiModel, SerpFeature };
