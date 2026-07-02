/**
 * projects api.ts — thin fetch wrappers for /api/projects/* and /p/:shareId.
 * All calls carry credentials so the session cookie is sent.
 */

export type ProjectSummary = {
  id: string;
  name: string;
  shareId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  code: string;
  wiring: string;
  shareId: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: string;
};

const BASE = '';

async function jsonFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T | { error: string } }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: T | { error: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T | { error: string };
    } catch {
      data = { error: 'bad_response' };
    }
  }
  return { status: res.status, data: (data ?? { error: 'empty_body' }) as T | { error: string } };
}

export const projectsApi = {
  list() {
    return jsonFetch<{ projects: ProjectSummary[] }>('GET', '/api/projects');
  },
  create(input: { name: string; code?: string; wiring?: string }) {
    return jsonFetch<{ project: Project }>('POST', '/api/projects', input);
  },
  get(id: string) {
    return jsonFetch<{ project: Project }>('GET', `/api/projects/${id}`);
  },
  update(id: string, patch: { name?: string; code?: string; wiring?: string }) {
    return jsonFetch<{ project: Project }>('PUT', `/api/projects/${id}`, patch);
  },
  remove(id: string) {
    return jsonFetch<{ ok: true }>('DELETE', `/api/projects/${id}`);
  },
  enableShare(id: string) {
    return jsonFetch<{ project: { id: string; shareId: string; name: string } }>(
      'POST',
      `/api/projects/${id}/share`,
    );
  },
  disableShare(id: string) {
    return jsonFetch<{ project: { id: string; shareId: null; name: string } }>(
      'DELETE',
      `/api/projects/${id}/share`,
    );
  },
  publicGet(shareId: string) {
    return jsonFetch<{ project: Project }>('GET', `/p/${shareId}`);
  },
  fork(shareId: string) {
    return jsonFetch<{ project: Project }>('POST', '/api/projects/fork', { shareId });
  },
};
