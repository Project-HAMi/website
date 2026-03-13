#!/bin/bash

# 获取所有非本地 IPv4 地址
get_local_ips() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
    else
        # Linux
        hostname -I | awk '{for(i=1;i<=NF;i++) if($i != "127.0.0.1") print $i}'
    fi
}

# 获取网络接口名称
get_interface_name() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ifconfig | grep -B 1 "inet " | grep -v 127.0.0.1 | grep "^[a-z]" | awk '{print $1}' | tr -d ':'
    else
        ip route get 1 | awk '{print $5; exit}'
    fi
}

PORT=${PORT:-3000}
IPS=$(get_local_ips)
INTERFACES=$(get_interface_name)

echo ''
echo '============================================================'
echo '🚀 Docusaurus 开发服务器已启动'
echo '============================================================'
echo ''
echo '✅ 本地访问:'
echo ''
echo "   ➜  http://localhost:$PORT"
echo "   ➜  http://127.0.0.1:$PORT"
echo ''

if [ -n "$IPS" ]; then
    echo '📱 局域网访问 (同一 WiFi 下的设备可访问):'
    echo ''
    i=1
    echo "$IPS" | while read -r ip; do
        if [ -n "$ip" ]; then
            echo "   ➜  http://$ip:$PORT"
        fi
        i=$((i + 1))
    done
    echo ''
fi

echo '────────────────────────────────────────────────────────────'
echo '💡 提示: 按 Ctrl+C 停止服务器'
echo '============================================================'
echo ''

# 启动 Docusaurus
npx docusaurus start --host 0.0.0.0 --port "$PORT"
