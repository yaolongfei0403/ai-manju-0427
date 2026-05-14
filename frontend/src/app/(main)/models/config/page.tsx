"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import {
  getModels,
  createModel,
  updateModel,
  deleteModel,
  testModelConnection,
  getResolvedConfig,
  updateResolvedConfig,
  getModelCapabilities,
  AIModel,
  CreateModelData,
  UpdateModelData,
  TestResult,
  ResolvedConfig,
  ConfigEntry,
  ModelCapability,
} from "@/lib/api/models";

type ModelType = "llm" | "t2i" | "i2v" | "tts";
type ConfigSource = "db" | "yaml";

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string }> = {
  openai: { name: "OpenAI", icon: "fa-circle", color: "#10a37f" },
  anthropic: { name: "Anthropic", icon: "fa-diamond", color: "#d4a574" },
  google: { name: "Google", icon: "fa-google", color: "#4285f4" },
  deepseek: { name: "DeepSeek", icon: "fa-searchengin", color: "#4d6bfa" },
  aliyun: { name: "阿里云", icon: "fa-cloud", color: "#ff6a00" },
  siliconflow: { name: "硅基流动", icon: "fa-microchip", color: "#6366f1" },
  bailian: { name: "百炼", icon: "fa-fire", color: "#ff6a00" },
  volc: { name: "火山引擎", icon: "fa-bolt", color: "#fe4c4c" },
  wanx: { name: "万相", icon: "fa-images", color: "#6366f1" },
  custom: { name: "自定义", icon: "fa-cog", color: "#64748b" },
};

const TYPE_LABELS: Record<ModelType, { name: string; desc: string; icon: string; color: string }> = {
  llm: { name: "LLM 大模型", desc: "文本生成 / 对话", icon: "fa-brain", color: "primary" },
  t2i: { name: "文生图模型", desc: "Text-to-Image", icon: "fa-image", color: "cyan" },
  i2v: { name: "图生视频模型", desc: "Image-to-Video", icon: "fa-video", color: "accent" },
  tts: { name: "语音合成", desc: "Text-to-Speech", icon: "fa-music", color: "violet" },
};

