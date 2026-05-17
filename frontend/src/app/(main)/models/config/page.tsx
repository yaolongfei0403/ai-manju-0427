"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthStore } from "@/stores/auth";

/* ─── Types ─── */
type ModelType =
  | "llm"
  | "t2i"
  | "t2v"
  | "i2v_ff"
  | "i2v_fflf"
  | "video_edit"
  | "video_extend"
  | "r2v"
  | "a2v"
  | "tts"
  | "comfyui";

interface ModelEntry {
  type: ModelType;
  provider: string;
  model: string;
  display_name: string | null;
  endpoint: string | null;
  timeout: number;
  extra: Record<string, unknown>;
  active: boolean;
  has_schema: boolean;
  test_passed: boolean;
  params: Record<string, {
    type: string;
    options: string[] | null;
    range: [number, number] | null;
    default: unknown;
  }>;
}

interface ResolvedConfig {
  llm: ConfigEntry[];
  t2i: ConfigEntry[];
  t2v: ConfigEntry[];
  i2v_ff: ConfigEntry[];
  i2v_fflf: ConfigEntry[];
  video_edit: ConfigEntry[];
  video_extend: ConfigEntry[];
  r2v: ConfigEntry[];
  a2v: ConfigEntry[];
  tts: ConfigEntry[];
  comfyui: ConfigEntry[];
  i2v: ConfigEntry[];
}

interface ConfigEntry {
  provider: string;
  model: string;
  display_name: string | null;
  endpoint: string | null;
  api_key: string | null;
  timeout: number;
  extra: Record<string, unknown>;
  test_passed: boolean;
}

interface TestResult {
  success: boolean;
  latency: number;
  message: string;
  error?: string;
  test_passed?: boolean;
}

/* ─── Constants ─── */
const TYPE_META: Record<ModelType, { title: string; desc: string; color: string; icon: string }> = {
  llm: { title: "LLM 大模型", desc: "文本生成、对话与推理模型配置", color: "#818cf8", icon: "fa-brain" },
  t2i: { title: "文生图 T2I", desc: "Text-to-Image 图像生成配置", color: "#22d3ee", icon: "fa-image" },
  t2v: { title: "文生视频 T2V", desc: "文本生成视频（HappyHorse / 万相 / Seedance）", color: "#f472b6", icon: "fa-video" },
  i2v_ff: { title: "图生视频-首帧", desc: "首帧引导视频生成（I2V FirstFrame）", color: "#fbbf24", icon: "fa-file-image" },
  i2v_fflf: { title: "图生视频-首尾帧", desc: "首尾帧引导视频生成（I2V First+Last）", color: "#fb923c", icon: "fa-images" },
  video_edit: { title: "视频编辑", desc: "视频风格转换、局部替换与指令编辑", color: "#a78bfa", icon: "fa-wand-magic-sparkles" },
  video_extend: { title: "视频续写", desc: "基于已有视频延长内容", color: "#34d399", icon: "fa-forward" },
  r2v: { title: "参考生视频 R2V", desc: "多模态参考素材生成视频", color: "#f43f5e", icon: "fa-film" },
  a2v: { title: "音频驱动 A2V", desc: "音频驱动视频生成（driving_audio）", color: "#ec4899", icon: "fa-music" },
  tts: { title: "语音合成 TTS", desc: "Text-to-Speech 语音合成配置", color: "#10b981", icon: "fa-microphone-lines" },
  comfyui: { title: "ComfyUI 工作流", desc: "节点式工作流服务器配置", color: "#06b6d4", icon: "fa-network-wired" },
};

const PROVIDER_META: Record<string, {
  name: string;
  protocol: string;
  color: string;
  icon: string;
  endpoints: Partial<Record<ModelType, string>>;
  authType: string;
}> = {
  aliyun_dashscope: {
    name: "阿里百炼",
    protocol: "dashscope",
    color: "#ff6a00",
    icon: "fa-cloud",
    endpoints: {
      llm: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      t2i: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
      t2v: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
      i2v_ff: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
      i2v_fflf: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
      video_edit: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
      video_extend: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
      r2v: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
      a2v: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
      tts: "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/speech",
    },
    authType: "bearer",
  },
  volcengine_ark: {
    name: "火山引擎方舟",
    protocol: "volcengine_ark",
    color: "#1668dc",
    icon: "fa-volcano",
    endpoints: {
      llm: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      t2i: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
      t2v: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      i2v_ff: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      i2v_fflf: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      video_edit: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      video_extend: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      r2v: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      a2v: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      tts: "https://openspeech.bytedance.com/api/v1/tts",
    },
    authType: "bearer",
  },
  siliconflow: {
    name: "硅基流动",
    protocol: "openai",
    color: "#6366f1",
    icon: "fa-microchip",
    endpoints: {
      llm: "https://api.siliconflow.cn/v1/chat/completions",
      t2i: "https://api.siliconflow.cn/v1/images/generations",
      tts: "https://api.siliconflow.cn/v1/audio/speech",
    },
    authType: "bearer",
  },
  comfyui: {
    name: "ComfyUI",
    protocol: "comfyui",
    color: "#a78bfa",
    icon: "fa-network-wired",
    endpoints: { comfyui: "http://127.0.0.1:8188" },
    authType: "none",
  },
  custom: {
    name: "自定义",
    protocol: "custom",
    color: "#64748b",
    icon: "fa-cog",
    endpoints: {},
    authType: "bearer",
  },
};

