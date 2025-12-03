import { MultiLayerSocialPostBuilder } from "./MultiLayerSocialPostBuilder";

interface SocialPostBuilderProps {
  source: string;
  summaryVariants: string[];
  pageData: {
    category?: 'COURT_AVAILABILITY' | 'PARTIAL_MATCHES' | 'COMPETITIONS';
    data?: any[];
    variant?: string;
    target?: 'TODAY' | 'TOMORROW';
    tz?: string;
    playtomicOffset?: number;
    clubName?: string;
    dateDisplayShort?: string;
    sport?: string;
    countSlots?: number;
    eventId?: string | null; // For locking event selection
    selectedVariant?: string; // For locking variant selection
  };
  onVariantChange: (variant: string) => void;
}

export function SocialPostBuilder({ source, summaryVariants, pageData, onVariantChange }: SocialPostBuilderProps) {
  return (
    <MultiLayerSocialPostBuilder
      source={source}
      pageData={pageData}
      summaryVariants={summaryVariants}
      onVariantChange={onVariantChange}
    />
  );
}