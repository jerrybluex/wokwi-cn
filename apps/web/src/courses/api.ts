/**
 * api.ts — fetch wrappers for /api/courses/*.
 */

/**
 * StepCheck — optional lightweight completion check (PRD-sync §5 决策 8).
 * The CoursePlayer renders a "任务卡" and runs a tiny lexer (no AST) against
 * the student's code. `api-used` matches every API name in `value` (comma-
 * separated, all must appear). `pattern` matches `value` as a regex.
 */
export type StepCheck = {
  kind: 'api-used' | 'pattern';
  value: string;
  label?: string;
};

export type Step = {
  title: string;
  context: string;
  taskCode: string;
  taskWiring: {
    parts: Array<{ id: string; type: string; x: number; y: number; rotation: number }>;
    wires: Array<{ from: { part: string; pin: string }; to: { part: string; pin: string }; id: string }>;
  };
  stepIndex: number;
  check?: StepCheck;
};

export type CourseDetail = {
  slug: string;
  title: string;
  description: string;
  steps: Step[];
  currentStepIdx: number;
};

export type CourseListItem = {
  slug: string;
  title: string;
  description: string;
  stepCount: number;
};

export type ProgressResponse = {
  stepIdx: number;
  completed: boolean;
};

export type ErrorResponse = { error: string };

const BASE = '';

async function jsonFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T | ErrorResponse }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: 'bad_response' };
    }
  }
  return { status: res.status, data: data as T | ErrorResponse };
}

export const coursesApi = {
  list() {
    return jsonFetch<{ courses: CourseListItem[] }>('GET', '/api/courses');
  },
  get(slug: string) {
    return jsonFetch<{ course: CourseDetail }>('GET', `/api/courses/${slug}`);
  },
  getProgress(slug: string) {
    return jsonFetch<ProgressResponse>('GET', `/api/courses/${slug}/progress`);
  },
  syncProgress(slug: string, stepIdx: number, completed = false) {
    return jsonFetch<{ ok: true; stepIdx: number }>('POST', `/api/courses/${slug}/progress`, {
      stepIdx,
      completed,
    });
  },
};