import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import {
  CreateLearningSubjectRequest,
  UpdateLearningSubjectRequest,
  CreateLearningModuleRequest,
  SubmitAssignmentRequest,
  GenerateCourseRequest
} from '../types';
import { aiService } from '../services/aiService';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all learning routes
router.use(authenticateToken);

// Learning Subjects CRUD
router.get('/subjects', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const subjects = await prisma.learningSubject.findMany({
      where: { user_id: userId, is_active: true },
      include: {
        modules: {
          include: {
            progress: {
              where: { user_id: userId }
            },
            assignments: true
          }
        },
        progress: {
          where: { user_id: userId }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching learning subjects:', error);
    res.status(500).json({ error: 'Failed to fetch learning subjects' });
  }
});

router.post('/subjects', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, goals }: CreateLearningSubjectRequest = req.body;

    const subject = await prisma.learningSubject.create({
      data: {
        user_id: userId,
        name,
        description,
        goals: goals ? JSON.stringify(goals) : null
      }
    });

    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating learning subject:', error);
    res.status(500).json({ error: 'Failed to create learning subject' });
  }
});

router.put('/subjects/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { name, description, goals }: UpdateLearningSubjectRequest = req.body;

    const subject = await prisma.learningSubject.update({
      where: {
        id,
        user_id: userId
      },
      data: {
        name,
        description,
        goals: goals ? JSON.stringify(goals) : undefined
      }
    });

    res.json(subject);
  } catch (error) {
    console.error('Error updating learning subject:', error);
    res.status(500).json({ error: 'Failed to update learning subject' });
  }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await prisma.learningSubject.update({
      where: {
        id,
        user_id: userId
      },
      data: {
        is_active: false
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting learning subject:', error);
    res.status(500).json({ error: 'Failed to delete learning subject' });
  }
});

// Learning Modules CRUD
router.get('/subjects/:subjectId/modules', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subjectId } = req.params;

    const modules = await prisma.learningModule.findMany({
      where: {
        subject_id: subjectId,
        subject: {
          user_id: userId
        }
      },
      include: {
        progress: {
          where: { user_id: userId }
        },
        assignments: true
      },
      orderBy: { order_index: 'asc' }
    });

    res.json(modules);
  } catch (error) {
    console.error('Error fetching learning modules:', error);
    res.status(500).json({ error: 'Failed to fetch learning modules' });
  }
});

router.post('/modules', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject_id, title, description, content, order_index, prerequisites, estimated_time, difficulty, is_optional }: CreateLearningModuleRequest = req.body;

    // Verify subject belongs to user
    const subject = await prisma.learningSubject.findFirst({
      where: {
        id: subject_id,
        user_id: userId
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const module = await prisma.learningModule.create({
      data: {
        subject_id,
        title,
        description,
        content,
        order_index: order_index || 0,
        prerequisites: prerequisites ? JSON.stringify(prerequisites) : null,
        estimated_time,
        difficulty,
        is_optional: is_optional || false
      }
    });

    res.status(201).json(module);
  } catch (error) {
    console.error('Error creating learning module:', error);
    res.status(500).json({ error: 'Failed to create learning module' });
  }
});

