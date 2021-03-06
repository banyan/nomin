import { normalizeString } from './../utils/normalize';
import fs from 'fs';
import { format, formatRFC3339 } from 'date-fns';

import { paths } from '~/paths';

const fsp = fs.promises;

export const createPost = async (title: string): Promise<void> => {
  try {
    const time = new Date();
    await fsp.writeFile(
      `${paths.posts}/${format(time, 'yyyy-MM-dd')}-${normalizeString(title)}.md`,
      `---\ntitle: ${normalizeString(title)}\ndate: ${formatRFC3339(time)}\n---`,
    );
  } catch (error) {
    console.error(error);
  }
};
