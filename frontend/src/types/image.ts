export type ImageProfile = 'natural' | 'visibility' | 'detail';
export type RestorationMode = 'hybrid' | 'classical' | 'deep';

export interface ClassicalStage {
  name: string;
  description: string;
  image: string;
  params: Record<string, unknown>;
  metrics: {
    mean_brightness?: number;
    contrast_score?: number;
    noise_score?: number;
  };
}

export interface ChangeStats {
  pct_brightened: number;
  pct_unchanged: number;
  pct_darkened: number;
  mean_delta: number;
  max_delta: number;
}

export interface ChannelHistogram {
  r: number[];
  g: number[];
  b: number[];
  luma: number[];
}

export interface HistogramPayload {
  original: ChannelHistogram;
  restored: ChannelHistogram;
}

export interface GridCellStat {
  row: number;
  col: number;
  bbox: [number, number, number, number];
  brightness_before: number;
  brightness_after: number;
  brightness_gain: number;
  contrast_before: number;
  contrast_after: number;
  noise_before: number;
  noise_after: number;
}

export interface MethodMetric {
  mean_brightness: number;
  contrast: number;
  noise: number;
  clipping: number;
  edge: number;
}

export interface QualityReport {
  passed?: boolean;
  score?: number;
  checks?: Record<string, number | boolean>;
  warnings?: string[];
  retry_count?: number;
  corrections_applied?: string[];
  [key: string]: unknown;
}

export interface TimingBreakdown {
  total_ms?: number;
  classical_ms?: number;
  deep_ms?: number;
  fusion_ms?: number;
  quality_ms?: number;
  processing_ms?: number;
  [key: string]: unknown;
}

export interface EnhancementResponse {
  status: string;
  message: string;
  profile: string;
  selected_method?: string;
  processing_status?: string;
  final_image?: string | null;
  classical_image?: string | null;
  deep_image?: string | null;
  hybrid_image?: string | null;
  classical_output?: string | null;
  deep_output?: string | null;
  hybrid_output?: string | null;
  fusion_map?: string | null;
  disagreement_map?: string | null;
  change_map?: string | null;
  change_stats?: ChangeStats | null;
  histograms?: HistogramPayload | null;
  grid_stats?: GridCellStat[] | null;
  method_metrics?: Record<string, MethodMetric> | null;
  classical_stages?: ClassicalStage[] | null;
  analysis?: Record<string, unknown> | null;
  quality_report?: QualityReport | null;
  timing?: TimingBreakdown | null;
  timings?: TimingBreakdown | null;
  warnings?: string[];
  demo_mode?: boolean;
}
