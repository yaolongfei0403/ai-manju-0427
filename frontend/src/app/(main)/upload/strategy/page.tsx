"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useNovelStore } from "@/stores/novel";
import StrategyConfigComponent from "@/components/features/upload/StrategyConfig";
import { useAuthStore } from "@/stores/auth";

function StrategyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { _hasHydrated } = useNovelStore();
  const { token } = useAuthStore();
  const [isCheckingDisclaimer, setIsCheckingDisclaimer] = useState(false);
  const [disclaimerStatus, setDisclaimerStatus] = useState<boolean | null>(null);

  // 每次进入页面时将滚动条重置到顶部
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, []);

  const fileId = searchParams.get("fileId");
  const projectId = searchParams.get("projectId");

  // 通过 API 检查免责条款状态
  useEffect(() => {
    if (!_hasHydrated || !fileId || !token) return;

    const checkDisclaimer = async () => {
      setIsCheckingDisclaimer(true);
      try {
        const response = await fetch(`/api/v1/upload/novel/disclaimer?fileId=${fileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setDisclaimerStatus(data.data?.agreed ?? false);
        } else {
          setDisclaimerStatus(false);
        }
      } catch {
        setDisclaimerStatus(false);
      } finally {
        setIsCheckingDisclaimer(false);
      }
    };

    checkDisclaimer();
  }, [_hasHydrated, fileId, token]);

  // 当确认未同意时，执行跳转
  useEffect(() => {
    if (disclaimerStatus === false && fileId) {
      window.location.href = `/upload/disclaimer?fileId=${fileId}${projectId ? `&projectId=${projectId}` : ""}`;
    }
  }, [disclaimerStatus, fileId, projectId]);

  // 检查是否已有分集结果，如有则直接跳转到 split-result
  useEffect(() => {
    if (!_hasHydrated || !fileId || !token) return;
    if (disclaimerStatus === false) return; // 还没通过免责检查，跳过
    // 如果是从 split-result 页面返回的，跳过检测，允许重新配置
    const fromResult = searchParams.get("from");
    if (fromResult === "result") return;

    const checkExistingEpisodes = async () => {
      try {
        // 通过 projectId 查询 Episode 表
        const projectResponse = await fetch(`/api/v1/upload/novel/by-project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!projectResponse.ok) return;
        const projectData = await projectResponse.json();
        const actualProjectId = projectData.data?.projectId || projectId;
        if (!actualProjectId) return;

        // 查询 Episode 表是否有数据
        const episodeResponse = await fetch(`/api/v1/upload/novel/split-result/check-episodes?projectId=${actualProjectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (episodeResponse.ok) {
          const episodeData = await episodeResponse.json();
          if (episodeData.data?.hasEpisodes) {
            // 已有分集，跳转到 split-result 页面
            router.replace(`/upload/split-result?fileId=${fileId}&projectId=${actualProjectId}&taskId=existing`);
          }
        }
      } catch {
        // 出错时不跳转，让用户继续配置
      }
    };

    checkExistingEpisodes();
  }, [_hasHydrated, fileId, projectId, token, disclaimerStatus, router, searchParams]);

  if (!_hasHydrated || isCheckingDisclaimer) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-slate-400">
          <i className="fas fa-circle-notch fa-spin text-primary text-2xl mb-2" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!fileId) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">缺少文件信息，请先上传小说</p>
          <Link href="/upload" className="text-primary hover:underline">
            返回上传页面
          </Link>
        </div>
      </div>
    );
  }

  // 通过 API 检查结果判断是否跳转
  if (disclaimerStatus === false) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">正在跳转...</p>
          <Link
            href={`/upload/disclaimer?fileId=${fileId}${projectId ? `&projectId=${projectId}` : ""}`}
            className="text-primary hover:underline"
          >
            如果没有跳转，请点击这里
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <StrategyConfigComponent fileId={fileId} projectId={projectId || undefined} />
    </div>
  );
}

export default function StrategyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-darker flex items-center justify-center">
          <div className="text-slate-400">加载中...</div>
        </div>
      }
    >
      <StrategyPageContent />
    </Suspense>
  );
}
