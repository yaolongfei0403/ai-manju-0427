"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useNovelStore } from "@/stores/novel";
import DisclaimerAgreementComponent from "@/components/features/upload/DisclaimerAgreement";
import { useAuthStore } from "@/stores/auth";

function DisclaimerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { _hasHydrated, fileMeta } = useNovelStore();
  const { token } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [alreadyAgreed, setAlreadyAgreed] = useState(false);
  const [agreedAt, setAgreedAt] = useState<string | null>(null);

  // 每次进入页面时将滚动条重置到顶部
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, []);

  const fileId = searchParams.get("fileId");
  const projectId = searchParams.get("projectId");

  // Check if disclaimer already agreed by querying the API
  useEffect(() => {
    if (!_hasHydrated || !fileId || !token) return;

    const checkAgreement = async () => {
      setIsChecking(true);
      try {
        const response = await fetch(`/api/v1/upload/novel/disclaimer?fileId=${fileId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.agreed) {
            setAlreadyAgreed(true);
            setAgreedAt(data.data.agreedAt);
          }
        }
      } catch {
        // Ignore errors, user can proceed normally
      } finally {
        setIsChecking(false);
      }
    };

    checkAgreement();
  }, [_hasHydrated, fileId, token]);

  if (!_hasHydrated || isChecking) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-slate-400">
          <i className="fas fa-circle-notch fa-spin text-primary text-2xl mb-2" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  // If already agreed, show confirmation and skip to strategy page
  if (alreadyAgreed && fileId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-4 fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/5">
            <i className="fas fa-check-double text-emerald-400 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">免责条款已确认</h2>
          <p className="text-sm text-slate-400">确认时间: {agreedAt ? new Date(agreedAt).toLocaleString('zh-CN') : '-'}</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 mb-6 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <i className="fas fa-file-shield text-emerald-400 text-xl"></i>
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">版权与使用授权</div>
              <div className="text-slate-400 text-sm mt-1">所有条款已确认完成</div>
            </div>
            <i className="fas fa-check-circle text-emerald-400 text-xl"></i>
          </div>
        </div>

        <button
          onClick={() => {
            const params = new URLSearchParams();
            params.set("fileId", fileId);
            if (projectId) params.set("projectId", projectId);
            router.push(`/upload/strategy?${params.toString()}`);
          }}
          className="generate-btn w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 text-base"
        >
          <span>继续到分集配置</span>
          <i className="fas fa-arrow-right"></i>
        </button>

        <button
          onClick={() => router.back()}
          className="w-full py-3 mt-3 rounded-xl bg-surface border border-white/10 text-slate-300 text-sm hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
        >
          <i className="fas fa-arrow-left"></i>
          返回上一步
        </button>
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

  return (
    <div className="fade-in">
      <DisclaimerAgreementComponent fileId={fileId} projectId={projectId || undefined} />
    </div>
  );
}

export default function DisclaimerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    }>
      <DisclaimerPageContent />
    </Suspense>
  );
}