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
  const [dbDestinations, setDbDestinations] = useState<Record<string, Record<Language, string>>>({});
  const [dbStatuses, setDbStatuses] = useState<Record<string, Record<Language, string>>>({});
  const [dbFleetTypes, setDbFleetTypes] = useState<Record<string, Record<Language, string>>>({});

  // Fetch translations from database
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        // Fetch destination translations
        const { data: destinations } = await supabase
          .from('destination_translations')
          .select('destination_key, english, khmer, chinese');

        const destMap: Record<string, Record<Language, string>> = {};
        destinations?.forEach(item => {
          destMap[item.destination_key] = {
            english: item.english,
            khmer: item.khmer,
            chinese: item.chinese
          };
        });
        setDbDestinations(destMap);

        // Fetch status translations
        const { data: statuses } = await supabase
          .from('status_translations')
          .select('status_key, english, khmer, chinese');

        const statusMap: Record<string, Record<Language, string>> = {};
        statuses?.forEach(item => {
          statusMap[item.status_key] = {
            english: item.english,
            khmer: item.khmer,
            chinese: item.chinese
          };
        });
        setDbStatuses(statusMap);

        // Fetch fleet type translations
        const { data: fleetTypes } = await supabase
          .from('fleet_type_translations')
          .select('fleet_type_key, english, khmer, chinese');

        const fleetMap: Record<string, Record<Language, string>> = {};
        fleetTypes?.forEach(item => {
          fleetMap[item.fleet_type_key] = {
            english: item.english,
            khmer: item.khmer,
            chinese: item.chinese
          };
        });
        setDbFleetTypes(fleetMap);

      } catch (error) {
        console.error('Error fetching translations:', error);
      }
    };

    fetchTranslations();
  }, []);

  // Fallback hardcoded translations
  const getTranslatedDestination = (destination: string): string => {
    // Try database first, fallback to hardcoded
    if (dbDestinations[destination]?.[currentLanguage]) {
      return dbDestinations[destination][currentLanguage];
    }

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
    // Try database first, fallback to hardcoded
    if (dbStatuses[status]?.[currentLanguage]) {
      return dbStatuses[status][currentLanguage];
    }

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
    // Try database first, fallback to hardcoded
    if (dbFleetTypes[fleetType]?.[currentLanguage]) {
      return dbFleetTypes[fleetType][currentLanguage];
    }

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