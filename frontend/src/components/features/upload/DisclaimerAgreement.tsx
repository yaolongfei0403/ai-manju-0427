"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNovelStore } from "@/stores/novel";

const AGREEMENT_ITEMS = [
  {
    id: "agree1",
    title: "原创声明",
    badge: "必填",
    badgeColor: "bg-emerald/15 text-emerald",
    iconBg: "from-emerald/15 to-emerald/5",
    iconBorder: "border-emerald/20",
    iconColor: "text-emerald",
    icon: "fas fa-pen-fancy",
    content: "我确认上传的作品为本人原创，或我已获得原作者的完整授权，有权使用该作品进行 AI 漫剧改编与生成。",
  },
  {
    id: "agree2",
    title: "AI 生成内容授权",
    badge: "必填",
    badgeColor: "bg-primary/15 text-primary",
    iconBg: "from-primary/15 to-primary/5",
    iconBorder: "border-primary/20",
    iconColor: "text-primary",
    icon: "fas fa-robot",
    content: "我同意平台使用 AI 技术对上传内容进行分析和处理，包括但不限于角色提取、场景识别、分镜拆分等自动化处理流程。",
  },
  {
    id: "agree3",
    title: "资产使用授权",
    badge: "必填",
    badgeColor: "bg-cyan/15 text-cyan",
    iconBg: "from-cyan/15 to-cyan/5",
    iconBorder: "border-cyan/20",
    iconColor: "text-cyan",
    icon: "fas fa-images",
    content: "我同意将提取出的角色、场景、道具等资产存入平台资产库，用于后续分镜生成和参考图注入。这些资产仅用于本作品的漫剧生成，不会用于其他用途。",
  },
  {
    id: "agree4",
    title: "责任免除",
    badge: "必填",
    badgeColor: "bg-amber/15 text-amber",
    iconBg: "from-amber/15 to-amber/5",
    iconBorder: "border-amber/20",
    iconColor: "text-amber",
    icon: "fas fa-shield-halved",
    content: "我了解 AI 生成内容可能存在偏差，平台不对生成内容的准确性、完整性或艺术质量承担责任。最终成品需由本人审核确认。",
  },
];

interface DisclaimerAgreementProps {
  fileId: string;
  projectId?: string;
}

export default function DisclaimerAgreement({ fileId, projectId }: DisclaimerAgreementProps) {
  const router = useRouter();
  const { agreeDisclaimer, clearError } = useNovelStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const allChecked = checkedItems.size === AGREEMENT_ITEMS.length;
  const checkedCount = checkedItems.size;

  const clearAllErrors = () => {
    setApiError(null);
    clearError();
  };

  const handleToggleItem = (id: string) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCheckedItems(newSet);
    if (newSet.size === AGREEMENT_ITEMS.length) {
      setApiError(null);
    }
  };

  const handleCheckboxChange = (id: string, checked: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(checkedItems);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setCheckedItems(newSet);
    if (checked && newSet.size === AGREEMENT_ITEMS.length) {
      setApiError(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setCheckedItems(new Set(AGREEMENT_ITEMS.map((item) => item.id)));
    } else {
      setCheckedItems(new Set());
    }
  };

  const handleAgree = async () => {
    if (!allChecked) {
      setApiError("请先阅读并同意免责条款");
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    clearError();

    try {
      await agreeDisclaimer(fileId);
      const params = new URLSearchParams();
      params.set("fileId", fileId);
      if (projectId) params.set("projectId", projectId);
      router.push(`/upload/strategy?${params.toString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "操作失败，请重试";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = (checkedCount / AGREEMENT_ITEMS.length) * 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/5">
          <i className="fas fa-file-shield text-primary text-2xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">版权与使用授权确认</h2>
        <p className="text-sm text-slate-400">请仔细阅读以下条款，确认您拥有该作品的合法使用权</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">已确认</span>
          <span className="text-lg font-bold text-primary">{checkedCount}</span>
          <span className="text-xs text-slate-500">/ {AGREEMENT_ITEMS.length} 项</span>
        </div>
        <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden ml-3">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Agreement cards */}
      <div className="glass-panel rounded-2xl p-5 mb-4 shadow-2xl shadow-black/20 space-y-3">
        {AGREEMENT_ITEMS.map((item) => {
          const isChecked = checkedItems.has(item.id);
          return (
            <div
              key={item.id}
              className={`agreement-item group flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                isChecked
                  ? "bg-surface/60 border-primary/30"
                  : "bg-surface/40 border-white/[0.06] hover:border-primary/30 hover:bg-surface/60"
              }`}
              onClick={() => handleToggleItem(item.id)}
            >
              <div
                className={`agree-icon w-10 h-10 rounded-xl bg-gradient-to-br ${item.iconBg} border ${item.iconBorder} flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110`}
              >
                <i className={`${item.icon} ${item.iconColor} text-sm`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-white font-semibold text-sm">{item.title}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{item.content}</p>
              </div>
              <input
                type="checkbox"
                id={item.id}
                checked={isChecked}
                onChange={(e) => handleCheckboxChange(item.id, e.target.checked, e)}
                onClick={(e) => e.stopPropagation()}
                className="checkbox-custom mt-1 flex-shrink-0"
              />
            </div>
          );
        })}
      </div>

      {/* Select all shortcut */}
      <div className="flex items-center justify-between px-2 mb-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            id="agreeAll"
            checked={allChecked}
            onChange={(e) => {
              e.stopPropagation();
              handleSelectAll(e.target.checked);
            }}
            className="checkbox-custom"
          />
          <span className="text-sm text-slate-400 group-hover:text-white transition-colors">全选全部条款</span>
        </label>
        <span className="text-xs text-slate-500">点击条款卡片或复选框即可勾选</span>
      </div>

      {/* Error message */}
      {apiError && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <i className="fas fa-exclamation-circle text-red-400 text-xs" />
          <span className="text-red-400 text-xs">{apiError}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3.5 rounded-xl bg-surface border border-white/10 text-slate-300 font-medium hover:text-white hover:border-white/20 transition-all"
        >
          <i className="fas fa-arrow-left mr-2" />
          返回上一步
        </button>
        <button
          onClick={handleAgree}
          disabled={isSubmitting || !allChecked}
          className="flex-[2] py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-secondary hover:shadow-primary/25 transition-all"
        >
          {isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin" />
              <span>处理中...</span>
            </>
          ) : (
            <>
              <span>同意并继续</span>
              <i className="fas fa-arrow-right" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
