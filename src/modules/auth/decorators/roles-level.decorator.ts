import { SetMetadata } from '@nestjs/common';

export const ROLES_LEVEL_KEY = 'roles_level';
export const RolesLevel = (level: number) =>
  SetMetadata(ROLES_LEVEL_KEY, level);