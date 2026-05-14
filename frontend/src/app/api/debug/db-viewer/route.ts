// Database Viewer API Route - for browser access
// Debug endpoint - no auth required for viewing

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Get stats
    const userCount = await query('SELECT COUNT(*) FROM "User"');
    const novelCount = await query('SELECT COUNT(*) FROM "NovelFile"');
    const discCount = await query('SELECT COUNT(*) FROM "DisclaimerAgreement"');
    const stratCount = await query('SELECT COUNT(*) FROM "SplitStrategyConfig"');

    const stats = {
      totalUsers: parseInt(userCount.rows[0].count),
      totalNovels: parseInt(novelCount.rows[0].count),
      totalDisclaimers: parseInt(discCount.rows[0].count),
      totalStrategies: parseInt(stratCount.rows[0].count)
    };

    // Get users
    const users = await query(`
      SELECT id, username, role, status, "createdAt"
      FROM "User"
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);

    // Get novels
    const novels = await query(`
      SELECT id, "userId", "originalName", format, size, "estimatedWords", status, "createdAt"
      FROM "NovelFile"
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);

    // Get disclaimers
    const disclaimers = await query(`
      SELECT id, "fileId", "userId", agreed, "agreedAt", "createdAt"
      FROM "DisclaimerAgreement"
      ORDER BY "agreedAt" DESC
      LIMIT 50
    `);

    // Get split strategy configs
    const strategies = await query(`
      SELECT id, "fileId", strategy, "targetEpisodes", "shotRangeMin", "shotRangeMax", "keepChapterIntegrity", "specialFirstLast", "preserveNarrative", "createdAt"
      FROM "SplitStrategyConfig"
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数据库查看器 - AI漫剧工厂</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #fff; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #6366f1; margin-bottom: 20px; }
    h2 { color: #a855f7; margin: 30px 0 15px; border-bottom: 1px solid #333; padding-bottom: 10px; }
    .stats { display: flex; gap: 20px; margin-bottom: 30px; }
    .stat { background: linear-gradient(135deg, #1e1e2e, #2a2a3e); padding: 20px 30px; border-radius: 12px; text-align: center; }
    .stat-value { font-size: 2em; font-weight: bold; color: #6366f1; }
    .stat-label { color: #888; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #333; }
    th { background: #1e1e2e; color: #a855f7; font-weight: 600; }
    tr:hover { background: #1a1a2e; }
    .tag { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; }
    .tag-uploaded { background: #10b98120; color: #10b981; }
    .tag-active { background: #6366f120; color: #6366f1; }
    .empty { color: #666; text-align: center; padding: 40px; }
    .refresh-btn { background: #6366f1; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .refresh-btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 数据库查看器</h1>
    <button class="refresh-btn" onclick="location.reload()">🔄 刷新数据</button>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${stats.totalUsers}</div>
        <div class="stat-label">用户数</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalNovels}</div>
        <div class="stat-label">小说文件</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalDisclaimers}</div>
        <div class="stat-label">免责确认</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalStrategies}</div>
        <div class="stat-label">策略配置</div>
      </div>
    </div>

    <h2>👥 用户列表</h2>
    ${users.rows.length > 0 ? `
    <table>
      <thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>状态</th><th>注册时间</th></tr></thead>
      <tbody>
        ${users.rows.map(u => `
        <tr>
          <td style="font-size:12px;color:#666">${u.id}</td>
          <td>${u.username}</td>
          <td><span class="tag ${u.role === 'admin' ? 'tag-active' : 'tag-uploaded'}">${u.role}</span></td>
          <td><span class="tag ${u.status === 'active' ? 'tag-uploaded' : 'tag-active'}">${u.status}</span></td>
          <td style="color:#888">${new Date(u.createdAt).toLocaleString('zh-CN')}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<div class="empty">暂无数据</div>'}

    <h2>📄 小说文件 (NovelFile)</h2>
    ${novels.rows.length > 0 ? `
    <table>
      <thead><tr><th>文件名</th><th>格式</th><th>大小</th><th>字数</th><th>状态</th><th>项目ID</th><th>上传时间</th></tr></thead>
      <tbody>
        ${novels.rows.map(n => `
        <tr>
          <td>${n.originalName}</td>
          <td>${n.format}</td>
          <td>${(n.size/1024).toFixed(1)} KB</td>
          <td>${n.estimatedWords}</td>
          <td><span class="tag tag-uploaded">${n.status}</span></td>
          <td style="font-size:11px;color:#666">${n.projectId || '-'}</td>
          <td style="color:#888">${new Date(n.createdAt).toLocaleString('zh-CN')}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<div class="empty">暂无数据</div>'}

    <h2>✅ 免责确认 (DisclaimerAgreement)</h2>
    ${disclaimers.rows.length > 0 ? `
    <table>
      <thead><tr><th>记录ID</th><th>文件ID</th><th>用户ID</th><th>已同意</th><th>确认时间</th></tr></thead>
      <tbody>
        ${disclaimers.rows.map(d => `
        <tr>
          <td style="font-size:11px">${d.id}</td>
          <td style="font-size:11px;color:#666">${d.fileId}</td>
          <td style="font-size:11px;color:#666">${d.userId}</td>
          <td><span class="tag tag-uploaded">${d.agreed ? '是' : '否'}</span></td>
          <td style="color:#888">${new Date(d.agreedAt).toLocaleString('zh-CN')}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<div class="empty">暂无数据</div>'}

    <h2>⚙️ 分集策略配置 (SplitStrategyConfig)</h2>
    ${strategies.rows.length > 0 ? `
    <table>
      <thead><tr><th>策略</th><th>目标集数</th><th>分镜范围</th><th>章节完整</th><th>首尾特殊</th><th>保留插叙</th><th>文件ID</th><th>创建时间</th></tr></thead>
      <tbody>
        ${strategies.rows.map(s => `
        <tr>
          <td><span class="tag tag-active">${s.strategy}</span></td>
          <td>${s.targetEpisodes === 0 ? '自动' : s.targetEpisodes + '集'}</td>
          <td>${s.shotRangeMin}-${s.shotRangeMax}</td>
          <td><span class="tag tag-uploaded">${s.keepChapterIntegrity ? '是' : '否'}</span></td>
          <td><span class="tag tag-uploaded">${s.specialFirstLast ? '是' : '否'}</span></td>
          <td><span class="tag tag-uploaded">${s.preserveNarrative ? '是' : '否'}</span></td>
          <td style="font-size:11px;color:#666">${s.fileId}</td>
          <td style="color:#888">${new Date(s.createdAt).toLocaleString('zh-CN')}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<div class="empty">暂无数据</div>'}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    console.error('DB viewer error:', error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
