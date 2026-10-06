import type { Person } from "./people";

/** What the table asks for: one page, in an order. */
export type PeopleRequest = { pageIndex: number; pageSize: number; sorting: { id: string; desc: boolean }[] };

/** One page of people, and how many there are across all pages. */
export type PeoplePage = { rows: Person[]; total: number };

const GIVEN = ["Lena", "Omar", "Sofia", "Yuki", "Amir", "Chloe", "Jonas", "Priya"];
const FAMILY = ["Park", "Haddad", "Reyes", "Tanaka", "Nasser", "Martin"];
const ROLES = ["Engineer", "Designer", "Manager", "Analyst", "Support"];
const TEAMS = ["Platform", "Product", "Payments", "Growth", "Care"];
const STATUSES = ["Active", "Active", "Away", "Active", "On leave"];

const twoDigits = (value: number) => String(value).padStart(2, "0");

/** 48 people, built from their position so every request sees the same ones. */
const PEOPLE: Person[] = GIVEN.flatMap((given, givenIndex) =>
  FAMILY.map((family, familyIndex) => {
    const index = givenIndex * FAMILY.length + familyIndex;
    return {
      id: String(index + 1),
      name: `${given} ${family}`,
      role: ROLES[(index * 3) % ROLES.length]!,
      team: TEAMS[(index * 7) % TEAMS.length]!,
      status: STATUSES[(index * 2 + givenIndex) % STATUSES.length]!,
      joined: `${2018 + (index % 7)}-${twoDigits(1 + ((index * 5) % 12))}-${twoDigits(1 + ((index * 11) % 28))}`,
    };
  }),
);

/** Waits `ms`, and rejects with an `AbortError` as soon as the signal aborts. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancelled = () => new DOMException("The request was cancelled.", "AbortError");
    if (signal?.aborted) return reject(cancelled());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(cancelled());
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** Orders two people by the sorted columns, first column first; ties keep the stored order. */
function compare(a: Person, b: Person, sorting: PeopleRequest["sorting"]): number {
  for (const { id, desc } of sorting) {
    const left = a[id as keyof Person];
    const right = b[id as keyof Person];
    if (left !== right) return (left < right ? -1 : 1) * (desc ? -1 : 1);
  }
  return 0;
}

/**
 * A stand-in for a paged endpoint: it sorts all 48 people by `sorting`, then
 * answers the page asked for and the total, after 300 milliseconds. It stops
 * as soon as `signal` aborts, and rejects when `fail` is set, the way a
 * server that is down would.
 */
export async function fetchPeople(
  { pageIndex, pageSize, sorting }: PeopleRequest,
  { signal, fail = false }: { signal?: AbortSignal; fail?: boolean } = {},
): Promise<PeoplePage> {
  await wait(300, signal);
  if (fail) throw new Error("The server did not answer.");
  const sorted = sorting.length === 0 ? PEOPLE : [...PEOPLE].sort((a, b) => compare(a, b, sorting));
  const start = pageIndex * pageSize;
  return { rows: sorted.slice(start, start + pageSize), total: PEOPLE.length };
}
