import { describe, expect, it } from 'vitest';
import {
  groupOnlyChurchSurfaceRedirect,
  groupOnlyHomeRedirect,
  permittedPresentationTypesForSession,
  presentationTypesFromQuery,
} from './church-member-access';

describe('church-member-access', () => {
  it('sends group-only users to groups when the flag is on', () => {
    expect(
      groupOnlyHomeRedirect({
        isChurchMember: false,
        prayerGroupsEnabled: true,
      })
    ).toEqual({
      commands: ['/'],
      queryParams: { filter: 'groups' },
    });
  });

  it('sends group-only users to personal when groups are off', () => {
    expect(groupOnlyHomeRedirect({ isChurchMember: false })).toEqual({
      commands: ['/'],
      queryParams: { filter: 'personal' },
    });
  });

  it('lets church members keep church presentation types', () => {
    expect(
      permittedPresentationTypesForSession({ isChurchMember: true }, [
        'prayers',
        'prompts',
      ])
    ).toEqual({
      kind: 'allow',
      contentTypes: ['prayers', 'prompts'],
    });
  });

  it('keeps group Pray handoff for group-only users', () => {
    expect(
      permittedPresentationTypesForSession(
        { isChurchMember: false, prayerGroupsEnabled: true },
        ['groups']
      )
    ).toEqual({ kind: 'allow', contentTypes: ['groups'] });
  });

  it('redirects a church-only presentation handoff for group-only users', () => {
    expect(
      permittedPresentationTypesForSession(
        { isChurchMember: false, prayerGroupsEnabled: true },
        ['prayers']
      )
    ).toEqual({
      kind: 'redirect',
      redirect: {
        commands: ['/'],
        queryParams: { filter: 'groups' },
      },
    });
  });

  it('redirects bare presentation for group-only users', () => {
    expect(
      permittedPresentationTypesForSession(
        { isChurchMember: false, prayerGroupsEnabled: true },
        null
      ).kind
    ).toBe('redirect');
  });

  it('reads homeTypes from the presentation query', () => {
    expect(
      presentationTypesFromQuery((key) => (key === 'homeTypes' ? 'groups' : null))
    ).toEqual(['groups']);
  });

  it('sends group-only users off admin', () => {
    expect(
      groupOnlyChurchSurfaceRedirect({
        path: '/admin',
        session: { isChurchMember: false, prayerGroupsEnabled: true },
        query: () => null,
      })
    ).toEqual({
      commands: ['/'],
      queryParams: { filter: 'groups' },
    });
  });

  it('keeps group-only users on a groups presentation', () => {
    expect(
      groupOnlyChurchSurfaceRedirect({
        path: '/presentation?homeTypes=groups',
        session: { isChurchMember: false, prayerGroupsEnabled: true },
        query: (key) => (key === 'homeTypes' ? 'groups' : null),
      })
    ).toBeNull();
  });

  it('sends group-only users off church presentation', () => {
    expect(
      groupOnlyChurchSurfaceRedirect({
        path: '/presentation?homeTypes=prayers',
        session: { isChurchMember: false, prayerGroupsEnabled: true },
        query: (key) => (key === 'homeTypes' ? 'prayers' : null),
      })?.queryParams
    ).toEqual({ filter: 'groups' });
  });

  it('does not move church members', () => {
    expect(
      groupOnlyChurchSurfaceRedirect({
        path: '/admin',
        session: { isChurchMember: true },
        query: () => null,
      })
    ).toBeNull();
  });
});
