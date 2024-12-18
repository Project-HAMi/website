---
title: Bash auto-completion on Linux
---

## Introduction
The hamictl completion script for Bash can be generated with the command hamictl completion bash. Sourcing the completion script in your shell enables hamictl autocompletion.

However, the completion script depends on [bash-completion](https://github.com/scop/bash-completion), which means that you have to install this software first (you can test if you have bash-completion already installed by running `type _init_completion`).

## Install bash-completion
bash-completion is provided by many package managers (see [here](https://github.com/scop/bash-completion#installation)). You can install it with `apt-get install bash-completion` or `yum install bash-completion`, etc.

The above commands create `/usr/share/bash-completion/bash_completion`, which is the main script of bash-completion. Depending on your package manager, you have to manually source this file in your `~/.bashrc` file.

```bash
source /usr/share/bash-completion/bash_completion
```

Reload your shell and verify that bash-completion is correctly installed by typing `type _init_completion`.

## Enable hamictl autocompletion
You now need to ensure that the hamictl completion script gets sourced in all your shell sessions. There are two ways in which you can do this:

- Source the completion script in your ~/.bashrc file:

```bash
echo 'source <(hamictl completion bash)' >>~/.bashrc
```

- Add the completion script to the /etc/bash_completion.d directory:

```bash
hamictl completion bash >/etc/bash_completion.d/hamictl
```

If you have an alias for hamictl, you can extend shell completion to work with that alias:

```bash
echo 'alias km=hamictl' >>~/.bashrc
echo 'complete -F __start_hamictl km' >>~/.bashrc
```

> **Note:** bash-completion sources all completion scripts in /etc/bash_completion.d.

Both approaches are equivalent. After reloading your shell, hamictl autocompletion should be working.

## Enable kubectl-hami autocompletion
Currently, kubectl plugins do not support autocomplete, but it is already planned in [Command line completion for kubectl plugins](https://github.com/kubernetes/kubernetes/issues/74178). 

We will update the documentation as soon as it does.
