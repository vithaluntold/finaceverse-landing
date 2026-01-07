# FinACEverse: Week 1 Action Plan
## Transform to Enterprise-Grade Platform

---

## 🎯 Goal for This Week

**Transform the current Express + React app into a production-ready, scalable foundation that supports multi-module architecture.**

---

## 📋 Daily Breakdown

### **Day 1: Monday - Project Setup & Planning**

#### Morning (3-4 hours)
- [x] ✅ Review architecture blueprint
- [x] ✅ Review migration guide
- [x] ✅ Review tech stack decision
- [ ] ⬜ Team alignment meeting (if applicable)
- [ ] ⬜ Create project tracking board (GitHub Projects / Jira)

#### Afternoon (4-5 hours)
- [ ] ⬜ Install TypeScript dependencies
```bash
npm install --save-dev typescript @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/pg ts-node-dev
```

- [ ] ⬜ Create `tsconfig.json`
```bash
npx tsc --init
```

- [ ] ⬜ Update `package.json` scripts
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "type-check": "tsc --noEmit"
  }
}
```

- [ ] ⬜ Create new folder structure:
```bash
mkdir -p src/{config,middleware,modules/{auth,users,analytics},shared/{utils,types,constants}}
```

---

### **Day 2: Tuesday - Backend Refactoring Begins**

#### Morning (3-4 hours)

**Task 1: Extract Configuration**

Create `src/config/database.ts`:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export default pool;
```

Create `src/config/redis.ts`:
```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

export const connectRedis = async () => {
  await redisClient.connect();
  return redisClient;
};

export default redisClient;
```

Create `src/config/env.ts`:
```typescript
import dotenv from 'dotenv';
dotenv.config();

interface Config {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ALLOWED_ORIGINS: string[];
}

export const config: Config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
};

// Validate critical env vars
const validateConfig = () => {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !config[key as keyof Config] || config[key as keyof Config] === 'change-me-in-production');
  
  if (missing.length > 0 && config.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateConfig();
```

#### Afternoon (4-5 hours)

**Task 2: Create Shared Utilities**

Create `src/shared/utils/AppError.ts`:
```typescript
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
```

Create `src/shared/utils/asyncHandler.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

Create `src/shared/types/index.ts`:
```typescript
export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface RequestContext {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}
```

---

### **Day 3: Wednesday - Authentication Module**

#### Morning (3-4 hours)

**Task 1: Create Auth Module**

Create `src/modules/auth/auth.service.ts`:
```typescript
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../shared/utils/AppError';
import { config } from '../../config/env';
import { User } from '../../shared/types';

export class AuthService {
  constructor(private db: Pool) {}

  async register(email: string, password: string, tenantId: string): Promise<{ user: User; token: string }> {
    // Check if user exists
    const existingUser = await this.db.query(
      'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await this.db.query(
      `INSERT INTO users (email, password, tenant_id, role, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, tenant_id, email, first_name, last_name, role, status, created_at`,
      [email, hashedPassword, tenantId, 'user', 'active']
    );

    const user = result.rows[0];

    // Generate token
    const token = this.generateToken(user);

    return { user, token };
  }

  async login(email: string, password: string, tenantId: string): Promise<{ user: User; token: string }> {
    // Find user
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      throw new AppError('Account is not active', 403);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await this.db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = this.generateToken(user);

    // Remove password from response
    delete user.password;

    return { user, token };
  }

  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}
```

#### Afternoon (4-5 hours)

**Task 2: Create Auth Controller & Routes**

Create `src/modules/auth/auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AppError } from '../../shared/utils/AppError';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, tenantId } = req.body;

    if (!email || !password || !tenantId) {
      throw new AppError('Email, password, and tenantId are required', 400);
    }

    const result = await this.authService.register(email, password, tenantId);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, tenantId } = req.body;

    if (!email || !password || !tenantId) {
      throw new AppError('Email, password, and tenantId are required', 400);
    }

    const result = await this.authService.login(email, password, tenantId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      data: { user: req.context },
    });
  });
}
```

Create `src/modules/auth/auth.routes.ts`:
```typescript
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import db from '../../config/database';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const authService = new AuthService(db);
const authController = new AuthController(authService);

// Public routes
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('tenantId').isUUID(),
    validate,
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('tenantId').isUUID(),
    validate,
  ],
  authController.login
);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);

export default router;
```

---

### **Day 4: Thursday - Middleware & Error Handling**

#### Morning (3-4 hours)

**Task 1: Create Middleware**

Create `src/middleware/auth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../shared/utils/AppError';
import { config } from '../config/env';
import { RequestContext } from '../shared/types';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded: any = jwt.verify(token, config.JWT_SECRET);

    // Attach context to request
    req.context = {
      tenantId: decoded.tenantId,
      userId: decoded.userId,
      roles: [decoded.role],
      permissions: [],
    };

    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.context) {
      return next(new AppError('Unauthorized', 401));
    }

    const hasRole = req.context.roles.some(role => roles.includes(role));
    if (!hasRole) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};
