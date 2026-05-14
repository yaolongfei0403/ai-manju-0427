// Database viewer for NovelFile and DisclaimerAgreement tables

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres123@127.0.0.1:5432/aimanju',
  ssl: false
});

async function viewDatabase() {
  try {
    console.log('========================================');
    console.log('       AI漫剧工厂 - 数据库查看器');
    console.log('========================================\n');

    // View NovelFile
    console.log('【NovelFile 表 - 小说文件记录】');
    console.log('-'.repeat(50));
    const novels = await pool.query(`
      SELECT id, "userId", name, "originalName", format,
             size, "estimatedWords", status, "createdAt"
      FROM "NovelFile"
      ORDER BY "createdAt" DESC
    `);

    if (novels.rows.length === 0) {
      console.log('(暂无数据)');
    } else {
      novels.rows.forEach((r, i) => {
        console.log(`\n记录 ${i + 1}:`);
        console.log(`  文件ID: ${r.id}`);
        console.log(`  原文件名: ${r.originalName}`);
        console.log(`  格式: ${r.format} | 大小: ${(r.size/1024).toFixed(1)}KB | 字数: ${r.estimatedWords}`);
        console.log(`  状态: ${r.status} | 用户ID: ${r.userId}`);
        console.log(`  上传时间: ${r.createdAt}`);
      });
    }

    // View DisclaimerAgreement
    console.log('\n\n【DisclaimerAgreement 表 - 免责确认记录】');
    console.log('-'.repeat(50));
    const disclaimers = await pool.query(`
      SELECT id, "fileId", "userId", agreed, "agreedAt", "createdAt"
      FROM "DisclaimerAgreement"
      ORDER BY "agreedAt" DESC
    `);

    if (disclaimers.rows.length === 0) {
      console.log('(暂无数据)');
    } else {
      disclaimers.rows.forEach((r, i) => {
        console.log(`\n记录 ${i + 1}:`);
        console.log(`  记录ID: ${r.id}`);
        console.log(`  文件ID: ${r.fileId}`);
        console.log(`  用户ID: ${r.userId}`);
        console.log(`  已同意: ${r.agreed ? '是' : '否'}`);
        console.log(`  同意时间: ${r.agreedAt}`);
      });
    }

    // Summary
    console.log('\n\n========================================');
    console.log('【统计信息】');
    console.log('-'.repeat(50));
    const novelCount = await pool.query('SELECT COUNT(*) FROM "NovelFile"');
    const discCount = await pool.query('SELECT COUNT(*) FROM "DisclaimerAgreement"');
    const userCount = await pool.query('SELECT COUNT(*) FROM "User"');
    console.log(`  用户总数: ${userCount.rows[0].count}`);
    console.log(`  小说文件数: ${novelCount.rows[0].count}`);
    console.log(`  免责确认数: ${discCount.rows[0].count}`);
    console.log('========================================\n');

    await pool.end();
  } catch (err) {
    console.error('查看数据库失败:', err.message);
    await pool.end();
    process.exit(1);
  }
}

viewDatabase();