import request from 'supertest';
import app from '../index';
import prisma from '../config/database';
import jwt from 'jsonwebtoken';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

export const createTestUser = async (email?: string, password = 'password123', name = 'Test User'): Promise<TestUser> => {
  // Generate unique email if not provided
  const uniqueEmail = email || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail,
      password_hash: await require('bcryptjs').hash(password, 12),
      name,
    },
  });

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '7d' }
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token,
  };
};

export const createTestResource = async (userId: string, data: any = {}) => {
  const defaultData = {
    title: 'Test Resource',
    type: 'note',
    content: 'Test content',
    ...data,
  };

  // Remove tag_names as it's not a direct field
  const { tag_names, ...resourceData } = defaultData;

  // Convert metadata to string for SQLite
  if (resourceData.metadata) {
    resourceData.metadata = JSON.stringify(resourceData.metadata);
  }

  const resource = await prisma.resource.create({
    data: {
      user_id: userId,
      ...resourceData,
    },
  });

  // Handle tags if provided
  if (tag_names && tag_names.length > 0) {
    for (const tagName of tag_names) {
      const tag = await prisma.tag.upsert({
        where: {
          user_id_name: {
            user_id: userId,
            name: tagName,
          },
        },
        update: {},
        create: {
          user_id: userId,
          name: tagName,
        },
      });

      await prisma.resource.update({
        where: { id: resource.id },
        data: {
          tags: {
            connect: { id: tag.id },
          },
        },
      });
    }
  }

  // Return with tags included
  return await prisma.resource.findUnique({
    where: { id: resource.id },
    include: {
      tags: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

export const getAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const api = request(app);