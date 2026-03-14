/**
 * 行业动态数据抓取插件 - 测试脚本
 *
 * 用于手动验证插件功能
 */

import { fetchIndustryDynamics, fetchMultipleIndustries } from './src/actions.js';

async function testSingleQuery() {
  console.log('=== 测试单个行业查询 ===\n');

  try {
    const result = await fetchIndustryDynamics({
      query: '新能源',
      days: 7,
      limit: 3,
    });

    console.log('查询关键词:', result.query);
    console.log('查询时间:', result.queryTime);
    console.log('统计信息:', result.statistics);
    console.log('\n新闻列表:');

    result.news.forEach((item, index) => {
      console.log(`\n[${index + 1}] ${item.title}`);
      console.log(`    来源: ${item.source}`);
      console.log(`    日期: ${item.publishDate}`);
      console.log(`    情感: ${item.sentimentScore}`);
      console.log(`    摘要: ${item.summary.substring(0, 50)}...`);
    });

    console.log('\n✅ 单个查询测试通过\n');
  } catch (error) {
    console.error('❌ 单个查询测试失败:', error);
  }
}

async function testMultipleQueries() {
  console.log('=== 测试批量行业查询 ===\n');

  try {
    const queries = ['半导体', '人工智能', '医药'];
    const results = await fetchMultipleIndustries(queries);

    results.forEach((result, index) => {
      console.log(`\n[${index + 1}] ${result.query}`);
      console.log(`    新闻数: ${result.statistics.total}`);
      console.log(`    正面: ${result.statistics.positive}, 负面: ${result.statistics.negative}, 中性: ${result.statistics.neutral}`);
    });

    console.log('\n✅ 批量查询测试通过\n');
  } catch (error) {
    console.error('❌ 批量查询测试失败:', error);
  }
}

async function main() {
  console.log('🚀 开始测试行业动态数据抓取插件\n');
  console.log('=' .repeat(50));

  await testSingleQuery();
  await testMultipleQueries();

  console.log('=' .repeat(50));
  console.log('\n✨ 所有测试完成');
}

main().catch(console.error);