```

Create `src/middleware/validation.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../shared/utils/AppError';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return next(new AppError(errorMessages, 400));
  }
  next();
};
```

Create `src/middleware/errorHandler.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/utils/AppError';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  const statusCode = (error as AppError).statusCode || 500;
  const status = (error as AppError).status || 'error';

  res.status(statusCode).json({
    status,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

#### Afternoon (4-5 hours)

**Task 2: Create Main App File**

Create `src/app.ts`:
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';

const app: Application = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api', limiter);

// CORS
app.use(cors({
  origin: config.ALLOWED_ORIGINS,
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize());
app.use(hpp());

// API Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve React app in production
if (config.NODE_ENV === 'production') {
  app.use(express.static('build'));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
```

Create `src/server.ts`:
```typescript
import app from './app';
import { config } from './config/env';
import db from './config/database';
import { connectRedis } from './config/redis';

const PORT = config.PORT;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const startServer = async () => {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Connect Redis
    await connectRedis();
    console.log('✅ Redis connected');

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${config.NODE_ENV}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        console.log('💥 Process terminated!');
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

---

### **Day 5: Friday - Database Migration & Testing**

#### Morning (3-4 hours)

**Task 1: Create Database Migrations**

Already created! Use the migration from Day 3 of Week 3 in the Migration Guide.

Run migration:
```bash
psql $DATABASE_URL < migrations/001_multi_tenancy.sql
```

#### Afternoon (4-5 hours)

**Task 2: Testing**

Create `src/modules/auth/auth.test.ts`:
```typescript
import request from 'supertest';
import app from '../../app';
import db from '../../config/database';

describe('Auth Module', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup
    await db.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
        });

      expect(res.status).toBe(400);
    });
  });
});
```

---

## 🎯 Week 1 Success Criteria

By end of Friday, you should have:

- [ ] ✅ TypeScript configured and working
- [ ] ✅ Project structure refactored
- [ ] ✅ Configuration files extracted
- [ ] ✅ Authentication module working
- [ ] ✅ Middleware implemented
- [ ] ✅ Error handling standardized
- [ ] ✅ Database migration completed
- [ ] ✅ Basic tests written
- [ ] ✅ Dev environment running with `npm run dev`
- [ ] ✅ Production build working with `npm run build`

---

## 📊 Progress Tracking

Use this checklist to track your progress:

```
Day 1: Project Setup
├── [ ] Install TypeScript
├── [ ] Create tsconfig.json
├── [ ] Update package.json
└── [ ] Create folder structure

Day 2: Backend Refactoring
├── [ ] Extract configuration files
├── [ ] Create shared utilities
├── [ ] Create types
└── [ ] Test configuration

Day 3: Authentication
├── [ ] Create auth service
├── [ ] Create auth controller
├── [ ] Create auth routes
└── [ ] Test authentication

Day 4: Middleware
├── [ ] Create auth middleware
├── [ ] Create validation middleware
├── [ ] Create error handler
└── [ ] Create main app file

Day 5: Database & Testing
├── [ ] Run database migration
├── [ ] Write tests
├── [ ] Fix any bugs
└── [ ] Deploy to staging
```

---

## 🆘 If You Get Stuck

### **Common Issues**

**Issue: TypeScript errors**
- Solution: Start with `"strict": false` in tsconfig.json
- Gradually enable strict mode later

**Issue: Database connection fails**
- Solution: Check `.env` file
- Verify DATABASE_URL format
- Test connection with `psql $DATABASE_URL`

**Issue: Redis not connecting**
- Solution: Install Redis locally or use Upstash (free tier)
- Or comment out Redis for now

**Issue: Imports not working**
- Solution: Check `tsconfig.json` paths
- Verify file extensions (.ts not .js)
- Restart TypeScript server in VS Code

---

## 🚀 Next Week Preview

### **Week 2: Module Admin Dashboard**
- Create dashboard UI
- Module management interface
- User management interface
- Analytics integration

---

## 💡 Tips for Success

1. **Commit often** - After each major task
2. **Test as you go** - Don't wait until end
3. **Keep notes** - Document issues and solutions
4. **Ask for help** - If stuck for >30 min
5. **Take breaks** - Pomodoro technique (25 min work, 5 min break)

---

## 📞 Support Resources

- TypeScript Docs: https://www.typescriptlang.org/docs/
- Express TypeScript Guide: https://blog.logrocket.com/how-to-set-up-node-typescript-express/
- PostgreSQL with Node.js: https://node-postgres.com/

---

**Let's build something amazing! 🚀**

Good luck with Week 1!
