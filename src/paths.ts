import fs from 'fs';
import path from 'path';

const srcDirectory = fs.realpathSync(process.cwd());
const resolvePath = (relativePath: string) => path.resolve(srcDirectory, relativePath);

export const paths = {
  posts: resolvePath('./posts'),
  layouts: resolvePath('./layouts'),
  public: resolvePath('./public'),
  static: resolvePath('./static'),
};

