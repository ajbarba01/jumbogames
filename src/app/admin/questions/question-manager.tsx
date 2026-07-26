/**
 * Client manager for the /admin/questions surface: the question bank as a
 * bordered list under a search row (debounced prompt search, difficulty
 * filter, new-question action), with skeleton, empty, no-match and error
 * states, per-row edit/delete actions, and a range-and-pager footer. Filtering
 * and paging are server-side, and every mutation re-fetches the current page
 * so the API stays the source of truth.
 */
"use client";

import { useEffect, useState } from "react";
import { Button, Select, SkeletonRows, StatusLine, TextField } from "@jumbo/ui";
import { QUESTIONS_PAGE_SIZE } from "@/lib/schemas/trivia";
import { DeleteQuestionDialog } from "./delete-question-dialog";
import { QuestionEditor } from "./question-editor";
import {
  ANY_DIFFICULTY,
  DIFFICULTY_FILTERS,
  readError,
  type DifficultyFilter,
  type Question,
} from "./types";

const SEARCH_DEBOUNCE_MS = 300;

/** The filter a set of results was fetched under — `null` means unfiltered.
 *  The live inputs change a render before the matching rows arrive, so the
 *  list's own states must read this, never `query`/`difficulty` directly. */
interface ResultsFilter {
  query: string;
  difficulty: DifficultyFilter;
}

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; question: Question }
  | { mode: "delete"; question: Question };

