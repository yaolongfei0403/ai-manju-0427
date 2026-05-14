"use client";

import { ProjectFormData, GENRES } from "./ProjectForm";

// Style names mapping
const STYLE_NAMES: Record<string, string> = {
  "scifi-real": "写实科幻",
  "anime": "二次元动漫",
  "ink": "国风水墨",
  "comic": "欧美漫画",
  "pixel": "像素风格",
  "3d": "3D渲染",
  "sketch": "手绘素描",
  "custom": "自定义风格",
};

// Model names mapping
const LLM_NAMES: Record<string, string> = {
  gpt4o: "GPT-4o",
  claude: "Claude 3.5",
  deepseek: "DeepSeek-V3",
};

const T2I_NAMES: Record<string, string> = {
  sdxl: "SDXL",
  midjourney: "Midjourney V6",
  dalle3: "DALL·E 3",
};

const I2V_NAMES: Record<string, string> = {
  runway: "Runway Gen-3",
  pika: "Pika 1.5",
  luma: "Luma Dream Machine",
};

// Templates
const TEMPLATES = {
  scifi: {
    name: "科幻太空",
    desc: "写实科幻 / 16:9 / 太空歌剧",
    icon: "fa-rocket",
    colorClass: "bg-primary",
    iconClass: "text-primary",
    config: {
      style: "scifi-real",
      aspectRatio: "16:9",
      width: 1024,
      height: 576,
      genre: "scifi",
      styleTags: ["太空歌剧", "未来都市", "机甲"],
      llmModel: "gpt4o",
      t2iModel: "sdxl",
      i2vModel: "runway",
    },
  },
  anime: {
    name: "二次元奇幻",
    desc: "动漫风格 / 9:16 / 魔法世界",
    icon: "fa-wand-magic-sparkles",
    colorClass: "bg-accent",
    iconClass: "text-accent",
    config: {
      style: "anime",
      aspectRatio: "9:16",
      width: 576,
      height: 1024,
      genre: "fantasy",
      styleTags: ["魔法", "异世界", "冒险"],
      llmModel: "claude",
      t2iModel: "midjourney",
      i2vModel: "pika",
    },
  },
  ink: {
    name: "国风仙侠",
    desc: "水墨风格 / 16:9 / 仙侠修真",
    icon: "fa-mountain",
    colorClass: "bg-cyan",
    iconClass: "text-cyan",
    config: {
      style: "ink",
      aspectRatio: "16:9",
      width: 1024,
      height: 576,
      genre: "xianxia",
      styleTags: ["修仙", "古风", "神兽"],
      llmModel: "deepseek",
      t2iModel: "dalle3",
      i2vModel: "luma",
    },
  },
};

interface ProjectPreviewProps {
  data: ProjectFormData;
}

export default function ProjectPreview({ data }: ProjectPreviewProps) {
  // Calculate preview dimensions with aspect ratio
  const getPreviewDimensions = () => {
    const maxW = 280;
    const maxH = 180;
    const scale = Math.min(maxW / data.width, maxH / data.height);
    return {
      width: Math.round(data.width * scale),
      height: Math.round(data.height * scale),
    };
  };

  const previewDims = getPreviewDimensions();

  const genreName = GENRES.find((g) => g.value === data.genre)?.label || "未选择";
  const styleName = STYLE_NAMES[data.style] || "未选择";

  const handleApplyTemplate = (templateKey: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[templateKey];
    // This would need to be connected to parent state through callbacks
    // For now, just show visual feedback
    console.log("Apply template:", templateKey, template);
  };

  return (
    <div className="sticky top-8 space-y-6">
      {/* Preview Card */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">画面预览</h3>
          <span className="text-[10px] text-slate-500">{data.aspectRatio}</span>
        </div>
        <div
          className="preview-frame rounded-xl overflow-hidden mx-auto flex items-center justify-center"
          style={{
            width: previewDims.width,
            height: previewDims.height,
            maxWidth: "100%",
            aspectRatio: `${data.width}/${data.height}`,
          }}
        >
          {data.coverUrl ? (
            <img
              src={data.coverUrl}
              alt="封面预览"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="text-center z-10">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-image text-primary text-lg" />
                </div>
                <p className="text-xs text-slate-500">画面比例预览</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {data.width} × {data.height}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">风格</span>
            <span className="text-slate-300">{styleName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">题材</span>
            <span className="text-slate-300">{genreName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">分辨率</span>
            <span className="text-slate-300 font-mono">
              {data.width} × {data.height}
            </span>
          </div>
        </div>
      </div>

      {/* Model Config Preview */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">模型配置</h3>
          <span className="text-[10px] text-slate-500">默认</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-brain text-primary text-[10px]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">LLM</div>
              <div className="text-xs text-white font-medium truncate">
                {LLM_NAMES[data.llmModel] || data.llmModel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan/10 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-image text-cyan text-[10px]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">文生图</div>
              <div className="text-xs text-white font-medium truncate">
                {T2I_NAMES[data.t2iModel] || data.t2iModel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber/10 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-video text-amber text-[10px]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">图生视频</div>
              <div className="text-xs text-white font-medium truncate">
                {I2V_NAMES[data.i2vModel] || data.i2vModel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-lightbulb text-amber-400 text-xs" />
          <h3 className="text-sm font-semibold text-white">创建提示</h3>
        </div>
        <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
          <div className="flex gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>项目名称创建后不可修改，请谨慎命名</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>风格与尺寸可在项目创建后随时调整</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>模型配置作为项目默认值，各环节可单独覆盖</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>项目内的资产（角色、场景、道具）将被所有分集共享</span>
          </div>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">快捷模板</h3>
          <span className="text-[10px] text-slate-500">一键套用</span>
        </div>
        <div className="space-y-2">
          {Object.entries(TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              className="w-full p-3 rounded-xl bg-surface/50 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg ${template.colorClass}/10 flex items-center justify-center flex-shrink-0`}
                >
                  <i className={`fas ${template.icon} ${template.iconClass} text-xs`} />
                </div>
                <div>
                  <div className="text-xs font-medium text-white group-hover:text-indigo-400 transition-colors">
                    {template.name}
                  </div>
                  <div className="text-[10px] text-slate-500">{template.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
