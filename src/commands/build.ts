import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import { compareAsc, format, formatRFC3339 } from 'date-fns';
import readline from 'readline';
import { Liquid } from 'liquidjs';
import yaml from 'js-yaml';

import { assertIsDefined } from '~/utils/assert';
import { paths } from '~/paths';
import { marked } from '~/marked';
import { options } from '~/cli';

export const fsp = fs.promises;
export const engine = new Liquid();

export interface Entry {
  path: string;
  date: Date;
  cnt?: number;
  link?: string;
}

interface Data {
  title: string;
  date: string;
}

export interface Feed {
  title: string;
  date: string;
  link: string;
  content: string;
}

export interface Archive {
  title: string;
  formattedDate: string;
  link: string;
}

export const parse = (entry: Entry): [string, Data] => {
  const data = fs.readFileSync(path.join(paths.posts, entry.path), 'utf8');
  const m = data.match(/^---([\s\S]*?)---([\s\S]*)$/m);
  if (!m) throw new Error(`parse failed: ${data}, ${m}`);
  return [m[2], yaml.load(m[1])];
};

export const build = async () => {
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
      const layout = fs.readFileSync(
        path.join(paths.layouts, 'post.html'),
        'utf8',
      );
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
      const layout = fs.readFileSync(
        path.join(paths.layouts, 'post.html'),
        'utf8',
      );
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
    const layout = fs.readFileSync(
      path.join(paths.layouts, 'atom.xml'),
      'utf8',
    );
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
