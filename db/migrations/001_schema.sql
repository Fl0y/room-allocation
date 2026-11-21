-- Schema bazei de date (Lotul 5a, D35). Același model ca motorul (src/engine/types.ts) și formatul intern
-- (info_pack/docs/data-format.md). Baza de date oprește singură, independent de cod:
--   H1 — două rezervări în aceeași sală, în aceeași zi, cu perechi suprapuse        (bookings_room_no_overlap)
--   H2 — același profesor în două locuri în același timp                              (bookings_teacher_no_overlap)
--   H3 — aceeași unitate atomică (subgrupă / grupă fără subgrupe) în două locuri      (booking_atoms_no_overlap)
--   H8 — o rezervare existentă se mută doar de sală, la aceeași oră; doar dacă e mutabilă (bookings_guard_update)
-- H4–H7 (capacitate, tip, echipamente, săli închise, blocuri) rămân în motor și în verificatorul independent.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE rooms (
  id        text PRIMARY KEY,
  name      text NOT NULL DEFAULT '',
  type      text NOT NULL CHECK (type IN ('auditorium', 'seminar', 'lab')),
  capacity  integer NOT NULL CHECK (capacity > 0),
  computers integer NOT NULL DEFAULT 0 CHECK (computers >= 0),
  projector boolean NOT NULL DEFAULT false,
  board     boolean NOT NULL DEFAULT false
);

-- Fluxuri, grupe, subgrupe (D21); mărimea doar pe unitatea cea mai mică.
CREATE TABLE units (
  id     text PRIMARY KEY,
  kind   text NOT NULL DEFAULT 'group' CHECK (kind IN ('flux', 'group', 'subgroup')),
  parent text REFERENCES units (id),
  size   integer CHECK (size > 0),
  name   text NOT NULL DEFAULT ''
);

-- Profesorii au doar pseudonime (D28).
CREATE TABLE teachers (
  id   text PRIMARY KEY,
  name text NOT NULL DEFAULT ''
);

-- Orizontul de date în care motorul caută alternative (Instance.dates).
CREATE TABLE calendar_days (
  day date PRIMARY KEY
);

CREATE TABLE closures (
  id       bigserial PRIMARY KEY,
  room_id  text NOT NULL REFERENCES rooms (id),
  from_day date NOT NULL,
  to_day   date NOT NULL,
  reason   text NOT NULL DEFAULT 'other' CHECK (reason IN ('repair', 'other')),
  CHECK (from_day <= to_day)
);

-- Perechile ca interval semi-deschis [prima, ultima + 1); grila are 7 perechi (D15).
CREATE TABLE bookings (
  id             text PRIMARY KEY,
  teacher        text REFERENCES teachers (id),
  units          text[] NOT NULL DEFAULT '{}',
  activity       text NOT NULL CHECK (activity IN ('lecture', 'seminar', 'lab', 'event', 'exam', 'other')),
  needs          jsonb NOT NULL,
  day            date NOT NULL,
  periods        int4range NOT NULL CHECK (NOT isempty(periods) AND lower(periods) >= 1 AND upper(periods) <= 8),
  students       integer NOT NULL CHECK (students > 0),
  room_id        text NOT NULL REFERENCES rooms (id),
  status         text NOT NULL DEFAULT 'movable' CHECK (status IN ('movable', 'frozen', 'fixed')),
  block_id       text,
  split_approved boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, day, periods),
  -- amânată până la COMMIT: un lanț de mutări (B → sala lui C, C → altă sală) e valid doar la final
  CONSTRAINT bookings_room_no_overlap EXCLUDE USING gist (room_id WITH =, day WITH =, periods WITH &&) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT bookings_teacher_no_overlap EXCLUDE USING gist (teacher WITH =, day WITH =, periods WITH &&)
);

-- Unitățile atomice ale fiecărei rezervări, completate automat de trigger; ziua și perechile sunt legate de
-- rezervare prin cheie străină, deci nu pot diverge.
CREATE TABLE booking_atoms (
  booking_id text NOT NULL,
  day        date NOT NULL,
  periods    int4range NOT NULL,
  atom_id    text NOT NULL REFERENCES units (id),
  PRIMARY KEY (booking_id, atom_id),
  FOREIGN KEY (booking_id, day, periods) REFERENCES bookings (id, day, periods) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT booking_atoms_no_overlap EXCLUDE USING gist (atom_id WITH =, day WITH =, periods WITH &&)
);

-- Unitățile atomice (fără copii) de sub unitățile date; UNION elimină dublurile și oprește ciclurile.
CREATE FUNCTION unit_atoms(ids text[]) RETURNS SETOF text
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE d(id) AS (
    SELECT unnest(ids)
    UNION
    SELECT u.id FROM units u JOIN d ON u.parent = d.id
  )
  SELECT d.id FROM d WHERE NOT EXISTS (SELECT 1 FROM units c WHERE c.parent = d.id)
$$;

CREATE FUNCTION bookings_fill_atoms() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(NEW.units) AS u(id) WHERE NOT EXISTS (SELECT 1 FROM units WHERE units.id = u.id)) THEN
    RAISE EXCEPTION 'rezervarea % are unități necunoscute', NEW.id USING ERRCODE = 'foreign_key_violation';
  END IF;
  INSERT INTO booking_atoms (booking_id, day, periods, atom_id)
    SELECT NEW.id, NEW.day, NEW.periods, a FROM unit_atoms(NEW.units) AS a;
  RETURN NULL;
END
$$;

CREATE TRIGGER bookings_atoms AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_fill_atoms();

CREATE FUNCTION bookings_guard_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.day <> OLD.day OR NEW.periods <> OLD.periods OR NEW.units IS DISTINCT FROM OLD.units
     OR NEW.teacher IS DISTINCT FROM OLD.teacher OR NEW.students <> OLD.students OR NEW.activity <> OLD.activity THEN
    RAISE EXCEPTION 'H8: rezervarea % se poate muta doar în altă sală, la aceeași oră și cu aceiași participanți', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.room_id <> OLD.room_id AND OLD.status <> 'movable' THEN
    RAISE EXCEPTION 'H8: rezervarea % are statutul % și nu se mută', OLD.id, OLD.status USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER bookings_guard BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_guard_update();

-- Cererile primite (idempotența, Lotul 5b): aceeași cheie → aceeași decizie, o singură rezervare.
CREATE TABLE requests (
  key        text PRIMARY KEY,
  payload    jsonb NOT NULL,
  outcome    text NOT NULL CHECK (outcome IN ('accepted', 'rejected')),
  decision   jsonb NOT NULL,
  booking_id text REFERENCES bookings (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
