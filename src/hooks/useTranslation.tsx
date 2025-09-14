import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Language = 'english' | 'khmer' | 'chinese';

interface TranslationContextType {
  currentLanguage: Language;
  t: (key: string, params?: Record<string, string>) => string;
  setLanguage: (lang: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Fallback translations in case database is not available
const fallbackTranslations: Record<string, Record<Language, string>> = {
  'bus_departures': {
    english: 'Bus Departures',
    khmer: 'ការចេញដំណើររបស់ឡានក្រុង',
    chinese: '巴士发车时刻'
  },
  'departure_board': {
    english: 'DEPARTURE BOARD',
    khmer: 'ក្តារចេញដំណើរ',
    chinese: '发车信息板'
  },
  'destination': {
    english: 'DESTINATION',
    khmer: 'ទិសដៅ',
    chinese: '目的地'
  },
  'departure_time': {
    english: 'DEPARTURE',
    khmer: 'ពេលចេញ',
    chinese: '发车时间'
  },
  'plate_number': {
    english: 'PLATE',
    khmer: 'ផ្ទាំង',
    chinese: '车牌'
  },
  'fleet_type': {
    english: 'TYPE',
    khmer: 'ប្រភេទ',
    chinese: '车型'
  },
  'status': {
    english: 'STATUS',
    khmer: 'ស្ថានភាព',
    chinese: '状态'
  },
  'time': {
    english: 'Time',
    khmer: 'ពេលវេលា',
    chinese: '时间'
  },
  'monday': {
    english: 'Monday',
    khmer: 'ចន្ទ',
    chinese: '周一'
  },
  'tuesday': {
    english: 'Tuesday',
    khmer: 'អង្គារ',
    chinese: '周二'
  },
  'wednesday': {
    english: 'Wednesday',
    khmer: 'ពុធ',
    chinese: '周三'
  },
  'thursday': {
    english: 'Thursday',
    khmer: 'ព្រហស្បតិ៍',
    chinese: '周四'
  },
  'friday': {
    english: 'Friday',
    khmer: 'សុក្រ',
    chinese: '周五'
  },
  'saturday': {
    english: 'Saturday',
    khmer: 'សៅរ៍',
    chinese: '周六'
  },
  'sunday': {
    english: 'Sunday',
    khmer: 'អាទិត្យ',
    chinese: '周日'
  },
  'january': {
    english: 'January',
    khmer: 'មករា',
    chinese: '一月'
  },
  'february': {
    english: 'February',
    khmer: 'កុម្ភៈ',
    chinese: '二月'
  },
  'march': {
    english: 'March',
    khmer: 'មីនា',
    chinese: '三月'
  },
  'april': {
    english: 'April',
    khmer: 'មេសា',
    chinese: '四月'
  },
  'may': {
    english: 'May',
    khmer: 'ឧសភា',
    chinese: '五月'
  },
  'june': {
    english: 'June',
    khmer: 'មិថុនា',
    chinese: '六月'
  },
  'july': {
    english: 'July',
    khmer: 'កក្កដា',
    chinese: '七月'
  },
  'august': {
    english: 'August',
    khmer: 'សីហា',
    chinese: '八月'
  },
  'september': {
    english: 'September',
    khmer: 'កញ្ញា',
    chinese: '九月'
  },
  'october': {
    english: 'October',
    khmer: 'តុលា',
    chinese: '十月'
  },
  'november': {
    english: 'November',
    khmer: 'វិច្ឆិកា',
    chinese: '十一月'
  },
  'december': {
    english: 'December',
    khmer: 'ធ្នូ',
    chinese: '十二月'
  },
  'current_time': {
    english: 'Current Time',
    khmer: 'ពេលវេលាបច្ចុប្បន្ន',
    chinese: '当前时间'
  },
  'powered_by': {
    english: 'Powered by TTS Lab',
    khmer: 'បើកដំណើរការដោយ TTS Lab',
    chinese: '由TTS实验室提供支持'
  },
  'loading_departures': {
    english: 'Loading departures...',
    khmer: 'កំពុងផ្ទុកការចេញដំណើរ...',
    chinese: '加载出发信息...'
  },
  'now': {
    english: 'Now',
    khmer: 'ឥឡូវ',
    chinese: '现在'
  },
  'minutes': {
    english: 'min',
    khmer: 'នាទី',
    chinese: '分钟'
  },
  'hours': {
    english: 'h',
    khmer: 'ម៉ោង',
    chinese: '小时'
  },
  'plate': {
    english: 'Plate',
    khmer: 'ផ្ទាំង',
    chinese: '车牌'
  },
  'estimated': {
    english: 'Est.',
    khmer: 'ប៉ាន់ស្មាន',
    chinese: '预计'
  },
  'no_departures': {
    english: 'No departures scheduled',
    khmer: 'គ្មានការចេញដំណើរកំណត់ពេល',
    chinese: '暂无班次安排'
  }
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider = ({ children }: TranslationProviderProps) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
  const [dbTranslations, setDbTranslations] = useState<Record<string, Record<Language, string>>>({});

  // Fetch translations from database
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const { data, error } = await supabase
          .from('static_translations')
          .select('translation_key, english, khmer, chinese');

        if (error) {
          console.error('Error fetching translations:', error);
          return;
        }

        const translationsMap: Record<string, Record<Language, string>> = {};
        data?.forEach(item => {
          translationsMap[item.translation_key] = {
            english: item.english,
            khmer: item.khmer,
            chinese: item.chinese
          };
        });

        setDbTranslations(translationsMap);
      } catch (error) {
        console.error('Error loading translations:', error);
      }
    };

    fetchTranslations();
  }, []);

  // Auto-switch languages every 15 seconds
  useEffect(() => {
    const languages: Language[] = ['english', 'khmer', 'chinese'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % languages.length;
      setCurrentLanguage(languages[currentIndex]);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const t = (key: string, params?: Record<string, string>): string => {
    // Try database translations first, fallback to hardcoded ones
    const translation = dbTranslations[key]?.[currentLanguage] || 
                       fallbackTranslations[key]?.[currentLanguage] || 
                       key;
    
    if (!params) return translation;
    
    // Replace parameters in the translation
    return Object.entries(params).reduce((text, [param, value]) => {
      return text.replace(new RegExp(`{${param}}`, 'g'), value);
    }, translation);
  };

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
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