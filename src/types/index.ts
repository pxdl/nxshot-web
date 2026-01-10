export interface GameIds {
  [key: string]: string;
}

export interface Screenshot {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  gameid: string;
  gamename: string;
}
