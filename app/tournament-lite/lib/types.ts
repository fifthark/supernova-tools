// Tournament Lite — shapes returned by the FifthArk proxy (/api/tournament-lite/*).
// Sheet values arrive as strings or numbers; components coerce as needed.

export interface SettingRow {
  Key: string;
  Value?: string | number;
  Updated_At?: string;
}

export interface Category {
  Category_ID: string;
  Category_Name?: string;
  Event_Code?: string;
  Pool_Size?: string | number;
  Match_Duration_Minutes?: string | number;
  Buffer_Minutes?: string | number;
  Start_Time?: string;
  End_Time?: string;
  Court_Whitelist?: string;
  Display_Order?: string | number;
  Status?: string;
}

export interface Entry {
  Entry_ID: string;
  Category_ID: string;
  Entry_Name?: string;
  Member_1?: string;
  Member_2?: string;
  Member_3?: string;
  Member_4?: string;
  Entry_Display_Name?: string;
  Seed?: string | number;
  Pool_ID?: string;
  Status?: string;
  Display_Order?: string | number;
}

export interface Pool {
  Pool_ID: string;
  Category_ID: string;
  Pool_Name: string;
  Entry_Count?: string | number;
}

export interface Match {
  Match_ID: string;
  Category_ID: string;
  Pool_ID: string;
  Round_No?: string | number;
  Match_No?: string | number;
  Entry1_ID?: string;
  Entry2_ID?: string;
  Entry1_Name?: string;
  Entry2_Name?: string;
  Is_Bye?: string | boolean;
  Court?: string;
  Start_Time?: string;
  End_Time?: string;
  Status?: string;
  Score1?: string | number;
  Score2?: string | number;
  Winner_Entry_ID?: string;
}

export interface LeaderRow {
  Category_ID: string;
  Pool_ID: string;
  Entry_ID: string;
  Entry_Name?: string;
  Played?: string | number;
  Wins?: string | number;
  Losses?: string | number;
  Points?: string | number;
  Points_For?: string | number;
  Points_Against?: string | number;
  Point_Diff?: string | number;
  Rank?: string | number;
}

export interface TournamentState {
  ok: boolean;
  reason?: string;
  message?: string;
  settings?: SettingRow[];
  categories?: Category[];
  entries?: Entry[];
  pools?: Pool[];
  matches?: Match[];
  leaderboard?: LeaderRow[];
  meta?: { schemaVersion?: number; engineVersion?: string; generatedAt?: string };
}

export interface PublicCategory {
  id: string;
  name: string;
  code?: string;
  entries: number;
  total: number;
  completed: number;
  pct: number;
  overflow: number;
  startTime?: string;
  endTime?: string;
}

export interface PublicBoard {
  ok: boolean;
  reason?: string;
  message?: string;
  event?: { name?: string; date?: string; venue?: string };
  categories?: PublicCategory[];
  selectedCategoryId?: string;
  matches?: Match[];
  leaderboard?: LeaderRow[];
  lastUpdated?: string;
}

export interface ActionResult {
  ok: boolean;
  reason?: string;
  message?: string;
  match?: Match;
  leaderboard?: LeaderRow[];
  counts?: { matches?: number; overflowMatches?: number; [k: string]: unknown };
  warnings?: unknown[];
}