const MODEL_PRESETS = [
  { name: "HappyHorse 文生视频", provider: "aliyun_dashscope", type: "t2v" as ModelType, modelId: "happyhorse-1.0-t2v", desc: "阿里百炼物理真实视频生成" },
  { name: "HappyHorse 参考生视频", provider: "aliyun_dashscope", type: "r2v" as ModelType, modelId: "happyhorse-1.0-r2v", desc: "多图参考角色融合视频" },
  { name: "HappyHorse 视频编辑", provider: "aliyun_dashscope", type: "video_edit" as ModelType, modelId: "happyhorse-1.0-video-edit", desc: "风格变换与局部替换" },
  { name: "万相 2.7 文生视频", provider: "aliyun_dashscope", type: "t2v" as ModelType, modelId: "wan2.7-t2v-2026-04-25", desc: "支持多镜头叙事与自定义音频" },
  { name: "万相 2.7 图生视频", provider: "aliyun_dashscope", type: "i2v_ff" as ModelType, modelId: "wan2.7-i2v-2026-04-25", desc: "首帧/首尾帧/续写/音频驱动" },
  { name: "万相 2.7 视频编辑", provider: "aliyun_dashscope", type: "video_edit" as ModelType, modelId: "wan2.7-videoedit", desc: "指令编辑与视频迁移" },
  { name: "Seedance 2.0", provider: "volcengine_ark", type: "t2v" as ModelType, modelId: "doubao-seedance-2-0-260128", desc: "火山方舟全场景视频生成" },
  { name: "Seedream 文生图", provider: "volcengine_ark", type: "t2i" as ModelType, modelId: "doubao-seedream-4-0", desc: "火山方舟图像生成" },
  { name: "硅基流动 LLM", provider: "siliconflow", type: "llm" as ModelType, modelId: "Qwen/Qwen3-235B-A22B", desc: "OpenAI 兼容对话模型" },
  { name: "本地 ComfyUI", provider: "comfyui", type: "comfyui" as ModelType, modelId: "comfyui-local", desc: "本地节点工作流服务" },
];

const ALL_TYPES = Object.keys(TYPE_META) as ModelType[];

/* ─── API Helpers ─── */
function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchModels(): Promise<ModelEntry[]> {
  const resp = await axios.get("/api/v1/admin/models", { headers: getAuthHeaders() });
  const raw = resp.data;
  const data = (raw as any).data !== undefined ? (raw as any).data : raw;
  if (!Array.isArray(data)) {
    console.warn("[fetchModels] Response is not an array:", data);
    return [];
  }
  return data as ModelEntry[];
}

async function fetchResolvedConfig(): Promise<ResolvedConfig> {
  const resp = await axios.get("/api/v1/admin/models/config", { headers: getAuthHeaders() });
  const raw = resp.data;
  if ("error" in raw) {
    throw new Error(raw.error.message);
  }
  const configData = (raw as any).data !== undefined ? (raw as any).data : raw;
  return configData as ResolvedConfig;
}

async function updateResolvedConfig(data: Partial<Record<string, ConfigEntry[]>>): Promise<ResolvedConfig> {
  const resp = await axios.post("/api/v1/admin/models/config", data, { headers: getAuthHeaders() });
  const raw = resp.data;
  if ("error" in raw) {
    throw new Error(raw.error.message);
  }
  const configData = (raw as any).data !== undefined ? (raw as any).data : raw;
  return configData as ResolvedConfig;
}

async function deleteModelConfig(modelType: string, model: string): Promise<void> {
  const resp = await axios.delete(`/api/v1/admin/models?model_type=${modelType}&model=${encodeURIComponent(model)}`, { headers: getAuthHeaders() });
  const raw = resp.data;
  if ("error" in raw) {
    throw new Error(raw.error.message);
  }
}

async function saveTestResult(params: {
  type: string;
  provider: string;
  model: string;
  api_key?: string;
  endpoint?: string;
  extra?: Record<string, unknown>;
}): Promise<void> {
  await axios.post("/api/v1/admin/models/test/save", params, { headers: getAuthHeaders() });
}

async function testConnection(params: {
  type: string;
  provider: string;
  model: string;
  api_key?: string;
  endpoint?: string;
  extra?: Record<string, unknown>;
}): Promise<TestResult> {
  const resp = await axios.post("/api/v1/admin/models/test", params, {
    headers: getAuthHeaders(),
  });
  const raw = resp.data;
  if ("error" in raw) {
    throw new Error(raw.error.message);
  }
  const resultData = (raw as any).data !== undefined ? (raw as any).data : raw;
  return resultData as TestResult;
}

