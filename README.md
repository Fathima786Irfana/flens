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
$ npm install -g flens
$ flens COMMAND
running command...
$ flens (--version)
flens/0.0.0 linux-x64 node-v20.13.1
$ flens --help [COMMAND]
USAGE
  $ flens COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`flens hello PERSON`](#flens-hello-person)
* [`flens hello world`](#flens-hello-world)
* [`flens help [COMMAND]`](#flens-help-command)
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

_See code: [src/commands/hello/index.ts](https://github.com/oclif-poc/flens/blob/v0.0.0/src/commands/hello/index.ts)_

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

_See code: [src/commands/hello/world.ts](https://github.com/oclif-poc/flens/blob/v0.0.0/src/commands/hello/world.ts)_

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
<!-- commandsstop -->
