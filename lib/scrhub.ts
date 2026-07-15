// SubcontractorHub API helpers — public photopack + authenticated project/equipment APIs

const API = "https://api.virtualsaleportal.com";

// ─── Public photopack helpers (read-only, no auth) ─────────────────────────

export function extractInstallationId(input: string): string | null {
  if (!input) return null;
  const m = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

export async function fetchDesignData(id: string) {
  const r = await fetch(`${API}/api/project-site-survey-attachment/${id}/get-design-data`, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data ?? null;
}

export async function fetchLabels(id: string) {
  const r = await fetch(`${API}/api/${id}/installation-label/labels`, { cache: "no-store" });
  if (!r.ok) return [];
  return (await r.json()) ?? [];
}

export async function fetchAttachments(id: string) {
  const r = await fetch(`${API}/api/project-installation-attachment/${id}/attachments?page=1&limit=500&sorting_col=updated_at&sorting_dir=desc`, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  return j?.data ?? [];
}

export async function fetchPhotopack(id: string) {
  const [design, labels, attachments] = await Promise.all([
    fetchDesignData(id),
    fetchLabels(id),
    fetchAttachments(id),
  ]);
  return { design, labels, attachments };
}


// ─── Authenticated SCH API (Bearer token) ──────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

/** Log in to SCH and return a bearer token. Caches for 20 mins. */
export async function getSchToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry) return _cachedToken;

  const email = process.env.SCH_EMAIL;
  const password = process.env.SCH_PASSWORD;
  if (!email || !password) throw new Error("SCH_EMAIL / SCH_PASSWORD not configured");

  const r = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`SCH login failed (${r.status}): ${body}`);
  }
  const data = await r.json();
  _cachedToken = data?.token ?? null;
  if (!_cachedToken) throw new Error("SCH login returned no token");
  // Cache for 20 minutes (expiry from API is 1440 min but play safe)
  _tokenExpiry = now + 20 * 60 * 1000;
  return _cachedToken;
}

