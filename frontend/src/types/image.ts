export type ImageProfile = 'natural' | 'visibility' | 'detail';
export type RestorationMode = 'hybrid' | 'classical' | 'deep';

export interface EnhancementResponse {
  status: string;
  message: string;
  profile: string;
  final_image?: string | null;
  classical_image?: string | null;
  deep_image?: string | null;
  hybrid_image?: string | null;
  classical_output?: string | null;
  deep_output?: string | null;
  hybrid_output?: string | null;
  fusion_map?: string | null;
  disagreement_map?: string | null;
  analysis?: Record<string, unknown>;
  quality_report?: Record<string, unknown> | null;
  timing?: Record<string, unknown>;
  timings?: Record<string, unknown>;
  warnings?: string[];
  selected_method?: string;
  processing_status?: string;
  demo_mode?: boolean;
}
