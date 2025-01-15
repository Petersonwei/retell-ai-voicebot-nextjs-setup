// Define the event types for better type safety
export interface RetellEvents {
  'call_started': () => void;
  'call_ended': () => void;
  'error': (error: { message: string }) => void;
  'agent_start_talking': () => void;
  'agent_stop_talking': () => void;
  'audio': (audio: Float32Array) => void;
  'transcription': (message: { text: string }) => void;
  'update': (update: { 
    transcript?: TranscriptItem[];
    llmResponse?: string;
    response?: string | { content?: string; text?: string };
  }) => void;
  'metadata': (metadata: any) => void;
  'response': (message: { content: string }) => void;
}

interface TranscriptItem {
  role: string;
  content: string;
}

// Define RetellWebClient as a type instead of module augmentation
export type RetellWebClient = {
  agent_id?: string;
  access_token?: string;
  voice_id?: string;
  language?: string;
  sampleRate?: number;
  
  disconnect(): Promise<void>;
  initializeDevices(): Promise<void>;
  setVoiceConfig(config: { voice_id: string; language: string }): Promise<void>;
  startCall(config: { 
    accessToken: string;
    sampleRate?: number;
    captureDeviceId?: string;
    playbackDeviceId?: string;
    emitRawAudioSamples?: boolean;
  }): Promise<void>;
  stopCall(): Promise<void>;
  removeAllListeners(): RetellWebClient;
  addListener(event: string, listener: (...args: any[]) => void): RetellWebClient;
  on(event: string, listener: (...args: any[]) => void): RetellWebClient;
  once(event: string, listener: (...args: any[]) => void): RetellWebClient;
  emit(event: string, ...args: any[]): boolean;
}

// Declare the module without redefining the type
declare module "retell-client-js-sdk" {
  export const RetellWebClient: {
    new(): RetellWebClient;
  };
}