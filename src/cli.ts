/* eslint-disable @typescript-eslint/camelcase */

import meow from 'meow';

export const cli = meow(
  `
  nomin - static site generator

  USAGE

      $ nomin --help
      $ nomin --version
      $ nomin
      $ nomin new [title]

  OPTIONS

      -h, --help                          Shows this help message

      -v, --version                       Displays the current version of nomin

      --base-path                         Specify a path on where to serve (default is '/')

      --archive                           Generate archive pages, default is true

      --feed_size                         Set feed size, default is 5
`,
  {
    inferType: true,
    flags: {
      archive: {
        type: 'boolean',
        default: true,
      },
      base_path: {
        type: 'string',
        default: '/',
      },
      feed_size: {
        type: 'number',
        default: 5,
      },
    },
  },
);

interface Options {
  archive: true;
  basePath: string;
  feedSize: number;
}

export const options = (cli.flags as unknown) as Options;
