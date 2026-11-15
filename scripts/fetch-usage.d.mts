export interface ParsedTournament {
  name: string;
  date: string | null;
  players: number;
  url: string;
  ok: boolean;
  sum: number;
  decks: Record<string, number>;
}
export function parseArticle(
  raw: string,
  url: string,
): {title: string; tournaments: ParsedTournament[]; links: string[]};
export function parseClabo(
  raw: string,
  year: number,
): {deck: string; main: string; date: string; players: number}[];
export function parsePortal(raw: string): {
  decks: number;
  from: string;
  to: string;
  rows: {name: string; count: number; share: number}[];
};
