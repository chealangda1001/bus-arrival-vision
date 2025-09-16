// Time formatting utility with Khmer translations
export const formatTimeWithKhmerPeriods = (time24: string): string => {
  try {
    // Parse the time (format: HH:MM or HH:MM:SS)
    const [hours, minutes] = time24.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn('Invalid time format:', time24);
      return time24; // Return original if invalid
    }
    
    // Convert to 12-hour format
    let displayHours = hours;
    let period = '';
    
    if (hours === 0) {
      displayHours = 12;
      period = 'AM';
    } else if (hours < 12) {
      period = 'AM';
    } else if (hours === 12) {
      period = 'PM';
    } else {
      displayHours = hours - 12;
      period = 'PM';
    }
    
    // Format time string
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')}`;
    
    // Translate period to Khmer based on time ranges
    let khmerPeriod = '';
    if (period === 'AM') {
      khmerPeriod = 'ព្រឹក'; // Morning
    } else {
      // PM periods based on time ranges
      if (hours >= 12 && hours < 17) { // 12:00 PM - 4:59 PM
        khmerPeriod = 'រសៀល'; // Afternoon
      } else if (hours >= 17 && hours < 20) { // 5:00 PM - 7:59 PM
        khmerPeriod = 'ល្ងាច'; // Evening
      } else { // 8:00 PM - 11:59 PM, and early morning hours handled above
        khmerPeriod = 'យប់'; // Night
      }
    }
    
    console.log(`Time formatting: ${time24} -> ${formattedTime} ${period} (Khmer: ${khmerPeriod})`);
    
    return `${formattedTime} ${khmerPeriod}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time24; // Return original on error
  }
};

// Format time for English (standard 12-hour format)
export const formatTimeEnglish = (time24: string): string => {
  try {
    const [hours, minutes] = time24.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return time24;
    }
    
    let displayHours = hours;
    let period = 'AM';
    
    if (hours === 0) {
      displayHours = 12;
    } else if (hours >= 12) {
      period = 'PM';
      if (hours > 12) {
        displayHours = hours - 12;
      }
    }
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.error('Error formatting English time:', error);
    return time24;
  }
};

// Format time for Chinese (using Chinese characters)
export const formatTimeChinese = (time24: string): string => {
  try {
    const [hours, minutes] = time24.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return time24;
    }
    
    let displayHours = hours;
    let period = '上午'; // AM
    
    if (hours === 0) {
      displayHours = 12;
    } else if (hours >= 12) {
      period = '下午'; // PM
      if (hours > 12) {
        displayHours = hours - 12;
      }
    }
    
    return `${period}${displayHours}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error formatting Chinese time:', error);
    return time24;
  }
};