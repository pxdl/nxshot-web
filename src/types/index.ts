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
