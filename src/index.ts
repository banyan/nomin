import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';

import { compareAsc, format, formatRFC3339 } from 'date-fns';
import { Liquid } from 'liquidjs';
import hljs from 'highlight.js';
import marked from 'marked';
import readline from 'readline';
import yaml from 'js-yaml';
import meow from 'meow';

import { assertIsDefined } from './assert';
import { createPost } from './commands/new'
import { paths } from '~/paths'

const fsp = fs.promises;

interface Entry {
  path: string;
  date: Date;
  cnt?: number;
  link?: string;
}

interface Data {
  title: string;
  date: string;
}

interface Feed {
  title: string;
  date: string;
  link: string;
  content: string;
}

interface Archive {
  title: string;
  formattedDate: string;
  link: string;
}

const engine = new Liquid();

const cli = meow(
  `
	Usage
	  $ nomin <input>

	Options
	  --base_path, Serve site from a given path. default is '/'
	  --archive, Generate archive pages, default is true
	  --feed_size, Set feed size, default is 5

	Examples
	  $ nomin
`,
  {
    inferType: true,
    flags: {
      archive: {
        type: 'boolean',
        default: true,
      },
      // eslint-disable-next-line @typescript-eslint/camelcase
      base_path: {
        type: 'string',
        default: '/',
      },
      // eslint-disable-next-line @typescript-eslint/camelcase
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

const options = (cli.flags as unknown) as Options;

const parse = (entry: Entry): [string, Data] => {
  const data = fs.readFileSync(path.join(paths.posts, entry.path), 'utf8');
  const m = data.match(/^---([\s\S]*?)---([\s\S]*)$/m);
  if (!m) throw new Error(`parse failed: ${data}, ${m}`);
  return [m[2], yaml.load(m[1])];
};

marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function (code, language) {
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    return hljs.highlight(validLanguage, code).value;
  },
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
});

export const run = async (): Promise<void> => {
  if (cli.input[0] === 'new' && cli.input.length === 2) {
    await createPost(cli.input[1]);
    process.exit(0);
  }

  let entries: Entry[] = [];
  const postPaths = await fsp.readdir(paths.posts);

  for (const postPath of postPaths) {
    const fileStream = fs.createReadStream(path.join(paths.posts, postPath));
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const m = line.match(/^date: (.+)$/);
      if (m) {
        entries.push({ path: postPath, date: new Date(m[1]) });
        break;
      }
    }
  }

  entries = entries.sort((a: Entry, b: Entry) => compareAsc(a.date, b.date));

  let preEntryDate = '0000/00/00';
  let cnt = 1;

  for (const entry of entries) {
    assertIsDefined(entry.date);
    const date = format(entry.date, 'yyyy/MM/dd');
    if (preEntryDate === date) {
      cnt = cnt + 1;
    } else {
      cnt = 1;
    }

    entry.cnt = cnt;
    entry.link = path.join(options.basePath, date, `${cnt}`);
    preEntryDate = date;
  }

  let pos = 0;
  const feeds: Feed[] = [];
  const archives: Archive[] = [];
  entries = entries.reverse();

  for (const entry of entries) {
    const [content, data] = parse(entry);

    let nextPage = undefined;
    let prevPage = undefined;

    if (pos < entries.length - 1) {
      nextPage = entries[pos + 1];
    }
    if (pos > 0) {
      prevPage = entries[pos - 1];
    }

    const props = {
      index: false,
      title: data.title,
      link: entry.link,
      date: entry.date,
      formattedDate: format(entry.date, 'MMM do, yyyy'),
      content: marked(content),
      nextPage: nextPage,
      prevPage: prevPage,
    };

    const buildPost = async (entry: Entry): Promise<void> => {
      const layout = fs.readFileSync(path.join(paths.layouts, 'post.html'), 'utf8');
      const tpl = engine.parse(layout);
      const html = await engine.render(tpl, props);
      assertIsDefined(entry.link);
      const outDir = path.join(paths.public, entry.link);
      const exists = await fse.pathExists(outDir);
      if (!exists) await fse.mkdirp(outDir);
      await fsp.writeFile(path.join(outDir, 'index.html'), html);
    };

    buildPost(entry);
    assertIsDefined(entry.link); // TODO: remove this

    if (pos < options.feedSize) {
      feeds.push({
        title: data.title,
        content,
        date: formatRFC3339(entry.date),
        link: entry.link,
      });
    }

    if (options.archive) {
      archives.push({
        title: data.title,
        formattedDate: format(entry.date, 'MMM do, yyyy'),
        link: entry.link,
      });
    }

    const buildIndex = async (): Promise<void> => {
      props.index = true;
      const layout = fs.readFileSync(path.join(paths.layouts, 'post.html'), 'utf8');
      const tpl = engine.parse(layout);
      const html = await engine.render(tpl, props);
      await fsp.writeFile(path.join(paths.public, 'index.html'), html);
    };

    if (pos === 0) {
      buildIndex();
    }

    pos++;
  }

  const buildFeed = async (feeds: Feed[]): Promise<void> => {
    const layout = fs.readFileSync(path.join(paths.layouts, 'atom.xml'), 'utf8');
    const tpl = engine.parse(layout);
    const html = await engine.render(tpl, { feeds });
    await fsp.writeFile(path.join(paths.public, 'atom.xml'), html);
  };
  buildFeed(feeds);

  const buildArchive = async (archives: Archive[]): Promise<void> => {
    const layout = fs.readFileSync(
      path.join(paths.layouts, 'archive.html'),
      'utf8',
    );
    const tpl = engine.parse(layout);
    const html = await engine.render(tpl, { archives });
    const archiveDir = path.join(paths.public, 'archive');
    await fse.mkdirp(archiveDir);
    await fsp.writeFile(path.join(archiveDir, 'index.html'), html);
  };
  buildArchive(archives);

  // copy static
  fse.copySync(paths.static, paths.public);
};