// Progress tracking
router.post('/progress', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { module_id, status, score, time_spent, notes } = req.body;

    // Verify module belongs to user's subject
    const module = await prisma.learningModule.findFirst({
      where: {
        id: module_id,
        subject: {
          user_id: userId
        }
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const progress = await prisma.learningProgress.upsert({
      where: {
        user_id_module_id: {
          user_id: userId,
          module_id
        }
      },
      update: {
        status,
        score,
        time_spent: {
          increment: time_spent || 0
        },
        completed_at: status === 'completed' ? new Date() : undefined,
        notes
      },
      create: {
        user_id: userId,
        subject_id: module.subject_id,
        module_id,
        status,
        score,
        time_spent: time_spent || 0,
        started_at: new Date(),
        completed_at: status === 'completed' ? new Date() : undefined,
        notes
      }
    });

    res.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Assignment submission
router.post('/assignments/submit', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { assignment_id, content }: SubmitAssignmentRequest = req.body;

    // Verify assignment belongs to user's module
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignment_id,
        module: {
          subject: {
            user_id: userId
          }
        }
      },
      include: {
        module: {
          include: {
            subject: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Analyze submission with AI
    const analysis = await aiService.analyzeAssignmentSubmission(
      {
        title: assignment.title,
        description: assignment.description || '',
        solution: assignment.solution || undefined
      },
      content,
      assignment.module.subject.name
    );

    // Create or update submission
    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignment_id_user_id: {
          assignment_id,
          user_id: userId
        }
      },
      update: {
        content,
        score: analysis.score,
        feedback: analysis.feedback,
        weak_points: JSON.stringify(analysis.weakPoints),
        submitted_at: new Date(),
        graded_at: new Date()
      },
      create: {
        assignment_id,
        user_id: userId,
        content,
        score: analysis.score,
        feedback: analysis.feedback,
        weak_points: JSON.stringify(analysis.weakPoints)
      }
    });

    // Create weak points in database
    for (const weakPoint of analysis.weakPoints) {
      await prisma.weakPoint.upsert({
        where: {
          user_id_topic: {
            user_id: userId,
            topic: weakPoint.topic
          }
        },
        update: {
          frequency: {
            increment: 1
          },
          last_identified: new Date()
        },
        create: {
          user_id: userId,
          subject_id: assignment.module.subject_id,
          topic: weakPoint.topic,
          description: weakPoint.description,
          severity: weakPoint.severity as any,
          suggestions: JSON.stringify(weakPoint.suggestions)
        }
      });
    }

    res.json({
      submission,
      analysis: {
        score: analysis.score,
        feedback: analysis.feedback,
        weakPoints: analysis.weakPoints,
        strengths: analysis.strengths,
        improvementAreas: analysis.improvementAreas
      }
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// Get learning progress overview
router.get('/progress/overview', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const subjects = await prisma.learningSubject.findMany({
      where: { user_id: userId, is_active: true },
      include: {
        modules: {
          include: {
            progress: {
              where: { user_id: userId }
            }
          }
        },
        progress: {
          where: { user_id: userId }
        },
        weakPoints: true
      }
    });

    const overview = subjects.map(subject => {
      const totalModules = subject.modules.length;
      const completedModules = subject.progress.filter(p => p.status === 'completed').length;
      const totalTimeSpent = subject.progress.reduce((sum, p) => sum + p.time_spent, 0);

      return {
        subject,
        overall_progress: {
          completed_modules: completedModules,
          total_modules: totalModules,
          percentage: totalModules > 0 ? (completedModules / totalModules) * 100 : 0,
          time_spent: totalTimeSpent,
          weak_points: subject.weakPoints
        }
      };
    });

    res.json(overview);
  } catch (error) {
    console.error('Error fetching progress overview:', error);
    res.status(500).json({ error: 'Failed to fetch progress overview' });
  }
});

// Generate course from AI analysis
router.post('/generate-course', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject_name, user_resources, current_level, goals }: GenerateCourseRequest = req.body;

    // Get user's existing resources for analysis
    let userResources: Array<{ title: string; content?: string; type: string; tags: string[] }> = [];
    if (user_resources && user_resources.length > 0) {
      const resources = await prisma.resource.findMany({
        where: {
          id: { in: user_resources },
          user_id: userId
        },
        select: {
          title: true,
          content: true,
          type: true,
          tags: {
            select: { name: true }
          }
        }
      });

      userResources = resources.map(r => ({
        title: r.title,
        content: r.content || undefined,
        type: r.type,
        tags: r.tags.map((t: any) => t.name)
      }));
    } else {
      // Get all user's resources related to the subject
      const resources = await prisma.resource.findMany({
        where: {
          user_id: userId,
          OR: [
            { title: { contains: subject_name } },
            { content: { contains: subject_name } },
            { tags: { some: { name: { contains: subject_name } } } }
          ]
        },
        select: {
          title: true,
          content: true,
          type: true,
          tags: {
            select: { name: true }
          }
        },
        take: 20 // Limit for analysis
      });

      userResources = resources.map(r => ({
        title: r.title,
        content: r.content || undefined,
        type: r.type,
        tags: r.tags.map((t: any) => t.name)
      }));
    }

    // Analyze user resources to assess current level
    const resourceAnalysis = await aiService.analyzeUserResourcesForCourse(
      subject_name,
      userResources,
      current_level
    );

    // Check if subject already exists
    let subject = await prisma.learningSubject.findFirst({
      where: {
        user_id: userId,
        name: subject_name,
        is_active: true
      }
    });

    if (!subject) {
      // Create new subject
      subject = await prisma.learningSubject.create({
        data: {
          user_id: userId,
          name: subject_name,
          current_level: resourceAnalysis.assessedLevel,
          goals: goals ? JSON.stringify(goals) : null
        }
      });
    } else {
      // Update existing subject with new assessment
      subject = await prisma.learningSubject.update({
        where: { id: subject.id },
        data: {
          current_level: resourceAnalysis.assessedLevel,
          goals: goals ? JSON.stringify(goals) : JSON.parse(subject.goals || '[]')
        }
      });
    }

    // Get existing progress
    const existingProgress = await prisma.learningProgress.findMany({
      where: {
        user_id: userId,
        subject_id: subject.id
      },
      include: {
        module: true
      }
    });

    const existingModules = existingProgress.map(p => ({
      title: p.module.title,
      completed: p.status === 'completed'
    }));

    // Generate personalized course
    const course = await aiService.generatePersonalizedCourse(
      subject_name,
      resourceAnalysis.assessedLevel,
      goals || [],
      resourceAnalysis.knowledgeGaps,
      existingModules
    );

    // Create modules in database
    const createdModules = [];
    for (const moduleData of course.modules) {
      const module = await prisma.learningModule.create({
        data: {
          subject_id: subject.id,
          title: moduleData.title,
          description: moduleData.description,
          content: moduleData.content,
          order_index: moduleData.order,
          prerequisites: JSON.stringify(moduleData.prerequisites),
          estimated_time: moduleData.estimatedHours,
          difficulty: moduleData.difficulty
        }
      });

      // Create assignments for this module
      for (const assignmentData of moduleData.assignments) {
        await prisma.assignment.create({
          data: {
            module_id: module.id,
            title: assignmentData.title,
            type: assignmentData.type as any,
            description: assignmentData.description
          }
        });
      }

      createdModules.push(module);
    }

    // Generate and save mindmap
    const mindmap = await aiService.generateMindmap(
      subject_name,
      'concept',
      {
        currentLevel: resourceAnalysis.assessedLevel,
        goals: goals
      }
    );

    await prisma.mindMap.create({
      data: {
        user_id: userId,
        subject_id: subject.id,
        title: mindmap.title,
        content: JSON.stringify(mindmap.structure),
        type: 'concept'
      }
    });

    res.json({
      subject,
      course,
      resourceAnalysis,
      modules: createdModules,
      mindmap,
      message: 'Course generated successfully'
    });
  } catch (error) {
    console.error('Error generating course:', error);
    res.status(500).json({ error: 'Failed to generate course' });
  }
});

// Get knowledge summary for a subject
router.get('/subjects/:subjectId/knowledge-summary', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subjectId } = req.params;

    // Verify subject belongs to user
    const subject = await prisma.learningSubject.findFirst({
      where: {
        id: subjectId,
        user_id: userId,
        is_active: true
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Get progress data
    const progressRecords = await prisma.learningProgress.findMany({
      where: {
        user_id: userId,
        subject_id: subjectId
      },
      include: {
        module: true
      }
    });

    const completedModules = progressRecords
      .filter(p => p.status === 'completed')
      .map(p => ({
        title: p.module.title,
        score: p.score || undefined,
        completedAt: p.completed_at!
      }));

    const currentModules = progressRecords
      .filter(p => p.status === 'in_progress')
      .map(p => ({
        title: p.module.title,
        progress: p.score || 0 // Using score as progress percentage
      }));

    const weakPoints = await prisma.weakPoint.findMany({
      where: {
        user_id: userId,
        subject_id: subjectId
      }
    });

    const weakPointsData = weakPoints.map(wp => ({
      topic: wp.topic,
      severity: wp.severity,
      frequency: wp.frequency
    }));

    const totalTimeSpent = progressRecords.reduce((sum, p) => sum + p.time_spent, 0);

    // Get assignment submissions
    const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        user_id: userId,
        assignment: {
          module: {
            subject_id: subjectId
          }
        }
      }
    });

    const assignmentSubmissionsData = assignmentSubmissions.map(sub => ({
      score: sub.score || undefined,
      feedback: sub.feedback || undefined,
      weakPoints: sub.weak_points ? JSON.parse(sub.weak_points) : undefined
    }));

    // Get user's resources related to the subject
    const resources = await prisma.resource.findMany({
      where: {
        user_id: userId,
        OR: [
          { title: { contains: subject.name } },
          { content: { contains: subject.name } },
          { tags: { some: { name: { contains: subject.name } } } }
        ]
      },
      select: {
        title: true,
        type: true,
        tags: {
          select: { name: true }
        }
      },
      take: 20
    });

    const resourcesData = resources.map(r => ({
      title: r.title,
      type: r.type,
      tags: r.tags.map((t: any) => t.name)
    }));

    // Generate knowledge summary
    const knowledgeSummary = await aiService.generateKnowledgeSummary(
      subject.name,
      {
        completedModules,
        currentModules,
        weakPoints: weakPointsData,
        totalTimeSpent,
        assignmentSubmissions: assignmentSubmissionsData
      },
      resourcesData,
      subject.current_level || 'beginner'
    );

    res.json(knowledgeSummary);
  } catch (error) {
    console.error('Error generating knowledge summary:', error);
    res.status(500).json({ error: 'Failed to generate knowledge summary' });
  }
});

