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
