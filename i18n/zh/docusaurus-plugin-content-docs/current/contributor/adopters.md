---
title: HAMi 采用者
---

你和你的组织正在使用 HAMi？太棒了！请通过 GitHub 提交使用信息。

## 添加你的信息

[这里](https://github.com/Project-HAMi/website/blob/master/src/data/adopters.json)列出了在生产环境中采用 HAMi 项目的组织。

你只需为你的公司添加一个条目，合并后它将自动添加到我们的网站中。

要添加你的组织，按照以下步骤操作：

1. Fork [Project-HAMi/website](https://github.com/Project-HAMi/website) 仓库。
2. 使用 `git clone https://github.com/<你的-GH-用户名>/website.git` 将其克隆到本地。
3. (可选) 将你组织的 logo 添加到 `static/img/adopters` 目录。建议将 logo 文件命名为 `<公司名>.png`。这些内容不会用于商业用途。
4. 编辑 [adopters.json](https://github.com/Project-HAMi/website/blob/master/src/data/adopters.json) 中的采用者列表。你可以参考下面的示例条目格式。

   ```json
   {
     "name": "My Company",
     "nameZh": "我的公司",
     "logo": "/img/adopters/mycompany.png",
     "website": "https://mycompany.com"
   }
   ```

5. 保存文件，然后执行 `git add -A` 并使用 `git commit -s -m "Add MY-ORG to adopters"` 提交。
6. 使用 `git push origin master` 推送提交。
7. 向 [Project-HAMi/website](https://github.com/Project-HAMi/website) 开启一个拉取请求（Pull Request），预览构建将会出现。

非常感谢你成为我们社区的一员 - 我们非常感激！
