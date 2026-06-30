import prisma from '@/lib/prisma';
import { hashPassword, comparePassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth';
import { AppError, UnauthorizedError } from '@/utils/errors';
import { RegisterInput, LoginInput } from './auth.schema';

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError('A user with this email already exists', 409);

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      entityId: input.entityId,
      delegationLimit: input.delegationLimit ?? 0,
    },
  });

  return sanitizeUser(user);
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    entityId: user.entityId,
  });
  const refreshToken = signRefreshToken({ userId: user.id });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    entityId: user.entityId,
  });
  return { accessToken };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { entity: true } });
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
}

function sanitizeUser(user: any) {
  const { passwordHash, mfaSecret, ...safe } = user;
  return safe;
}
