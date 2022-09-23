import { createID } from '../src/utilities';

describe('utilities', () => {
  it('should create an id string with a length of 5', () => {
    expect(createID(5)).toHaveLength(5);
  });
});
