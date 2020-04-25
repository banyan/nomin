import meow from 'meow';

export const cli = meow(`
  nomin

  static site generator.
  More information: <https://github.com/banyan/nomin>.

  Examples

  - Build assets
    $ nomin

	  Options
	    --base_path, Serve site from a given path. default is '/'
	    --archive, Generate archive pages, default is true
	    --feed_size, Set feed size, default is 5

  - Create new post
    $ nomin new title
`, {
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
});

interface Options {
  archive: true;
  basePath: string;
  feedSize: number;
}

export const options = (cli.flags as unknown) as Options;