export default function ModelConfigPage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  const [currentType, setCurrentType] = useState<ModelType>("llm");
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AIModel | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [configSource, setConfigSource] = useState<ConfigSource>("yaml");
  const [yamlConfig, setYamlConfig] = useState<ResolvedConfig | null>(null);
  const [yamlCapabilities, setYamlCapabilities] = useState<ModelCapability[]>([]);
  const [yamlSelected, setYamlSelected] = useState<{ type: ModelType; entry: ConfigEntry | null } | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState<CreateModelData>({
    type: "llm",
    code: "",
    name: "",
    provider: "openai",
    description: "",
    endpoint: "",
    apiKey: "",
    modelName: "",
    modelId: "",
    maxTokens: 4096,
    temperature: 0.7,
    systemPrompt: "",
    resolution: "1024x1024",
    quality: "standard",
    duration: 5,
    fps: 24,
    timeout: 30,
    retry: 3,
  });

  useEffect(() => {
    if (!checkAuth()) {
      router.push("/login");
    }
  }, [checkAuth, router]);

  // Load YAML config
  const loadYamlConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const [config, capabilities] = await Promise.all([
        getResolvedConfig(),
        getModelCapabilities(),
      ]);
      setYamlConfig(config);
      setYamlCapabilities(capabilities);
    } catch (error) {
      showToastMessage("加载配置失败", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    if (configSource === "yaml") {
      await loadYamlConfig();
      return;
    }
    try {
      setIsLoading(true);
      const data = await getModels(currentType);
      setModels(data);
    } catch (error) {
      showToastMessage("加载模型失败", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentType, configSource, loadYamlConfig]);

  // Reload models when type changes
  useEffect(() => {
    if (isAuthenticated) {
      loadModels();
    }
  }, [isAuthenticated, loadModels]);

  // Update selected model when models list changes
  useEffect(() => {
    if (selectedModel) {
      const updated = models.find((m) => m.id === selectedModel.id);
      if (updated) {
        setSelectedModel(updated);
      } else {
        setSelectedModel(null);
      }
    }
  }, [models, selectedModel]);

  const showToastMessage = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTabChange = (type: ModelType) => {
    setCurrentType(type);
    setSelectedModel(null);
    setTestResult(null);
    setYamlSelected(null);
    setFormData((prev) => ({ ...prev, type }));
  };

  const handleSelectModel = (model: AIModel) => {
    setSelectedModel(model);
    setTestResult(null);
    setFormData({
      type: model.type as ModelType,
      code: model.code,
      name: model.name,
      provider: model.provider,
      description: model.description || "",
      endpoint: model.endpoint,
      apiKey: model.apiKey || "",
      modelName: model.modelName || "",
      modelId: (model as any).modelId || "",
      maxTokens: model.maxTokens || 4096,
      temperature: model.temperature || 0.7,
      systemPrompt: model.systemPrompt || "",
      resolution: model.resolution || "1024x1024",
      quality: model.quality || "standard",
      duration: model.duration || 5,
      fps: model.fps || 24,
      timeout: model.timeout || 30,
      retry: model.retry || 3,
    });
  };

  const handleAddNew = () => {
    setSelectedModel(null);
    setFormData({
      type: currentType,
      code: "",
      name: "",
      provider: "openai",
      description: "",
      endpoint: "",
      apiKey: "",
      modelName: "",
      modelId: "",
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: "",
      resolution: "1024x1024",
      quality: "standard",
      duration: 5,
      fps: 24,
      timeout: 30,
      retry: 3,
    });
    setShowAddModal(true);
  };

  const handleEditModel = (model: AIModel) => {
    setSelectedModel(model);
    setFormData({
      type: model.type as ModelType,
      code: model.code,
      name: model.name,
      provider: model.provider,
      description: model.description || "",
      endpoint: model.endpoint,
      apiKey: model.apiKey || "",
      modelName: model.modelName || "",
      modelId: (model as any).modelId || "",
      maxTokens: model.maxTokens || 4096,
      temperature: model.temperature || 0.7,
      systemPrompt: model.systemPrompt || "",
      resolution: model.resolution || "1024x1024",
      quality: model.quality || "standard",
      duration: model.duration || 5,
      fps: model.fps || 24,
      timeout: model.timeout || 30,
      retry: model.retry || 3,
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.code || !formData.endpoint) {
        showToastMessage("请填写必填字段", "error");
        return;
      }

      if (selectedModel) {
        // Update
        const updateData: UpdateModelData = {
          name: formData.name,
          provider: formData.provider,
          description: formData.description,
          endpoint: formData.endpoint,
          apiKey: formData.apiKey,
          modelName: formData.modelName,
          modelId: formData.modelId,
          status: formData.status,
          maxTokens: formData.type === "llm" ? formData.maxTokens : undefined,
          temperature: formData.type === "llm" ? formData.temperature : undefined,
          systemPrompt: formData.type === "llm" ? formData.systemPrompt : undefined,
          resolution: formData.type === "t2i" ? formData.resolution : undefined,
          quality: formData.type === "t2i" ? formData.quality : undefined,
          duration: formData.type === "i2v" ? formData.duration : undefined,
          fps: formData.type === "i2v" ? formData.fps : undefined,
          timeout: formData.timeout,
          retry: formData.retry,
        };
        await updateModel(selectedModel.id, updateData);
        showToastMessage("保存成功", "success");
      } else {
        // Create
        await createModel(formData);
        showToastMessage("添加成功", "success");
        setShowAddModal(false);
      }
      loadModels();
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "操作失败", "error");
    }
  };

  const handleTestConnection = async () => {
    if (!selectedModel) return;
    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await testModelConnection(selectedModel.id);
      setTestResult(result);
      loadModels();
    } catch (error) {
      showToastMessage("测试连接失败", "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteClick = (model: AIModel) => {
    setDeleteTarget(model);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteModel(deleteTarget.id);
      showToastMessage("删除成功", "success");
      setSelectedModel(null);
      setShowDeleteModal(false);
      loadModels();
    } catch (error) {
      showToastMessage("删除失败", "error");
    }
  };

  const onlineCount = models.filter((m) => m.status === "online").length;
  const offlineCount = models.filter((m) => m.status === "offline").length;

  return (
    <div className="h-full flex flex-col bg-[#020617]">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center cursor-pointer"
            onClick={() => router.push("/projects")}
          >
            <i className="fas fa-film text-white text-xs" />
          </div>
          <span className="text-sm font-bold text-white">AI漫剧工厂</span>
          <span className="text-xs text-slate-500">/</span>
          <span className="text-sm font-medium text-slate-300">模型配置中心</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="fas fa-server text-slate-600" />
            <span>
              API 状态: <span className="text-emerald-400">正常</span>
            </span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
              {user?.username?.charAt(0).toUpperCase() || "A"}
            </div>
            <span className="text-xs text-slate-400">{user?.username || "Admin"}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-[#0a0f1e]/50 flex flex-col">
          {/* Tabs */}
          <div className="p-4 space-y-2">
            {/* Config source toggle */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-surface/30 rounded-lg mb-2">
              <button
                onClick={() => { setConfigSource("yaml"); setYamlSelected(null); }}
                className={`flex-1 text-[11px] py-1.5 rounded-md transition-all ${
                  configSource === "yaml" ? "bg-primary/20 text-primary font-semibold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                YAML配置
              </button>
              <button
                onClick={() => { setConfigSource("db"); setSelectedModel(null); }}
                className={`flex-1 text-[11px] py-1.5 rounded-md transition-all ${
                  configSource === "db" ? "bg-primary/20 text-primary font-semibold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                数据库
              </button>
            </div>
            {(Object.keys(TYPE_LABELS) as ModelType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleTabChange(type)}
                className={`tab-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  currentType === type
                    ? "active bg-primary/10 text-white border-primary/40"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${TYPE_LABELS[type].color}/10`}
                >
                  <i className={`fas ${TYPE_LABELS[type].icon} text-${TYPE_LABELS[type].color} text-sm`} />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium">{TYPE_LABELS[type].name}</div>
                  <div className="text-[11px] text-slate-500">{TYPE_LABELS[type].desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mx-4 border-t border-white/5" />

          {/* Model List */}
          <div className="flex-1 overflow-y-auto scroll-hidden p-3">
            {configSource === "yaml" ? (
              yamlConfigView()
            ) : (
              <>
            <div className="flex items-center justify-between px-2 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                模型列表
              </span>
              <button
                onClick={handleAddNew}
                className="text-xs text-primary hover:text-white transition-colors flex items-center gap-1"
              >
                <i className="fas fa-plus" /> 添加
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-surface/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : configSource === "yaml" ? (
              yamlSidebarList()
            ) : models.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-cube text-slate-600 text-2xl mb-2" />
                <p className="text-xs text-slate-500">暂无可用模型</p>
                <button
                  onClick={handleAddNew}
                  className="mt-2 text-xs text-primary hover:text-white"
                >
                  点击添加
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {models.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => handleSelectModel(model)}
                    className={`model-item flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all ${
                      selectedModel?.id === model.id
                        ? "active bg-primary/10 border-l-[3px] border-primary"
                        : ""
                    }`}
                  >
                    <div
                      className="provider-icon w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: `${PROVIDER_INFO[model.provider]?.color || "#64748b"}15`,
                        color: PROVIDER_INFO[model.provider]?.color || "#64748b",
                      }}
                    >
                      <i className={`fas ${PROVIDER_INFO[model.provider]?.icon || "fa-cog"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {model.name}
                        </span>
                        <span
                          className={`env-tag text-[10px] px-1.5 py-0.5 rounded ${
                            model.env === "prod"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : model.env === "test"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              : "bg-primary/15 text-primary border border-primary/20"
                          }`}
                        >
                          {model.env === "prod" ? "生产" : model.env === "test" ? "测试" : "开发"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {PROVIDER_INFO[model.provider]?.name || model.provider}
                      </div>
                    </div>
                    <div
                      className={`status-dot w-2 h-2 rounded-full ${
                        model.status === "online"
                          ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                          : model.status === "testing"
                          ? "bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse"
                          : "bg-red-400 shadow-[0_0_8px_#f87171]"
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
              </>
            )}
          </div>

          {/* Stats */}
          <div className="p-4 border-t border-white/5">
            {configSource === "db" && (
            <>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>在线模型</span>
              <span className="text-emerald-400 font-mono">{onlineCount}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>离线模型</span>
              <span className="text-red-400 font-mono">{offlineCount}</span>
            </div>
            </>
            )}
          </div>
        </aside>

        {/* Right Detail Panel */}
        <main className="flex-1 flex flex-col bg-[#020617]">
          {configSource === "yaml" && yamlSelected ? (
            <YamlConfigDetail
              type={yamlSelected.type}
              entry={yamlSelected.entry}
              capabilities={yamlCapabilities.filter(c => c.provider === (yamlSelected.entry?.provider || "") && c.model === (yamlSelected.entry?.model || ""))}
              onUpdate={async (entry) => {
                try {
                  await updateResolvedConfig({ [yamlSelected.type]: entry });
                  await loadYamlConfig();
                  showToastMessage("保存成功", "success");
                } catch (e) {
                  showToastMessage("保存失败", "error");
                }
              }}
              onTest={async () => {
                if (!yamlSelected.entry) return;
                try {
                  setIsTesting(true);
                  const result = await testModelConnection(yamlSelected.type as string) as any;
                  setTestResult(result);
                } catch (e) {
                  showToastMessage("测试失败", "error");
                } finally {
                  setIsTesting(false);
                }
              }}
              isTesting={isTesting}
              testResult={testResult}
            />
          ) : configSource === "yaml" ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-file-code text-slate-700 text-4xl mb-4" />
                <p className="text-sm text-slate-500">从左侧选择一个模型类型进行配置</p>
              </div>
            </div>
          ) : selectedModel ? (
            <ModelDetail
              model={selectedModel}
              formData={formData}
              setFormData={setFormData}
              testResult={testResult}
              isTesting={isTesting}
              onSave={handleSave}
              onTest={handleTestConnection}
              onDelete={() => handleDeleteClick(selectedModel)}
              onEdit={() => handleEditModel(selectedModel)}
              providerInfo={PROVIDER_INFO}
              typeLabels={TYPE_LABELS}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-sliders-h text-slate-700 text-4xl mb-4" />
                <p className="text-sm text-slate-500">请从左侧选择一个模型进行配置</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddModelModal
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onClose={() => setShowAddModal(false)}
          typeLabels={TYPE_LABELS}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-[360px]">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-400 text-xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">确认删除</h3>
              <p className="text-sm text-slate-400 mb-6">
                确定要删除模型{" "}
                <span className="text-white font-medium">{deleteTarget.name}</span> 吗？此操作不可撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium z-50 animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : toast.type === "error"
              ? "bg-red-500 text-white"
              : "bg-primary text-white"
          }`}
        >
          <i
            className={`fas ${
              toast.type === "success"
                ? "fa-check-circle"
                : toast.type === "error"
                ? "fa-times-circle"
                : "fa-info-circle"
            }`}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// Model Detail Component
function ModelDetail({
  model,
  formData,
  setFormData,
  testResult,
  isTesting,
  onSave,
  onTest,
  onDelete,
  onEdit,
  providerInfo,
  typeLabels,
}: {
  model: AIModel;
  formData: CreateModelData;
  setFormData: React.Dispatch<React.SetStateAction<CreateModelData>>;
  testResult: TestResult | null;
  isTesting: boolean;
  onSave: () => void;
  onTest: () => void;
  onDelete: () => void;
  onEdit: () => void;
  providerInfo: Record<string, { name: string; icon: string; color: string }>;
  typeLabels: Record<string, { name: string; desc: string; icon: string; color: string }>;
}) {
  const [showKey, setShowKey] = useState(false);
  const modelType = model.type as ModelType;

  return (
    <div className="flex-1 overflow-y-auto scroll-hidden p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl border"
              style={{
                background: `${providerInfo[model.provider]?.color || "#64748b"}15`,
                color: providerInfo[model.provider]?.color || "#64748b",
                borderColor: `${providerInfo[model.provider]?.color || "#64748b"}20`,
              }}
            >
              <i className={`fas ${providerInfo[model.provider]?.icon || "fa-cog"}`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">{model.name}</h2>
                <span
                  className={`badge text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    model.type === "llm"
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : model.type === "t2i"
                      ? "bg-cyan/15 text-cyan border border-cyan/20"
                      : "bg-accent/15 text-accent border border-accent/20"
                  }`}
                >
                  {typeLabels[model.type]?.name}
                </span>
                <span
                  className={`env-tag text-[10px] px-1.5 py-0.5 rounded ${
                    model.env === "prod"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : model.env === "test"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "bg-primary/15 text-primary border border-primary/20"
                  }`}
                >
                  <i className="fas fa-circle text-[6px] mr-1" />
                  {model.env === "prod" ? "生产" : model.env === "test" ? "测试" : "开发"}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{model.description || "暂无描述"}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span>
                  <i className="fas fa-building mr-1" />
                  {providerInfo[model.provider]?.name || model.provider}
                </span>
                <span>
                  <i className="fas fa-calendar mr-1" />
                  {new Date(model.createdAt).toLocaleDateString("zh-CN")}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      model.status === "online"
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : model.status === "testing"
                        ? "bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse"
                        : "bg-red-400 shadow-[0_0_8px_#f87171]"
                    }`}
                  />
                  {model.status === "online" ? "在线" : model.status === "testing" ? "检测中" : "离线"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onTest}
              disabled={isTesting}
              className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-sm flex items-center gap-2 hover:border-primary/30 transition-all"
            >
              <i className={`fas fa-bolt text-amber-400 ${isTesting ? "animate-spin" : ""}`} />
              <span>{isTesting ? "检测中..." : "测试连接"}</span>
            </button>
            <button
              onClick={onSave}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all"
            >
              <i className="fas fa-save" />
              <span>保存配置</span>
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-sm text-red-400 hover:text-red-300 flex items-center gap-2 ml-auto hover:border-red-500/30 transition-all"
            >
              <i className="fas fa-trash-alt" />
              <span>删除</span>
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                testResult.success
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              <i
                className={`fas ${
                  testResult.success ? "fa-check-circle mr-2" : "fa-times-circle mr-2"
                }`}
              />
              {testResult.message}
              {testResult.latency && <span className="ml-2">延迟 {testResult.latency}ms</span>}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              基本信息
            </div>
            <div className="bg-surface/40 border border-white/5 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                    提供商
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="aliyun">阿里云</option>
                    <option value="siliconflow">硅基流动</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                    描述
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="模型用途描述"
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Endpoint Config */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              端点配置
            </div>
            <div className="bg-surface/40 border border-white/5 rounded-xl p-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                  API 端点 URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="https://api.example.com/v1/chat/completions"
                    className="flex-1 px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                  <select
                    value={formData.env || "prod"}
                    onChange={(e) =>
                      setFormData({ ...formData, env: e.target.value as "prod" | "test" | "dev" })
                    }
                    className="px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none w-28"
                  >
                    <option value="prod">生产环境</option>
                    <option value="test">测试环境</option>
                    <option value="dev">开发环境</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                  模型调用名称 (Model ID)
                </label>
                <input
                  type="text"
                  value={formData.modelId}
                  onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                  placeholder="例如：Qwen/Qwen2.5-7B-Instruct 或 gpt-4o"
                  className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                />
                <p className="text-[11px] text-slate-600 mt-1.5">实际API调用时传递的模型标识名称</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                    超时时间 (秒)
                  </label>
                  <input
                    type="number"
                    value={formData.timeout}
                    onChange={(e) =>
                      setFormData({ ...formData, timeout: parseInt(e.target.value) || 30 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                    重试次数
                  </label>
                  <input
                    type="number"
                    value={formData.retry}
                    onChange={(e) =>
                      setFormData({ ...formData, retry: parseInt(e.target.value) || 3 })
                    }
                    min={0}
                    max={5}
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              密钥配置
            </div>
            <div className="bg-surface/40 border border-white/5 rounded-xl p-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                  API 密钥
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="输入 API 密钥"
                    className="w-full px-3 py-2 pr-20 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white flex items-center gap-1"
                  >
                    <i className={`fas ${showKey ? "fa-eye-slash" : "fa-eye"}`} />
                    {showKey ? "隐藏" : "显示"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5">密钥将加密存储，仅用于 API 调用</p>
              </div>
            </div>
          </div>

          {/* Type-specific Config */}
          {modelType === "llm" && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                模型参数
              </div>
              <div className="bg-surface/40 border border-white/5 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                      最大 Token 数
                    </label>
                    <input
                      type="number"
                      value={formData.maxTokens}
                      onChange={(e) =>
                        setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 4096 })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                      Temperature
                    </label>
                    <input
                      type="number"
                      value={formData.temperature}
                      onChange={(e) =>
                        setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0.7 })
                      }
                      step={0.1}
                      min={0}
                      max={2}
                      className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                    系统提示词 (System Prompt)
                  </label>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    placeholder="输入系统提示词，用于定义模型行为..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none resize-y font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {modelType === "t2i" && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                图像生成参数
              </div>
              <div className="bg-surface/40 border border-white/5 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                      默认分辨率
                    </label>
                    <select
                      value={formData.resolution}
                      onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                    >
                      <option value="512x512">512 x 512</option>
                      <option value="768x768">768 x 768</option>
                      <option value="1024x1024">1024 x 1024</option>
                      <option value="1024x1792">1024 x 1792</option>
                      <option value="1792x1024">1792 x 1024</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                      图像质量
                    </label>
                    <select
                      value={formData.quality}
                      onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                    >
                      <option value="standard">标准</option>
                      <option value="hd">高清 (HD)</option>
                      <option value="ultra">超清</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modelType === "i2v" && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                视频生成参数
              </div>
              <div className="bg-surface/40 border border-white/5 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                      默认时长 (秒)
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: parseInt(e.target.value) || 5 })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                    >
                      <option value="3">3 秒</option>
                      <option value="5">5 秒</option>
                      <option value="10">10 秒</option>
                      <option value="15">15 秒</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                      帧率 (FPS)
                    </label>
                    <select
                      value={formData.fps}
                      onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) || 24 })}
                      className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                    >
                      <option value="24">24 FPS</option>
                      <option value="30">30 FPS</option>
                      <option value="60">60 FPS</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    );
  }
}

