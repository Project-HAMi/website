---
title: HAMi Adopters
---

Using HAMi in your organization? Reach out and let the community know.

## Adding yourself

[See the list of HAMi adopters](https://github.com/Project-HAMi/website/blob/master/src/data/adopters.json) for organizations who have adopted the HAMi project in production.

Add an entry for your company and upon merging it will automatically be added to the website.

To add your organization follow these steps:

1. Fork the [Project-HAMi/website](https://github.com/Project-HAMi/website) repository.
2. Clone it locally with `git clone https://github.com/<YOUR-GH-USERNAME>/website.git`.
3. (Optional) Add the logo of your organization to `static/img/adopters`. Good practice is for the logo to be called e.g. `<company>.png`. This will not be used for commercial purposes.
4. Edit the list of adopters in [adopters.json](https://github.com/Project-HAMi/website/blob/master/src/data/adopters.json). You can refer to the following sample entry for the format.

   ```json
   {
     "name": "My Company",
     "nameZh": "我的公司",
     "logo": "/img/adopters/mycompany.png",
     "website": "https://mycompany.com"
   }
   ```

5. Save the file, then stage it with `git add src/data/adopters.json` and commit using `git commit -s -m "Add MY-ORG to adopters"`.
6. Push the commit with `git push origin master`.
7. Open a Pull Request to [Project-HAMi/website](https://github.com/Project-HAMi/website) and a preview build will turn up.

Thanks for being part of the community!
