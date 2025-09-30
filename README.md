flens
=================

A new CLI generated with oclif


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/flens.svg)](https://npmjs.org/package/flens)
[![Downloads/week](https://img.shields.io/npm/dw/flens.svg)](https://npmjs.org/package/flens)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @fathima786irfana/flens
$ flens COMMAND
running command...
$ flens (--version)
@fathima786irfana/flens/1.0.0 linux-x64 node-v20.19.5
$ flens --help [COMMAND]
USAGE
  $ flens COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`flens create pr`](#flens-create-pr)
* [`flens gitflow reminder`](#flens-gitflow-reminder)
* [`flens hello PERSON`](#flens-hello-person)
* [`flens hello world`](#flens-hello-world)
* [`flens help [COMMAND]`](#flens-help-command)
* [`flens nectar open-project`](#flens-nectar-open-project)
* [`flens plugins`](#flens-plugins)
* [`flens plugins add PLUGIN`](#flens-plugins-add-plugin)
* [`flens plugins:inspect PLUGIN...`](#flens-pluginsinspect-plugin)
* [`flens plugins install PLUGIN`](#flens-plugins-install-plugin)
* [`flens plugins link PATH`](#flens-plugins-link-path)
* [`flens plugins remove [PLUGIN]`](#flens-plugins-remove-plugin)
* [`flens plugins reset`](#flens-plugins-reset)
* [`flens plugins uninstall [PLUGIN]`](#flens-plugins-uninstall-plugin)
* [`flens plugins unlink [PLUGIN]`](#flens-plugins-unlink-plugin)
* [`flens plugins update`](#flens-plugins-update)
* [`flens project clear-use`](#flens-project-clear-use)
* [`flens project create`](#flens-project-create)
* [`flens project delete`](#flens-project-delete)
* [`flens project edit`](#flens-project-edit)
* [`flens project list`](#flens-project-list)
* [`flens project use`](#flens-project-use)
* [`flens project view`](#flens-project-view)
* [`flens repo check-hygiene`](#flens-repo-check-hygiene)
* [`flens repo init`](#flens-repo-init)
* [`flens repo sync`](#flens-repo-sync)
* [`flens setup test_pilot`](#flens-setup-test_pilot)
* [`flens test srt`](#flens-test-srt)
* [`flens [RELEASEGROUPNAME] -d=2025-06-14 --> upgrade a release group`](#flens-releasegroupname--d2025-06-14----upgrade-a-release-group)
* [`flens version upgrade-ref RELEASEGROUP`](#flens-version-upgrade-ref-releasegroup)

## `flens create pr`

```
USAGE
  $ flens create pr
```

_See code: [src/commands/create/pr.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/create/pr.ts)_

## `flens gitflow reminder`

Run GitFlow reminder job in background

```
USAGE
  $ flens gitflow reminder

DESCRIPTION
  Run GitFlow reminder job in background
```

_See code: [src/commands/gitflow/reminder.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/gitflow/reminder.ts)_

## `flens hello PERSON`

Say hello

```
USAGE
  $ flens hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ flens hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/hello/index.ts)_

## `flens hello world`

Say hello world

```
USAGE
  $ flens hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ flens hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/hello/world.ts)_

## `flens help [COMMAND]`

Display help for flens.

```
USAGE
  $ flens help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for flens.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.25/src/commands/help.ts)_

## `flens nectar open-project`

Get all open projects from nectar and display them as a select list

```
USAGE
  $ flens nectar open-project

DESCRIPTION
  Get all open projects from nectar and display them as a select list
```

_See code: [src/commands/nectar/open-project.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/nectar/open-project.ts)_

## `flens plugins`

List installed plugins.

```
USAGE
  $ flens plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ flens plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.31/src/commands/plugins/index.ts)_

## `flens plugins add PLUGIN`

Installs a plugin into flens.

```
USAGE
  $ flens plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into flens.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the FLENS_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the FLENS_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ flens plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ flens plugins add myplugin

  Install a plugin from a github url.

    $ flens plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ flens plugins add someuser/someplugin
```

## `flens plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ flens plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ flens plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.31/src/commands/plugins/inspect.ts)_

## `flens plugins install PLUGIN`

Installs a plugin into flens.

```
USAGE
  $ flens plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into flens.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the FLENS_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the FLENS_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ flens plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ flens plugins install myplugin

  Install a plugin from a github url.

    $ flens plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ flens plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.31/src/commands/plugins/install.ts)_

## `flens plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ flens plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ flens plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.31/src/commands/plugins/link.ts)_

## `flens plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ flens plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ flens plugins unlink
  $ flens plugins remove

EXAMPLES
  $ flens plugins remove myplugin
```

## `flens plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ flens plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.31/src/commands/plugins/reset.ts)_

## `flens plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ flens plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ flens plugins unlink
  $ flens plugins remove

EXAMPLES
  $ flens plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.31/src/commands/plugins/uninstall.ts)_

## `flens plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ flens plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ flens plugins unlink
  $ flens plugins remove

EXAMPLES
  $ flens plugins unlink myplugin
```

## `flens plugins update`

Update installed plugins.

```
USAGE
  $ flens plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.31/src/commands/plugins/update.ts)_

## `flens project clear-use`

Clear the currently active project with confirmation

```
USAGE
  $ flens project clear-use

DESCRIPTION
  Clear the currently active project with confirmation
```

_See code: [src/commands/project/clear-use.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/project/clear-use.ts)_

## `flens project create`

Creates a new project by storing repo details securely in JSON

```
USAGE
  $ flens project create

DESCRIPTION
  Creates a new project by storing repo details securely in JSON
```

_See code: [src/commands/project/create.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/project/create.ts)_

## `flens project delete`

Deletes a project

```
USAGE
  $ flens project delete

DESCRIPTION
  Deletes a project
```

_See code: [src/commands/project/delete.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/project/delete.ts)_

## `flens project edit`

Edit an existing project

```
USAGE
  $ flens project edit

DESCRIPTION
  Edit an existing project
```

_See code: [src/commands/project/edit.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/project/edit.ts)_

## `flens project list`

Lists all projects stored in the projects folder

```
USAGE
  $ flens project list

DESCRIPTION
  Lists all projects stored in the projects folder
```

_See code: [src/commands/project/list.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/project/list.ts)_

## `flens project use`

Select and set an active project

```
USAGE
  $ flens project use

DESCRIPTION
  Select and set an active project
```

_See code: [src/commands/project/use.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/project/use.ts)_

## `flens project view`

View details of a selected project. Sensitive data (Git token, API key) will be masked.

```
USAGE
  $ flens project view

DESCRIPTION
  View details of a selected project. Sensitive data (Git token, API key) will be masked.
```

_See code: [src/commands/project/view.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/project/view.ts)_

## `flens repo check-hygiene`

Check whether local IDE is in sync with the local LENS instance.

```
USAGE
  $ flens repo check-hygiene [-h]

FLAGS
  -h, --help  Show CLI help.

DESCRIPTION
  Check whether local IDE is in sync with the local LENS instance.
```

_See code: [src/commands/repo/check-hygiene.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/repo/check-hygiene.ts)_

## `flens repo init`

Initialize a repository based on details from the Instance using API call

```
USAGE
  $ flens repo init

DESCRIPTION
  Initialize a repository based on details from the Instance using API call
```

_See code: [src/commands/repo/init.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/repo/init.ts)_

## `flens repo sync`

Syncs Repo with Host

```
USAGE
  $ flens repo sync [-h]

FLAGS
  -h, --help  Show CLI help.

DESCRIPTION
  Syncs Repo with Host
```

_See code: [src/commands/repo/sync.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/repo/sync.ts)_

## `flens setup test_pilot`

Setup the Lens AI Test Pilot project in your environment

```
USAGE
  $ flens setup test_pilot [-d <value>]

FLAGS
  -d, --dir=<value>  Optional directory name (defaults to ~/lens_ai_test_pilot)

DESCRIPTION
  Setup the Lens AI Test Pilot project in your environment

EXAMPLES
  $ lenscloud setup test_pilot

  $ lenscloud setup test_pilot --dir custom_pilot
```

_See code: [src/commands/setup/test_pilot.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/setup/test_pilot.ts)_

## `flens test srt`

```
USAGE
  $ flens test srt
```

_See code: [src/commands/test/srt.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/test/srt.ts)_

## `flens [RELEASEGROUPNAME] -d=2025-06-14 --> upgrade a release group`

Upgrade a release group

```
USAGE
  $ flens version upgrade [RELEASEGROUPNAME] -d=2025-06-14 --> upgrade a release group
  $ flens version upgrade -r --> list the release groups available in the lensdocker repo

ARGUMENTS
  RELEASEGROUPNAME  Release group name

FLAGS
  -d, --date=2025-06-14  Upgrade date (YYYY-MM-DD)
  -h, --help             Show CLI help.
  -r, --releasegroup     List Release Groups available

DESCRIPTION
  Upgrade a release group
```

_See code: [src/commands/version/upgrade.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/version/upgrade.ts)_

## `flens version upgrade-ref RELEASEGROUP`

```
USAGE
  $ flens version upgrade-ref RELEASEGROUP -d <value>

FLAGS
  -d, --date=<value>  (required)
```

_See code: [src/commands/version/upgrade-ref.ts](https://github.com/Fathima786Irfana/flens/blob/v1.0.0/src/commands/version/upgrade-ref.ts)_
<!-- commandsstop -->
