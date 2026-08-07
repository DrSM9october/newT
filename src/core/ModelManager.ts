export interface OfflineModelManifest {
  id: string;
  name: string;
  type: 'asr' | 'nlp' | 'tts';
  language: string;
  dialect?: string;
  version: string;
  sizeMB: number;
  isInstalled: boolean;
  downloadProgress?: number; // 0 to 100
  checksum: string;
}

export class ModelManager {
  private models: OfflineModelManifest[] = [
    {
      id: 'vosk-en-us-small',
      name: 'Vosk English US Light Model',
      type: 'asr',
      language: 'en',
      dialect: 'en-US',
      version: '1.2.0',
      sizeMB: 48,
      isInstalled: true,
      checksum: 'sha256_8a91b2c',
    },
    {
      id: 'vosk-ar-iq-small',
      name: 'Vosk Arabic (Iraqi Dialect)',
      type: 'asr',
      language: 'ar',
      dialect: 'ar-IQ',
      version: '1.0.4',
      sizeMB: 62,
      isInstalled: false,
      checksum: 'sha256_7c22e11',
    },
    {
      id: 'local-nlp-fa-en',
      name: 'Persian-English Rule NLP Engine',
      type: 'nlp',
      language: 'en-fa',
      version: '2.5.1',
      sizeMB: 12,
      isInstalled: true,
      checksum: 'sha256_1f98d00',
    },
  ];

  public getModels(): OfflineModelManifest[] {
    return [...this.models];
  }

  public installModel(modelId: string, onProgress?: (p: number) => void): Promise<boolean> {
    return new Promise((resolve) => {
      const idx = this.models.findIndex((m) => m.id === modelId);
      if (idx === -1) return resolve(false);

      let p = 0;
      const interval = setInterval(() => {
        p += 20;
        this.models[idx].downloadProgress = p;
        if (onProgress) onProgress(p);

        if (p >= 100) {
          clearInterval(interval);
          this.models[idx].isInstalled = true;
          this.models[idx].downloadProgress = undefined;
          resolve(true);
        }
      }, 150);
    });
  }

  public removeModel(modelId: string): boolean {
    const idx = this.models.findIndex((m) => m.id === modelId);
    if (idx !== -1) {
      this.models[idx].isInstalled = false;
      return true;
    }
    return false;
  }
}

export const modelManager = new ModelManager();
