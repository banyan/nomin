import { normalizeString } from './../normalize';

describe('normalizeString', () => {
  it('converts uppercase to lowercase', () => {
    expect(normalizeString("Aa")).toEqual("aa");
  });

  it('deletes hyphen at both ends', () => {
    expect(normalizeString("-a-")).toEqual("a");
  });

  it('converts slash to hyphen', () => {
    expect(normalizeString("A/a/a")).toEqual("a-a-a");
  });

  it('deletes slashes at both ends', () => {
    expect(normalizeString("/a/")).toEqual("a");
  });

  it('omits special characters', () => {
    expect(normalizeString("^&a*()")).toEqual("a");
  });

})
