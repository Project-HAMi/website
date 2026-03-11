const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/adopters.json');
const adopters = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Mapping for translations
const translations = {
  regions: {
    'China': '中国',
    'Global': '全球',
  },
  industries: {
    'AI Platform': 'AI 平台',
    'Telecom': '电信',
    'Education': '教育',
    'Finance': '金融',
    'Healthcare': '医疗健康',
    'Real Estate': '房地产',
  },
  scenarios: {
    'Production': '生产环境',
    'Testing': '测试',
    'Evaluation': '评估',
    'Staging': '预发布',
  }
};

// Known websites for major adopters
const knownWebsites = {
  '4paradigm': 'https://www.4paradigm.com',
  'DaoCloud': 'https://www.daocloud.io',
  'Huawei': 'https://www.huawei.com',
  'iFlytek': 'https://www.iflytek.com',
  'China Mobile': 'https://www.chinamobileltd.com',
  'China Unicom Industrial Internet': 'https://www.chinaunicom.cn',
  'China University of Mining and Technology': 'https://www.cumt.edu.cn',
  'Donghua University': 'https://www.dhu.edu.cn',
  'Guangdong University of Technology': 'https://www.gdut.edu.cn',
  'Harbin Institute of Technology': 'https://www.hit.edu.cn',
  'H3C': 'https://www.h3c.com',
  'Ping An Bank': 'https://bank.pingan.com',
  'Ping An Securities': 'https://www.pa18.com',
  'Nankai University - Network Laboratory': 'https://www.nankai.edu.cn',
  'Technical University of Munich': 'https://www.tum.de',
  'Tongcheng Travel': 'https://www.ly.com',
  'XW Bank': 'https://www.xwbank.com',
  'Kylinsoft': 'https://www.kylinos.cn',
  'RiseUnion': 'https://www.theriseunion.com',
};

const updatedAdopters = adopters.map(adopter => {
  const updated = { ...adopter };

  // Add Chinese translations if not present
  if (!updated.regionZh && translations.regions[updated.region]) {
    updated.regionZh = translations.regions[updated.region];
  }
  if (!updated.industryZh && translations.industries[updated.industry]) {
    updated.industryZh = translations.industries[updated.industry];
  }
  if (!updated.scenarioZh && translations.scenarios[updated.scenario]) {
    updated.scenarioZh = translations.scenarios[updated.scenario];
  }

  // Add website if known
  if (!updated.website && knownWebsites[updated.name]) {
    updated.website = knownWebsites[updated.name];
  }

  return updated;
});

fs.writeFileSync(filePath, JSON.stringify(updatedAdopters, null, 2), 'utf8');
console.log('✅ Adopters updated successfully!');
console.log(`Updated ${updatedAdopters.length} adopters`);