/* ─── Main Page ─── */
export default function ModelConfigPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();

  const [currentType, setCurrentType] = useState<ModelType>("llm");
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [resolvedConfig, setResolvedConfig] = useState<ResolvedConfig | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "online" | "offline">("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModelEntry | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [activeTab, setActiveTab] = useState<"basic" | "params" | "backend">("basic");

  const [showKey, setShowKey] = useState(false);
  const [useDefaultSchema, setUseDefaultSchema] = useState(true);

  // Add modal state
  const [newPresetIdx, setNewPresetIdx] = useState(-1);
  const [newType, setNewType] = useState<ModelType>("t2v");
  const [newProvider, setNewProvider] = useState("aliyun_dashscope");
  const [newName, setNewName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newEndpoint, setNewEndpoint] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newEnv, setNewEnv] = useState<"dev" | "test" | "prod">("prod");

  /* ─── Auth Guard ─── */
  useEffect(() => {
    if (!checkAuth()) router.push("/login");
  }, [checkAuth, router]);

  /* ─── Helpers ─── */
  const showToast = (message: string, type: "success" | "error" | "info" | "warning") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ─── Data Loading ─── */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allModelsData, configData] = await Promise.all([
        fetchModels(),
        fetchResolvedConfig(),
      ]);
      setModels(Array.isArray(allModelsData) ? allModelsData : []);
      setResolvedConfig(configData);
    } catch (err) {
      console.error("[loadData] Error:", err);
      showToast("加载数据失败", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getFilteredModels = () => {
    let list: ModelEntry[] = Array.isArray(models) ? models : [];
    list = list.filter((m) => m.type === currentType);
    // Only show active models (registered in config), not catalog entries
    list = list.filter((m) => m.active);
    // Apply status filter
    if (filterStatus === "online") {
      list = list.filter((m) => m.test_passed);
    } else if (filterStatus === "offline") {
      list = list.filter((m) => !m.test_passed);
    }
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      list = list.filter(
        (m) =>
          (m.display_name || m.model).toLowerCase().includes(kw) ||
          m.model.toLowerCase().includes(kw) ||
          m.provider.toLowerCase().includes(kw) ||
          m.type.toLowerCase().includes(kw)
      );
    }
    return list;
  };

  const getConfigEntry = (): ConfigEntry | null => {
    // If a model is selected, find matching entry in resolvedConfig list
    if (selectedModel) {
      const resolvedList = resolvedConfig?.[selectedModel.type as keyof ResolvedConfig];
      const list = Array.isArray(resolvedList) ? resolvedList : [];
      const matching = list.find(
        (e) => e.provider === selectedModel.provider && e.model === selectedModel.model
      );
      if (matching) {
        return matching;
      }
      // Fall back to selectedModel data if no resolved config match
      return {
        provider: selectedModel.provider,
        model: selectedModel.model,
        display_name: selectedModel.display_name,
        endpoint: selectedModel.endpoint,
        api_key: null,
        timeout: selectedModel.timeout,
        extra: selectedModel.extra,
        test_passed: selectedModel.test_passed,
      };
    }
    // Fallback: resolved config for current type (first entry if list)
    if (!resolvedConfig) return null;
    const entries = resolvedConfig[currentType as keyof ResolvedConfig];
    return entries && entries.length > 0 ? entries[0] : null;
  };

  const getEnvBadge = (env: string) => {
    const cls = env === "prod" ? "badge-prod" : env === "test" ? "badge-test" : "badge-dev";
    const label = env === "prod" ? "生产" : env === "test" ? "测试" : "开发";
    return { cls, label };
  };

  /* ─── Handlers ─── */
  const handleTypeChange = (type: ModelType) => {
    console.log("[handleTypeChange] Changing type to:", type);
    setCurrentType(type);
    setSelectedModel(null);
    setTestResult(null);
    setActiveTab("basic");
  };

  const handleSelectModel = (model: ModelEntry) => {
    setSelectedModel(model);
    setTestResult(null);
  };

  const handleAddNew = () => {
    setNewPresetIdx(-1);
    setNewName("");
    setNewModelId("");
    setNewEndpoint("");
    setNewApiKey("");
    setNewEnv("prod");
    setShowAddModal(true);
  };

  const handleDeleteClick = (model: ModelEntry) => {
    setDeleteTarget(model);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteModelConfig(deleteTarget.type, deleteTarget.model);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setSelectedModel(null);
      showToast("删除成功", "success");
      loadData();
    } catch {
      showToast("删除失败", "error");
    }
  };

  const handleTest = async () => {
    const config = getConfigEntry();
    if (!config) return;
    const modelType = selectedModel?.type || currentType;
    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await testConnection({
        type: modelType,
        provider: config.provider,
        model: config.model,
        api_key: config.api_key || undefined,
        endpoint: config.endpoint || undefined,
      });
      setTestResult(result);
      // If test passed, save the test_passed status
      if (result.success && result.test_passed) {
        await saveTestResult({
          type: modelType,
          provider: config.provider,
          model: config.model,
          api_key: config.api_key || undefined,
          endpoint: config.endpoint || undefined,
        });
        // Reload data to reflect the updated test_passed status
        loadData();
      }
    } catch {
      showToast("测试连接失败", "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    const config = getConfigEntry();
    if (!config) return;
    const modelType = (selectedModel?.type || currentType) as ModelType;
    try {
      // Get existing entries and update/save the current one
      const existingEntries = resolvedConfig?.[modelType] || [];
      const updatedEntries = existingEntries.map((e) =>
        e.model === config.model ? config : e
      );
      // If config model not in list, append it
      if (!updatedEntries.some((e) => e.model === config.model)) {
        updatedEntries.push(config);
      }
      const updatedConfig = await updateResolvedConfig({ [modelType]: updatedEntries });
      setResolvedConfig(updatedConfig);
      showToast("配置已保存", "success");
      loadData();
    } catch {
      showToast("保存失败", "error");
    }
  };

  const handlePresetSelect = (idx: number) => {
    setNewPresetIdx(idx);
    const pr = MODEL_PRESETS[idx];
    if (!pr) return;
    setNewName(pr.name);
    setNewModelId(pr.modelId);
    setNewType(pr.type);
    setNewProvider(pr.provider);
    const meta = PROVIDER_META[pr.provider];
    const ep = meta?.endpoints?.[pr.type];
    if (ep) setNewEndpoint(ep);
  };

  const handleNewProviderChange = (prov: string) => {
    setNewProvider(prov);
    const meta = PROVIDER_META[prov];
    const ep = meta?.endpoints?.[newType];
    if (ep) setNewEndpoint(ep);
  };

  const handleNewTypeChange = (type: ModelType) => {
    setNewType(type);
    const meta = PROVIDER_META[newProvider];
    const ep = meta?.endpoints?.[type];
    if (ep) setNewEndpoint(ep);
  };

  const handleConfirmAdd = async () => {
    if (!newName.trim()) { showToast("请输入模型名称", "warning"); return; }
    if (!newModelId.trim()) { showToast("请输入模型 ID", "warning"); return; }
    if (!newEndpoint.trim()) { showToast("请输入 API 端点", "warning"); return; }

    const newEntry: ConfigEntry = {
      provider: newProvider,
      model: newModelId,
      display_name: newName || null,
      endpoint: newEndpoint,
      api_key: newApiKey || null,
      timeout: 60,
      extra: {},
      test_passed: false,
    };

    try {
      // Get existing entries for this type and append new one
      const existingEntries = resolvedConfig?.[newType] || [];
      const updatedConfig = await updateResolvedConfig({ [newType]: [...existingEntries, newEntry] });
      setResolvedConfig(updatedConfig);
      setShowAddModal(false);
      showToast("添加成功", "success");
      setCurrentType(newType);
      setSelectedModel(null);
      loadData();
    } catch {
      showToast("添加失败", "error");
    }
  };

  const handleExport = () => {
    const data = resolvedConfig ? Object.entries(resolvedConfig).map(([k, v]) => ({ type: k, ...v })) : [];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `model-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("配置已导出", "success");
  };

  const handleCopyModel = () => {
    const config = getConfigEntry();
    if (!config) return;
    setNewName(`${config.display_name || config.model} (副本)`);
    setNewModelId(`${config.model}-copy`);
    setNewProvider(config.provider);
    setNewEndpoint(config.endpoint || "");
    setNewApiKey(config.api_key || "");
    setShowAddModal(true);
  };

  // Auto select first model of current type when type changes or models load
  useEffect(() => {
    const filtered = models.filter((m) => m.type === currentType);
    if (filtered.length > 0) {
      const stillSelected = selectedModel && filtered.some(
        (m) => m.model === selectedModel.model && m.type === selectedModel.type
      );
      if (!stillSelected) {
        setSelectedModel(filtered[0]);
      }
    } else {
      setSelectedModel(null);
    }
  }, [currentType, models]);

  /* ─── Render ─── */
  const meta = TYPE_META[currentType];
  const filtered = getFilteredModels();
  const config = getConfigEntry();
  const pMeta = PROVIDER_META[config?.provider || selectedModel?.provider || "custom"];

  return (
    <div className="h-screen flex flex-col bg-[#030712] text-slate-200 overflow-hidden">
      {/* ── Header ── */}
      <header className="h-[52px] shrink-0 flex items-center justify-between px-5 border-b border-white/[0.05] bg-[#060d1a]/85 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/projects")}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <i className="fas fa-cubes text-white text-sm" />
          </button>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">AI 模型统一配置中心</span>
            <span className="text-[10px] text-slate-500 ml-2 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 font-medium">网关 v2.1</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={handleExport} className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-2">
            <i className="fas fa-download text-slate-400 text-[10px]" /> 导出
          </button>
          <button onClick={() => document.getElementById("import-file")?.click()} className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-2">
            <i className="fas fa-upload text-slate-400 text-[10px]" /> 导入
          </button>
          <input type="file" id="import-file" accept=".json" className="hidden" onChange={() => showToast("导入功能开发中", "info")} />
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            网关正常
          </div>
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
            {user?.username?.charAt(0).toUpperCase() || "A"}
          </div>
        </div>
      </header>

      {/* ── Body: Three Column Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Type Navigation Rail ── */}
        <nav className="nav-rail custom-scroll">
          <div className="text-[10px] font-bold text-slate-600 mb-3 uppercase tracking-widest px-2 text-center">能力</div>
          {ALL_TYPES.map((type) => {
            const t = TYPE_META[type];
            const count = (models as ModelEntry[]).filter((m) => m.type === type && m.active).length;
            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`nav-item ${currentType === type ? "active" : ""}`}
                title={t.title}
              >
                <i className={`fas ${t.icon} icon`} style={{ color: t.color }} />
                <span className="label">{type === "i2v_ff" ? "首帧" : type === "i2v_fflf" ? "首尾帧" : t.title.split(" ")[0]}</span>
                {count > 0 && (
                  <span className="nav-badge" style={{ display: "flex" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="flex-1" />
        </nav>

        {/* ── Middle: Model List ── */}
        <section className="list-panel">
          <div className="list-header">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold" style={{ color: meta.color }}>{meta.title}</h2>
                <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-1 rounded-md font-medium">
                  {filtered.length} 个
                </span>
              </div>
              <button onClick={handleAddNew} className="btn-primary px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 font-semibold shadow-lg shadow-primary/15">
                <i className="fas fa-plus text-[10px]" /> 添加模型
              </button>
            </div>
            <p className="text-xs text-slate-500">{meta.desc}</p>
          </div>

          <div className="list-toolbar">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[11px]" />
              <input
                type="text"
                className="form-input pl-8 py-2 text-xs"
                placeholder="搜索模型 ID 或名称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          </div>
          <div className="px-3 pb-2.5 flex gap-1.5 border-b border-white/[0.03]">
            <button onClick={() => setFilterStatus("all")} className={`filter-pill ${filterStatus === "all" ? "active" : ""}`}>全部</button>
            <button onClick={() => setFilterStatus("online")} className={`filter-pill ${filterStatus === "online" ? "active" : ""}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1 shadow-[0_0_5px_#10b981]" />在线
            </button>
            <button onClick={() => setFilterStatus("offline")} className={`filter-pill ${filterStatus === "offline" ? "active" : ""}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block mr-1" />离线
            </button>
          </div>

          <div className="list-body custom-scroll">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse border border-white/[0.04]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <i className={`fas ${meta.icon} empty-icon`} style={{ color: meta.color }} />
                <p className="text-xs text-slate-500 mt-2">
                  {searchKeyword ? "未找到匹配结果" : "暂无模型配置"}
                </p>
                {!searchKeyword && (
                  <button onClick={handleAddNew} className="mt-4 text-xs px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 font-medium">
                    立即添加
                  </button>
                )}
              </div>
            ) : (
              filtered.map((m) => {
                const p = PROVIDER_META[m.provider];
                const isSel = selectedModel?.model === m.model && selectedModel?.type === m.type;
                const displayName = m.display_name || m.model;
                const statusDot =
                  m.test_passed ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 opacity-60" />
                  );
                return (
                  <div key={`${m.type}-${m.provider}-${m.model}`} onClick={() => handleSelectModel(m)} className={`model-card ${isSel ? "active" : ""}`}>
                    <div className="status-dot" style={{ background: m.test_passed ? "#10b981" : "#fbbf24", opacity: m.test_passed ? 1 : 0.5 }} />
                    <div className="flex items-start gap-3 pl-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5"
                        style={{ background: `${p?.color || "#64748b"}12`, color: p?.color || "#64748b", border: `1.5px solid ${p?.color || "#64748b"}20` }}
                      >
                        <i className={`fas ${p?.icon || "fa-cog"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-white truncate">{displayName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mb-1.5">{p?.name || m.provider} · {m.model}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {m.test_passed && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">已激活</span>
                          )}
                          {m.has_schema && !m.test_passed && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-500 border border-white/5">可用</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 mt-1.5">{statusDot}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Right: Detail Panel ── */}
        <main className="detail-panel custom-scroll p-6 lg:p-8">
          {!config && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-5">
                <i className="fas fa-sliders-h text-3xl text-slate-700" />
              </div>
              <p className="text-sm text-slate-500 font-medium">请从左侧列表选择一个模型进行配置</p>
            </div>
          ) : config ? (
            <div className="animate-fade-in max-w-4xl mx-auto">
              {/* Header */}
              <div className="flex items-start justify-between mb-7">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${pMeta?.color || "#64748b"}10`, color: pMeta?.color || "#64748b", border: `1.5px solid ${pMeta?.color || "#64748b"}22` }}
                  >
                    <i className={`fas ${pMeta?.icon || "fa-cog"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-white">{selectedModel?.display_name || selectedModel?.model || config.model}</h2>
                      <span className={`badge ${getEnvBadge(newEnv).cls}`}>{getEnvBadge(newEnv).label}</span>
                      {config.test_passed && <span className="badge badge-online"><i className="fas fa-check-circle mr-1 text-[9px]" />已激活</span>}
                      {config.api_key && <span className="badge badge-online"><i className="fas fa-key mr-1 text-[9px]" />已配置</span>}
                    </div>
                    <p className="text-sm text-slate-400">{meta.desc}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="font-mono bg-white/5 px-2 py-0.5 rounded-md">{config.model}</span>
                      <span>{pMeta?.name || config.provider}</span>
                      <span>超时 {config.timeout}s</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={handleCopyModel} className="btn-icon w-9 h-9 rounded-lg" title="复制配置">
                    <i className="fas fa-copy text-xs" />
                  </button>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-3 mb-7">
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium"
                >
                  <i className={`fas fa-bolt text-amber-400 ${isTesting ? "animate-spin" : ""}`} />
                  {isTesting ? "检测中..." : "测试连接"}
                </button>
                <button onClick={handleSave} className="btn-primary px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                  <i className="fas fa-save" /> 保存配置
                </button>
                <button onClick={() => handleDeleteClick(selectedModel!)} className="btn-ghost px-4 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 flex items-center gap-2 ml-auto font-medium">
                  <i className="fas fa-trash-alt" /> 删除
                </button>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`mb-6 text-xs rounded-xl px-4 py-3 border flex items-center gap-3 ${
                  testResult.success
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/5 border-red-500/20 text-red-400"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    testResult.success ? "bg-emerald-500/15" : "bg-red-500/15"
                  }`}>
                    <i className={`fas ${testResult.success ? "fa-check" : "fa-times"}`} />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{testResult.message}</span>
                    {testResult.latency && <span className="ml-2 text-slate-500">延迟 {testResult.latency}ms</span>}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-white/[0.05] pb-1">
                <button onClick={() => setActiveTab("basic")} className={`detail-tab ${activeTab === "basic" ? "active" : ""}`}>基础配置</button>
                <button onClick={() => setActiveTab("params")} className={`detail-tab ${activeTab === "params" ? "active" : ""}`}>能力参数</button>
                <button onClick={() => setActiveTab("backend")} className={`detail-tab ${activeTab === "backend" ? "active" : ""}`}>
                  协议模板 <span className="text-[10px] opacity-50">后端</span>
                </button>
              </div>

              {/* Basic Tab */}
              {activeTab === "basic" && (
                <div className="animate-slide-up">
                  <div className="glass rounded-xl p-5 mb-4">
                    <div className="section-title"><i className="fas fa-info-circle text-slate-500" /> 基本信息</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group mb-0">
                        <label className="form-label">显示名称</label>
                        <input
                          type="text"
                          className="form-input"
                          value={config.display_name || selectedModel?.display_name || selectedModel?.model || ""}
                          onChange={(e) => {
                            if (resolvedConfig) {
                              const updated = { ...resolvedConfig };
                              const entry = updated[currentType as keyof ResolvedConfig];
                              if (entry) setResolvedConfig({ ...updated, [currentType]: { ...entry, display_name: e.target.value } });
                            }
                          }}
                          placeholder="输入自定义显示名称"
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="form-label">模型 ID <span className="text-[10px] text-slate-500 font-normal">网关调用标识</span></label>
                        <input
                          type="text"
                          className="form-input font-mono text-xs"
                          value={config.model}
                          onChange={(e) => {
                            if (resolvedConfig) {
                              const updated = { ...resolvedConfig };
                              const entry = updated[currentType as keyof ResolvedConfig];
                              if (entry) setResolvedConfig({ ...updated, [currentType]: { ...entry, model: e.target.value } });
                            }
                          }}
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="form-label">厂商平台</label>
                        <select
                          className="form-select"
                          value={config.provider}
                          onChange={(e) => {
                            if (resolvedConfig) {
                              const updated = { ...resolvedConfig };
                              const entry = updated[currentType as keyof ResolvedConfig];
                              if (entry) setResolvedConfig({ ...updated, [currentType]: { ...entry, provider: e.target.value } });
                            }
                          }}
                        >
                          {Object.entries(PROVIDER_META).map(([k, v]) => (
                            <option key={k} value={k}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group mb-0">
                        <label className="form-label">协议类型 <span className="text-[10px] text-slate-500 font-normal">自动识别</span></label>
                        <input type="text" className="form-input" value={pMeta?.protocol || "custom"} disabled />
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-xl p-5 mb-4">
                    <div className="section-title"><i className="fas fa-plug text-slate-500" /> 端点与密钥</div>
                    <div className="form-group mb-0">
                      <label className="form-label">API 端点</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="form-input flex-1 font-mono text-xs"
                          value={config.endpoint || ""}
                          onChange={(e) => {
                            if (resolvedConfig) {
                              const updated = { ...resolvedConfig };
                              const entry = updated[currentType as keyof ResolvedConfig];
                              if (entry) setResolvedConfig({ ...updated, [currentType]: { ...entry, endpoint: e.target.value } });
                            }
                          }}
                        />
                        <select className="form-select w-32" value={newEnv} onChange={(e) => setNewEnv(e.target.value as "dev" | "test" | "prod")}>
                          <option value="dev">开发环境</option>
                          <option value="test">测试环境</option>
                          <option value="prod">生产环境</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group mb-0 mt-4">
                      <label className="form-label">API 密钥</label>
                      <div className="relative">
                        <input
                          type={showKey ? "text" : "password"}
                          className="form-input pr-20 font-mono text-xs"
                          value={config.api_key || ""}
                          onChange={(e) => {
                            if (resolvedConfig) {
                              const updated = { ...resolvedConfig };
                              const entry = updated[currentType as keyof ResolvedConfig];
                              if (entry) setResolvedConfig({ ...updated, [currentType]: { ...entry, api_key: e.target.value } });
                            }
                          }}
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
                        >
                          <i className={`fas ${showKey ? "fa-eye-slash" : "fa-eye"}`} />
                          {showKey ? "隐藏" : "显示"}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-2">密钥将加密存储（AES-256-GCM），仅用于网关发起 API 调用</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Params Tab */}
              {activeTab === "params" && (
                <div className="animate-slide-up">
                  {selectedModel && Object.keys(selectedModel.params || {}).length > 0 ? (
                    <div className="glass rounded-xl p-5">
                      <div className="section-title"><i className="fas fa-sliders-h text-slate-500" /> 能力参数</div>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(selectedModel.params).map(([key, param]) => (
                          <div key={key} className="form-group mb-0">
                            <label className="form-label">{key}</label>
                            {param.options ? (
                              <select className="form-select">
                                {param.options.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : param.range ? (
                              <input type="number" className="form-input" defaultValue={param.default as number} min={param.range[0]} max={param.range[1]} />
                            ) : (
                              <input type="text" className="form-input" defaultValue={param.default as string} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-5">
                      <div className="text-xs text-slate-500 p-4">暂无业务参数配置</div>
                    </div>
                  )}
                </div>
              )}

              {/* Backend Tab */}
              {activeTab === "backend" && (
                <div className="animate-slide-up">
                  <div className="backend-panel mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="fas fa-server text-cyan-500 text-xs" />
                      <span className="text-xs font-semibold text-cyan-400">后端协议模板</span>
                    </div>
                    <p className="hint-text mb-3">以下为 Jinja2 参数映射模板、异步轮询配置与认证信息。通常由后端根据厂商+类型自动生成，高级用户可手动覆盖。</p>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="switch" style={{ transform: "scale(0.85)", transformOrigin: "left" }}>
                        <input type="checkbox" checked={useDefaultSchema} onChange={(e) => setUseDefaultSchema(e.target.checked)} />
                        <span className="slider" />
                      </label>
                      <span className="text-xs text-slate-400">使用后端默认模板（推荐）</span>
                    </div>
                  </div>
                  {useDefaultSchema ? (
                    <div className="glass rounded-xl p-5">
                      <div className="text-xs text-slate-500 font-mono whitespace-pre-wrap break-all">
                        {`// 后端自动生成默认模板\nprotocol: "${pMeta?.protocol || "custom"}"\nauth: { type: "${pMeta?.authType || "bearer"}" }\n\n// requestTemplate / responseTemplate 由后端自动装配。`}
                      </div>
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-5">
                      <div className="section-title"><i className="fas fa-code text-slate-500" /> ParamsSchema JSON</div>
                      <textarea className="form-textarea" style={{ minHeight: "300px" }} placeholder='{"protocol":"dashscope", "requestTemplate": {...}, "polling": {...}}' />
                    </div>
                  )}
                </div>
              )}

              <div className="h-12" />
            </div>
          ) : null}
        </main>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div id="toast-container" className="toast-container">
          <div className={`toast ${toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-red-500" : toast.type === "warning" ? "bg-amber-500" : "bg-primary"}`}>
            <i className={`fas ${
              toast.type === "success" ? "fa-check-circle" :
              toast.type === "error" ? "fa-times-circle" :
              toast.type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle"
            }`} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAddModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-box custom-scroll">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">添加新模型</h3>
                <button onClick={() => setShowAddModal(false)} className="btn-icon w-9 h-9 rounded-lg text-slate-400 hover:text-white">
                  <i className="fas fa-times" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Quick Presets */}
                <div>
                  <label className="form-label">快速预设 <span className="text-[10px] text-slate-500 font-normal">（选择后自动填充）</span></label>
                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scroll pr-1">
                    {MODEL_PRESETS.map((pr, idx) => {
                      const p = PROVIDER_META[pr.provider];
                      return (
                        <div
                          key={idx}
                          onClick={() => handlePresetSelect(idx)}
                          className={`preset-card ${idx === newPresetIdx ? "selected" : ""}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`fas ${p.icon}`} style={{ color: p.color, fontSize: "10px" }} />
                            <span className="text-xs font-semibold text-white">{pr.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{p.name} · {TYPE_META[pr.type].title}</div>
                          <div className="text-[10px] text-slate-600 mt-1 truncate font-mono">{pr.modelId}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Type Selection */}
                <div>
                  <label className="form-label">能力类型 <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-5 gap-2">
                    {ALL_TYPES.map((type) => {
                      const t = TYPE_META[type];
                      return (
                        <button
                          key={type}
                          onClick={() => handleNewTypeChange(type)}
                          className={`type-option ${type === newType ? "selected" : ""}`}
                        >
                          <i className={`fas ${t.icon} mb-1 block text-sm`} style={{ color: t.color }} />
                          <div className="text-[10px] leading-tight">{t.title.split(" ")[0]}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Provider Selection */}
                <div>
                  <label className="form-label">厂商平台 <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(PROVIDER_META).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => handleNewProviderChange(k)}
                        className={`provider-option ${k === newProvider ? "selected" : ""}`}
                      >
                        <i className={`fas ${v.icon}`} style={{ color: v.color, fontSize: "15px" }} />
                        <div className="text-[10px] text-slate-400">{v.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group mb-0">
                    <label className="form-label">模型名称 <span className="text-red-400">*</span></label>
                    <input type="text" className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：万相2.7 文生视频" />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">模型 ID <span className="text-red-400">*</span></label>
                    <input type="text" className="form-input" value={newModelId} onChange={(e) => setNewModelId(e.target.value)} placeholder="wan2.7-t2v-prod" />
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">API 端点</label>
                  <input type="text" className="form-input" value={newEndpoint} onChange={(e) => setNewEndpoint(e.target.value)} placeholder="https://..." />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">API 密钥</label>
                  <div className="relative">
                    <input
                      type="password"
                      className="form-input pr-12"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label">环境</label>
                  <select className="form-select" value={newEnv} onChange={(e) => setNewEnv(e.target.value as "dev" | "test" | "prod")}>
                    <option value="dev">开发环境</option>
                    <option value="test">测试环境</option>
                    <option value="prod">生产环境</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white transition-all font-medium">
                  取消
                </button>
                <button onClick={handleConfirmAdd} className="flex-1 py-2.5 rounded-xl btn-primary text-white text-sm font-semibold">
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && deleteTarget && (
        <div className="modal-overlay active">
          <div className="modal-box" style={{ width: "400px" }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-400 text-xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">确认删除</h3>
              <p className="text-sm text-slate-400 mb-6">
                确定要删除 <span className="text-white font-semibold">{deleteTarget.display_name || deleteTarget.model}</span> 吗？此操作不可撤销。
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white transition-all font-medium">
                  取消
                </button>
                <button onClick={handleConfirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Global Styles ── */}
      <style jsx global>{`
        :root {
          --bg-deep: #030712;
          --bg-surface: #0b1121;
          --bg-card: rgba(17, 24, 39, 0.55);
          --border-subtle: rgba(255, 255, 255, 0.04);
          --border-soft: rgba(255, 255, 255, 0.07);
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --radius-sm: 10px;
          --radius-md: 14px;
          --radius-lg: 18px;
          --radius-xl: 22px;
        }

        .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.06); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.12); }

        .nav-rail {
          width: 72px;
          background: rgba(8, 13, 26, 0.7);
          backdrop-filter: blur(20px);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 0;
          flex-shrink: 0;
          z-index: 20;
          gap: 2px;
        }
        .nav-item {
          width: 48px;
          min-height: 50px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          border: 1.5px solid transparent;
          padding: 4px 0;
          gap: 2px;
          color: var(--text-muted);
          background: transparent;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.03);
          color: #cbd5e1;
          border-color: rgba(255, 255, 255, 0.05);
        }
        .nav-item.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(139, 92, 246, 0.1));
          border-color: rgba(99, 102, 241, 0.35);
          color: #e0e7ff;
          box-shadow: 0 0 24px rgba(99, 102, 241, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .nav-item .icon { font-size: 17px; transition: transform 0.2s ease; }
        .nav-item:hover .icon { transform: translateY(-1px); }
        .nav-item.active .icon { transform: scale(1.05); }
        .nav-item .label {
          font-size: 9px;
          font-weight: 500;
          text-align: center;
          line-height: 1.15;
          letter-spacing: 0.01em;
          max-width: 56px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nav-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          min-width: 17px;
          height: 17px;
          border-radius: 9px;
          background: rgba(99, 102, 241, 0.9);
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          border: 2px solid var(--bg-deep);
          letter-spacing: 0;
          line-height: 1;
        }

        .list-panel {
          width: 370px;
          min-width: 320px;
          max-width: 430px;
          background: rgba(8, 14, 26, 0.35);
          backdrop-filter: blur(8px);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .list-header { padding: 18px 18px 14px; border-bottom: 1px solid var(--border-subtle); }
        .list-toolbar { padding: 10px 14px; display: flex; gap: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); align-items: center; }
        .list-body { flex: 1; overflow-y: auto; padding: 6px 8px; }

        .model-card {
          padding: 13px 14px;
          border-radius: var(--radius-md);
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: all 0.22s ease;
          margin-bottom: 4px;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.015);
        }
        .model-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.07);
          transform: translateX(2px);
        }
        .model-card.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.08);
        }
        .model-card.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 14px;
          bottom: 14px;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(to bottom, #6366f1, #8b5cf6);
        }
        .status-dot {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          border-radius: 0 3px 3px 0;
          transition: all 0.3s ease;
        }

        .detail-panel {
          flex: 1;
          overflow-y: auto;
          background: radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 60%, rgba(139, 92, 246, 0.02) 0%, transparent 50%),
              var(--bg-deep);
        }

        .form-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.5);
          color: #e2e8f0;
          font-size: 13px;
          transition: all 0.25s ease;
          font-family: inherit;
          box-sizing: border-box;
        }
        .form-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
          background: rgba(20, 30, 50, 0.7);
        }
        .form-input::placeholder { color: #475569; }
        .form-input:disabled { opacity: 0.5; cursor: not-allowed; background: rgba(15, 23, 42, 0.3); }

        .form-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.5);
          color: #e2e8f0;
          font-size: 13px;
          appearance: none;
          cursor: pointer;
          transition: all 0.25s ease;
          font-family: inherit;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
          box-sizing: border-box;
        }
        .form-select:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
        }
        .form-select option { background: #0f172a; color: #e2e8f0; }

        .form-textarea {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-sm);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.5);
          color: #e2e8f0;
          font-size: 12px;
          resize: vertical;
          min-height: 100px;
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
          transition: all 0.25s ease;
          box-sizing: border-box;
        }
        .form-textarea:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
        }

        .form-label {
          display: block;
          font-size: 11.5px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }
        .form-group { margin-bottom: 18px; }
        .section-title {
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #64748b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .glass {
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-soft);
          border-radius: var(--radius-lg);
        }

        .btn-primary {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: #fff;
          font-weight: 600;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          border: none;
          cursor: pointer;
          border-radius: var(--radius-sm);
          letter-spacing: 0.01em;
        }
        .btn-primary:hover {
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.35);
          transform: translateY(-1px);
          background: linear-gradient(135deg, #6d6ff7, #8b5cf6);
        }
        .btn-primary:active { transform: translateY(0); box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25); }

        .btn-secondary {
          background: rgba(30, 41, 59, 0.5);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          transition: all 0.2s ease;
          cursor: pointer;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }
        .btn-secondary:hover {
          background: rgba(30, 41, 59, 0.75);
          border-color: rgba(99, 102, 241, 0.3);
          color: #e2e8f0;
        }

        .btn-ghost {
          color: #64748b;
          transition: all 0.2s ease;
          cursor: pointer;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1.5px solid transparent;
        }
        .btn-ghost:hover {
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.06);
        }

        .btn-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1.5px solid transparent;
          background: transparent;
          color: var(--text-muted);
        }
        .btn-icon:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .badge {
          font-size: 10px;
          padding: 2px 9px;
          border-radius: 6px;
          font-weight: 600;
          letter-spacing: 0.02em;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .badge-prod { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
        .badge-test { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
        .badge-dev { background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); }
        .badge-online { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }

        .filter-pill {
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1.5px solid transparent;
          background: transparent;
          white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .filter-pill:hover { background: rgba(255, 255, 255, 0.03); color: #94a3b8; border-color: rgba(255, 255, 255, 0.05); }
        .filter-pill.active {
          background: rgba(99, 102, 241, 0.12);
          color: #a5b4fc;
          border-color: rgba(99, 102, 241, 0.3);
          font-weight: 600;
        }

        .detail-tab {
          padding: 8px 18px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1.5px solid transparent;
          background: transparent;
          letter-spacing: 0.01em;
        }
        .detail-tab:hover { color: #94a3b8; background: rgba(255, 255, 255, 0.03); }
        .detail-tab.active {
          color: #e2e8f0;
          background: rgba(99, 102, 241, 0.14);
          border-color: rgba(99, 102, 241, 0.3);
          font-weight: 600;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(10px);
          z-index: 100;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-overlay.active { opacity: 1; pointer-events: auto; }
        .modal-box {
          background: #0b1121;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          width: 580px;
          max-width: 93vw;
          max-height: 88vh;
          overflow-y: auto;
          transform: scale(0.95);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
        }
        .modal-overlay.active .modal-box { transform: scale(1); }

        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 200;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }
        .toast {
          padding: 12px 18px;
          border-radius: var(--radius-md);
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 9px;
          animation: toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.4);
          pointer-events: auto;
          letter-spacing: 0.01em;
        }
        @keyframes toastIn {
          from { transform: translateX(80px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 42px;
          height: 23px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: #334155;
          transition: .3s ease;
          border-radius: 23px;
          border: 1.5px solid rgba(255, 255, 255, 0.06);
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 17px;
          width: 17px;
          left: 2px;
          bottom: 2px;
          background: #e2e8f0;
          transition: .3s ease;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        input:checked + .slider {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          border-color: transparent;
        }
        input:checked + .slider:before { transform: translateX(19px); background: #fff; }

        .empty-state { text-align: center; padding: 60px 20px; }
        .empty-state .empty-icon { font-size: 52px; opacity: 0.2; margin-bottom: 14px; display: block; }

        .backend-panel {
          background: rgba(6, 182, 212, 0.03);
          border: 1.5px dashed rgba(6, 182, 212, 0.15);
          border-radius: var(--radius-md);
          padding: 16px 18px;
        }
        .hint-text { font-size: 11px; color: #475569; line-height: 1.6; }

        .preset-card {
          padding: 12px;
          border-radius: var(--radius-sm);
          border: 1.5px solid rgba(255, 255, 255, 0.05);
          background: rgba(30, 41, 59, 0.25);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .preset-card:hover {
          border-color: rgba(99, 102, 241, 0.35);
          background: rgba(99, 102, 241, 0.08);
          transform: translateY(-1px);
        }
        .preset-card.selected {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(99, 102, 241, 0.14);
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.1);
        }

        .type-option {
          padding: 10px 6px;
          border-radius: var(--radius-sm);
          border: 1.5px solid rgba(255, 255, 255, 0.06);
          background: rgba(30, 41, 59, 0.25);
          color: #94a3b8;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          font-weight: 500;
        }
        .type-option:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .type-option.selected {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(99, 102, 241, 0.14);
          color: #c7d2fe;
          font-weight: 600;
        }

        .provider-option {
          padding: 10px 4px;
          border-radius: var(--radius-sm);
          border: 1.5px solid rgba(255, 255, 255, 0.06);
          background: rgba(30, 41, 59, 0.25);
          color: #94a3b8;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          font-weight: 500;
        }
        .provider-option:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .provider-option.selected {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(99, 102, 241, 0.14);
          color: #c7d2fe;
          font-weight: 600;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.35s ease-out; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

        .primary { --primary: #6366f1; }
      `}</style>
    </div>
  );
}