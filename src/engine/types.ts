// Tipurile modelului V0 (plan.md §2). Fără dependențe de interfață, HTTP sau bază de date.

export type RoomType = 'auditorium' | 'seminar' | 'lab';
export type ActivityType = 'lecture' | 'seminar' | 'lab' | 'event' | 'exam' | 'other';

/** Grila perechilor (D15). `index` începe de la 1. */
export interface Grid {
  periods: { index: number; start: string; end: string }[];
}

/** Sala, cu echipamentele minime (P13). Pentru laboratoare, capacitatea = numărul de locuri de lucru. */
export interface Room {
  id: string;
  type: RoomType;
  capacity: number;
  computers: number;
  projector: boolean;
  board: boolean;
}

/**
 * Flux, grupă sau subgrupă (D21). `parent` leagă subgrupa de grupă și grupa de flux.
 * `size` se declară doar pe unitatea cea mai mică (fără copii).
 */
export interface Unit {
  id: string;
  parent?: string;
  size?: number;
}

/** Cerințele de sală ale unei activități (D05, P13). */
export interface Needs {
  /** Tipurile de sală acceptabile. */
  roomTypes: RoomType[];
  minComputers?: number;
  projector?: boolean;
  board?: boolean;
}

/**
 * - movable: poate fi mutată în altă sală, la aceeași oră (P04);
 * - frozen: în orizontul înghețat, nu se mută;
 * - fixed: doar evenimente și examene (D19); nu se mută, cu excepția închiderii sălii pentru reparații.
 */
export type BookingStatus = 'movable' | 'frozen' | 'fixed';

export interface Request {
  id: string;
  teacher: string;
  /** Unitățile participante (flux, grupe sau subgrupe), D21. */
  units: string[];
  activity: ActivityType;
  needs: Needs;
  /** Data, ISO `YYYY-MM-DD`. Rezervări pe o singură dată (D16). */
  date: string;
  /** Prima pereche (1..7). Cu interval: prima pereche acceptabilă. */
  start: number;
  /** Numărul de perechi consecutive (blocul, D06). */
  length: number;
  /**
   * Cererea cu interval (P11, D29, Lotul 4): ultima pereche acceptabilă. Blocul poate începe la orice pereche
   * între `start` și `latest − length + 1`; motorul alege și perechea (ordinea D31). Fără `latest`: ora este fixă.
   */
  latest?: number;
  /** Doar pentru excepții (recuperare parțială, activitate fără grupă); ≤ mărimea unităților (D21). */
  declaredStudents?: number;
  /** Implicit `movable`; `fixed` doar pentru evenimente și examene (D19). */
  status?: BookingStatus;
}

export interface Booking {
  id: string;
  teacher: string;
  units: string[];
  activity: ActivityType;
  needs: Needs;
  date: string;
  start: number;
  length: number;
  students: number;
  roomId: string;
  status: BookingStatus;
  /** Părțile unui bloc rupt (D20) au același `blockId`; ruperea cere acordul profesorului. */
  blockId?: string;
  splitApproved?: boolean;
}

/** Închiderea unei săli pe un interval de date, inclusiv capetele. */
export interface Closure {
  roomId: string;
  from: string;
  to: string;
  reason: 'repair' | 'other';
}

export interface Instance {
  grid: Grid;
  rooms: Room[];
  units: Unit[];
  /** Orizontul de date în care se caută alternative. */
  dates: string[];
}

export interface State {
  bookings: Booking[];
  closures: Closure[];
}