function authHeaders(token: string) {
  return {
    "Accept": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

// ─── Project search ─────────────────────────────────────────────────────────

export interface SchProjectSummary {
  id: number;
  uuid: string;
  projectName: string;
  systemSize: number | null;
  panelName: string | null;
  financeType: string | null;
  state: string | null;
  city: string | null;
  street: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  stage: string | null;
}

export async function searchSchProjects(
  query: string,
  opts?: { page?: number; limit?: number; status?: string }
): Promise<{ projects: SchProjectSummary[]; total: number }> {
  const token = await getSchToken();
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 25;
  const statusParam = opts?.status ? `&status=${encodeURIComponent(opts.status)}` : "";

  const url = `${API}/api/projects?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}&sorting_col=updated_at&sorting_dir=desc&is_project_review=1${statusParam}`;
  const r = await fetch(url, { headers: authHeaders(token), cache: "no-store" });
  if (!r.ok) throw new Error(`SCH search failed (${r.status})`);

  const json = await r.json();
  const items: any[] = json?.data?.data ?? json?.data ?? [];
  const total: number = json?.data?.total ?? items.length;

  const projects: SchProjectSummary[] = items.map((p: any) => ({
    id: p?.id,
    uuid: p?.uuid ?? "",
    projectName: p?.project_name ?? "",
    systemSize: p?.system_size ?? null,
    panelName: p?.panel_name ?? null,
    financeType: p?.finance_type ?? null,
    state: p?.state ?? null,
    city: p?.city ?? null,
    street: p?.street ?? null,
    createdAt: p?.created_at ?? null,
    updatedAt: p?.updated_at ?? null,
    stage: p?.stage ?? p?.stages?.[p.stages.length - 1]?.name ?? null,
  }));

  return { projects, total };
}

// ─── Equipment fetch ────────────────────────────────────────────────────────

export interface SoldEquipment {
  schProjectId: number;
  projectName: string;
  systemSizeKw: number | null;
  panelCount: number;
  mountingType: string | null;
  panel: {
    name: string;
    manufacturer: string;
    modelNumber: string;
    watts: number | null;
  } | null;
  inverter: {
    name: string;
    manufacturer: string;
    modelNumber: string;
    type: string | null;
    quantity: number | null;
  } | null;
  batteries: any[] | null;
  batteryCount: number;
  adders: { name: string; type: string; qty: number; unit: string }[];
  interconnection: string | null;
  fetchedAt: string;
}

export async function fetchSchEquipment(projectId: number): Promise<SoldEquipment> {
  const token = await getSchToken();
  const r = await fetch(`${API}/api/projects/${projectId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`SCH project fetch failed (${r.status})`);

  const json = await r.json();
  const d = json?.data;
  if (!d) throw new Error("No project data returned");

  const panel = d.module?.panel;
  const inv = d.inverter;

  return {
    schProjectId: d.id,
    projectName: d.project_name ?? "",
    systemSizeKw: d.system_size ?? null,
    panelCount: d.no_of_panels ?? 0,
    mountingType: d.mounting_type ?? null,
    panel: panel
      ? {
          name: panel.name ?? "",
          manufacturer: panel.manufacturer ?? panel.mastermanufacturer?.name ?? "",
          modelNumber: panel.model_number ?? "",
          watts: panel.watts ?? null,
        }
      : null,
    inverter: inv
      ? {
          name: inv.name ?? "",
          manufacturer: inv.manufacturer ?? "",
          modelNumber: inv.model_number ?? "",
          type: inv.inverter_type ?? null,
          quantity: inv.size ?? null,
        }
      : null,
    batteries: d.batteries ?? null,
    batteryCount: d.no_of_batteries ?? 0,
    adders: (d.adders ?? []).map((a: any) => ({
      name: a?.name ?? "",
      type: a?.type ?? "",
      qty: a?.qty ?? a?.quantity ?? 0,
      unit: a?.unit ?? "",
    })),
    interconnection: null, // populated later from photo analysis
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Design CAD / Planset attachments ────────────────────────────────────────

export interface DesignCadFile {
  id: number;
  fileName: string;
  label: string;
  subLabel: string | null;
  attachmentType: string;
  /** Direct CDN URL — requires SCH auth token to download */
  cdnUrl: string;
  /** S3 path on stp-sales-tool bucket (may work without auth for PDFs) */
  s3Path: string;
  /** Our S3 URL after re-uploading — filled in by the download step */
  storedUrl?: string;
  fileSize?: number;
}

/**
 * Fetch Design CAD attachments from SCH project.
 * Only projects with design completed (Permit, Install, Review Completed stages) will have these.
 */
export async function fetchSchDesignAttachments(projectId: number): Promise<DesignCadFile[]> {
  const token = await getSchToken();
  const url = `${API}/api/projects/attachments/${projectId}?page=1&limit=100&sorting_col=updated_at&sorting_dir=desc`;
  const r = await fetch(url, { headers: authHeaders(token), cache: "no-store" });
  if (!r.ok) {
    console.log(`[SCH] No attachments found for project ${projectId}: ${r.status}`);
    return [];
  }

  const json = await r.json();
  const items: any[] = json?.data ?? [];

  // Classify each attachment into a category
  function classifyItem(item: any): "planset" | "production_model" | "shade_report" | null {
    const atype = (item?.attachment_type ?? "").toLowerCase();
    const label = (item?.label ?? "").toLowerCase();
    const fname = (item?.file_name ?? "").toLowerCase();
    // Production model & shade report are checked FIRST so their PDFs are never
    // swallowed by the broader "design" planset match below.
    if (atype === "production_model" || atype === "production model" || label.includes("production model") || label.includes("production_model") || label.includes("production graph") || fname.includes("production")) return "production_model";
    if (atype === "shade_report" || atype === "shade report" || label.includes("shade report") || label.includes("shade_report") || label.includes("shade") || fname.includes("shade")) return "shade_report";
    // Planset / Design CAD. In SCH the real planset PDF is usually labeled
    // "Design Attachment (Design)" (attachment_type "default") or is a design
    // image (attachment_type "designs"), NOT the literal word "planset". Match
    // any design/planset attachment; DXF files are excluded (they contain neither
    // "design" nor "planset").
    if (atype === "planset" || atype === "designs" || label.includes("planset") || label.includes("design") || fname.includes("planset") || fname.includes("design")) return "planset";
    return null;
  }

  // Items are already sorted by updated_at desc. Collect candidates per category,
  // then pick the best one — preferring a PDF (full planset/report document) over
  // an image thumbnail when both exist.
  const candidates: Record<string, any[]> = { planset: [], production_model: [], shade_report: [] };
  for (const item of items) {
    const cat = classifyItem(item);
    if (cat) candidates[cat].push(item);
  }
  function pickBest(list: any[]): any | null {
    if (!list.length) return null;
    const pdf = list.find((it) => (it?.file_name ?? "").toLowerCase().endsWith(".pdf"));
    return pdf ?? list[0];
  }
  const latestFiles: any[] = [pickBest(candidates.planset), pickBest(candidates.production_model), pickBest(candidates.shade_report)].filter(Boolean);

  return latestFiles.map((item: any) => ({
    id: item?.id ?? 0,
    fileName: item?.file_name ?? "unknown",
    label: item?.label ?? "Design",
    subLabel: item?.sub_label ?? null,
    attachmentType: item?.attachment_type ?? "designs",
    cdnUrl: item?.url ?? "",
    s3Path: item?.file ?? "",
  }));
}

/**
 * Download a Design CAD file from SCH CDN using auth token.
 * Returns the file as a Buffer.
 */
export async function downloadSchFile(cdnUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const token = await getSchToken();
  const r = await fetch(cdnUrl, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "*/*",
    },
  });
  if (!r.ok) {
    throw new Error(`SCH CDN ${r.status}`);
  }
  const contentType = r.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await r.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

/** Try to find the SCH project by UUID (installation ID from photopack URL) */
export async function findSchProjectByUuid(uuid: string): Promise<number | null> {
  const token = await getSchToken();
  // Search by UUID — the project list includes uuid field
  const r = await fetch(`${API}/api/projects?page=1&limit=5&search=${encodeURIComponent(uuid)}&is_project_review=1`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const json = await r.json();
  const items: any[] = json?.data?.data ?? json?.data ?? [];
  const match = items.find((p: any) => p?.uuid === uuid);
  return match?.id ?? null;
}