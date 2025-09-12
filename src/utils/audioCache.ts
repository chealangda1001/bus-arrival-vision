// IndexedDB-based audio cache for offline playback
class AudioCacheManager {
  private dbName = 'AnnouncementCache';
  private dbVersion = 1;
  private storeName = 'audioFiles';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'cacheKey' });
          store.createIndex('expires', 'expires', { unique: false });
        }
      };
    });
  }

  async get(cacheKey: string): Promise<string | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(cacheKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expires > Date.now()) {
          resolve(result.audioData);
        } else {
          // Clean up expired entry
          if (result) this.delete(cacheKey);
          resolve(null);
        }
      };
    });
  }

  async set(cacheKey: string, audioData: string, ttlHours = 168): Promise<void> { // 7 days default
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const expires = Date.now() + (ttlHours * 60 * 60 * 1000);
      
      const request = store.put({
        cacheKey,
        audioData,
        expires,
        timestamp: Date.now()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(cacheKey: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(cacheKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearExpired(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('expires');
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Audio playback queue for sequential announcements
export class AudioQueue {
  private queue: HTMLAudioElement[] = [];
  private isPlaying = false;
  private currentIndex = 0;

  async addToQueue(base64Audio: string): Promise<void> {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    this.queue.push(audio);
    
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (this.currentIndex >= this.queue.length) {
      this.isPlaying = false;
      this.queue = [];
      this.currentIndex = 0;
      return;
    }

    this.isPlaying = true;
    const audio = this.queue[this.currentIndex];
    
    return new Promise((resolve) => {
      audio.onended = () => {
        this.currentIndex++;
        this.playNext().then(resolve);
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.currentIndex++;
        this.playNext().then(resolve);
      };
      
      audio.play().catch((error) => {
        console.error('Audio play error:', error);
        this.currentIndex++;
        this.playNext().then(resolve);
      });
    });
  }

  stop(): void {
    this.queue.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.queue = [];
    this.currentIndex = 0;
    this.isPlaying = false;
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}

// Generate cache key for announcement
export const generateCacheKey = (text: string, language: string, operatorId: string): string => {
  try {
    // Use a simple hash approach to avoid encoding issues with non-Latin characters
    const input = `${text}_${language}_${operatorId}_nova`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff;
    }
    return btoa(`cache_${Math.abs(hash)}_${language}_${operatorId}`);
  } catch (error) {
    console.error('Error generating cache key:', error);
    // Fallback to a time-based key
    const fallbackKey = `${language}_${operatorId}_${text.length}_${Date.now()}`;
    return btoa(fallbackKey);
  }
};

// Singleton instance
export const audioCache = new AudioCacheManager();

// Initialize cache when module loads
audioCache.init().catch(console.error);

// Clean up expired entries periodically
setInterval(() => {
  audioCache.clearExpired().catch(console.error);
}, 60 * 60 * 1000); // Every hour