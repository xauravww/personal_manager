import { api, createTestUser, createTestResource, getAuthHeader } from './testUtils';
import prisma from '../config/database';

describe('Resources Routes', () => {
  let user: any;
  let user2: any;

  beforeEach(async () => {
    await prisma.resource.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();

    user = await createTestUser('user1@example.com');
    user2 = await createTestUser('user2@example.com');
  });

  describe('GET /api/resources', () => {
    it('should return user resources with pagination', async () => {
      // Create test resources
      await createTestResource(user.id, { title: 'Resource 1' });
      await createTestResource(user.id, { title: 'Resource 2' });
      await createTestResource(user2.id, { title: 'Resource 3' }); // Different user

      const response = await api
        .get('/api/resources')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(12);
    });

    it('should filter by type', async () => {
      await createTestResource(user.id, { title: 'Note Resource', type: 'note' });
      await createTestResource(user.id, { title: 'Video Resource', type: 'video' });

      const response = await api
        .get('/api/resources?type=note')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toHaveLength(1);
      expect(response.body.data.resources[0].type).toBe('note');
    });

    it('should handle pagination', async () => {
      // Create 5 resources
      for (let i = 1; i <= 5; i++) {
        await createTestResource(user.id, { title: `Resource ${i}` });
      }

      const response = await api
        .get('/api/resources?page=1&limit=2')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resources).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(5);
      expect(response.body.data.pagination.pages).toBe(3);
    });

    it('should return 401 without authentication', async () => {
      const response = await api
        .get('/api/resources')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should return specific resource', async () => {
      const resource = await createTestResource(user.id, { title: 'Specific Resource' });
      expect(resource).toBeTruthy();

      const response = await api
        .get(`/api/resources/${resource!.id}`)
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resource.id).toBe(resource!.id);
      expect(response.body.data.resource.title).toBe('Specific Resource');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await api
        .get('/api/resources/123e4567-e89b-12d3-a456-426614174000')
        .set(getAuthHeader(user.token))
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for resource belonging to another user', async () => {
      const resource = await createTestResource(user2.id);
      expect(resource).toBeTruthy();

      const response = await api
        .get(`/api/resources/${resource!.id}`)
        .set(getAuthHeader(user.token))
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await api
        .get('/api/resources/invalid-uuid')
        .set(getAuthHeader(user.token))
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/resources', () => {
    it('should create a new resource', async () => {
      const resourceData = {
        title: 'New Resource',
        description: 'Description',
        type: 'note',
        content: 'Content',
        tag_names: ['tag1', 'tag2'],
      };

      const response = await api
        .post('/api/resources')
        .set(getAuthHeader(user.token))
        .send(resourceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resource.title).toBe(resourceData.title);
      expect(response.body.data.resource.type).toBe(resourceData.type);
      expect(response.body.data.resource.tags).toHaveLength(2);
    });

    it('should create resource with URL for link type', async () => {
      const resourceData = {
        title: 'Link Resource',
        type: 'link',
        url: 'https://example.com',
      };

      const response = await api
        .post('/api/resources')
        .set(getAuthHeader(user.token))
        .send(resourceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resource.url).toBe(resourceData.url);
    });

    it('should return 400 for invalid type', async () => {
      const resourceData = {
        title: 'Invalid Type',
        type: 'invalid',
      };

      const response = await api
        .post('/api/resources')
        .set(getAuthHeader(user.token))
        .send(resourceData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const resourceData = {
        description: 'Missing title and type',
      };

      const response = await api
        .post('/api/resources')
        .set(getAuthHeader(user.token))
        .send(resourceData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/resources/:id', () => {
    it('should update resource', async () => {
      const resource = await createTestResource(user.id, { title: 'Original Title' });
      expect(resource).toBeTruthy();

      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        tag_names: ['new-tag'],
      };

      const response = await api
        .put(`/api/resources/${resource!.id}`)
        .set(getAuthHeader(user.token))
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resource.title).toBe(updateData.title);
      expect(response.body.data.resource.description).toBe(updateData.description);
      expect(response.body.data.resource.tags).toHaveLength(1);
      expect(response.body.data.resource.tags[0].name).toBe('new-tag');
    });

    it('should return 404 for non-existent resource', async () => {
      const updateData = { title: 'Updated Title' };

      const response = await api
        .put('/api/resources/123e4567-e89b-12d3-a456-426614174000')
        .set(getAuthHeader(user.token))
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for resource belonging to another user', async () => {
      const resource = await createTestResource(user2.id);
      expect(resource).toBeTruthy();
      const updateData = { title: 'Updated Title' };

      const response = await api
        .put(`/api/resources/${resource!.id}`)
        .set(getAuthHeader(user.token))
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/resources/:id', () => {
    it('should delete resource', async () => {
      const resource = await createTestResource(user.id);
      expect(resource).toBeTruthy();

      const response = await api
        .delete(`/api/resources/${resource!.id}`)
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Resource deleted successfully');

      // Verify resource is deleted
      await api
        .get(`/api/resources/${resource!.id}`)
        .set(getAuthHeader(user.token))
        .expect(404);
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await api
        .delete('/api/resources/123e4567-e89b-12d3-a456-426614174000')
        .set(getAuthHeader(user.token))
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for resource belonging to another user', async () => {
      const resource = await createTestResource(user2.id);
      expect(resource).toBeTruthy();

      const response = await api
        .delete(`/api/resources/${resource!.id}`)
        .set(getAuthHeader(user.token))
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});