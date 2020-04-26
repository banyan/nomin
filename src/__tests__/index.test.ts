import path from 'path';
import execa from 'execa';
import fse, { pathExists } from 'fs-extra';
import { format } from 'date-fns';
import tempy from 'tempy';
import assert from 'assert';

describe('nomin', () => {
  const tmpDir = tempy.directory();
  const bin = path.join(__dirname, '../../bin/run');
  const fixtureDir = path.join(__dirname, 'fixture');

  describe('nomin new', () => {
    it('creates a new file', async () => {
      process.chdir(tmpDir);
      await fse.copy(fixtureDir, tmpDir);
      const title = 'foo';
      const { stdout, stderr } = await execa(bin, ['new', title]);
      expect(stdout).toEqual('');
      expect(stderr).toEqual('');
      const expectedFile = `${tmpDir}/posts/${format(
        new Date(),
        'yyyy-MM-dd',
      )}-${title}.md`;
      expect(await pathExists(expectedFile)).toEqual(true);
    });

    it('shows a message if title is missing and returns exit code as 1', async () => {
      process.chdir(tmpDir);
      await fse.copy(fixtureDir, tmpDir);
      try {
        await expect(await execa(bin, ['new'])).rejects.toThrow();
      } catch (err) {
        // eslint-disable-next-line jest/no-try-expect
        expect(err.stdout).toMatchInlineSnapshot(`"nomin new requires title"`);
      }
    });
  });

  describe('nomin', () => {
    beforeAll(async () => {
      process.chdir(tmpDir);
      await fse.copy(fixtureDir, tmpDir);
      const { stdout, stderr } = await execa(bin);
      assert(stdout === '');
      assert(stderr === '');
    });

    describe('index.html', () => {
      it('creates index.html', async () => {
        const expectedFile = `${tmpDir}/public/index.html`;
        expect(await pathExists(expectedFile)).toEqual(true);
        const post = fse.readFileSync(expectedFile, 'utf8');
        expect(post).toMatchSnapshot();
      });
    });

    describe('post', () => {
      it('creates post html', async () => {
        const expectedFile = `${tmpDir}/public/2020/04/25/1/index.html`;
        expect(await pathExists(expectedFile)).toEqual(true);
        const post = fse.readFileSync(expectedFile, 'utf8');
        expect(post).toMatchSnapshot();
      });
    });

    describe('atom.xml', () => {
      it('creates atom.xml', async () => {
        const expectedFile = `${tmpDir}/public/atom.xml`;
        expect(await pathExists(expectedFile)).toEqual(true);
        const { stdout } = await execa.command(
          `grep -v updated ${expectedFile}`,
        );
        expect(stdout).toMatchSnapshot();
      });
    });

    describe('archive/index.html', () => {
      it('creates archive/index.html', async () => {
        const expectedFile = `${tmpDir}/public/archive/index.html`;
        expect(await pathExists(expectedFile)).toEqual(true);
        const archive = fse.readFileSync(expectedFile, 'utf8');
        expect(archive).toMatchSnapshot();
      });
    });

    describe('copy static', () => {
      it('copies from static to public', async () => {
        const expectedFile = `${tmpDir}/public/foo.txt`;
        expect(await pathExists(expectedFile)).toEqual(true);
      });
    });
  });
});
