export interface CaptureIds {
  [key: string]: string;
}

export interface Screenshot {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  captureId: string;
  gameName: string;
}

export interface ParsedFile {
  file: File;
  screenshot: Screenshot;
}

export interface GameGroup {
  gameName: string;
  files: ParsedFile[];
}

export interface SourceMetadata {
  count: number;
  fetchedAt: string;
  sourceUpdatedAt: string | null;
}

export type FolderStructure =
  | "by-game"
  | "by-date"
  | "by-game-date"
  | "flat-renamed";

export interface CaptureIdsMetadata {
  totalCount: number;
  generatedAt: string;
  sources: {
    switchbrew?: SourceMetadata;
    nswdb?: SourceMetadata;
    titledb?: SourceMetadata;
  };
}
