import { api, createTestUser, createTestResource, getAuthHeader } from './testUtils';
import prisma from '../config/database';

describe('Search Routes', () => {
  let user: any;
  let user2: any;

  beforeEach(async () => {
    await prisma.resource.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();

    user = await createTestUser('searchuser@example.com');
    user2 = await createTestUser('searchuser2@example.com');

    // Create test resources with searchable content
    await createTestResource(user.id, {
      title: 'JavaScript Guide',
      content: 'Learn JavaScript programming language basics',
      type: 'document',
    });

    await createTestResource(user.id, {
      title: 'React Tutorial',
      content: 'Building user interfaces with React',
      type: 'video',
    });

    await createTestResource(user.id, {
      title: 'Node.js Best Practices',
      content: 'Server-side JavaScript with Node.js',
      type: 'note',
    });

    await createTestResource(user2.id, {
      title: 'Other User Resource',
      content: 'This should not appear in user searches',
      type: 'note',
    });
  });

  describe('GET /api/search', () => {
    it('should search resources by query', async () => {
      const response = await api
        .get('/api/search?q=JavaScript')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources.length).toBeGreaterThan(0);
      expect(response.body.data.resources.some((r: any) => r.title.includes('JavaScript'))).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await api
        .get('/api/search?q=programming&type=note')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources.every((r: any) => r.type === 'note')).toBe(true);
    });

    it('should filter by tags', async () => {
      // Create resource with tags
      await createTestResource(user.id, {
        title: 'Tagged Resource',
        content: 'Content with tags',
        type: 'note',
        tag_names: ['javascript', 'tutorial'],
      });

      const response = await api
        .get('/api/search?tags=javascript')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources.length).toBeGreaterThan(0);
      expect(response.body.data.resources[0].tags.some((tag: any) => tag.name === 'javascript')).toBe(true);
    });

    it('should handle pagination', async () => {
      const response = await api
        .get('/api/search?q=programming&limit=1&offset=0')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources.length).toBe(1);
      expect(response.body.data.has_more).toBe(false); // Only 1 resource matches "programming"
    });

    it('should return empty results for no matches', async () => {
      const response = await api
        .get('/api/search?q=nonexistentterm')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return all resources when no query', async () => {
      const response = await api
        .get('/api/search')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources.length).toBe(3); // Only user's resources
      expect(response.body.data.total).toBe(3);
    });

    it('should return 401 without authentication', async () => {
      const response = await api
        .get('/api/search?q=test')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/search/suggestions', () => {
    it('should return title suggestions', async () => {
      const response = await api
        .get('/api/search/suggestions?q=Java')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toContain('JavaScript Guide');
      expect(response.body.data.type).toBe('mixed');
    });

    it('should return tag suggestions', async () => {
      // Create resource with tags
      await createTestResource(user.id, {
        title: 'Tagged Resource',
        type: 'note',
        tag_names: ['react', 'tutorial'],
      });

      const response = await api
        .get('/api/search/suggestions?q=rea')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toContain('react');
    });

    it('should return popular tags when no query', async () => {
      // Create resources with tags
      await createTestResource(user.id, {
        title: 'Resource 1',
        type: 'note',
        tag_names: ['popular', 'tag'],
      });
      await createTestResource(user.id, {
        title: 'Resource 2',
        type: 'note',
        tag_names: ['popular'],
      });

      const response = await api
        .get('/api/search/suggestions')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('tags');
      expect(response.body.data.suggestions).toContain('popular');
    });

    it('should limit suggestions', async () => {
      const response = await api
        .get('/api/search/suggestions?limit=2')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await api
        .get('/api/search/suggestions?q=test')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});