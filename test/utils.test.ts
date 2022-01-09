import { expect } from 'chai';
import { args2Option } from '../lib/index';

describe('utils', () => {

  it('args2Option should parse standalone unknown bool flags', () => {
    const env = args2Option(['--FOO']);
    if (env.extra)
      expect(env.extra.FOO).to.eq('1')
  })

  it('args2Option should parse unknown flags with value', () => {
    const env = args2Option(['--FOO', 'bar']);
    if (env.extra)
      expect(env.extra.FOO).to.eq('bar')
  })

  it('args2Option should parse unknown string flags with value', () => {
    const env = args2Option(['--FOO=bar']);
    if (env.extra)
      expect(env.extra.FOO).to.eq('bar')
  })

})