// TTS section in AddModelModal - inserted after i2v block
function YamlConfigDetail({
  type,
  entry,
  capabilities,
  onUpdate,
  onTest,
  isTesting,
  testResult,
}: {
  type: ModelType;
  entry: ConfigEntry | null;
  capabilities: ModelCapability[];
  onUpdate: (entry: ConfigEntry) => void;
  onTest: () => void;
  isTesting: boolean;
  testResult: TestResult | null;
}) {
  const [formData, setFormData] = useState({
    provider: entry?.provider || "",
    model: entry?.model || "",
    endpoint: entry?.endpoint || "",
    api_key: entry?.api_key || "",
    timeout: entry?.timeout || 60,
    extra: entry?.extra || {},
  });

  useEffect(() => {
    setFormData({
      provider: entry?.provider || "",
      model: entry?.model || "",
      endpoint: entry?.endpoint || "",
      api_key: entry?.api_key || "",
      timeout: entry?.timeout || 60,
      extra: entry?.extra || {},
    });
  }, [entry]);

  const caps = capabilities[0];
  const typeColor = TYPE_LABELS[type]?.color || "primary";

  return (
    <div className="flex-1 overflow-y-auto scroll-hidden p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl border"
              style={{
                background: `${PROVIDER_INFO[formData.provider]?.color || "#64748b"}15`,
                color: PROVIDER_INFO[formData.provider]?.color || "#64748b",
                borderColor: `${PROVIDER_INFO[formData.provider]?.color || "#64748b"}20`,
              }}
            >
              <i className={`fas ${PROVIDER_INFO[formData.provider]?.icon || "fa-cog"}`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">{TYPE_LABELS[type]?.name}</h2>
                <span className={`badge text-[10px] px-2 py-0.5 rounded-full font-semibold bg-${typeColor}/15 text-${typeColor} border border-${typeColor}/20`}>
                  YAML配置
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">通过 capabilities.yaml 声明式配置</p>
            </div>
          </div>
        </div>

        {/* Test / Save */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onTest}
              disabled={isTesting}
              className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-sm flex items-center gap-2 hover:border-primary/30 transition-all"
            >
              <i className={`fas fa-bolt text-amber-400 ${isTesting ? "animate-spin" : ""}`} />
              <span>{isTesting ? "检测中..." : "测试连接"}</span>
            </button>
            <button
              onClick={() => onUpdate(formData as ConfigEntry)}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all"
            >
              <i className="fas fa-save" />
              <span>保存配置</span>
            </button>
          </div>
          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${
              testResult.success ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              <i className={`fas ${testResult.success ? "fa-check-circle mr-2" : "fa-times-circle mr-2"}`} />
              {testResult.message}
              {testResult.latency && <span className="ml-2">延迟 {testResult.latency}ms</span>}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              基础配置
            </div>
            <div className="bg-surface/40 border border-white/5 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  >
                    <option value="">选择 Provider</option>
                    <option value="bailian">百炼</option>
                    <option value="wanx">万相</option>
                    <option value="volc">火山引擎</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">模型</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder={caps?.model || "如 qwen-max, seedance-2.0"}
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">Endpoint</label>
                  <input
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-400 mb-1.5">API Key</label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="${DASHSCOPE_API_KEY}"
                    className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Capability params */}
          {caps && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                能力参数 <span className="text-primary/60 text-[10px]">(来自 capabilities.yaml)</span>
              </div>
              <div className="bg-surface/40 border border-white/5 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(caps.params).map(([name, param]) => (
                    <div key={name}>
                      <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
                        {name}
                        <span className="text-[10px] text-slate-600 ml-1">({param.type})</span>
                      </label>
                      {param.options ? (
                        <select
                          value={(formData.extra as Record<string, unknown>)[name] as string || param.default as string || ""}
                          onChange={(e) => setFormData({ ...formData, extra: { ...formData.extra, [name]: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                        >
                          {param.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : param.range ? (
                        <input
                          type="number"
                          value={(formData.extra as Record<string, unknown>)[name] as number || param.default as number || param.range[0]}
                          min={param.range[0]}
                          max={param.range[1]}
                          step={param.type === "float" ? 0.1 : 1}
                          onChange={(e) => setFormData({ ...formData, extra: { ...formData.extra, [name]: parseFloat(e.target.value) } })}
                          className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={(formData.extra as Record<string, unknown>)[name] as string || param.default as string || ""}
                          onChange={(e) => setFormData({ ...formData, extra: { ...formData.extra, [name]: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
                        />
                      )}
                      {param.default !== undefined && (
                        <p className="text-[10px] text-slate-600 mt-1">默认: {String(param.default)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

// YAML config list view in sidebar
function yamlConfigView() {
  // This function is called inline in the sidebar
  return null; // placeholder replaced below
}
function AddModelModal({
  formData,
  setFormData,
  onSave,
  onClose,
  typeLabels,
}: {
  formData: CreateModelData;
  setFormData: React.Dispatch<React.SetStateAction<CreateModelData>>;
  onSave: () => void;
  onClose: () => void;
  typeLabels: Record<string, { name: string; desc: string; icon: string; color: string }>;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">添加新模型</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
              模型名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：GPT-4o"
              className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
              提供商
            </label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="deepseek">DeepSeek</option>
              <option value="aliyun">阿里云</option>
              <option value="siliconflow">硅基流动</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
              模型类型
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ModelType })}
              className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
            >
              <option value="llm">LLM 大模型</option>
              <option value="t2i">文生图模型</option>
              <option value="i2v">图生视频模型</option>
              <option value="tts">语音合成</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
              模型代码 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="例如：gpt4o (唯一标识)"
              className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
              API 端点 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder="https://api.openai.com/v1/chat/completions"
              className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
              API 密钥
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-400 mb-1.5">
              模型 ID（API调用时使用）
            </label>
            <input
              type="text"
              value={formData.modelId}
              onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
              placeholder="例如：Qwen/Qwen2.5-7B-Instruct"
              className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-white/10 text-white text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all"
          >
            添加模型
          </button>
        </div>
      </div>
    </div>
  );
}
