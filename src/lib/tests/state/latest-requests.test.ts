import { describe, expect, it } from 'vitest';
import { LatestRequests } from '#lib/state/latest-requests.js';

describe('LatestRequests', () => {
  it('supersedes only the matching scope and never revives an older request', () => {
    const requests = new LatestRequests<'collection' | 'history'>();
    const oldCollection = requests.begin('collection');
    const history = requests.begin('history');
    const collection = requests.begin('collection');

    expect(oldCollection()).toBe(false);
    expect(collection()).toBe(true);
    expect(history()).toBe(true);

    requests.invalidate('collection');
    const nextCollection = requests.begin('collection');
    expect(oldCollection()).toBe(false);
    expect(collection()).toBe(false);
    expect(nextCollection()).toBe(true);
    expect(history()).toBe(true);

    requests.invalidate('collection', 'history');
    expect(nextCollection()).toBe(false);
    expect(history()).toBe(false);
  });

  it('permanently invalidates pending and future requests on destruction', () => {
    const requests = new LatestRequests<'collection'>();
    const pending = requests.begin('collection');
    expect(requests.destroyed).toBe(false);

    requests.destroy();
    requests.destroy();

    expect(requests.destroyed).toBe(true);
    expect(pending()).toBe(false);
    expect(requests.begin('collection')()).toBe(false);
  });

  it('keeps request ownership isolated between controller instances', () => {
    const first = new LatestRequests<'collection'>();
    const second = new LatestRequests<'collection'>();
    const firstCollection = first.begin('collection');
    const secondCollection = second.begin('collection');

    first.destroy();

    expect(firstCollection()).toBe(false);
    expect(secondCollection()).toBe(true);
    expect(second.destroyed).toBe(false);
  });
});
