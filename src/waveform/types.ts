// waveform/types.ts — Shared types for the waveform viewer

export interface WaveformSignal {
  id: string;
  displayName: string;
  group: string;           // module name for hierarchy
  type: 'boolean' | 'numeric' | 'enum' | 'assertion' | 'coverage';
  visible: boolean;
  color: string;
  renderMode: 'analog' | 'digital';  // analog = line chart, digital = step/VCD
}

export interface WaveformMarker {
  id: 'A' | 'B';
  timestamp: number;
  color: string;
}

export interface SearchMatch {
  timestamp: number;
  signalId: string;
  value: any;
}

export interface WaveformState {
  signals: WaveformSignal[];
  viewStart: number;
  viewEnd: number;
  viewInitialized: boolean;
  userInteracted: boolean;
  markers: WaveformMarker[];
  cursorX: number;
  searchQuery: string;
  searchMatches: SearchMatch[];
  searchIndex: number;
}

export const COLORS = [
  '#6ee7f9', // cyan (primary)
  '#72f1b8', // green
  '#a78bfa', // purple
  '#ff5d8f', // pink
  '#f8d66d', // yellow
  '#5b9bd5', // blue
  '#e8915a', // orange
  '#c084fc', // lavender
];

export const ROW_H = 56;
export const LABEL_W = 120;
export const HEADER_H = 32;
