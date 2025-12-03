export interface SummaryFormat {
  layout: 'inline' | 'bulleted' | 'paragraph';
  includeLabels: boolean;
  timeStyle: '12h' | '24h';
  rangeJoiner: string;
  separator: string;
  maxLines?: number;
  order: ('morning' | 'afternoon' | 'evening')[];
  uppercaseLabels: boolean;
}

export interface TextLayer {
  id: string;
  type: 'text';
  name?: string;
  content: string;
  tokens?: string[];
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  wordWrap: boolean;
  x: number;
  y: number;
  width: number;
  rotation: number;
  visible: boolean;
  summaryFormat?: SummaryFormat;
}

export interface SocialTemplate {
  id?: string;
  org_id: string;
  name: string;
  bg_url: string;
  bg_natural_w?: number;
  bg_natural_h?: number;
  bg_fit?: 'cover' | 'contain';
  bg_offset_x?: number;
  bg_offset_y?: number;
  canvas_w: number;
  canvas_h: number;
  layers: TextLayer[];
  event_id?: string | null;
  summary_variant?: string | null;
  source_category?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SocialRender {
  id?: string;
  org_id: string;
  template_id?: string;
  source: string;
  variant_key?: string;
  payload: Record<string, any>;
  inputs: Record<string, any>;
  result_url: string;
  status: 'READY' | 'QUEUED' | 'FAILED';
  created_at?: string;
}

export interface LayerDragEvent {
  layerId: string;
  x: number;
  y: number;
}

export interface LayerResizeEvent {
  layerId: string;
  width: number;
  height: number;
}

export const AVAILABLE_TOKENS = [
  'summary',
  'date_display_short', 
  'club_name',
  'count_slots',
  'sport'
] as const;

export const FONT_FAMILIES = [
  'Arial',
  'Roboto', 
  'Helvetica',
  'Times New Roman'
] as const;

export const CANVAS_PRESETS = {
  'instagram-portrait': { name: 'Instagram Portrait', width: 1080, height: 1350 },
  'instagram-square': { name: 'Instagram Square', width: 1080, height: 1080 },
  'instagram-story': { name: 'Instagram Story/Reel', width: 1080, height: 1920 },
  'custom': { name: 'Custom Size', width: 1080, height: 1080 }
} as const;

export type AvailableToken = typeof AVAILABLE_TOKENS[number];
export type FontFamily = typeof FONT_FAMILIES[number];
export type CanvasPreset = keyof typeof CANVAS_PRESETS;