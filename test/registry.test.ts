import { describe, it, expect, beforeEach } from 'vitest';
import { registerLoader, getRegistry } from '../src/runtime/registry.js';

describe('Registry', () => {
  beforeEach(() => {
    getRegistry().clear();
  });

  it('should register loaders', () => {
    const loader1 = async () => ({ data: 'test1' });
    const loader2 = async () => ({ data: 'test2' });

    registerLoader('module1', loader1);
    registerLoader('module2', loader2);

    const registry = getRegistry();
    expect(registry.size).toBe(2);
    expect(registry.get('module1')).toBe(loader1);
    expect(registry.get('module2')).toBe(loader2);
  });

  it('should overwrite existing loader for same module', () => {
    const loader1 = async () => ({ data: 'test1' });
    const loader2 = async () => ({ data: 'test2' });

    registerLoader('module1', loader1);
    registerLoader('module1', loader2);

    const registry = getRegistry();
    expect(registry.size).toBe(1);
    expect(registry.get('module1')).toBe(loader2);
  });

  it('should return the same registry instance', () => {
    const registry1 = getRegistry();
    const registry2 = getRegistry();

    expect(registry1).toBe(registry2);
  });

  it('should persist registrations across calls', () => {
    registerLoader('module1', async () => ({ data: 'test1' }));

    expect(getRegistry().size).toBe(1);

    registerLoader('module2', async () => ({ data: 'test2' }));

    expect(getRegistry().size).toBe(2);
  });
});
