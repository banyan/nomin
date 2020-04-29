import fs from 'fs';
import { advanceTo, clear } from 'jest-date-mock';

import { paths } from '~/paths';
import { createPost } from '~/commands/new';

describe('createPost', () => {
  const spy = jest
    .spyOn(fs.promises, 'writeFile')
    .mockImplementation(jest.fn());
  advanceTo(new Date(2020, 3, 25, 0, 0, 0)); // 3 is actually 4

  afterAll(() => {
    clear();
  });

  it('creates new post', async () => {
    const title = 'foo/bar';
    await createPost(title);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toEqual(
      `${paths.posts}/2020-04-25-${'foo-bar'}.md`,
    );
    expect(spy.mock.calls[0][1]).toMatchInlineSnapshot(`
      "---
      title: foo-bar
      date: 2020-04-25T00:00:00+09:00
      ---"
    `);
  });
});
