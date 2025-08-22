# HAMi Adopters

So you and your organisation are using HAMi? That's great. We would love to hear from you! 💖

## Adding yourself

[Here](https://github.com/Project-HAMi/website/blob/master/src/pages/adopters.mdx) lists the organisations who adopted the HAMi project in production.

You just need to add an entry for your company and upon merging it will automatically be added to our website.

To add your organisation follow these steps:

1. Fork the [HAMi-io/website](https://github.com/Project-HAMi/website) repository.
2. Clone it locally with `git clone https://github.com/<YOUR-GH-USERNAME>/website.git`.
3. (Optional) Add the logo of your organisation to `static/img/supporters`. Good practice is for the logo to be called e.g. `<company>.png`.
   This will not be used for commercial purposes.
4. Edit the list of adopters in [adopters.mdx](https://github.com/Project-HAMi/website/blob/master/src/pages/adopters.mdx).
   You can refer to the following sample table for the format.

   | Organization | Contact                           | Environment | Description of Use                            |
   | ------------ | --------------------------------- | ----------- | --------------------------------------------- |
   | My Company   | [email](mailto:email@company.com) | Production  | We use HAMi to Manage our GPU infrastructure. |

5. Save the file, then do `git add -A` and commit using `git commit -s -m "Add MY-ORG to adopters"`.
6. Push the commit with `git push origin main`.
7. Open a Pull Request to [HAMi-io/website](https://github.com/Project-HAMi/website) and a preview build will turn up.

Thanks a lot for being part of our community - we very much appreciate it!
