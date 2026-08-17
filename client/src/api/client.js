const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `リクエストに失敗しました (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listPapers: (status) => request(`/papers${status ? `?status=${status}` : ""}`),
  getPaper: (id) => request(`/papers/${id}`),
  uploadPaper: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/papers", { method: "POST", body: form });
  },
  updatePaper: (id, patch) => request(`/papers/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deletePaper: (id) => request(`/papers/${id}`, { method: "DELETE" }),
  reportSession: (id, seconds) =>
    request(`/papers/${id}/session`, { method: "POST", body: JSON.stringify({ seconds }) }),
  listTranslations: (id) => request(`/papers/${id}/translations`),
  translate: (id, sourceText) =>
    request(`/papers/${id}/translate`, { method: "POST", body: JSON.stringify({ sourceText }) }),
  dashboard: (days) => request(`/stats/dashboard${days ? `?days=${days}` : ""}`),
  fileUrl: (id) => `${BASE}/papers/${id}/file`,
  lookupWord: (word) => request(`/vocab/lookup`, { method: "POST", body: JSON.stringify({ word }) }),
  listVocab: (params) => request(`/vocab${params ? `?${new URLSearchParams(params)}` : ""}`),
  updateVocab: (id, patch) => request(`/vocab/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteVocab: (id) => request(`/vocab/${id}`, { method: "DELETE" }),
};
