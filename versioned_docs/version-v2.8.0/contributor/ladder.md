---
title: Contributor Ladder
---

This document describes the contributor roles within the HAMi project, along with the responsibilities and privileges that come with each role. Contributors generally start at the first level and advance as their involvement grows.

## Overview

Each role below lists three things: **Responsibilities** (what is expected), **Requirements** (what qualifies someone for the role), and **Privileges** (what the role grants).

### Community Participant

A Community Participant engages with the project and its community. These are typically users who have moved from anonymous usage to active participation in discussions.

- Responsibilities:
  - Follow the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/main/code-of-conduct.md)
- Ways to get involved:
  - Participate in community discussions
  - Help other users
  - Submit bug reports
  - Comment on issues
  - Try out new releases
  - Attend community events

### Contributor

A Contributor contributes directly to the project. Contributions do not have to be code. Contributors may be new or may contribute only occasionally.

- Responsibilities:
  - Follow the CNCF Code of Conduct
  - Follow the project contributing guide
- Requirements (one or more of the following):
  - Report and sometimes resolve issues
  - Submit PRs occasionally
  - Contribute to documentation
  - Attend meetings and take notes
  - Answer questions from other community members
  - Submit feedback on issues and PRs
  - Test releases and patches and submit reviews
  - Run or help run events
  - Promote the project publicly
  - Help maintain project infrastructure
- Privileges:
  - Invitations to contributor events
  - Eligible to become an Organization Member

Contributors are listed in the [AUTHORS.md file](https://github.com/Project-HAMi/HAMi/blob/master/AUTHORS.md). If a name is missing, open an issue on the HAMi repository to have it added.

### Organization Member

An Organization Member is an established contributor who participates regularly. Organization Members have privileges in both project repositories and elections, and are expected to act in the interests of the whole project.

An Organization Member must meet all Contributor responsibilities and requirements, plus:

- Responsibilities:
  - Continue contributing regularly, as demonstrated by at least 50 GitHub contributions per year
- Requirements:
  - [Two-factor authentication][two-factor authentication] enabled on their GitHub account
  - Successful contributions to the project or community, including at least one of the following:
    - 5 accepted PRs
    - 5 PRs reviewed
    - 3 issues resolved and closed
    - Responsibility for a key project management area
    - An equivalent combination of contributions
  - Contributing for at least 1 month
  - Actively contributing to at least one project area
  - Two sponsors who are also Organization Members, at least one of whom works for a different employer
  - [Open a membership request issue][membership request] against the Project-HAMi/HAMi repo:
    - Mention sponsors in the issue
    - Complete every item on the issue checklist
    - Ensure the contributions listed are representative of the work done
  - Sponsors reply with confirmation: `+1`
  - After sponsor confirmation, the request is handled by the HAMi GitHub Admin team
- Privileges:
  - May be assigned issues and reviews
  - May issue commands to CI/CD automation
  - Can be added to HAMi project teams
  - Can recommend other contributors for Org Member status

### Reviewer

A Reviewer is responsible for a specific area of the project: a code directory, a section of the docs, a test suite, or another clearly-defined component. Reviewers are collectively responsible for reviewing all changes to their area and indicating whether changes are ready to merge.

Reviewers have all the rights and responsibilities of an Organization Member, plus:

- Responsibilities:
  - Follow the reviewing guide
  - Review most pull requests against their specific area of responsibility
  - Review at least 20 PRs per year
  - Help other contributors become reviewers
- Requirements:
  - At least 3 months of experience as a Contributor
  - Organization Member status
  - At least 10 pull requests reviewed or co-reviewed
  - Demonstrated ability to analyze and resolve test failures in their area
  - In-depth knowledge of the specific area
  - Commitment to ongoing responsibility for that area
  - Supportive of new and occasional contributors
- Privileges:
  - GitHub or CI/CD rights to approve pull requests in specific directories
  - Can recommend and review other contributors for Reviewer status

To become a Reviewer:

1. A contributor opens a PR against the appropriate repository, adding their GitHub username to the OWNERS file for one or more directories.
2. At least two existing Approvers for that repository or directory approve the PR.

### Maintainer

A Maintainer is a highly established contributor responsible for the entire project. Maintainers can approve PRs against any area of the project and are expected to participate in decisions about project strategy and priorities.

A Maintainer must meet all Reviewer responsibilities and requirements.

The current list of maintainers is in [MAINTAINERS](https://github.com/Project-HAMi/HAMi/blob/master/MAINTAINERS.md).

**An active maintainer:**

- Actively reviews pull requests and incoming issues. There are no hard rules on what counts as active - this is left to the judgement of the current maintainer group.
- Participates in discussions about design and the future of the project.
- Takes responsibility for backports to appropriate branches for PRs they approve and merge.
- Follows code, testing, and design conventions as determined by consensus among active maintainers.
- Steps down gracefully when no longer planning to actively participate.

**Becoming a maintainer:**

New maintainers are added by consensus among the current maintainer group, via Slack or email discussion. A majority must support the addition, and no single maintainer should object.

When adding a new maintainer, open a PR to [HAMi](https://github.com/Project-HAMi/HAMi) and update [MAINTAINERS](https://github.com/Project-HAMi/HAMi/blob/master/MAINTAINERS.md). Once merged, the person becomes a maintainer.

**Removing maintainers:**

Maintainers may step back as their other responsibilities change. Inactive maintainers may be removed if there is no expectation of renewed participation. Former maintainers who return should be given prompt consideration for reinstatement.

## Inactivity

Active participation is important for project health. Inactivity is measured by:

- No contributions for more than 3 months
- No communication for more than 3 months

Consequences may include involuntary removal, demotion, or a move to Emeritus status.

## Involuntary removal or demotion

Involuntary removal or demotion happens when a contributor's responsibilities and requirements are no longer being met. This may result from repeated or extended inactivity, failure to meet role requirements, or a Code of Conduct violation.

Involuntary removal or demotion is decided by a majority vote of the current Maintainers.

[two-factor authentication]: https://help.github.com/articles/about-two-factor-authentication
[membership request]: https://github.com/Project-HAMi/HAMi/issues/new
