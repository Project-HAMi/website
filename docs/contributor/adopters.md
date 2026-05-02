---
title: HAMi Adopters
---

# HAMi Adopters

So you and your organisation are using HAMi? That's great. Reach out and let the community know.

## Adding yourself

[See the list of HAMi adopters](https://github.com/Project-HAMi/website/blob/master/src/pages/adopters.mdx) for organisations who have adopted the HAMi project in production.

Add an entry for your company and upon merging it will automatically be added to the website.

To add your organisation follow these steps:

1. Fork the [Project-HAMi/website](https://github.com/Project-HAMi/website) repository.
2. Clone it locally with `git clone https://github.com/<YOUR-GH-USERNAME>/website.git`.
3. (Optional) Add the logo of your organisation to `static/img/supporters`. Good practice is for the logo to be called e.g. `<company>.png`.
   This will not be used for commercial purposes.
4. Edit the list of adopters in [adopters.mdx](https://github.com/Project-HAMi/website/blob/master/src/pages/adopters.mdx).
   You can refer to the following sample table for the format.

   | Organization | Contact                           | Environment | Description of Use                            |
   | ------------ | --------------------------------- | ----------- | --------------------------------------------- |
   | My Company   | [email](mailto:email@company.com) | Production  | We use HAMi to manage our GPU infrastructure. |

5. Save the file, then do `git add -A` and commit using `git commit -s -m "Add MY-ORG to adopters"`.
6. Push the commit with `git push origin main`.
7. Open a Pull Request to [Project-HAMi/website](https://github.com/Project-HAMi/website) and a preview build will turn up.

Thanks for being part of the community!
