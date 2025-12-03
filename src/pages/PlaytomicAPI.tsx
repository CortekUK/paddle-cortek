import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Copy, Save, Calendar, Clock } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, parseISO, addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TenantInfo {
  tenant_id: string;
  sport_id: string;
  evidence: {
    seen_on: string;
  };
}

interface FetchResult {
  url: string;
  status: number;
  raw: any;
  error?: string;
  endpoint: string;
  tenant_id: string;
  timestamp: string;
}

export default function PlaytomicAPI() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  // State for discovery
  const [clubUrl, setClubUrl] = useState<string>('');
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');

  // State for fetch runner
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('availability');
  const [selectedSportId, setSelectedSportId] = useState<string>('PADEL');
  const [startMin, setStartMin] = useState<string>(format(new Date(), 'yyyy-MM-dd') + 'T00:00:00');
  const [startMax, setStartMax] = useState<string>(format(new Date(), 'yyyy-MM-dd') + 'T23:59:59');
  const [hasPlayers, setHasPlayers] = useState<boolean>(true);
  const [applyDateFilters, setApplyDateFilters] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<FetchResult | null>(null);
  const [matchesHyper, setMatchesHyper] = useState<{
    url: string;
    urlDecoded: string;
    status: string;
    raw: any;
    matchIds: string[];
    method: string;
    requestBody: any;
    error?: string;
  } | null>(null);
  

  // UI state
  const [expandedJson, setExpandedJson] = useState<boolean>(false);
  
  // Summary state
  const [selectedSummaryVariant, setSelectedSummaryVariant] = useState<string>('dayparts-time-ranges');
  const [currentSummary, setCurrentSummary] = useState<string>('');
  
  // Debug state
  const [showDebugTable, setShowDebugTable] = useState<boolean>(false);
  const [debugTimeDisplay, setDebugTimeDisplay] = useState<'local' | 'utc'>('local');
  
  // Tournaments state
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  
  // Matches state
  const [selectedMatchesVariant, setSelectedMatchesVariant] = useState<string>('competitive-open');
  const [currentMatchesSummary, setCurrentMatchesSummary] = useState<string>('');
  
  // Location data
  const [location, setLocation] = useState<any>(null);
  const [prefillMode, setPrefillMode] = useState<boolean>(true);

  // Load location data
  useEffect(() => {
    const loadLocationData = async () => {
      if (!user) return;

      try {
        // Get user profile to find location_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('location_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.location_id) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('*')
            .eq('id', profile.location_id)
            .single();

          if (locationData) {
            setLocation(locationData);
            if (locationData.tenant_id) {
              setCurrentTenantId(locationData.tenant_id);
            }
            if (locationData.playtomic_url) {
              setClubUrl(locationData.playtomic_url);
            }
          }
        }
      } catch (error) {
        console.error('Error loading location data:', error);
      }
    };

    loadLocationData();
  }, [user]);

  // Helper to ensure second precision for datetime strings
  const ensureSecondPrecision = (value: string, isEnd: boolean = false): string => {
    if (!value) return value;
    
    // If it matches YYYY-MM-DD format, add time
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return isEnd ? `${value}T23:59:59` : `${value}T00:00:00`;
    }
    
    // If it matches YYYY-MM-DDTHH:mm format, add seconds
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      return isEnd ? `${value}:59` : `${value}:00`;
    }
    
    // If seconds already exist, return as-is  
    return value;
  };

  // Preset functions
  const setPreset = (preset: 'today' | 'tomorrow') => {
    const now = new Date();
    const targetDate = preset === 'today' ? now : addDays(now, 1);
    const timezone = location?.timezone || 'Europe/London';
    
    const startOfDayLocal = formatInTimeZone(startOfDay(targetDate), timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
    const endOfDayLocal = formatInTimeZone(endOfDay(targetDate), timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
    
    setStartMin(startOfDayLocal);
    setStartMax(endOfDayLocal);
  };

  // Playtomic offset configuration
  const playtomicOffsetMinutes = location?.playtomic_hour_offset ?? (location?.timezone === 'Europe/London' ? 60 : 0);

  // Helper functions for wall-time math and formatting
  const hhmmToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':').map(n => parseInt(n));
    return parts[0] * 60 + (parts[1] || 0);
  };

  const minutesToHHMM = (minutes: number): string => {
    const totalMins = minutes % 1440; // Wrap to 0-1439
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const addMinutesLocal = (timeStr: string, offsetMins: number): string => {
    const baseMins = hhmmToMinutes(timeStr);
    const adjustedMins = (baseMins + offsetMins + 1440) % 1440; // Handle negatives
    return minutesToHHMM(adjustedMins);
  };

  const formatCompactAmPm = (minutes: number): string => {
    const totalMins = ((minutes % 1440) + 1440) % 1440; // Wrap to 0–1439
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    if (hours === 0) {
      return mins === 0 ? "12am" : `12:${mins.toString().padStart(2, '0')}am`;
    } else if (hours < 12) {
      return mins === 0 ? `${hours}am` : `${hours}:${mins.toString().padStart(2, '0')}am`;
    } else if (hours === 12) {
      return mins === 0 ? "12pm" : `12:${mins.toString().padStart(2, '0')}pm`;
    } else {
      const displayHour = hours - 12;
      return mins === 0 ? `${displayHour}pm` : `${displayHour}:${mins.toString().padStart(2, '0')}pm`;
    }
  };

  // Non-overlapping day-part boundaries (in minutes)
  const DAY_PART_BOUNDARIES = {
    morning: { start: 360, end: 720 }, // 06:00 - 12:00
    afternoon: { start: 720, end: 1020 }, // 12:00 - 17:00  
    evening: { start: 1020, end: 1380 } // 17:00 - 23:00
  };

  // Process availability data with timezone correction
  const processAvailabilityData = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const timezone = location?.timezone || 'Europe/London';
    
    // CRITICAL FIX: Flatten nested slots arrays
    // Playtomic API returns array of resources, each with a slots array
    const flattenedSlots = [];
    
    for (const item of data) {
      if (item.slots && Array.isArray(item.slots)) {
        // This is a resource with nested slots
        for (const slot of item.slots) {
          flattenedSlots.push({
            ...slot,
            start_date: item.start_date ?? slot.start_date, // Propagate start_date to reduce warnings
            resource_id: item.resource_id || item.id, // Preserve resource info
            resource_name: item.name || item.resource_name
          });
        }
      } else {
        // This might be a direct slot
        flattenedSlots.push(item);
      }
    }
    
    return flattenedSlots.map(slot => {
      try {
        // Handle different possible field names and formats
        let startDateTime = null;
        
        // Try different combinations of fields that might contain the start time
        if (slot.start_date && slot.start_time) {
          startDateTime = `${slot.start_date}T${slot.start_time}`;
        } else if (slot.start_time) {
          startDateTime = slot.start_time;
        } else if (slot.startTime) {
          startDateTime = slot.startTime;
        } else if (slot.start) {
          startDateTime = slot.start;
        } else {
          console.warn('No valid start time found in slot:', slot);
          return {
            ...slot,
            local_start: 'Invalid date',
            local_end: 'Invalid date',
            hour_local: 0,
            duration: 0
          };
        }
        
        // Validate the datetime string exists
        if (!startDateTime) {
          console.warn('Start datetime is null/undefined for slot:', slot);
          return {
            ...slot,
            local_start: 'Invalid date',
            local_end: 'Invalid date',
            hour_local: 0,
            duration: 0
          };
        }
        
        // CRITICAL FIX: Treat start_date + start_time as UTC time from Playtomic API
        // Then convert to local timezone for proper bucketing
        
        // Ensure we have a properly formatted UTC datetime string
        let utcDateTime = startDateTime;
        if (!utcDateTime.endsWith('Z') && !utcDateTime.includes('+')) {
          utcDateTime = `${startDateTime}Z`; // Treat as UTC if no timezone specified
        }
        
        let localDate;
        try {
          // Parse as UTC and convert to venue local timezone
          const utcDate = parseISO(utcDateTime);
          localDate = toZonedTime(utcDate, timezone);
        } catch (parseError) {
          console.warn('Failed to parse datetime as UTC:', utcDateTime, parseError);
          return {
            ...slot,
            local_start: 'Invalid date',
            local_end: 'Invalid date',
            hour_local: 0,
            duration: 0
          };
        }
        
        // Check if the parsed date is valid
        if (isNaN(localDate.getTime())) {
          console.warn('Invalid date parsed from:', startDateTime, 'for slot:', slot);
          return {
            ...slot,
            local_start: 'Invalid date',
            local_end: 'Invalid date',
            hour_local: 0,
            duration: 0
          };
        }
        
        // Detect duration from various possible fields
        let duration = 90; // Default 90 minutes
        if (slot.duration) {
          duration = parseInt(slot.duration) || 90;
        } else if (slot.duration_minutes) {
          duration = parseInt(slot.duration_minutes) || 90;
        } else if (slot.length) {
          duration = parseInt(slot.length) || 90;
        }
        
        // Create normalized fields using venue-local time
        const localStart = formatInTimeZone(localDate, timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
        const localEnd = formatInTimeZone(addMinutes(localDate, duration), timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
        const hourLocal = parseInt(formatInTimeZone(localDate, timezone, 'HH'));
        
        return {
          ...slot,
          local_start: localStart,
          local_end: localEnd,
          hour_local: hourLocal,
          duration: duration
        };
      } catch (error) {
        console.error('Error processing slot:', slot, 'Error:', error);
        return {
          ...slot,
          local_start: 'Error processing date',
          local_end: 'Error processing date',
          hour_local: 0,
          duration: 0
        };
      }
    });
  };

  // Extract slots directly from raw JSON (bypassing problematic parser)
  const extractRawSlots = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const slots = [];
    
    for (const item of data) {
      if (item.slots && Array.isArray(item.slots)) {
        // This is a resource with nested slots
        for (const slot of item.slots) {
          slots.push({
            ...slot,
            start_date: item.start_date ?? slot.start_date, // Propagate start_date to reduce warnings
            resource_id: item.resource_id || item.id,
            resource_name: item.name || item.resource_name
          });
        }
      } else {
        // This might be a direct slot
        slots.push(item);
      }
    }
    
    return slots;
  };

  // Parse time from raw slot data with Playtomic offset
  const parseSlotTime = (slot: any) => {
    let startTime = null;
    
    // Try different field combinations
    if (slot.start_date && slot.start_time) {
      startTime = slot.start_time; // Use just the time part (HH:MM format)
    } else if (slot.start_time) {
      startTime = slot.start_time;
    } else if (slot.startTime) {
      startTime = slot.startTime;
    }
    
    if (!startTime) return null;
    
    // Extract base time and apply Playtomic offset
    const baseTime = startTime.split(':').slice(0, 2).join(':'); // Get HH:MM
    const duration = slot.duration || slot.duration_minutes || slot.length || 90;
    
    // Apply offset to get adjusted times
    const adjustedStartHHMM = addMinutesLocal(baseTime, playtomicOffsetMinutes);
    const adjustedStartMin = hhmmToMinutes(adjustedStartHHMM);
    const adjustedEndMin = (adjustedStartMin + duration) % 1440;
    
    return {
      startTimeHHMM: baseTime,
      adjustedStartHHMM,
      adjustedStartMin,
      adjustedEndMin,
      hour: Math.floor(adjustedStartMin / 60),
      duration
    };
  };

  // Generate summary variants working directly with raw JSON
  const generateSummary = (variant: string, data: any[], endpoint: string) => {
    if (!Array.isArray(data) || data.length === 0) {
      return '0 slots available for this day';
    }

    if (endpoint !== 'availability') {
      // For non-availability endpoints, return basic summary
      const nextStart = data[0]?.start_time || data[0]?.date || '';
      const topTitles = data.slice(0, 3).map(event => event.name || event.title || 'Untitled').join(', ');
      return `${data.length} events, next: ${nextStart}, titles: ${topTitles}`;
    }

    // Extract raw slots and parse times directly
    const rawSlots = extractRawSlots(data);
    const validSlots = rawSlots
      .map(slot => ({ ...slot, timeData: parseSlotTime(slot) }))
      .filter(slot => slot.timeData !== null);
    
    if (validSlots.length === 0) {
      return '0 slots available for this day';
    }
    
    switch (variant) {
      case 'dayparts-counts':
        return generateDirectDayPartsCountsSummary(validSlots);
      case 'dayparts-time-ranges':
        return generateDirectDayPartsTimeRangesSummary(validSlots);
      case 'full-day':
        return generateDirectFullDaySummary(validSlots);
      case 'prime-time-counts':
        return generateDirectPrimeTimeCountsSummary(validSlots);
      default:
        return `${validSlots.length} slots available`;
    }
  };

  // Direct summary functions working with raw JSON and Playtomic offset
  const generateDirectDayPartsCountsSummary = (slots: any[]) => {
    const counts = { morning: 0, afternoon: 0, evening: 0 };

    slots.forEach(slot => {
      const adjustedStartMin = slot.timeData.adjustedStartMin;
      
      if (adjustedStartMin >= DAY_PART_BOUNDARIES.morning.start && adjustedStartMin < DAY_PART_BOUNDARIES.morning.end) {
        counts.morning++;
      } else if (adjustedStartMin >= DAY_PART_BOUNDARIES.afternoon.start && adjustedStartMin < DAY_PART_BOUNDARIES.afternoon.end) {
        counts.afternoon++;
      } else if (adjustedStartMin >= DAY_PART_BOUNDARIES.evening.start && adjustedStartMin < DAY_PART_BOUNDARIES.evening.end) {
        counts.evening++;
      }
    });

    const parts = [];
    if (counts.morning > 0) parts.push(`Morning: ${counts.morning} slots`);
    if (counts.afternoon > 0) parts.push(`Afternoon: ${counts.afternoon} slots`);
    if (counts.evening > 0) parts.push(`Evening: ${counts.evening} slots`);

    return parts.length > 0 ? parts.join('\n') : 'No slots found in day-part ranges (6 a.m.–10:59 p.m.)';
  };

  const generateDirectDayPartsTimeRangesSummary = (slots: any[]) => {
    const ranges = {
      morning: { minStart: null, maxEnd: null, count: 0 },
      afternoon: { minStart: null, maxEnd: null, count: 0 },
      evening: { minStart: null, maxEnd: null, count: 0 }
    };

    let outsideCount = 0;

    slots.forEach(slot => {
      const { adjustedStartMin, adjustedEndMin } = slot.timeData;
      
      let dayPart = null;
      let bucketEndMin = null;
      
      if (adjustedStartMin >= DAY_PART_BOUNDARIES.morning.start && adjustedStartMin < DAY_PART_BOUNDARIES.morning.end) {
        dayPart = 'morning';
        bucketEndMin = DAY_PART_BOUNDARIES.morning.end;
      } else if (adjustedStartMin >= DAY_PART_BOUNDARIES.afternoon.start && adjustedStartMin < DAY_PART_BOUNDARIES.afternoon.end) {
        dayPart = 'afternoon';
        bucketEndMin = DAY_PART_BOUNDARIES.afternoon.end;
      } else if (adjustedStartMin >= DAY_PART_BOUNDARIES.evening.start && adjustedStartMin < DAY_PART_BOUNDARIES.evening.end) {
        dayPart = 'evening';
        bucketEndMin = DAY_PART_BOUNDARIES.evening.end;
      } else {
        outsideCount++;
        return;
      }

      // Count the slot in this day-part
      ranges[dayPart].count++;

      // Clamp end time to bucket boundary
      const clampedEndMin = Math.min(adjustedEndMin, bucketEndMin);
      
      if (ranges[dayPart].minStart === null || adjustedStartMin < ranges[dayPart].minStart) {
        ranges[dayPart].minStart = adjustedStartMin;
      }
      if (ranges[dayPart].maxEnd === null || clampedEndMin > ranges[dayPart].maxEnd) {
        ranges[dayPart].maxEnd = clampedEndMin;
      }
    });

    const parts = [];
    if (ranges.morning.minStart !== null && ranges.morning.maxEnd !== null) {
      const timeRange = `${formatCompactAmPm(ranges.morning.minStart)} – ${formatCompactAmPm(ranges.morning.maxEnd)}`;
      const countSuffix = ranges.morning.count < 5 ? ` x${ranges.morning.count}` : '';
      parts.push(`Morning: ${timeRange}${countSuffix}`);
    }
    if (ranges.afternoon.minStart !== null && ranges.afternoon.maxEnd !== null) {
      const timeRange = `${formatCompactAmPm(ranges.afternoon.minStart)} – ${formatCompactAmPm(ranges.afternoon.maxEnd)}`;
      const countSuffix = ranges.afternoon.count < 5 ? ` x${ranges.afternoon.count}` : '';
      parts.push(`Afternoon: ${timeRange}${countSuffix}`);
    }
    if (ranges.evening.minStart !== null && ranges.evening.maxEnd !== null) {
      const timeRange = `${formatCompactAmPm(ranges.evening.minStart)} – ${formatCompactAmPm(ranges.evening.maxEnd)}`;
      const countSuffix = ranges.evening.count < 5 ? ` x${ranges.evening.count}` : '';
      parts.push(`Evening: ${timeRange}${countSuffix}`);
    }

    if (parts.length === 0) {
      return `No day-part ranges within 6am–10:59pm (found ${outsideCount} slots outside this window).`;
    }

    return parts.join('\n');
  };

  const generateDirectFullDaySummary = (slots: any[]) => {
    if (slots.length === 0) return 'No slots available';
    
    let earliestStart = null;
    let latestEnd = null;
    
    slots.forEach(slot => {
      const { startTime, duration } = slot.timeData;
      
      // Calculate end time
      const [startHour, startMin] = startTime.split(':').map(n => parseInt(n));
      const endMinutes = (startHour * 60 + startMin + duration);
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      
      if (!earliestStart || startTime < earliestStart) {
        earliestStart = startTime;
      }
      if (!latestEnd || endTime > latestEnd) {
        latestEnd = endTime;
      }
    });

    return `Full day: ${earliestStart}–${latestEnd}`;
  };

  const generateDirectPrimeTimeCountsSummary = (slots: any[]) => {
    const primeTimeSlots = slots.filter(slot => 
      slot.timeData.hour >= 17 && slot.timeData.hour <= 21
    );

    return `Prime time: ${primeTimeSlots.length} slots`;
  };

  // Keep old summary functions for backward compatibility with debug table
  const generateDayPartsCountsSummary = (slots: any[]) => {
    const counts = {
      morning: 0,
      afternoon: 0,
      evening: 0
    };

    slots.forEach(slot => {
      const hour = slot.hour_local;
      if (hour >= 6 && hour <= 11) {
        counts.morning++;
      } else if (hour >= 12 && hour <= 16) {
        counts.afternoon++;
      } else if (hour >= 17 && hour <= 22) {
        counts.evening++;
      }
    });

    const parts = [];
    if (counts.morning > 0) parts.push(`Morning: ${counts.morning} slots`);
    if (counts.afternoon > 0) parts.push(`Afternoon: ${counts.afternoon} slots`);
    if (counts.evening > 0) parts.push(`Evening: ${counts.evening} slots`);

    return parts.join('\n');
  };

  // Copy summary to clipboard
  const copySummary = () => {
    if (currentSummary) {
      navigator.clipboard.writeText(currentSummary);
      toast({
        title: "Summary copied!",
        description: "Summary copied to clipboard",
      });
    }
  };

  // Save as dynamic field
  const saveDynamicField = async () => {
    if (!currentSummary || !location || !user) return;

    const fieldKeyMap = {
      'dayparts-counts': 'df_dayparts_counts',
      'dayparts-time-ranges': 'df_dayparts_time_ranges',
      'full-day': 'df_full_day_range',
      'prime-time-counts': 'df_prime_time_counts'
    };

    const fieldKey = fieldKeyMap[selectedSummaryVariant];
    if (!fieldKey) return;

    try {
      const { error } = await supabase
        .from('dynamic_fields')
        .upsert({
          location_id: location.id,
          field_key: fieldKey,
          field_type: 'text',
          last_output_text: currentSummary,
          last_output_json: {
            variant: selectedSummaryVariant,
            endpoint: lastResult?.endpoint,
            timestamp: new Date().toISOString(),
            filters: {
              sport_id: selectedSportId,
              start_min: startMin,
              start_max: startMax
            }
          }
        });

      if (error) throw error;

      toast({
        title: "Dynamic field saved",
        description: `Saved as ${fieldKey}`,
      });
    } catch (error: any) {
      console.error('Save dynamic field error:', error);
      toast({
        title: "Save failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Update summary when result or variant changes
  useEffect(() => {
    if (lastResult && lastResult.raw) {
      const summary = generateSummary(selectedSummaryVariant, lastResult.raw, lastResult.endpoint);
      setCurrentSummary(summary);
    }
  }, [lastResult, selectedSummaryVariant, location?.timezone]);

  // Update matches summary when result or variant changes
  useEffect(() => {
    if (lastResult && lastResult.endpoint === 'matches' && Array.isArray(lastResult.raw)) {
      const summary = generateMatchesSummary(selectedMatchesVariant, lastResult.raw);
      setCurrentMatchesSummary(summary);
    }
  }, [lastResult, selectedMatchesVariant, location?.timezone, location?.playtomic_hour_offset]);

  const validateAndSubmit = async () => {
    // Check if basic required fields are filled
    if (!currentTenantId.trim()) {
      toast({
        title: "No tenant ID",
        description: "Please discover a tenant first",
        variant: "destructive",
      });
      return;
    }
    
    // For availability, we need both start_min and start_max
    if (selectedEndpoint === 'availability') {
      if (!startMin || !startMax) {
        toast({
          title: "Date range required",
          description: "Both Start Min and Start Max are required for availability",
          variant: "destructive",
        });
        return;
      }
      
      const startDate = new Date(startMin);
      const endDate = new Date(startMax);
      
      if (startDate >= endDate) {
        toast({
          title: "Invalid date range",
          description: "Start Min must be before Start Max",
          variant: "destructive",
        });
        return;
      }
    }
    
    // For tournaments, matches, and lessons, we need both dates
    if (['tournaments', 'matches', 'lessons'].includes(selectedEndpoint)) {
      if (!startMin || !startMax) {
        toast({
          title: "Date range required",
          description: `Both Start Min and Start Max are required for ${selectedEndpoint}`,
          variant: "destructive",
        });
        return;
      }
      
      const startDate = new Date(startMin);
      const endDate = new Date(startMax);
      
      if (startDate >= endDate) {
        toast({
          title: "Invalid date range",
          description: "Start Min must be before Start Max",
          variant: "destructive",
        });
        return;
      }
    }
    
    // For classes with date filters enabled, we need both dates
    if (selectedEndpoint === 'classes' && applyDateFilters) {
      if (!startMin || !startMax) {
        toast({
          title: "Date range required",
          description: "Both Start Min and Start Max are required when date filters are enabled",
          variant: "destructive",
        });
        return;
      }
      
      const startDate = new Date(startMin);
      const endDate = new Date(startMax);
      
      if (startDate >= endDate) {
        toast({
          title: "Invalid date range",
          description: "Start Min must be before Start Max",
          variant: "destructive",
        });
        return;
      }
    }

    // All validation passed, proceed with fetch
    await performFetch();
  };

  const validateDateRange = () => {
    if (!startMin || !startMax) return true;
    return new Date(startMin) < new Date(startMax);
  };

  const discoverTenant = async () => {
    if (!clubUrl.trim()) return;

    setIsDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('discover-tenant', {
        body: { club_url: clubUrl.trim() }
      });

      if (error) throw error;

      setTenantInfo(data);
      toast({
        title: "Tenant discovered",
        description: `Found tenant: ${data.tenant_id}`,
      });
    } catch (error: any) {
      console.error('Discovery error:', error);
      toast({
        title: "Discovery failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const useForSession = () => {
    if (tenantInfo) {
      setCurrentTenantId(tenantInfo.tenant_id);
      toast({
        title: "Using tenant for session",
        description: `Tenant ID: ${tenantInfo.tenant_id}`,
      });
    }
  };

  const saveToLocation = async () => {
    if (!tenantInfo || !location) {
      toast({
        title: "Cannot save",
        description: "Missing tenant info or location",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .update({
          tenant_id: tenantInfo.tenant_id,
          playtomic_url: clubUrl.trim()
        })
        .eq('id', location.id);

      if (error) throw error;

      setCurrentTenantId(tenantInfo.tenant_id);
      toast({
        title: "Saved to location",
        description: "Tenant ID and URL saved",
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Save failed", 
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const performFetch = async () => {
    setIsLoading(true);
    setSelectedTournament(null); // Clear selection on new fetch
    try {
      // Process datetime strings based on endpoint requirements
      let processedStartMin = '';
      let processedStartMax = '';
      
      if (startMin && startMax) {
        if (selectedEndpoint === 'availability') {
          // Availability needs full datetime
          processedStartMin = startMin.includes('T') ? startMin : `${startMin}T00:00:00`;
          processedStartMax = startMax.includes('T') ? startMax : `${startMax}T23:59:59`;
        } else {
          // Other endpoints need date-only or full datetime
          processedStartMin = startMin.includes('T') ? startMin : `${startMin}T00:00:00`;
          processedStartMax = startMax.includes('T') ? startMax : `${startMax}T23:59:59`;
        }
      }

      // For classes, only send date params if apply_date_filters is true
      const shouldSendDates = selectedEndpoint !== 'classes' || applyDateFilters;

      const payload = {
        endpoint: selectedEndpoint,
        tenant_id: currentTenantId,
        sport_id: selectedSportId,
        start_min: shouldSendDates ? processedStartMin : '',
        start_max: shouldSendDates ? processedStartMax : '',
        has_players: hasPlayers,
        apply_date_filters: applyDateFilters
      };

      // Make parallel hyper-api call for matches endpoint
      let hyperApiPromise = null;
      
      if (selectedEndpoint === 'matches') {
        // Ensure second precision for hyper-api call
        const hyperStartMin = ensureSecondPrecision(processedStartMin, false);
        const hyperStartMax = ensureSecondPrecision(processedStartMax, true);
        
        const hyperRequestBody = {
          tenantid: currentTenantId,
          datefrom: hyperStartMin,
          dateto: hyperStartMax
        };
        
        const readableUrl = `https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/hyper-api?tenantid=${encodeURIComponent(currentTenantId)}&datefrom=${encodeURIComponent(hyperStartMin)}&dateto=${encodeURIComponent(hyperStartMax)}`;
        
        hyperApiPromise = supabase.functions.invoke('hyper-api', {
          body: hyperRequestBody
        }).then(({ data, error }) => {
          if (error) {
            return {
              url: readableUrl,
              urlDecoded: readableUrl,
              status: 'Supabase Error',
              raw: error,
              matchIds: [],
              method: 'POST',
              requestBody: hyperRequestBody,
              error: error.message || JSON.stringify(error)
            };
          }
          
          const ids = Array.isArray(data?.match_ids) ? data.match_ids : [];
          return {
            url: readableUrl,
            urlDecoded: readableUrl,
            status: '200 OK',
            raw: data || {},
            matchIds: ids,
            method: 'POST',
            requestBody: hyperRequestBody
          };
        }).catch((err) => ({
          url: readableUrl,
          urlDecoded: readableUrl,
          status: 'Network Error',
          raw: {},
          matchIds: [],
          method: 'POST',
          requestBody: hyperRequestBody,
          error: err.message
        }));
      }

      // Execute main fetch and hyper-api in parallel if needed
      const results = await Promise.allSettled([
        supabase.functions.invoke('playtomic-fetch', { body: payload }),
        ...(hyperApiPromise ? [hyperApiPromise] : [])
      ]);
      
      // Handle main playtomic-fetch result
      const mainResult = results[0];
      if (mainResult.status === 'fulfilled' && !mainResult.value.error) {
        setLastResult(mainResult.value.data);
      } else {
        const error = mainResult.status === 'rejected' ? mainResult.reason : mainResult.value.error;
        throw error;
      }

      // Handle hyper-api result if matches endpoint
      if (selectedEndpoint === 'matches' && results[1]) {
        const hyperResult = results[1];
        if (hyperResult.status === 'fulfilled') {
          setMatchesHyper(hyperResult.value);
        } else {
          setMatchesHyper({
            url: 'hyper-api',
            urlDecoded: 'hyper-api',
            status: 'Failed',
            raw: {},
            matchIds: [],
            method: 'POST',
            requestBody: {},
            error: 'Promise rejected'
          });
        }
      } else {
        setMatchesHyper(null);
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast({
        title: "Fetch failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = validateAndSubmit;

  const copyUrl = () => {
    if (lastResult?.url) {
      navigator.clipboard.writeText(lastResult.url);
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      });
    }
  };

  const copyCurl = () => {
    if (lastResult?.url) {
      const curlCommand = `curl -X GET "${lastResult.url}" -H "Accept: application/json"`;
      navigator.clipboard.writeText(curlCommand);
      toast({
        title: "cURL copied!",
        description: "cURL command copied to clipboard",
      });
    }
  };

  const saveSnapshot = async () => {
    if (!lastResult || !user || !location) return;

    try {
      const { error } = await supabase
        .from('fetch_snapshots')
        .insert({
          location_id: location.id,
          user_id: user.id,
          endpoint: selectedEndpoint,
          tenant_id: currentTenantId,
          filters: {
            sport_id: selectedSportId,
            start_min: startMin,
            start_max: startMax,
            has_players: hasPlayers,
            apply_date_filters: applyDateFilters
          },
          url: lastResult.url,
          status_code: lastResult.status,
          response_body: lastResult.raw
        });

      if (error) throw error;

      toast({
        title: "Snapshot saved",
        description: "API response saved to database",
      });
    } catch (error: any) {
      console.error('Save snapshot error:', error);
      toast({
        title: "Save failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: number) => {
    if (status === 200) return <Badge className="bg-green-500 text-white">200 OK</Badge>;
    if (status === 0) return <Badge variant="destructive">Timeout</Badge>;
    if (status >= 400 && status < 500) return <Badge variant="destructive">HTTP {status}</Badge>;
    if (status >= 500) return <Badge variant="destructive">HTTP {status}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getSummary = (result: FetchResult): string => {
    if (!result.raw || result.error) {
      const timezone = location?.timezone || 'Europe/London';
      const localWindow = startMin && startMax ? 
        `${formatInTimeZone(new Date(startMin), timezone, 'MMM dd HH:mm')} - ${formatInTimeZone(new Date(startMax), timezone, 'MMM dd HH:mm')} ${timezone}` : 
        'selected time range';
      return `Error: ${result.error || 'Unknown error'}. Local window: ${localWindow}`;
    }

    const data = result.raw;
    const timezone = location?.timezone || 'Europe/London';
    
    if (result.endpoint === 'availability') {
      if (Array.isArray(data) && data.length === 0) {
        const localWindow = startMin && startMax ? 
          `${formatInTimeZone(new Date(startMin), timezone, 'MMM dd HH:mm')} - ${formatInTimeZone(new Date(startMax), timezone, 'MMM dd HH:mm')} ${timezone}` : 
          'selected time range';
        return `0 slots available for ${localWindow}`;
      }
      if (Array.isArray(data)) {
        // FIXED: Use processed slots for earliest start time
        const processedSlots = processAvailabilityData(data);
        const validSlots = processedSlots.filter(slot => 
          slot.local_start && 
          slot.local_start !== 'Invalid date' && 
          slot.local_start !== 'Error processing date'
        );
        
        if (validSlots.length > 0) {
          const earliestStart = validSlots.reduce((earliest, slot) => {
            const startTime = format(parseISO(slot.local_start), 'HH:mm');
            return !earliest || startTime < earliest ? startTime : earliest;
          }, null);
          const minPrice = Math.min(...data.map(slot => slot.price || 0));
          return `${data.length} slots, earliest: ${earliestStart}, from €${minPrice}`;
        } else {
          return `${data.length} slots (processing failed)`;
        }
      }
    } else if (result.endpoint === 'matches') {
      // Enhanced matches summary with filtering statistics
      if (Array.isArray(data) && data.length === 0) {
        const localWindow = startMin && startMax ? 
          `${formatInTimeZone(new Date(startMin), timezone, 'MMM dd HH:mm')} - ${formatInTimeZone(new Date(startMax), timezone, 'MMM dd HH:mm')} ${timezone}` : 
          'selected time range';
        return `0 matches found for ${localWindow}`;
      }
      if (Array.isArray(data)) {
        const groupedData = processMatchesData(data);
        const stats = groupedData.stats;
        
        // Build enhanced summary based on current variant
        if (selectedMatchesVariant === 'open-joinable') {
          return `${data.length} total matches → ${stats.openJoinable} Open Joinable Games (strict filter: BOOKING+HIDDEN+CUSTOMER_MATCH+OPEN, excludes COMPETITIVE/PRIVATE)`;
        } else {
          return `${data.length} total matches → ${stats.baseAvailable} available games (1-3 players: ${groupedData.onePlayer.length + groupedData.twoPlayers.length + groupedData.threePlayers.length})`;
        }
      }
    } else {
      // Other events (tournaments, lessons, classes)
      if (Array.isArray(data) && data.length === 0) {
        const localWindow = startMin && startMax ? 
          `${formatInTimeZone(new Date(startMin), timezone, 'MMM dd HH:mm')} - ${formatInTimeZone(new Date(startMax), timezone, 'MMM dd HH:mm')} ${timezone}` : 
          'selected time range';
        return `0 events found for ${localWindow}`;
      }
      if (Array.isArray(data)) {
        const nextStart = data[0]?.start_time || data[0]?.date || '';
        const topTitles = data.slice(0, 3).map(event => event.name || event.title || 'Untitled').join(', ');
        return `${data.length} events, next: ${nextStart}, titles: ${topTitles}`;
      }
    }

    return 'Data received';
  };

  // Format tournament date and time with offset
  const formatTournamentDateTime = (tournament: any) => {
    try {
      const startDate = new Date(tournament.start_date);
      const endDate = new Date(tournament.end_date);
      
      // Apply Playtomic offset
      const adjustedStart = new Date(startDate.getTime() + playtomicOffsetMinutes * 60000);
      const adjustedEnd = new Date(endDate.getTime() + playtomicOffsetMinutes * 60000);
      
      const dateStr = format(adjustedStart, 'MMM d');
      const startTimeStr = format(adjustedStart, 'HH:mm');
      const endTimeStr = format(adjustedEnd, 'HH:mm');
      const startTime = formatCompactAmPm(hhmmToMinutes(startTimeStr));
      const endTime = formatCompactAmPm(hhmmToMinutes(endTimeStr));
      
      return {
        date: dateStr,
        time: `${startTime} – ${endTime}`
      };
    } catch (error) {
      return {
        date: 'Invalid date',
        time: 'Invalid time'
      };
    }
  };

  // Get player capacity info
  const getPlayerCapacity = (tournament: any) => {
    const registered = tournament.registered_players?.length || 0;
    const max = tournament.max_players || 0;
    const spacesLeft = Math.max(0, max - registered);
    
    return {
      registered,
      max,
      spacesLeft,
      display: `${registered}/${max}`,
      full: registered >= max
    };
  };

  const handleTournamentClick = (tournament: any) => {
    setSelectedTournament(tournament);
  };

  // Helper function to extract tournament ID
  const getTournamentId = (tournament: any) => {
    return tournament.tournament_id || tournament.id || tournament.tournamentId || null;
  };

  // Helper function to generate tournament join URL
  const getTournamentJoinUrl = (tournament: any) => {
    const tournamentId = getTournamentId(tournament);
    return tournamentId ? `https://app.playtomic.io/lessons/${tournamentId}` : null;
  };

  // Generate enhanced tournament summary
  const generateTournamentSummary = (tournament: any) => {
    if (!tournament) return '';
    
    const name = (tournament.tournament_name || tournament.name || tournament.title || 'Untitled').trim();
    const dateTime = formatTournamentDateTime(tournament);
    const capacity = getPlayerCapacity(tournament);
    const joinUrl = getTournamentJoinUrl(tournament);
    
    // Handle cancelled tournaments
    const isCancelled = tournament.is_cancelled === true || tournament.tournament_status === 'CANCELLED';
    const spacesText = isCancelled ? 'Spaces left = 0 (Cancelled)' : `Spaces left = ${capacity.spacesLeft}`;
    
    let summary = `${name}
Date: ${dateTime.date}
Time: ${dateTime.time}
${spacesText}`;

    if (joinUrl) {
      summary += `\nJoin URL: ${joinUrl}`;
    }

    return summary;
  };

  // Copy tournament summary to clipboard
  const copyTournamentSummary = async () => {
    if (!selectedTournament) return;
    
    try {
      const summary = generateTournamentSummary(selectedTournament);
      await navigator.clipboard.writeText(summary);
      toast({
        title: "Copied to clipboard",
        description: "Tournament summary copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Save tournament summary as dynamic field
  const saveTournamentDynamicField = async () => {
    if (!selectedTournament || !user || !location?.id) return;

    try {
      const summary = generateTournamentSummary(selectedTournament);
      let fieldKey = 'tournament_summary';
      
      // Check if field exists and increment if needed
      let counter = 1;
      const { data: existingFields } = await supabase
        .from('dynamic_fields')
        .select('field_key')
        .eq('location_id', location.id)
        .like('field_key', `${fieldKey}%`);

      if (existingFields && existingFields.length > 0) {
        const existingKeys = existingFields.map(f => f.field_key);
        while (existingKeys.includes(fieldKey)) {
          counter++;
          fieldKey = `tournament_summary_${counter}`;
        }
      }

      const joinUrl = getTournamentJoinUrl(selectedTournament);

      const { error } = await supabase
        .from('dynamic_fields')
        .insert({
          location_id: location.id,
          field_key: fieldKey,
          field_type: 'text',
          last_output_text: summary,
          last_output_json: { 
            text: summary, 
            tournament: selectedTournament,
            join_url: joinUrl
          }
        });

      if (error) throw error;

      toast({
        title: "Dynamic field saved",
        description: `Saved as "${fieldKey}"`,
      });
    } catch (error) {
      console.error('Error saving dynamic field:', error);
      toast({
        title: "Save failed",
        description: "Failed to save dynamic field",
        variant: "destructive",
      });
    }
  };

  // Helper function to check if a match is cancelled
  const isCancelled = (match: any) => {
    return match.is_cancelled === true || 
           match.status === 'CANCELED' || 
           match.status === 'CANCELLED' ||
           match.game_status === 'CANCELED' ||
           match.game_status === 'CANCELLED';
  };

  // Helper function to check if match is open customer match
  const isOpenCustomerMatch = (match: any) => {
    return match.product_type === "CUSTOMER_MATCH" &&
           match.registration_status === "OPEN" &&
           match.status === "PENDING" &&
           match.game_status === "PENDING";
  };

  // Enhanced helper function to check if match is open joinable game
  const isOpenJoinable = (match: any) => {
    const matchId = match.match_id || match.id || 'unknown';
    
    // Extract all possible field variations for robust checking (case-insensitive)
    const matchType = (match.match_type || match.type || '').toUpperCase();
    const visibility = (match.visibility || match.visibility_status || '').toUpperCase();
    const productType = (match.product_type || '').toUpperCase();
    const registrationStatus = (match.registration_status || '').toUpperCase();
    const bookingType = (match.booking_type || '').toUpperCase();
    
    // Get player names for diagnostics
    const playerNames = match.teams?.flatMap((team: any) => 
      team.players?.map((player: any) => player.name).filter(Boolean) || []
    ) || [];
    
    console.log(`🔍 [${matchId}] Open Joinable Check:`, {
      match_type: matchType,
      visibility: visibility,
      product_type: productType,
      registration_status: registrationStatus,
      booking_type: bookingType,
      players: playerNames
    });

    // HARDENED EXCLUSIONS - Explicitly exclude problematic types (case-insensitive)
    const excludedTypes = ['COMPETITIVE', 'PRIVATE', 'TOURNAMENT', 'LESSON'];
    if (excludedTypes.includes(matchType)) {
      console.log(`❌ [${matchId}] EXCLUDED: Prohibited match type (${matchType})`);
      return false;
    }

    // REQUIRED: Must be BOOKING type (case-insensitive)
    if (matchType !== "BOOKING") {
      console.log(`❌ [${matchId}] EXCLUDED: Not BOOKING type (${matchType})`);
      return false;
    }

    // REQUIRED: Must be HIDDEN visibility (case-insensitive)
    if (visibility !== "HIDDEN") {
      console.log(`❌ [${matchId}] EXCLUDED: Not HIDDEN (${visibility})`);
      return false;
    }

    // REQUIRED: Must be CUSTOMER_MATCH product type (case-insensitive)
    if (productType !== "CUSTOMER_MATCH") {
      console.log(`❌ [${matchId}] EXCLUDED: Not CUSTOMER_MATCH (${productType})`);
      return false;
    }

    // REQUIRED: Must be OPEN registration (case-insensitive)
    if (registrationStatus !== "OPEN") {
      console.log(`❌ [${matchId}] EXCLUDED: Not OPEN registration (${registrationStatus})`);
      return false;
    }

    // HARDENED CAPACITY CHECK: Must have available slots with robust fallbacks
    const playerCount = match.teams?.reduce((count: number, team: any) => {
      return count + (team.players?.length || 0);
    }, 0) || 0;

    // Compute total slots with multiple fallback strategies
    let totalSlots = 0;
    if (match.teams && Array.isArray(match.teams)) {
      // Primary: Sum team.max_players when available
      totalSlots = match.teams.reduce((slots: number, team: any) => {
        return slots + (team.max_players || 0);
      }, 0);
      
      // Fallback 1: Use match-level max_players_per_team
      if (totalSlots === 0) {
        const maxPlayersPerTeam = match.max_players_per_team || 2; // Standard doubles
        totalSlots = maxPlayersPerTeam * 2; // Two teams
      }
    }
    
    // Fallback 2: Last resort default (standard doubles)
    if (totalSlots === 0) {
      totalSlots = 4; // 2 players per team × 2 teams
    }

    // Only exclude if we have positive capacity and it's full
    if (totalSlots > 0 && playerCount >= totalSlots) {
      console.log(`❌ [${matchId}] EXCLUDED: Full capacity (${playerCount}/${totalSlots} players: ${playerNames.join(', ')})`);
      return false;
    }

    console.log(`✅ [${matchId}] PASSES all Open Joinable criteria (${playerCount}/${totalSlots} players: ${playerNames.join(', ')})`);
    return true;
  };

  // Enhanced process matches data with independent filtering pipelines
  const processMatchesData = (matches: any[]) => {
    if (!Array.isArray(matches)) return { 
      onePlayer: [], twoPlayers: [], threePlayers: [], 
      allGames: [], openJoinable: [], 
      stats: { total: 0, openJoinable: 0, baseAvailable: 0 }
    };

    console.log(`🔄 Processing ${matches.length} total matches for variant: ${selectedMatchesVariant}`);

    // INDEPENDENT FILTERING PIPELINES
    
    // Pipeline 1: Open Joinable Games (strict criteria)
    const openJoinableMatches = matches.filter(match => 
      isOpenJoinable(match) && !isCancelled(match)
    );
    console.log(`📊 Open Joinable Games: ${openJoinableMatches.length}/${matches.length}`);

    // Pipeline 2: Base Available Games (existing criteria for other variants)
    const baseAvailableMatches = matches.filter(match => 
      isOpenCustomerMatch(match) && !isCancelled(match)
    );
    console.log(`📊 Base Available Games: ${baseAvailableMatches.length}/${matches.length}`);

    // Select appropriate dataset based on variant
    let validMatches = [];
    if (selectedMatchesVariant === 'open-joinable') {
      validMatches = openJoinableMatches;
      console.log(`✅ Using Open Joinable dataset: ${validMatches.length} matches`);
    } else {
      validMatches = baseAvailableMatches;
      console.log(`✅ Using Base Available dataset: ${validMatches.length} matches`);
    }

    const processedMatches = validMatches.map(match => {
      // Count registered players with names
      const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
        const playersWithNames = team.players?.filter((player: any) => player.name) || [];
        return count + playersWithNames.length;
      }, 0) || 0;

      // Calculate max players (usually 4 for doubles)
      const maxPlayersPerTeam = match.max_players_per_team || 2;
      const numberOfTeams = 2; // Standard doubles
      const maxPlayers = maxPlayersPerTeam * numberOfTeams;

      // Get all player info for detailed display
      const allPlayers = match.teams?.flatMap((team: any) => 
        team.players?.map((player: any) => ({
          name: player.name || '??',
          level_value: player.level_value || player.level || null
        })) || []
      ) || [];

      return {
        ...match,
        registeredPlayers,
        maxPlayers,
        allPlayers,
        spacesLeft: Math.max(0, maxPlayers - registeredPlayers)
      };
    });

    // Filter out full matches for grouped variants
    const availableMatches = processedMatches.filter(match => 
      match.registeredPlayers < match.maxPlayers
    );

    // Create ID sets for efficient correlation (fixes object reference bug)
    const openJoinableIds = new Set(openJoinableMatches.map(match => match.match_id || match.id));
    
    // Sort Open Joinable matches by start date for better UX
    const sortedOpenJoinable = [...openJoinableMatches].sort((a, b) => {
      if (a.start_date && b.start_date) {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      }
      return 0;
    });

    return {
      onePlayer: availableMatches.filter(match => match.registeredPlayers === 1),
      twoPlayers: availableMatches.filter(match => match.registeredPlayers === 2),
      threePlayers: availableMatches.filter(match => match.registeredPlayers === 3),
      allGames: availableMatches,
      openJoinable: selectedMatchesVariant === 'open-joinable' ? 
        availableMatches.filter(match => openJoinableIds.has(match.match_id || match.id)) : 
        availableMatches,
      stats: {
        total: matches.length,
        openJoinable: openJoinableMatches.length,
        baseAvailable: baseAvailableMatches.length
      }
    };
  };

  // Format match as WhatsApp block
  const formatMatchWhatsAppBlock = (match: any) => {
    const timezone = location?.timezone || 'Europe/London';
    const playtomicOffset = location?.playtomic_hour_offset || 60; // Default 60 minutes for Europe/London

    // Parse and format date/time
    let formattedDate = 'Date: Unknown';
    let formattedTime = 'Time: Unknown';
    
    if (match.start_date) {
      try {
        // Apply Playtomic offset
        const originalDate = parseISO(match.start_date);
        const offsetDate = addMinutes(originalDate, playtomicOffset);
        
        // Format date as "Friday 29"
        const dayName = format(offsetDate, 'EEEE');
        const dayNumber = format(offsetDate, 'd');
        formattedDate = `${dayName} ${dayNumber}`;
        
        // Format time and calculate end time
        const duration = match.duration || 60; // Default 60 minutes
        const endDate = addMinutes(offsetDate, duration);
        
        // Convert to 12-hour format without dots
        const startTime12 = format(offsetDate, 'h:mma').toLowerCase().replace('.', '');
        const endTime12 = format(endDate, 'h:mma').toLowerCase().replace('.', '');
        formattedTime = `${startTime12} – ${endTime12}`;
      } catch (error) {
        console.error('Error formatting match date:', error);
      }
    }

    // Get location info
    const location_name = match.location || match.tenant?.tenant_name || 'Unknown Location';
    const city = match.tenant?.address?.city || match.location_info?.address?.city || 'Unknown City';

    // Calculate level range - prioritize match min_level/max_level if available
    let levelRange = 'Level N/A';
    if (match.min_level != null && match.max_level != null) {
      // Use match's min/max level (formatted to 2 decimal places)
      const minLevel = match.min_level.toFixed(2);
      const maxLevel = match.max_level.toFixed(2);
      levelRange = `Level ${minLevel} - ${maxLevel}`;
    } else if (match.allPlayers && match.allPlayers.length > 0) {
      // Fall back to calculating from player levels (formatted to 1 decimal)
      const levels = match.allPlayers
        .map((player: any) => player.level_value)
        .filter((level: any) => typeof level === 'number');
      
      if (levels.length > 0) {
        const minLevel = Math.min(...levels).toFixed(1);
        const maxLevel = Math.max(...levels).toFixed(1);
        levelRange = `Level ${minLevel} - ${maxLevel}`;
      }
    }

    // Build player list and empty slots
    let playerLines = '';
    
    // Add confirmed players
    if (match.allPlayers) {
      match.allPlayers.forEach((player: any) => {
        const level = player.level_value ? `(${player.level_value.toFixed(2)})` : '(N/A)';
        playerLines += `✅ ${player.name} ${level}\n`;
      });
    }
    
    // Add empty slots
    const emptySlots = match.spacesLeft || 0;
    for (let i = 0; i < emptySlots; i++) {
      playerLines += '⚪ ??\n';
    }

    // Build the match URL
    const matchUrl = `https://app.playtomic.io/matches/${match.match_id}`;

    return `*MATCH IN ${location_name}*
📅 ${formattedDate}, ${formattedTime} (${match.duration || 60}min)
📍 ${city}
📊 ${levelRange}
${playerLines.trim()}
${matchUrl}`;
  };

  // Helper function to get competitive open matches with enriched data
  const getCompetitiveOpenMatches = (matches: any[]) => {
    return matches.filter(match => {
      // Check if cancelled
      const isCancelled = match.status?.toLowerCase() === 'cancelled';
      if (isCancelled) return false;
      
      // Check join requests status is OPEN (case-insensitive)
      const joinStatus = match.join_requests_info?.status?.toLowerCase();
      if (joinStatus !== 'open') return false;
      
      // Check competition_mode is COMPETITIVE (case-insensitive)
      const compMode = match.competition_mode?.toLowerCase();
      if (compMode !== 'competitive') return false;
      
      // Check match_type is COMPETITIVE (case-insensitive)
      const matchType = match.match_type?.toLowerCase();
      if (matchType !== 'competitive') return false;
      
      // Count registered players with names
      const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
        const playersWithNames = team.players?.filter((player: any) => player.name) || [];
        return count + playersWithNames.length;
      }, 0) || 0;
      
      // Check if between 1-3 players
      return registeredPlayers >= 1 && registeredPlayers <= 3;
    }).map(match => {
      // Enrich matches with player data for display
      const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
        const playersWithNames = team.players?.filter((player: any) => player.name) || [];
        return count + playersWithNames.length;
      }, 0) || 0;

      // Calculate max players (usually 4 for doubles)
      const maxPlayersPerTeam = match.max_players_per_team || 2;
      const numberOfTeams = 2; // Standard doubles
      const maxPlayers = maxPlayersPerTeam * numberOfTeams;

      // Get all player info for detailed display with consistent level_value property
      const allPlayers = match.teams?.flatMap((team: any) => 
        team.players?.map((player: any) => ({
          name: player.name || '??',
          level_value: player.level_value || player.level || null
        })) || []
      ) || [];

      return {
        ...match,
        registeredPlayers,
        maxPlayers,
        allPlayers,
        spacesLeft: Math.max(0, maxPlayers - registeredPlayers)
      };
    }).sort((a, b) => {
      if (a.start_date && b.start_date) {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      }
      return 0;
    });
  };

  // Generate matches summary for selected variant
  const generateMatchesSummary = (variant: string, matches: any[]) => {
    const groupedMatches = processMatchesData(matches);
    
    let selectedMatches: any[] = [];
    let headerText = '';
    
    switch (variant) {
      case 'one-player':
        selectedMatches = groupedMatches.onePlayer;
        headerText = `— GAMES WITH 1 PLAYER IN (${selectedMatches.length}) —`;
        break;
      case 'two-players':
        selectedMatches = groupedMatches.twoPlayers;
        headerText = `— GAMES WITH 2 PLAYERS IN (${selectedMatches.length}) —`;
        break;
      case 'three-players':
        selectedMatches = groupedMatches.threePlayers;
        headerText = `— GAMES WITH 3 PLAYERS IN (${selectedMatches.length}) —`;
        break;
      case 'all-games':
        selectedMatches = groupedMatches.allGames.sort((a, b) => {
          if (a.start_date && b.start_date) {
            return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          }
          return 0;
        });
        headerText = `— ALL GAMES (${selectedMatches.length}) —`;
        break;
      case 'open-joinable':
        selectedMatches = groupedMatches.openJoinable.sort((a, b) => {
          if (a.start_date && b.start_date) {
            return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          }
          return 0;
        });
        headerText = `— OPEN JOINABLE GAMES (${selectedMatches.length}) —`;
        break;
      case 'competitive-open':
        selectedMatches = getCompetitiveOpenMatches(matches);
        headerText = `— COMPETITIVE — OPEN (1–3 PLAYERS) (${selectedMatches.length}) —`;
        break;
      case 'competitive-open-1':
        const compMatches1 = getCompetitiveOpenMatches(matches);
        selectedMatches = compMatches1.filter(match => match.registeredPlayers === 1);
        headerText = `— COMPETITIVE — OPEN (1 PLAYER) (${selectedMatches.length}) —`;
        break;
      case 'competitive-open-2':
        const compMatches2 = getCompetitiveOpenMatches(matches);
        selectedMatches = compMatches2.filter(match => match.registeredPlayers === 2);
        headerText = `— COMPETITIVE — OPEN (2 PLAYERS) (${selectedMatches.length}) —`;
        break;
      case 'competitive-open-3':
        const compMatches3 = getCompetitiveOpenMatches(matches);
        selectedMatches = compMatches3.filter(match => match.registeredPlayers === 3);
        headerText = `— COMPETITIVE — OPEN (3 PLAYERS) (${selectedMatches.length}) —`;
        break;
      default:
        return 'Invalid variant selected';
    }

    if (selectedMatches.length === 0) {
      return `${headerText}\n\nNo matches found for this criteria.`;
    }

    const matchBlocks = selectedMatches.map(match => formatMatchWhatsAppBlock(match));
    return `${headerText}\n\n${matchBlocks.join('\n\n')}`;
  };

  // Copy matches summary to clipboard
  const copyMatchesSummary = async () => {
    if (!currentMatchesSummary) return;
    
    try {
      await navigator.clipboard.writeText(currentMatchesSummary);
      toast({
        title: "Copied to clipboard",
        description: "Matches summary copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Save matches as dynamic field
  const saveMatchesDynamicField = async () => {
    if (!currentMatchesSummary || !location || !user) return;

    try {
      let fieldKey = 'matches_summary';
      
      // Check if field exists and increment if needed
      let counter = 1;
      const { data: existingFields } = await supabase
        .from('dynamic_fields')
        .select('field_key')
        .eq('location_id', location.id)
        .like('field_key', `${fieldKey}%`);

      if (existingFields && existingFields.length > 0) {
        const existingKeys = existingFields.map(f => f.field_key);
        while (existingKeys.includes(fieldKey)) {
          counter++;
          fieldKey = `matches_summary_${counter}`;
        }
      }

      const { error } = await supabase
        .from('dynamic_fields')
        .insert({
          location_id: location.id,
          field_key: fieldKey,
          field_type: 'text',
          last_output_text: currentMatchesSummary,
          last_output_json: {
            variant: selectedMatchesVariant,
            endpoint: 'matches',
            timestamp: new Date().toISOString(),
            filters: {
              sport_id: selectedSportId,
              start_min: startMin,
              start_max: startMax,
              matches_variant: selectedMatchesVariant
            }
          }
        });

      if (error) throw error;

      toast({
        title: "Dynamic field saved",
        description: `Saved as "${fieldKey}"`,
      });
    } catch (error: any) {
      console.error('Save dynamic field error:', error);
      toast({
        title: "Save failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Helper function to check if match is open and visible
  const isOpenVisible = (match: any): boolean => {
    const regOpen = match.registration_status === 'OPEN';
    const joinOpen = !match.join_requests_info || match.join_requests_info.status === 'OPEN';
    const visible = !match.visibility || match.visibility === 'VISIBLE';
    return regOpen && joinOpen && visible;
  };

  // Fetch match details in batches
  const fetchDetailsBatched = async (ids: string[], batchSize = 10, pauseMs = 250) => {
    const results: any[] = [];
    const skipped: string[] = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const promises = batch.map(async (id) => {
        try {
          // Use existing playtomic-fetch edge function to get match details
          const { data, error } = await supabase.functions.invoke('playtomic-fetch', {
            body: {
              endpoint: `matches/${id}`,
              query: {}
            }
          });
          
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          
          return data.data;
        } catch (error) {
          console.error(`Failed to fetch match ${id}:`, error);
          throw error;
        }
      });
      
      const chunk = await Promise.allSettled(promises);
      chunk.forEach((p, idx) => {
        if (p.status === 'fulfilled') {
          results.push(p.value);
        } else {
          skipped.push(batch[idx]);
        }
      });
      
      // Pause between batches to respect rate limits
      if (i + batchSize < ids.length) {
        await new Promise(r => setTimeout(r, pauseMs));
      }
    }
    
    return { results, skipped };
  };




  // Render admin check after all hooks
  if (!isAdmin()) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Admin role required to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Playtomic API Test Lab</h1>
        <Badge variant="outline">Admin Only</Badge>
      </div>

      <Tabs defaultValue="discovery" className="space-y-6">
        <TabsList>
          <TabsTrigger value="discovery">Tenant Discovery</TabsTrigger>
          <TabsTrigger value="fetch">API Fetch Runner</TabsTrigger>
        </TabsList>
        
        <TabsContent value="discovery">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Discovery</CardTitle>
              <CardDescription>
                Discover Playtomic tenant information from a club URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="club-url">Club URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="club-url"
                    placeholder="https://playtomic.com/clubs/example-club"
                    value={clubUrl}
                    onChange={(e) => setClubUrl(e.target.value)}
                    disabled={prefillMode && location?.playtomic_url}
                  />
                  {prefillMode && location?.playtomic_url && (
                    <Button 
                      variant="outline" 
                      onClick={() => setPrefillMode(false)}
                    >
                      Replace
                    </Button>
                  )}
                </div>
              </div>

              <Button 
                onClick={discoverTenant}
                disabled={isDiscovering || !clubUrl.trim()}
              >
                {isDiscovering ? 'Discovering...' : 'Discover Tenant'}
              </Button>

              {tenantInfo && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2">
                    <div><strong>Tenant ID:</strong> {tenantInfo.tenant_id}</div>
                    <div><strong>Sport ID:</strong> {tenantInfo.sport_id}</div>
                    <div><strong>Evidence:</strong> Seen on {tenantInfo.evidence.seen_on}</div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button onClick={useForSession} variant="outline">
                        Use for This Session
                      </Button>
                      <Button onClick={saveToLocation}>
                        Save to Location
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fetch">
          <Card>
            <CardHeader>
              <CardTitle>API Fetch Runner</CardTitle>
              <CardDescription>
                Test Playtomic API endpoints with various parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Endpoint</Label>
                  <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                      <SelectContent>
                       <SelectItem value="availability">Availability</SelectItem>
                       <SelectItem value="matches">Matches</SelectItem>
                       <SelectItem value="tournaments">Competitions / Academy</SelectItem>
                       <SelectItem value="lessons">Lessons</SelectItem>
                       <SelectItem value="classes">Classes</SelectItem>
                     </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sport ID</Label>
                  <Select value={selectedSportId} onValueChange={setSelectedSportId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PADEL">PADEL</SelectItem>
                      <SelectItem value="TENNIS">TENNIS</SelectItem>
                      <SelectItem value="FOOTBALL">FOOTBALL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreset('today')}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreset('tomorrow')}
                  >
                    Tomorrow
                  </Button>
                 </div>
                 
                  {/* Show date fields conditionally */}
                  {(selectedEndpoint !== 'classes' || applyDateFilters) && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="start-min" className="flex items-center gap-2">
                         <Calendar className="h-4 w-4" />
                         Start Min
                       </Label>
                       <Input
                         id="start-min"
                         type="datetime-local"
                         value={startMin}
                         onChange={(e) => setStartMin(e.target.value)}
                         step="60"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="start-max" className="flex items-center gap-2">
                         <Clock className="h-4 w-4" />
                         Start Max
                       </Label>
                       <Input
                         id="start-max"
                         type="datetime-local"
                         value={startMax}
                         onChange={(e) => setStartMax(e.target.value)}
                         step="60"
                       />
                     </div>
                   </div>
                 )}
                
                 {(selectedEndpoint !== 'classes' || applyDateFilters) && (
                   <p className="text-sm text-muted-foreground">
                     Times are local to {location?.timezone || 'Europe/London'}; submitted as ISO (no Z)
                     {playtomicOffsetMinutes !== 0 && (
                       <span className="block">
                         Local window (with Playtomic offset {playtomicOffsetMinutes > 0 ? '+' : ''}{playtomicOffsetMinutes} min): {
                           startMin && startMax ? (
                             `${addMinutesLocal(format(new Date(startMin), 'HH:mm'), playtomicOffsetMinutes)} – ${addMinutesLocal(format(new Date(startMax), 'HH:mm'), playtomicOffsetMinutes)}`
                           ) : 'N/A'
                         }
                       </span>
                     )}
                   </p>
                 )}
              </div>

              <div className="space-y-4">
                {selectedEndpoint === 'matches' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has-players"
                      checked={hasPlayers}
                      onCheckedChange={setHasPlayers}
                    />
                    <Label htmlFor="has-players">Has Players</Label>
                  </div>
                )}
                
                {selectedEndpoint === 'classes' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="apply-date-filters"
                      checked={applyDateFilters}
                      onCheckedChange={setApplyDateFilters}
                    />
                    <Label htmlFor="apply-date-filters">Apply Date Filters</Label>
                  </div>
                )}
              </div>

                <div className="flex items-center gap-4">
                  <Button 
                    onClick={fetchData} 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Fetching...' : 'Fetch Now'}
                  </Button>
                 {currentTenantId && (
                   <Badge variant="outline">
                     Tenant: {currentTenantId.substring(0, 8)}...
                   </Badge>
                 )}
               </div>
            </CardContent>
          </Card>

          {lastResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Results</CardTitle>
                  {getStatusBadge(lastResult.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Final URL</Label>
                  <div className="flex gap-2">
                    <Input value={lastResult.url} readOnly className="font-mono text-xs" />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyUrl}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyCurl}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy cURL
                      </Button>
                    </div>
                  </div>
                </div>

                  <div className="space-y-2">
                    <Label>Summary</Label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {getSummary(lastResult)}
                    </div>
                  </div>

                  {lastResult.endpoint === 'availability' && Array.isArray(lastResult.raw) && lastResult.raw.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Normalized Slots (Admin Debug)</Label>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="debug-time-toggle" className="text-sm">Local</Label>
                          <Switch
                            id="debug-time-toggle"
                            checked={debugTimeDisplay === 'utc'}
                            onCheckedChange={(checked) => setDebugTimeDisplay(checked ? 'utc' : 'local')}
                          />
                          <Label htmlFor="debug-time-toggle" className="text-sm">UTC</Label>
                        </div>
                      </div>
                      <Collapsible open={showDebugTable} onOpenChange={setShowDebugTable}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="flex items-center gap-2 p-0">
                            <ChevronDown className={`h-4 w-4 transition-transform ${showDebugTable ? 'rotate-180' : ''}`} />
                            {showDebugTable ? 'Hide' : 'Show'} Normalized Slots Table
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 border rounded-md overflow-auto max-h-96">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Resource ID</TableHead>
                                  <TableHead>Start Date</TableHead>
                                  <TableHead>Start Time</TableHead>
                                  <TableHead>Local Start</TableHead>
                                  <TableHead>Local End</TableHead>
                                  <TableHead>Hour Local</TableHead>
                                  <TableHead>Duration</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {processAvailabilityData(lastResult.raw).map((slot, index) => {
                                  const timezone = location?.timezone || 'Europe/London';
                                  let displayStart = slot.local_start;
                                  let displayEnd = slot.local_end;
                                  
                                  if (debugTimeDisplay === 'utc' && slot.local_start !== 'Invalid date' && slot.local_start !== 'Error processing date') {
                                    try {
                                      const localDate = parseISO(slot.local_start);
                                      const utcDate = toZonedTime(localDate, timezone);
                                      displayStart = format(utcDate, 'yyyy-MM-dd\'T\'HH:mm:ss') + 'Z';
                                      
                                      const localEndDate = parseISO(slot.local_end);
                                      const utcEndDate = toZonedTime(localEndDate, timezone);
                                      displayEnd = format(utcEndDate, 'yyyy-MM-dd\'T\'HH:mm:ss') + 'Z';
                                    } catch (error) {
                                      // Keep original values if conversion fails
                                    }
                                  }
                                  
                                  return (
                                    <TableRow key={index}>
                                      <TableCell className="font-mono text-xs">{slot.resource_id || slot.courtId || slot.id || '-'}</TableCell>
                                      <TableCell className="font-mono text-xs">{slot.start_date || '-'}</TableCell>
                                      <TableCell className="font-mono text-xs">{slot.start_time || '-'}</TableCell>
                                      <TableCell className="font-mono text-xs">{displayStart}</TableCell>
                                      <TableCell className="font-mono text-xs">{displayEnd}</TableCell>
                                      <TableCell className="font-mono text-xs">{slot.hour_local}</TableCell>
                                      <TableCell className="font-mono text-xs">{slot.duration || '-'}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}

                  {lastResult.endpoint === 'availability' && Array.isArray(lastResult.raw) && lastResult.raw.length > 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Summary Variant</Label>
                      <Select value={selectedSummaryVariant} onValueChange={setSelectedSummaryVariant}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dayparts-time-ranges">Day-parts: time ranges</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Enhanced Summary</Label>
                      <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-line">
                        {currentSummary}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copySummary}
                          disabled={!currentSummary}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Summary
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveDynamicField}
                          disabled={!currentSummary}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save as Dynamic Field
                        </Button>
                      </div>
                    </div>
                  </div>
                   )}

                 {lastResult.endpoint === 'tournaments' && Array.isArray(lastResult.raw) && lastResult.raw.length > 0 && (
                   <div className="space-y-4">
                     <div className="space-y-2">
                       <Label>Competitions / Academy</Label>
                       <div className="border rounded-md">
                         <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tournament</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Capacity</TableHead>
                                <TableHead>Join</TableHead>
                              </TableRow>
                            </TableHeader>
                           <TableBody>
                              {lastResult.raw.map((tournament: any, index: number) => {
                                const dateTime = formatTournamentDateTime(tournament);
                                const capacity = getPlayerCapacity(tournament);
                                const isSelected = selectedTournament === tournament;
                                
                                return (
                                  <TableRow 
                                    key={index} 
                                    className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
                                    onClick={() => handleTournamentClick(tournament)}
                                  >
                                     <TableCell className="font-medium">
                                       {tournament.tournament_name || tournament.name || tournament.title || 'Unnamed Tournament'}
                                     </TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        <div>{dateTime.date}</div>
                                        <div className="text-muted-foreground">{dateTime.time}</div>
                                      </div>
                                    </TableCell>
                                     <TableCell>
                                       <div className="flex items-center gap-2">
                                         <span className={capacity.full ? 'text-red-600' : capacity.spacesLeft <= 2 ? 'text-orange-600' : 'text-green-600'}>
                                           {capacity.display}
                                         </span>
                                         {capacity.full && <Badge variant="secondary" className="text-xs">Full</Badge>}
                                         {!capacity.full && capacity.spacesLeft <= 2 && (
                                           <Badge variant="outline" className="text-xs">
                                             {capacity.spacesLeft} space{capacity.spacesLeft !== 1 ? 's' : ''}
                                           </Badge>
                                         )}
                                       </div>
                                     </TableCell>
                                     <TableCell>
                                       {(() => {
                                         const joinUrl = getTournamentJoinUrl(tournament);
                                         return joinUrl ? (
                                           <a 
                                             href={joinUrl} 
                                             target="_blank" 
                                             rel="noopener noreferrer"
                                             className="text-primary hover:underline text-sm"
                                             onClick={(e) => e.stopPropagation()}
                                           >
                                             Join
                                           </a>
                                         ) : (
                                           <span className="text-muted-foreground text-sm">N/A</span>
                                         );
                                       })()}
                                     </TableCell>
                                  </TableRow>
                                );
                              })}
                           </TableBody>
                         </Table>
                        </div>
                      </div>

                      {/* Tournament Summary Panel */}
                      {selectedTournament && (
                        <div className="mt-6 space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Summary Variant</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="summary-variant">Summary Variant</Label>
                                <Select defaultValue="tournament-summary">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="tournament-summary">Tournament summary</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                               <div className="space-y-2">
                                 <Label>Enhanced Summary</Label>
                                 <div className="p-4 bg-muted rounded-md border">
                                   <pre className="whitespace-pre-wrap text-sm font-mono">
                                     {generateTournamentSummary(selectedTournament)}
                                   </pre>
                                 </div>
                               </div>

                               {(() => {
                                 const joinUrl = getTournamentJoinUrl(selectedTournament);
                                 return joinUrl ? (
                                   <div className="space-y-2">
                                     <Label>Join URL</Label>
                                     <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                                       <code className="flex-1 text-sm">{joinUrl}</code>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => {
                                           navigator.clipboard.writeText(joinUrl);
                                           toast({
                                             title: "Copied to clipboard",
                                             description: "Join URL copied successfully",
                                           });
                                         }}
                                       >
                                         <Copy className="h-4 w-4" />
                                       </Button>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => window.open(joinUrl, '_blank')}
                                       >
                                         Open
                                       </Button>
                                     </div>
                                   </div>
                                 ) : (
                                   <div className="space-y-2">
                                     <Label>Join URL</Label>
                                     <div className="p-3 bg-muted rounded-md border text-muted-foreground text-sm">
                                       Join URL unavailable
                                     </div>
                                   </div>
                                 );
                               })()}

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={copyTournamentSummary}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Summary
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={saveTournamentDynamicField}
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  Save as Dynamic Field
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                     </div>
                   )}

                  {lastResult.endpoint === 'matches' && Array.isArray(lastResult.raw) && lastResult.raw.length > 0 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Summary Variant</Label>
                        <Select value={selectedMatchesVariant} onValueChange={setSelectedMatchesVariant}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="competitive-open">Competitive — Open (1–3 players)</SelectItem>
                              <SelectItem value="competitive-open-1">Competitive — Open (1 player)</SelectItem>
                              <SelectItem value="competitive-open-2">Competitive — Open (2 players)</SelectItem>
                              <SelectItem value="competitive-open-3">Competitive — Open (3 players)</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Enhanced Summary</Label>
                        <div className="p-4 bg-muted rounded-md border">
                          <pre className="whitespace-pre-wrap text-sm font-mono">
                            {currentMatchesSummary}
                          </pre>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyMatchesSummary}
                          disabled={!currentMatchesSummary}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Summary
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveMatchesDynamicField}
                          disabled={!currentMatchesSummary}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save as Dynamic Field
                        </Button>
                      </div>

                        {matchesHyper && (
                        <div className="space-y-2 mt-4">
                          <Label>Supabase Hyper API (match IDs)</Label>
                          <div className="p-4 bg-background border rounded-md space-y-3">
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Final URL (Readable):</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigator.clipboard.writeText(matchesHyper.url)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy URL
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground break-all bg-muted p-2 rounded border">
                                {matchesHyper.url}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Method:</span>
                              <Badge variant="outline">{matchesHyper.method}</Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Request Body:</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigator.clipboard.writeText(JSON.stringify(matchesHyper.requestBody, null, 2))}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy JSON
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground bg-muted p-2 rounded border font-mono">
                                <pre>{JSON.stringify(matchesHyper.requestBody, null, 2)}</pre>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {matchesHyper.status.includes('OK') ? (
                                <Badge className="bg-green-500 text-white">{matchesHyper.status}</Badge>
                              ) : (
                                <Badge variant="destructive">{matchesHyper.status}</Badge>
                              )}
                            </div>

                            {matchesHyper.matchIds.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Match IDs ({matchesHyper.matchIds.length}):</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const idsText = matchesHyper.matchIds.join('\n');
                                      navigator.clipboard.writeText(idsText);
                                      toast({
                                        title: "Copied!",
                                        description: "Match IDs copied to clipboard"
                                      });
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy IDs
                                  </Button>
                                </div>
                                <div className="max-h-32 overflow-y-auto p-2 bg-muted rounded text-xs font-mono space-y-1">
                                  {matchesHyper.matchIds.map((id, index) => (
                                    <div key={index}>• {id}</div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No IDs returned for this range.
                              </div>
                            )}

                            {matchesHyper.error && (
                              <div className="text-sm text-red-600">
                                Error: {matchesHyper.error}
                              </div>
                            )}

                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="p-0 h-6 text-xs">
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Raw JSON Response
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(matchesHyper.raw, null, 2)}
                                </pre>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                      )}
                    </div>
                   )}

                  <Collapsible>
                   <CollapsibleTrigger asChild>
                     <Button variant="ghost" className="flex items-center gap-2 p-0">
                       <ChevronDown className="h-4 w-4" />
                       Raw JSON Response
                     </Button>
                   </CollapsibleTrigger>
                   <CollapsibleContent>
                     <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto max-h-96">
                       {JSON.stringify(lastResult.raw, null, 2)}
                     </pre>
                   </CollapsibleContent>
                 </Collapsible>

                <Button onClick={saveSnapshot} variant="outline" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Snapshot
                </Button>
              </CardContent>
            </Card>
           )}

        </TabsContent>
      </Tabs>
      
    </div>
  );
}
