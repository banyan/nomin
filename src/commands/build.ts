import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import { compareDesc, format, formatRFC3339 } from 'date-fns';
import { Liquid } from 'liquidjs';
import yaml from 'js-yaml';

import { assertIsDefined } from '~/utils/assert';
import { paths } from '~/paths';
import { marked } from '~/utils/marked';
import { options } from '~/cli';

export const fsp = fs.promises;
export const engine = new Liquid();

export interface Entry {
  path: string;
  date: Date;
  formattedDate: string;
  link: string;
  title: string;
  content: string;
}

interface Data {
  title: string;
  date: string;
  permalink?: string;
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

const parse = (postPath: string): [string, Data] => {
  const data = fs.readFileSync(path.join(paths.posts, postPath), 'utf8');
  const m = data.match(/^---([\s\S]*?)---([\s\S]*)$/m);
  assertIsDefined(m);
  return [m[2], yaml.load(m[1])];
};

const normalizeLink = (s: string): string => {
  const regexp = /^[\d]{4}-[\d]{2}-[\d]{2}-(.*)\.md$/;
  const m = s.match(regexp);
  assertIsDefined(m);
  return path.join(options.basePath, m[1]);
};

const buildPost = async (
  entry: Entry & { nextPage: Entry | null; prevPage: Entry | null },
): Promise<void> => {
  const layout = await fsp.readFile(
    path.join(paths.layouts, 'post.html'),
    'utf8',
  );
  const tpl = engine.parse(layout);
  const html = await engine.render(tpl, entry);
  const outDir = path.join(paths.public, entry.link);
  const exists = await fse.pathExists(outDir);
  if (!exists) await fse.mkdirp(outDir);
  await fsp.writeFile(path.join(outDir, 'index.html'), html);
};

const buildIndex = async (entry: Entry): Promise<void> => {
  const layout = await fsp.readFile(
    path.join(paths.layouts, 'post.html'),
    'utf8',
  );
  const tpl = engine.parse(layout);
  const html = await engine.render(tpl, {
    ...entry,
    index: true,
  });
  await fsp.writeFile(path.join(paths.public, 'index.html'), html);
};

const buildFeed = async (feeds: Feed[]): Promise<void> => {
  const layout = await fsp.readFile(
    path.join(paths.layouts, 'atom.xml'),
    'utf8',
  );
  const tpl = engine.parse(layout);
  const html = await engine.render(tpl, { feeds });
  await fsp.writeFile(path.join(paths.public, 'atom.xml'), html);
};

const buildArchive = async (archives: Archive[]): Promise<void> => {
  const layout = await fsp.readFile(
    path.join(paths.layouts, 'archive.html'),
    'utf8',
  );
  const tpl = engine.parse(layout);
  const html = await engine.render(tpl, { archives });
  await fse.mkdirp(paths.archive);
  await fsp.writeFile(path.join(paths.archive, 'index.html'), html);
};

const buildPosts = (
  entries: Entry[],
  pos: number,
  feeds: Feed[],
  archives: Archive[],
): void => {
  for (const entry of entries) {
    const nextPage = pos < entries.length - 1 ? entries[pos + 1] : null;
    const prevPage = pos > 0 ? entries[pos - 1] : null;

    buildPost({
      ...entry,
      nextPage,
      prevPage,
    });

    if (pos < options.feedSize) {
      feeds.push({
        title: entry.title,
        content: entry.content,
        date: formatRFC3339(entry.date),
        link: entry.link,
      });
    }

    if (options.archive) {
      archives.push({
        title: entry.title,
        formattedDate: entry.formattedDate,
        link: entry.link,
      });
    }

    if (pos === 0) {
      buildIndex(entry);
    }

    pos++;
  }
};

export const build = async (): Promise<void> => {
  const postPaths = await fsp.readdir(paths.posts);

  const pos = 0;
  const feeds: Feed[] = [];
  const archives: Archive[] = [];

  const entries: Entry[] = postPaths
    .filter((postPath) => path.extname(postPath) === '.md')
    .map((postPath) => {
      const [content, data] = parse(postPath);
      const date = new Date(data.date);
      return {
        path: postPath,
        date,
        formattedDate: format(date, 'MMM do, yyyy'),
        link: data.permalink || normalizeLink(postPath),
        title: data.title,
        content: marked(content),
      };
    })
    .sort((a: Entry, b: Entry) => compareDesc(a.date, b.date));

  buildPosts(entries, pos, feeds, archives);
  buildFeed(feeds);
  if (options.archive) buildArchive(archives);
  fse.copySync(paths.static, paths.public); // copy static
};
