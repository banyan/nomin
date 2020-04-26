import { cli } from '~/cli';
import { build } from '~/commands/build';
import { createPost } from '~/commands/new';

export const run = async (): Promise<void> => {
  if (cli.flags.v) {
    cli.showVersion();
    process.exit(0);
  }

  if (cli.flags.h) {
    cli.showHelp();
    process.exit(0);
  }

  if (cli.input[0] === 'new') {
    if (cli.input[0] === 'new' && cli.input.length !== 2) {
      console.log('nomin new requires title');
      process.exit(1);
    }
    await createPost(cli.input[1]);
    process.exit(0);
  }

  build();
};
