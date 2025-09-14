import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation, Language } from './useTranslation';

interface TranslatedDestination {
  id: string;
  destination_english: string;
  destination_khmer: string;
  destination_chinese: string;
}

interface TranslatedStatus {
  status_key: string;
  status_english: string;
  status_khmer: string;
  status_chinese: string;
}

interface TranslatedFleetType {
  fleet_type_key: string;
  fleet_type_english: string;
  fleet_type_khmer: string;
  fleet_type_chinese: string;
}

export const useTranslatedData = () => {
  const { currentLanguage } = useTranslation();
  const [translatedDestinations, setTranslatedDestinations] = useState<TranslatedDestination[]>([]);
  const [translatedStatuses, setTranslatedStatuses] = useState<TranslatedStatus[]>([]);
  const [translatedFleetTypes, setTranslatedFleetTypes] = useState<TranslatedFleetType[]>([]);

  // For now, we'll use hardcoded translations since we don't have translation tables
  // In a real implementation, you would fetch from database tables
  const getTranslatedDestination = (destination: string): string => {
    const destinationTranslations: Record<string, Record<Language, string>> = {
      'Phnom Penh': {
        english: 'Phnom Penh',
        khmer: 'ភ្នំពេញ',
        chinese: '金边'
      },
      'Siem Reap': {
        english: 'Siem Reap', 
        khmer: 'សៀមរាប',
        chinese: '暹粒'
      },
      'Battambang': {
        english: 'Battambang',
        khmer: 'បាត់ដំបង',
        chinese: '马德望'
      },
      'Kampong Thom': {
        english: 'Kampong Thom',
        khmer: 'កំពង់ធំ',
        chinese: '磅通'
      },
      'Poipet': {
        english: 'Poipet',
        khmer: 'ប៉ោយប៉ែត',
        chinese: '波贝'
      }
    };

    return destinationTranslations[destination]?.[currentLanguage] || destination;
  };

  const getTranslatedStatus = (status: string): string => {
    const statusTranslations: Record<string, Record<Language, string>> = {
      'on-time': {
        english: 'ON-TIME',
        khmer: 'ទាន់ពេល',
        chinese: '准时'
      },
      'delayed': {
        english: 'DELAYED',
        khmer: 'យឺតយ៉ាវ',
        chinese: '延误'
      },
      'boarding': {
        english: 'BOARDING',
        khmer: 'កំពុងឡើង',
        chinese: '登车中'
      },
      'departed': {
        english: 'DEPARTED',
        khmer: 'ចេញហើយ',
        chinese: '已出发'
      }
    };

    return statusTranslations[status]?.[currentLanguage] || status.toUpperCase();
  };

  const getTranslatedFleetType = (fleetType: string): string => {
    const fleetTypeTranslations: Record<string, Record<Language, string>> = {
      'VIP Van': {
        english: 'VIP Van',
        khmer: 'វីអាយភីវ៉ាន់',
        chinese: 'VIP面包车'
      },
      'Bus': {
        english: 'Bus',
        khmer: 'ឡានក្រុង',
        chinese: '巴士'
      },
      'Sleeping Bus': {
        english: 'Sleeping Bus',
        khmer: 'ឡានក្រុងគេង',
        chinese: '卧铺巴士'
      }
    };

    return fleetTypeTranslations[fleetType]?.[currentLanguage] || fleetType;
  };

  return {
    getTranslatedDestination,
    getTranslatedStatus,
    getTranslatedFleetType
  };
};