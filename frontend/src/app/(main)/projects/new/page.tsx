"use client";

import ProjectForm from "@/components/features/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
            <i className="fas fa-plus text-primary text-sm" />
          </div>
          <h2 className="text-2xl font-bold text-white">创建新项目</h2>
        </div>
        <p className="text-sm text-slate-400 ml-11">
          配置项目基本信息、视觉风格与 AI 模型，项目内的资产将被所有分集共享使用
        </p>
      </div>

      {/* Form */}
      <ProjectForm />
    </div>
  );
}
