import { cli } from './cli';
import { build } from './commands/build';
import { createPost } from './commands/new'

export const run = async (): Promise<void> => {
  if (cli.input[0] === 'new' && cli.input.length === 2) {
    await createPost(cli.input[1]);
    process.exit(0);
  }

  build();
};
