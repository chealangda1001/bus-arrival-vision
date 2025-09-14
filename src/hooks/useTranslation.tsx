import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'english' | 'khmer' | 'chinese';

interface TranslationContextType {
  currentLanguage: Language;
  t: (key: string, params?: Record<string, string>) => string;
  setLanguage: (language: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Translation data
const translations = {
  english: {
    'bus_departures': 'Bus Departures',
    'loading_departures': 'Loading departures...',
    'branch_not_found': 'Branch not found',
    'destination': 'Destination:',
    'fleet_type': 'Fleet Type:',
    'plate': 'Plate:',
    'departure_time': 'Departure Time:',
    'status': 'Status:',
    'no_departures': 'No departures scheduled',
    'estimated': 'Est:',
    'now': 'Now',
    'minutes': 'mn',
    'hours': 'h',
    
    // Status translations
    'status_ontime': 'ON-TIME',
    'status_delayed': 'DELAYED',
    'status_boarding': 'BOARDING',
    'status_departed': 'DEPARTED',
    
    // Fleet types
    'fleet_vip_van': 'VIP Van',
    'fleet_bus': 'Bus',
    'fleet_sleeping_bus': 'Sleeping Bus',
    
    // Days of week
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday',
    
    // Months
    'january': 'January',
    'february': 'February',
    'march': 'March',
    'april': 'April',
    'may': 'May',
    'june': 'June',
    'july': 'July',
    'august': 'August',
    'september': 'September',
    'october': 'October',
    'november': 'November',
    'december': 'December',
  },
  
  khmer: {
    'bus_departures': 'កាលវិភាគឡានក្រុង',
    'loading_departures': 'កំពុងដោះស្រាយកាលវិភាគ...',
    'branch_not_found': 'រកមិនឃើញសាខា',
    'destination': 'ទិសដៅ:',
    'fleet_type': 'ប្រភេទយានជំនិះ:',
    'plate': 'លេខផ្ទាំង:',
    'departure_time': 'ម៉ោងចេញ:',
    'status': 'ស្ថានភាព:',
    'no_departures': 'មិនមានកាលវិភាគចេញ',
    'estimated': 'ប៉ាន់ស្មាន:',
    'now': 'ឥឡូវ',
    'minutes': 'នាទី',
    'hours': 'ម៉ោង',
    
    // Status translations
    'status_ontime': 'ទាន់ពេល',
    'status_delayed': 'យឺតយ៉ាវ',
    'status_boarding': 'កំពុងឡើង',
    'status_departed': 'ចេញហើយ',
    
    // Fleet types
    'fleet_vip_van': 'វីអាយភីវ៉ាន់',
    'fleet_bus': 'ឡានក្រុង',
    'fleet_sleeping_bus': 'ឡានក្រុងគេង',
    
    // Days of week
    'monday': 'ច័ន្ទ',
    'tuesday': 'អង្គារ',
    'wednesday': 'ពុធ',
    'thursday': 'ព្រហស្បតិ៍',
    'friday': 'សុក្រ',
    'saturday': 'សៅរ៍',
    'sunday': 'អាទិត្យ',
    
    // Months
    'january': 'មករា',
    'february': 'កុម្ភៈ',
    'march': 'មីនា',
    'april': 'មេសា',
    'may': 'ឧសភា',
    'june': 'មិថុនា',
    'july': 'កក្កដា',
    'august': 'សីហា',
    'september': 'កញ្ញា',
    'october': 'តុលា',
    'november': 'វិច្ឆិកា',
    'december': 'ធ្នូ',
  },
  
  chinese: {
    'bus_departures': '巴士班次',
    'loading_departures': '正在加载班次...',
    'branch_not_found': '找不到分支',
    'destination': '目的地:',
    'fleet_type': '车型:',
    'plate': '车牌:',
    'departure_time': '出发时间:',
    'status': '状态:',
    'no_departures': '暂无班次',
    'estimated': '预计:',
    'now': '现在',
    'minutes': '分钟', 
    'hours': '小时',
    
    // Status translations
    'status_ontime': '准时',
    'status_delayed': '延误',
    'status_boarding': '登车中',
    'status_departed': '已出发',
    
    // Fleet types
    'fleet_vip_van': 'VIP面包车',
    'fleet_bus': '巴士',
    'fleet_sleeping_bus': '卧铺巴士',
    
    // Days of week
    'monday': '星期一',
    'tuesday': '星期二',
    'wednesday': '星期三',
    'thursday': '星期四',
    'friday': '星期五',
    'saturday': '星期六',
    'sunday': '星期日',
    
    // Months
    'january': '一月',
    'february': '二月',
    'march': '三月',
    'april': '四月',
    'may': '五月',
    'june': '六月',
    'july': '七月',
    'august': '八月',
    'september': '九月',
    'october': '十月',
    'november': '十一月',
    'december': '十二月',
  }
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider = ({ children }: TranslationProviderProps) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');

  // Auto-switch languages every 15 seconds
  useEffect(() => {
    const languages: Language[] = ['english', 'khmer', 'chinese'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % languages.length;
      setCurrentLanguage(languages[currentIndex]);
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  const t = (key: string, params?: Record<string, string>): string => {
    let translation = translations[currentLanguage][key as keyof typeof translations['english']] || key;
    
    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{${param}}`, value);
      });
    }
    
    return translation;
  };

  const setLanguage = (language: Language) => {
    setCurrentLanguage(language);
  };

  return (
    <TranslationContext.Provider value={{ currentLanguage, t, setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};