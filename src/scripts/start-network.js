#!/usr/bin/env node

const os = require('os');
const { execSync } = require('child_process');

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部 IP 和 IPv6
      if (!iface.internal && iface.family === 'IPv4') {
        ips.push({
          interface: name,
          ip: iface.address
        });
      }
    }
  }

  return ips;
}

function displayBanner(ips, port) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Docusaurus 开发服务器已启动');
  console.log('='.repeat(60));
  console.log('\n✅ 本地访问:\n');
  console.log(`   ➜  http://localhost:${port}`);
  console.log(`   ➜  http://127.0.0.1:${port}`);

  if (ips.length > 0) {
    console.log('\n📱 局域网访问 (同一 WiFi 下的设备可访问):\n');
    ips.forEach(({ interface: name, ip }) => {
      console.log(`   ➜  http://${ip}:${port}  (${name})`);
    });
  }

  console.log('\n' + '─'.repeat(60));
  console.log('💡 提示: 按 Ctrl+C 停止服务器');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  const port = process.env.PORT || 3000;
  const ips = getLocalIPs();

  // 显示访问地址横幅
  displayBanner(ips, port);

  // 启动 Docusaurus 开发服务器
  try {
    const docusaurus = require.resolve('@docusaurus/server/lib/index.js');
    const { start } = require(docusaurus);
    await start();
  } catch (error) {
    console.error('启动 Docusaurus 失败:', error.message);
    process.exit(1);
  }
}

main();
