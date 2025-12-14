import { describe, it, expect, beforeEach } from 'vitest';
import { registerLoader, getRegistry, initializeRequestRegistry } from '../src/runtime/registry.js';

describe('Registry', () => {
  it('should register loaders within request context', () => {
    initializeRequestRegistry(() => {
      const loader1 = async () => ({ data: 'test1' });
      const loader2 = async () => ({ data: 'test2' });

      registerLoader('module1', loader1);
      registerLoader('module2', loader2);

      const registry = getRegistry();
      expect(registry.size).toBe(2);
      expect(registry.get('module1')).toBe(loader1);
      expect(registry.get('module2')).toBe(loader2);
    });
  });

  it('should skip re-registration of already-registered loaders', () => {
    initializeRequestRegistry(() => {
      const loader1 = async () => ({ data: 'test1' });
      const loader2 = async () => ({ data: 'test2' });

      registerLoader('module1', loader1);
      registerLoader('module1', loader2); // Should be skipped

      const registry = getRegistry();
      expect(registry.size).toBe(1);
      expect(registry.get('module1')).toBe(loader1); // First loader is kept
    });
  });

  it('should return the same registry instance within request', () => {
    initializeRequestRegistry(() => {
      const registry1 = getRegistry();
      const registry2 = getRegistry();

      expect(registry1).toBe(registry2);
    });
  });

  it('should isolate registrations between requests', () => {
    const loader1 = async () => ({ data: 'request1' });
    const loader2 = async () => ({ data: 'request2' });

    // First request
    initializeRequestRegistry(() => {
      registerLoader('module1', loader1);
      expect(getRegistry().size).toBe(1);
    });

    // Second request - should have fresh registry
    initializeRequestRegistry(() => {
      expect(getRegistry().size).toBe(0); // Empty registry
      registerLoader('module2', loader2);
      expect(getRegistry().size).toBe(1);
      expect(getRegistry().has('module1')).toBe(false); // Previous request's loader not present
    });
  });
});