// Get mindmaps
router.get('/mindmaps', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const mindmaps = await prisma.mindMap.findMany({
      where: { user_id: userId },
      include: {
        subject: true
      },
      orderBy: { generated_at: 'desc' }
    });

    res.json(mindmaps);
  } catch (error) {
    console.error('Error fetching mindmaps:', error);
    res.status(500).json({ error: 'Failed to fetch mindmaps' });
  }
});

// Generate mindmap
router.post('/mindmaps/generate', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject_id, type, context } = req.body;

    let subject = null;
    if (subject_id) {
      subject = await prisma.learningSubject.findFirst({
        where: {
          id: subject_id,
          user_id: userId
        }
      });
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }
    }

    // Get context data
    let contextData = {};
    if (context && type === 'progress' && subject) {
      const progress = await prisma.learningProgress.findMany({
        where: {
          user_id: userId,
          subject_id: subject.id
        },
        include: {
          module: true
        }
      });

      contextData = {
        completedModules: progress.filter(p => p.status === 'completed').map(p => p.module.title),
        currentLevel: subject.current_level,
        goals: subject.goals ? JSON.parse(subject.goals) : []
      };
    } else if (context && type === 'weak_points' && subject) {
      const weakPoints = await prisma.weakPoint.findMany({
        where: {
          user_id: userId,
          subject_id: subject.id
        }
      });

      contextData = {
        weakPoints: weakPoints.map(wp => wp.topic),
        currentLevel: subject.current_level
      };
    }

    const mindmap = await aiService.generateMindmap(
      subject?.name || 'General Knowledge',
      type as 'concept' | 'progress' | 'weak_points',
      contextData
    );

    // Save mindmap
    const savedMindmap = await prisma.mindMap.create({
      data: {
        user_id: userId,
        subject_id: subject?.id,
        title: mindmap.title,
        content: JSON.stringify(mindmap.structure),
        type: type as any
      }
    });

    res.json({
      mindmap: savedMindmap,
      structure: mindmap.structure,
      description: mindmap.description
    });
  } catch (error) {
    console.error('Error generating mindmap:', error);
    res.status(500).json({ error: 'Failed to generate mindmap' });
  }
});

export default router;