export function QuestionManager(): React.JSX.Element {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(QUESTIONS_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [difficulty, setDifficulty] =
    useState<DifficultyFilter>(ANY_DIFFICULTY);
  const [resultsFilter, setResultsFilter] = useState<ResultsFilter | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      setLoading(true);
      setLoadError(null);
      // The filter this request carries, captured before it is sent so the
      // results can be labelled with the filter that actually produced them.
      const requestFilter: ResultsFilter | null =
        debouncedQuery !== "" || difficulty !== ANY_DIFFICULTY
          ? { query: debouncedQuery, difficulty }
          : null;
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedQuery) params.set("q", debouncedQuery);
      // The sentinel is client-side only: the API accepts the three real
      // levels and rejects anything else, so "any" means omit the param.
      if (difficulty !== ANY_DIFFICULTY) params.set("difficulty", difficulty);

      try {
        const res = await fetch(`/api/admin/questions?${params.toString()}`);
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(
            await readError(res, "Couldn’t load the question bank."),
          );
          setLoading(false);
          return;
        }
        const data = (await res.json()) as {
          questions: Question[];
          total: number;
          pageSize: number;
        };
        if (cancelled) return;
        const newPageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (page > newPageCount) {
          setLoading(false);
          setPage(newPageCount);
          return;
        }
        setQuestions(data.questions);
        setTotal(data.total);
        setPageSize(data.pageSize);
        setResultsFilter(requestFilter);
        setLoaded(true);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLoadError("Couldn’t load the question bank.");
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, difficulty, page, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const refetch = (): void => setRefreshKey((k) => k + 1);

  /** Drop every filter in one batch, so the surface makes one request rather
   *  than one now and another when the debounce catches up. */
  function clearFilters(): void {
    setQuery("");
    setDebouncedQuery("");
    setDifficulty(ANY_DIFFICULTY);
    setPage(1);
  }

  // A narrowed result renumbers the pages, so changing the filter goes back to
  // page 1 — the same reset the search debounce does for the query.
  function changeDifficulty(next: DifficultyFilter): void {
    setDifficulty(next);
    setPage(1);
  }

  function closeAfterMutation(): void {
    setModal(null);
    refetch();
  }

  // Filtering and paging are both server-side, so `total` is the filtered
  // total across every page — not the length of the page on screen.
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = (page - 1) * pageSize + questions.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Peers of similar weight, so the row wraps rather than shrinking a
          control past the point where it loses meaning (docs/UI.md, fluid
          law): the basis is the width below which the search placeholder and
          the filter's own value stop being readable, so at the floor each
          control takes its own line instead of both truncating to nothing. */}
      <div className="flex flex-wrap items-stretch gap-3">
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search questions"
          placeholder="Search prompts"
          className="min-w-0 flex-1 basis-40"
          disabled={loadError !== null}
        />
        <Select
          options={DIFFICULTY_FILTERS}
          value={difficulty}
          onChange={(v) => changeDifficulty(v as DifficultyFilter)}
          size="field"
          disabled={loadError !== null}
          className="min-w-0 flex-1 basis-40"
          aria-label="Filter by difficulty"
        />
        <Button
          variant="primary"
          className="shrink-0"
          onClick={() => setModal({ mode: "create" })}
        >
          New question
        </Button>
      </div>

      <div className="overflow-hidden border-2 border-s6 bg-s2">
        <div className="flex items-center justify-between gap-3 border-b-2 border-s6 px-4 py-2 text-caps uppercase tracking-widest text-s7">
          <span className="min-w-0 truncate">Question</span>
          <span className="shrink-0">
            {loaded && resultsFilter === null ? `${total} total` : null}
            {loaded && resultsFilter !== null
              ? `${total} ${total === 1 ? "match" : "matches"}`
              : null}
          </span>
        </div>

        {loadError ? (
          <div className="px-4 py-3.5">
            <StatusLine
              tone="crit"
              live
              action={
                <Button variant="text" onClick={refetch}>
                  Retry
                </Button>
              }
            >
              {loadError}
            </StatusLine>
          </div>
        ) : !loaded && loading ? (
          <SkeletonRows />
        ) : /* Both empty states read the filter the rows on screen were
             fetched under, not the live inputs: clearing a filter that
             matched nothing flips the inputs a render before the refetch
             lands, and this panel must never claim a populated bank is
             empty. */
        questions.length === 0 && resultsFilter === null ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sec font-bold text-s11">No questions yet.</p>
            <p className="max-w-sm text-sec text-s9">
              Run{" "}
              <code className="font-mono text-s10">npm run seed:trivia</code> to
              import the starter bank, or write the first one.
            </p>
            <Button
              variant="primary"
              onClick={() => setModal({ mode: "create" })}
            >
              New question
            </Button>
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-sec text-s9">
              No questions match{" "}
              {[
                resultsFilter?.query && `“${resultsFilter.query}”`,
                resultsFilter?.difficulty !== ANY_DIFFICULTY &&
                  resultsFilter?.difficulty,
              ]
                .filter(Boolean)
                .join(" · ")}
              .
            </p>
            <Button variant="text" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <ul className="divide-y-2 divide-s6">
            {questions.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sec text-s11">{q.prompt}</p>
                  {q.category || q.difficulty ? (
                    <p className="truncate text-meta text-s7">
                      {[q.category, q.difficulty].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                {/* The glyphs are decorative; the aria-label is the name. */}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    icon
                    aria-label={`Edit: ${q.prompt}`}
                    onClick={() => setModal({ mode: "edit", question: q })}
                  >
                    ✎
                  </Button>
                  <Button
                    variant="ghost"
                    icon
                    aria-label={`Delete: ${q.prompt}`}
                    onClick={() => setModal({ mode: "delete", question: q })}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Unlike the mockup, the footer stays up on filtered results too:
            filtering is server-side here, so a filtered bank can genuinely run
            to several pages and still needs its range and pager. */}
        {loaded && !loadError && total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-s6 px-4 py-2">
            <span className="text-caps uppercase tracking-widest text-s7">
              {rangeStart}–{rangeEnd} of {total}
            </span>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </Button>
              <Button
                variant="outline"
                disabled={page === pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {modal?.mode === "create" || modal?.mode === "edit" ? (
        <QuestionEditor
          state={modal}
          onClose={() => setModal(null)}
          onSaved={closeAfterMutation}
        />
      ) : null}

      {modal?.mode === "delete" ? (
        <DeleteQuestionDialog
          question={modal.question}
          onClose={() => setModal(null)}
          onDeleted={closeAfterMutation}
        />
      ) : null}
    </div>
  );
}
