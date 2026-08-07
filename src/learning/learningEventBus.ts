export type LearningEventType =
  | 'WORD_VIEWED'
  | 'WORD_CORRECT'
  | 'WORD_WRONG'
  | 'GRAMMAR_ERROR'
  | 'SPEECH_ATTEMPT'
  | 'PRONUNCIATION_ERROR'
  | 'EXERCISE_COMPLETED';

export interface LearningEvent {
  id: string;
  type: LearningEventType;
  topicOrWordId?: string;
  skillCategory: 'vocabulary' | 'grammar' | 'speaking' | 'pronunciation' | 'listening';
  severityOrScore?: number; // 0 - 1
  detailsFa?: string;
  timestamp: string;
}

export type EventListener = (event: LearningEvent) => void;

export class LearningEventBus {
  private listeners: Map<LearningEventType | '*', Set<EventListener>> = new Map();
  private eventHistory: LearningEvent[] = [];

  public subscribe(eventType: LearningEventType | '*', listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  public emit(event: Omit<LearningEvent, 'id' | 'timestamp'>): void {
    const fullEvent: LearningEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > 200) {
      this.eventHistory.shift(); // keep last 200 events
    }

    // Trigger specific listeners
    const specific = this.listeners.get(event.type);
    if (specific) {
      specific.forEach((cb) => cb(fullEvent));
    }

    // Trigger wildcard listeners
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach((cb) => cb(fullEvent));
    }
  }

  public getHistory(): LearningEvent[] {
    return [...this.eventHistory];
  }

  public getWeaknessReport(): { category: string; count: number; recentErrorFa?: string }[] {
    const errors = this.eventHistory.filter(
      (e) => e.type === 'GRAMMAR_ERROR' || e.type === 'WORD_WRONG' || e.type === 'PRONUNCIATION_ERROR'
    );

    const map = new Map<string, { count: number; lastError?: string }>();
    errors.forEach((e) => {
      const existing = map.get(e.skillCategory) || { count: 0 };
      map.set(e.skillCategory, {
        count: existing.count + 1,
        lastError: e.detailsFa || existing.lastError,
      });
    });

    return Array.from(map.entries()).map(([category, val]) => ({
      category,
      count: val.count,
      recentErrorFa: val.lastError,
    }));
  }
}

export const learningEventBus = new LearningEventBus();
