export type ImageProfile = 'natural' | 'visibility' | 'detail' | 'maximum_visibility' | 'detail_preservation';

export type RestorationMethod = 'hybrid' | 'classical' | 'deep';

export interface AnalysisMetrics {
  mean_brightness?: number;
  contrast_score?: number;
  noise_score?: number;
  edge_strength?: number;
  edge_score?: number;
  underexposed_ratio?: number;
  overexposed_ratio?: number;
  clipping_ratio?: number;
  highlight_clipping_ratio?: number;
  shadow_clipping_ratio?: number;
  image_dimensions?: {
    height?: number;
    width?: number;
    channels?: number;
  };
  conditions?: Record<string, boolean | string>;
  source?: string;
  [key: string]: unknown;
}

export interface EnhancementResponse {
  status: string;
  message: string;
  profile: string;
  method?: string;
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
  branch_disagreement_map?: string | null;
  analysis?: AnalysisMetrics | Record<string, unknown>;
  restored_analysis?: AnalysisMetrics | Record<string, unknown>;
  quality_report?: Record<string, unknown> | null;
  timing?: Record<string, unknown>;
  timings?: Record<string, unknown>;
  warnings?: string[];
  retry_count?: number;
  retry_applied?: boolean;
  demo_mode?: boolean;
}
